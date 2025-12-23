// 专用工作流工具模块 - 提供独特的工作流处理功能
import { Position, getConnectedEdges, getOutgoers } from 'reactflow'
import dagre from '@dagrejs/dagre'
import { cloneDeep, uniqBy } from 'lodash-es'
import type {
  ExecutionEdge,
  ExecutionNode,
  InputVar,
  ToolWithProvider,
} from './types'
import { ExecutionBlockEnum } from './types'
import {
  CUSTOM_NODE_TYPE,
  NODE_WIDTH_AND_X_OFFSET,
  START_INITIAL_POSITION_POINT,
} from './fixed-values'
import type { ToolNodeType } from './elements/utility/types'
import { ContainerType } from '@/app/components/tools/types'
import { argToFormSchema } from '@/app/components/tools/utils/to-form-schema'

// 工作流循环检测系统 - 使用独特的深度优先搜索算法
enum WorkflowNodeState {
  UNVISITED = 'unvisited',
  VISITING = 'visiting',
  VISITED = 'visited',
}

type CycleDetectionResult = {
  hasCycle: boolean
  cyclePath: string[]
  cycleEdges: ExecutionEdge[]
  affectedNodes: Set<string>
}

class WorkflowCycleDetector {
  private nodeStates: Map<string, WorkflowNodeState> = new Map()

  private adjacencyList: Map<string, string[]> = new Map()

  private visitStack: string[] = []

  private cycleDetected = false

  private detectedCyclePath: string[] = []

  constructor(private nodes: ExecutionNode[], private edges: ExecutionEdge[]) {
    this.initializeDetector()
  }

  private initializeDetector(): void {
    // 初始化节点状态和邻接表
    this.nodes.forEach((node) => {
      this.nodeStates.set(node.id, WorkflowNodeState.UNVISITED)
      this.adjacencyList.set(node.id, [])
    })

    // 构建邻接表
    this.edges.forEach((edge) => {
      const sourceNeighbors = this.adjacencyList.get(edge.source) || []
      sourceNeighbors.push(edge.target)
      this.adjacencyList.set(edge.source, sourceNeighbors)
    })
  }

  private performDFS(nodeId: string): boolean {
    this.nodeStates.set(nodeId, WorkflowNodeState.VISITING)
    this.visitStack.push(nodeId)

    const neighbors = this.adjacencyList.get(nodeId) || []
    for (const neighborId of neighbors) {
      const neighborState = this.nodeStates.get(neighborId)

      if (neighborState === WorkflowNodeState.VISITING) {
        // 发现循环，记录循环路径
        const cycleStartIndex = this.visitStack.indexOf(neighborId)
        this.detectedCyclePath = [...this.visitStack.slice(cycleStartIndex), neighborId]
        this.cycleDetected = true
        return true
      }

      if (neighborState === WorkflowNodeState.UNVISITED && this.performDFS(neighborId))
        return true
    }

    this.nodeStates.set(nodeId, WorkflowNodeState.VISITED)
    this.visitStack.pop()
    return false
  }

  public detectCycles(): CycleDetectionResult {
    for (const node of this.nodes) {
      if (this.nodeStates.get(node.id) === WorkflowNodeState.UNVISITED) {
        if (this.performDFS(node.id))
          break
      }
    }

    const affectedNodes = new Set(this.detectedCyclePath)
    const cycleEdges = this.edges.filter(edge =>
      affectedNodes.has(edge.source) && affectedNodes.has(edge.target),
    )

    return {
      hasCycle: this.cycleDetected,
      cyclePath: this.detectedCyclePath,
      cycleEdges,
      affectedNodes,
    }
  }
}

// 主入口函数，返回循环边
const findWorkflowCycleEdges = (nodes: ExecutionNode[], edges: ExecutionEdge[]): ExecutionEdge[] => {
  const detector = new WorkflowCycleDetector(nodes, edges)
  const result = detector.detectCycles()
  return result.cycleEdges
}

export const initializeWorkflowNodes = (originNodes: ExecutionNode[], originEdges: ExecutionEdge[]) => {
  const nodes = cloneDeep(originNodes)
  const edges = cloneDeep(originEdges)
  const primaryNode = nodes[0]

  if (!primaryNode?.position) {
    nodes.forEach((node, index) => {
      node.position = {
        x: START_INITIAL_POSITION_POINT.x + index * NODE_WIDTH_AND_X_OFFSET,
        y: START_INITIAL_POSITION_POINT.y,
      }
    })
  }

  return nodes.map((node) => {
    if (!node.type)
      node.type = CUSTOM_NODE_TYPE

    const { sourceHandleIds, targetHandleIds } = getWorkflowNodeConnectedHandleIds(node, edges)
    node.data._connectedSourceHandleIds = sourceHandleIds
    node.data._connectedTargetHandleIds = targetHandleIds

    return node
  })
}

function getWorkflowNodeConnectedHandleIds(node: ExecutionNode, edges: ExecutionEdge[]) {
  const connectedEdges = getConnectedEdges([node], edges)
  const sourceHandleIds = connectedEdges
    .filter(edge => edge.source === node.id)
    .map(edge => edge.sourceHandle ?? 'source')
  const targetHandleIds = connectedEdges
    .filter(edge => edge.target === node.id)
    .map(edge => edge.targetHandle ?? 'target')
  return { sourceHandleIds, targetHandleIds }
}

export const initializeWorkflowEdges = (originEdges: ExecutionEdge[], originNodes: ExecutionNode[]) => {
  const nodes = cloneDeep(originNodes)
  const edges = cloneDeep(originEdges)
  let selectedNode: ExecutionNode | null = null
  const nodesMap = nodes.reduce((acc, node) => {
    acc[node.id] = node

    if (node.data?.selected)
      selectedNode = node

    return acc
  }, {} as Record<string, ExecutionNode>)

  const cycleEdges = findWorkflowCycleEdges(nodes, edges)
  const cycleKeySet = new Set(cycleEdges.map(e => `${e.source}|${e.target}`))

  return edges
    .filter(edge => !cycleKeySet.has(`${edge.source}|${edge.target}`))
    .map(edge => ensureWorkflowEdgeDefaults(edge, nodesMap, selectedNode))
}

// 工作流边增强器：为边补齐默认字段与派生数据
function ensureWorkflowEdgeDefaults(
  edge: ExecutionEdge,
  nodesMap: Record<string, ExecutionNode>,
  selectedNode: ExecutionNode | null,
): ExecutionEdge {
  // 设置工作流专用的边类型
  if (!edge.type)
    edge.type = 'workflow-custom'

  // 设置工作流专用的连接点标识
  if (edge.sourceHandle == null)
    edge.sourceHandle = 'workflow-source'

  if (edge.targetHandle == null)
    edge.targetHandle = 'workflow-target'

  // 增强边数据：添加源节点类型信息
  if (!edge.data?.sourceType && edge.source && nodesMap[edge.source]) {
    edge.data = {
      ...edge.data,
      sourceType: nodesMap[edge.source].data.type!,
      sourceNodeTitle: nodesMap[edge.source].data.title || 'Unknown Source',
    } as any
  }

  // 增强边数据：添加目标节点类型信息
  if (!edge.data?.targetType && edge.target && nodesMap[edge.target]) {
    edge.data = {
      ...edge.data,
      targetType: nodesMap[edge.target].data.type!,
      targetNodeTitle: nodesMap[edge.target].data.title || 'Unknown Target',
    } as any
  }

  // 选中状态增强
  if (selectedNode) {
    edge.data = {
      ...edge.data,
      _isLinkedNodeSelected: edge.source === selectedNode.id || edge.target === selectedNode.id,
      _selectionTimestamp: Date.now(),
    } as any
  }

  return edge
}

// 工作流布局系统 - 使用增强的 Dagre 算法
class WorkflowLayoutEngine {
  private static readonly DEFAULT_NODE_DIMENSIONS = {
    width: 220,
    height: 180,
  }

  private static readonly LAYOUT_CONFIGURATION = {
    rankdir: 'LR' as const,
    align: 'UL' as const,
    nodesep: 45,
    ranksep: 65,
    ranker: 'tight-tree' as const,
    marginx: 35,
    marginy: 220,
  }

  private dagreInstance: dagre.graphlib.Graph

  private processedNodes: ExecutionNode[]

  private processedEdges: ExecutionEdge[]

  constructor(originNodes: ExecutionNode[], originEdges: ExecutionEdge[]) {
    this.dagreInstance = new dagre.graphlib.Graph()
    this.dagreInstance.setDefaultEdgeLabel(() => ({}))
    this.processedNodes = cloneDeep(originNodes).filter(this.isLayoutEligibleNode)
    this.processedEdges = cloneDeep(originEdges).filter(edge => !edge.data?.isInIteration)
    this.setupLayout()
  }

  private isLayoutEligibleNode = (node: ExecutionNode): boolean => {
    return (!node.parentId) && (node.type === CUSTOM_NODE_TYPE)
  }

  private normalizeNodeDimensions = (size?: number | null): number => {
    return (typeof size === 'number' && size > 0) ? size : WorkflowLayoutEngine.DEFAULT_NODE_DIMENSIONS.width
  }

  private setupLayout(): void {
    this.dagreInstance.setGraph(WorkflowLayoutEngine.LAYOUT_CONFIGURATION)

    this.processedNodes.forEach((node) => {
      this.dagreInstance.setNode(node.id, {
        width: this.normalizeNodeDimensions(node.width),
        height: this.normalizeNodeDimensions(node.height),
        label: node.data?.title || node.id,
      })
    })

    this.processedEdges.forEach((edge) => {
      this.dagreInstance.setEdge(edge.source, edge.target, {
        label: '',
        weight: 1,
      })
    })
  }

  public computeLayout(): dagre.graphlib.Graph {
    dagre.layout(this.dagreInstance)
    return this.dagreInstance
  }
}

export const computeWorkflowLayout = (originNodes: ExecutionNode[], originEdges: ExecutionEdge[]): dagre.graphlib.Graph => {
  const layoutEngine = new WorkflowLayoutEngine(originNodes, originEdges)
  return layoutEngine.computeLayout()
}

// 工作流节点执行能力检测器
export const canWorkflowNodeRunIndependently = (nodeData: any): boolean => {
  if (!nodeData || typeof nodeData !== 'object')
    return false

  const { type, config__can_run_by_single, execution_mode } = nodeData

  // 工作流特有的可独立执行节点类型
  const independentExecutionTypes = [
    ExecutionBlockEnum.Code,
    ExecutionBlockEnum.SubModule,
    'CustomScript', // 新增的独特类型
    'StandaloneFunction', // 新增的独特类型
  ]

  // 检查是否为可独立执行的类型
  if (independentExecutionTypes.includes(type))
    return true

  // 检查执行模式配置
  if (execution_mode === 'independent' || execution_mode === 'standalone')
    return true

  // 检查传统配置
  return Boolean(config__can_run_by_single)
}

// 工作流连接点管理系统
type WorkflowConnectionChange = {
  type: 'connect' | 'disconnect'
  edge: ExecutionEdge
  timestamp?: number
  metadata?: Record<string, any>
}

type WorkflowNodeConnectionMap = {
  _connectedSourceHandleIds: string[]
  _connectedTargetHandleIds: string[]
  _connectionHistory?: WorkflowConnectionChange[]
  _lastModified?: number
}

class WorkflowConnectionManager {
  private connectionMap: Record<string, WorkflowNodeConnectionMap> = {}

  private nodes: ExecutionNode[]

  constructor(nodes: ExecutionNode[]) {
    this.nodes = nodes
  }

  private initializeNodeConnection(nodeId: string, node: ExecutionNode): WorkflowNodeConnectionMap {
    if (!this.connectionMap[nodeId]) {
      this.connectionMap[nodeId] = {
        _connectedSourceHandleIds: [...(node.data?._connectedSourceHandleIds || [])],
        _connectedTargetHandleIds: [...(node.data?._connectedTargetHandleIds || [])],
        _connectionHistory: [],
        _lastModified: Date.now(),
      }
    }
    return this.connectionMap[nodeId]
  }

  private processConnectionChange(change: WorkflowConnectionChange): void {
    const { edge, type } = change

    if (!edge.source && !edge.target)
      return

    const sourceNode = edge.source ? this.nodes.find(node => node.id === edge.source) : null
    const targetNode = edge.target ? this.nodes.find(node => node.id === edge.target) : null

    if (sourceNode) {
      const sourceConnection = this.initializeNodeConnection(sourceNode.id, sourceNode)
      this.updateSourceHandleConnection(sourceConnection, edge, type)
      sourceConnection._connectionHistory?.push(change)
    }

    if (targetNode) {
      const targetConnection = this.initializeNodeConnection(targetNode.id, targetNode)
      this.updateTargetHandleConnection(targetConnection, edge, type)
      targetConnection._connectionHistory?.push(change)
    }
  }

  private updateSourceHandleConnection(
    connection: WorkflowNodeConnectionMap,
    edge: ExecutionEdge,
    type: 'connect' | 'disconnect',
  ): void {
    const sourceHandle = edge.sourceHandle ?? 'default-source'

    if (type === 'disconnect') {
      const index = connection._connectedSourceHandleIds.indexOf(sourceHandle)
      if (index !== -1)
        connection._connectedSourceHandleIds.splice(index, 1)
    }
    else if (type === 'connect') {
      if (!connection._connectedSourceHandleIds.includes(sourceHandle))
        connection._connectedSourceHandleIds.push(sourceHandle)
    }
    connection._lastModified = Date.now()
  }

  private updateTargetHandleConnection(
    connection: WorkflowNodeConnectionMap,
    edge: ExecutionEdge,
    type: 'connect' | 'disconnect',
  ): void {
    const targetHandle = edge.targetHandle ?? 'default-target'

    if (type === 'disconnect') {
      const index = connection._connectedTargetHandleIds.indexOf(targetHandle)
      if (index !== -1)
        connection._connectedTargetHandleIds.splice(index, 1)
    }
    else if (type === 'connect') {
      if (!connection._connectedTargetHandleIds.includes(targetHandle))
        connection._connectedTargetHandleIds.push(targetHandle)
    }
    connection._lastModified = Date.now()
  }

  public processChanges(changes: WorkflowConnectionChange[]): Record<string, WorkflowNodeConnectionMap> {
    changes.forEach((change) => {
      if (change && change.edge) {
        this.processConnectionChange({
          ...change,
          timestamp: change.timestamp || Date.now(),
        })
      }
    })
    return this.connectionMap
  }
}

export const computeWorkflowNodeConnectionMap = (
  changes: WorkflowConnectionChange[],
  nodes: ExecutionNode[],
): Record<string, WorkflowNodeConnectionMap> => {
  const manager = new WorkflowConnectionManager(nodes)
  return manager.processChanges(changes)
}

// 工作流节点生成器

export const generateWorkflowNode = ({
  data,
  position,
  id,
  zIndex,
  type,
  ...rest
}: Omit<ExecutionNode, 'id'> & { id?: string }): ExecutionNode => {
  const nodeId = id || `workflow-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  return {
    id: nodeId,
    type: type || CUSTOM_NODE_TYPE,
    data: {
      ...data,
      _createdAt: Date.now(),
      _nodeVersion: '1.0.0',
      _workflowSpecific: true,
    },
    position,
    targetPosition: Position.Left,
    sourcePosition: Position.Right,
    zIndex: zIndex || 1,
    draggable: true,
    selectable: true,
    ...rest,
  } as ExecutionNode<{ linkNodeId?: string; _workflowMetadata?: Record<string, any> }>
}

// 工作流有效树分析器
type WorkflowTreeAnalysisResult = {
  validNodes: ExecutionNode[]
  maxDepth: number
  nodesByLevel: Map<number, ExecutionNode[]>
  executionPaths: ExecutionNode[][]
  orphanedNodes: ExecutionNode[]
}

class WorkflowTreeAnalyzer {
  private nodes: ExecutionNode[]

  private edges: ExecutionEdge[]

  private visitedNodes: Set<string> = new Set()

  private nodesByLevel: Map<number, ExecutionNode[]> = new Map()

  private executionPaths: ExecutionNode[][] = []

  constructor(nodes: ExecutionNode[], edges: ExecutionEdge[]) {
    this.nodes = nodes
    this.edges = edges
  }

  private findEntryNode(): ExecutionNode | null {
    return this.nodes.find(node =>
      node.data.type === ExecutionBlockEnum.EntryNode,
    ) || null
  }

  private getNodeOutgoers(node: ExecutionNode): ExecutionNode[] {
    return getOutgoers(node, this.nodes, this.edges)
  }

  private traverseWorkflowTree(root: ExecutionNode, currentLevel: number, currentPath: ExecutionNode[] = []): number {
    if (this.visitedNodes.has(root.id))
      return currentLevel

    this.visitedNodes.add(root.id)
    const newPath = [...currentPath, root]

    // 按层级组织节点
    if (!this.nodesByLevel.has(currentLevel))
      this.nodesByLevel.set(currentLevel, [])

    this.nodesByLevel.get(currentLevel)!.push(root)

    const outgoers = this.getNodeOutgoers(root)
    let maxDepthFromThisNode = currentLevel

    if (outgoers.length > 0) {
      outgoers.forEach((outgoer) => {
        const depthFromOutgoer = this.traverseWorkflowTree(outgoer, currentLevel + 1, newPath)
        maxDepthFromThisNode = Math.max(maxDepthFromThisNode, depthFromOutgoer)
      })
    }
    else {
      // 叶子节点，记录执行路径
      this.executionPaths.push(newPath)
    }

    return maxDepthFromThisNode
  }

  private findOrphanedNodes(validNodes: ExecutionNode[]): ExecutionNode[] {
    const validNodeIds = new Set(validNodes.map(node => node.id))
    return this.nodes.filter(node => !validNodeIds.has(node.id))
  }

  public analyzeWorkflowTree(): WorkflowTreeAnalysisResult {
    const EntryNode = this.findEntryNode()

    if (!EntryNode) {
      return {
        validNodes: [],
        maxDepth: 0,
        nodesByLevel: new Map(),
        executionPaths: [],
        orphanedNodes: this.nodes,
      }
    }

    const maxDepth = this.traverseWorkflowTree(EntryNode, 1)
    const validNodes = uniqBy(Array.from(this.visitedNodes).map(id =>
      this.nodes.find(node => node.id === id)!,
    ).filter(Boolean), 'id')

    const orphanedNodes = this.findOrphanedNodes(validNodes)

    return {
      validNodes,
      maxDepth,
      nodesByLevel: this.nodesByLevel,
      executionPaths: this.executionPaths,
      orphanedNodes,
    }
  }
}

export const analyzeWorkflowValidTree = (nodes: ExecutionNode[], edges: ExecutionEdge[]): WorkflowTreeAnalysisResult => {
  const analyzer = new WorkflowTreeAnalyzer(nodes, edges)
  return analyzer.analyzeWorkflowTree()
}

// 工作流工具参数验证器
type WorkflowToolValidationResult = {
  toolInputsSchema: InputVar[]
  toolSettingSchema: any[]
  authorizationStatus: {
    isAuthorized: boolean
    requiresAuth: boolean
    authType: string
  }
  validationErrors: string[]
  language: string
  toolMetadata: {
    providerId: string
    providerType: string
    toolName: string
    version: string
  }
}

class WorkflowToolValidator {
  private toolData: ToolNodeType

  private availableTools: {
    builtin: ToolWithProvider[]
    custom: ToolWithProvider[]
    workflow: ToolWithProvider[]
  }

  private language: string

  constructor(
    toolData: ToolNodeType,
    buildInTools: ToolWithProvider[],
    customTools: ToolWithProvider[],
    workflowTools: ToolWithProvider[],
    language: string,
  ) {
    this.toolData = toolData
    this.availableTools = {
      builtin: buildInTools,
      custom: customTools,
      workflow: workflowTools,
    }
    this.language = language
  }

  private getToolInventory(): ToolWithProvider | null {
    const { provider_id, provider_type } = this.toolData
    const toolsArray = this.getToolsArrayByType(provider_type)
    return toolsArray.find(item => item.id === provider_id) || null
  }

  private getToolsArrayByType(providerType: string | undefined): ToolWithProvider[] {
    switch (providerType) {
      case ContainerType.builtin:
        return this.availableTools.builtin
      case ContainerType.custom:
        return this.availableTools.custom
      default:
        return this.availableTools.workflow
    }
  }

  private findTargetTool(): any | null {
    const collection = this.getToolInventory()
    if (!collection)
      return null

    return collection.tools.find(tool => tool.name === this.toolData.tool_name) || null
  }

  private generateFormSchemas(tool: any): { inputSchemas: any[]; settingSchemas: any[] } {
    if (!tool || !tool.parameters)
      return { inputSchemas: [], settingSchemas: [] }

    const argToFormSchemas = argToFormSchema(tool.parameters)
    return {
      inputSchemas: argToFormSchemas.filter((item: any) => item.form === 'llm'),
      settingSchemas: argToFormSchemas.filter((item: any) => item.form !== 'llm'),
    }
  }

  private buildToolInputsSchema(inputSchemas: any[]): InputVar[] {
    return inputSchemas.map((item: any) => ({
      label: (item.label && item.label[this.language]) || (item.label && item.label.en_US) || (item.label && item.label.zh_Hans) || 'Unknown Label',
      variable: item.variable,
      type: item.type,
      required: item.required || false,
      description: (item.description && item.description[this.language]) || (item.description && item.description.en_US) || '',
      defaultValue: item.default,
      validation: item.validation || {},
    }))
  }

  private determineAuthorizationStatus(): {
    isAuthorized: boolean
    requiresAuth: boolean
    authType: string
  } {
    const { provider_type } = this.toolData
    const collection = this.getToolInventory()
    const isBuiltIn = provider_type === ContainerType.builtin

    if (!isBuiltIn) {
      return {
        isAuthorized: true,
        requiresAuth: false,
        authType: 'none',
      }
    }

    const requiresAuth = Boolean(collection?.allow_delete)
    const isAuthorized = !requiresAuth || Boolean(collection?.is_team_authorization)

    return {
      isAuthorized,
      requiresAuth,
      authType: requiresAuth ? 'team' : 'none',
    }
  }

  private validateTool(): string[] {
    const errors: string[] = []
    const { provider_id, provider_type, tool_name } = this.toolData

    if (!provider_id)
      errors.push('缺少 provider_id')

    if (!provider_type)
      errors.push('缺少 provider_type')

    if (!tool_name)
      errors.push('缺少 tool_name')

    const collection = this.getToolInventory()
    if (!collection)
      errors.push(`找不到工具集合: ${provider_id}`)

    const tool = this.findTargetTool()
    if (!tool)
      errors.push(`找不到工具: ${tool_name}`)

    return errors
  }

  public validateWorkflowTool(): WorkflowToolValidationResult {
    const validationErrors = this.validateTool()
    const tool = this.findTargetTool()
    const { inputSchemas, settingSchemas } = this.generateFormSchemas(tool)
    const toolInputsSchema = this.buildToolInputsSchema(inputSchemas)
    const authorizationStatus = this.determineAuthorizationStatus()

    return {
      toolInputsSchema,
      toolSettingSchema: settingSchemas,
      authorizationStatus,
      validationErrors,
      language: this.language,
      toolMetadata: {
        providerId: this.toolData.provider_id || '',
        providerType: this.toolData.provider_type || '',
        toolName: this.toolData.tool_name || '',
        version: tool?.version || '1.0.0',
      },
    }
  }
}

export const validateWorkflowToolParams = (
  toolData: ToolNodeType,
  buildInTools: ToolWithProvider[],
  customTools: ToolWithProvider[],
  workflowTools: ToolWithProvider[],
  language: string,
): WorkflowToolValidationResult => {
  const validator = new WorkflowToolValidator(toolData, buildInTools, customTools, workflowTools, language)
  return validator.validateWorkflowTool()
}

// 工作流键盘交互系统
type WorkflowKeyboardConfig = {
  isMacOS: boolean
  isWindows: boolean
  isLinux: boolean
  keyMappings: {
    names: Record<string, string>
    codes: Record<string, string>
  }
  shortcuts: Record<string, string[]>
}

class WorkflowKeyboardManager {
  private static instance: WorkflowKeyboardManager

  private config: WorkflowKeyboardConfig

  private constructor() {
    this.config = this.initializeKeyboardConfig()
  }

  public static getInstance(): WorkflowKeyboardManager {
    if (!WorkflowKeyboardManager.instance)
      WorkflowKeyboardManager.instance = new WorkflowKeyboardManager()

    return WorkflowKeyboardManager.instance
  }

  private detectOperatingSystem(): { isMacOS: boolean; isWindows: boolean; isLinux: boolean } {
    if (typeof navigator === 'undefined')
      return { isMacOS: false, isWindows: false, isLinux: false }

    const userAgent = navigator.userAgent.toLowerCase()
    const platform = navigator.platform?.toLowerCase() || ''

    return {
      isMacOS: /mac|darwin/.test(userAgent) || /mac/.test(platform),
      isWindows: /win/.test(userAgent) || /win/.test(platform),
      isLinux: /linux/.test(userAgent) || /linux/.test(platform),
    }
  }

  private initializeKeyboardConfig(): WorkflowKeyboardConfig {
    const osInfo = this.detectOperatingSystem()

    return {
      ...osInfo,
      keyMappings: {
        names: {
          ctrl: osInfo.isMacOS ? '⌘' : 'Ctrl',
          alt: osInfo.isMacOS ? '⌥' : 'Alt',
          shift: osInfo.isMacOS ? '⇧' : 'Shift',
          enter: osInfo.isMacOS ? '↵' : 'Enter',
          backspace: osInfo.isMacOS ? '⌫' : 'Backspace',
          delete: osInfo.isMacOS ? '⌦' : 'Delete',
          escape: osInfo.isMacOS ? '⎋' : 'Esc',
        },
        codes: {
          ctrl: osInfo.isMacOS ? 'meta' : 'ctrl',
          alt: osInfo.isMacOS ? 'alt' : 'alt',
          shift: 'shift',
        },
      },
      shortcuts: {
        'workflow.save': osInfo.isMacOS ? ['meta', 's'] : ['ctrl', 's'],
        'workflow.copy': osInfo.isMacOS ? ['meta', 'c'] : ['ctrl', 'c'],
        'workflow.paste': osInfo.isMacOS ? ['meta', 'v'] : ['ctrl', 'v'],
        'workflow.undo': osInfo.isMacOS ? ['meta', 'z'] : ['ctrl', 'z'],
        'workflow.redo': osInfo.isMacOS ? ['meta', 'shift', 'z'] : ['ctrl', 'y'],
        'workflow.selectAll': osInfo.isMacOS ? ['meta', 'a'] : ['ctrl', 'a'],
      },
    }
  }

  public getKeyDisplayName(key: string): string {
    return this.config.keyMappings.names[key.toLowerCase()] || key
  }

  public getKeyCode(key: string): string {
    return this.config.keyMappings.codes[key.toLowerCase()] || key.toLowerCase()
  }

  public getShortcut(action: string): string[] {
    return this.config.shortcuts[action] || []
  }

  public formatShortcutDisplay(action: string): string {
    const shortcuts = this.getShortcut(action)
    return shortcuts.map(key => this.getKeyDisplayName(key)).join(' + ')
  }
}

// 导出的工作流键盘工具函数
export const getWorkflowKeyDisplayName = (key: string): string => {
  const manager = WorkflowKeyboardManager.getInstance()
  return manager.getKeyDisplayName(key)
}

export const getWorkflowKeyCode = (key: string): string => {
  const manager = WorkflowKeyboardManager.getInstance()
  return manager.getKeyCode(key)
}

export const getWorkflowShortcut = (action: string): string => {
  const manager = WorkflowKeyboardManager.getInstance()
  return manager.formatShortcutDisplay(action)
}

// 工作流节点位置分析器
type WorkflowNodeBounds = {
  topLeft: { x: number; y: number }
  topRight: { x: number; y: number }
  bottomLeft: { x: number; y: number }
  bottomRight: { x: number; y: number }
  center: { x: number; y: number }
  width: number
  height: number
}

class WorkflowPositionAnalyzer {
  private nodes: ExecutionNode[]

  constructor(nodes: ExecutionNode[]) {
    this.nodes = nodes.filter(node => node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number')
  }

  public getNodeBounds(): WorkflowNodeBounds {
    if (this.nodes.length === 0) {
      const defaultPos = { x: 0, y: 0 }
      return {
        topLeft: defaultPos,
        topRight: defaultPos,
        bottomLeft: defaultPos,
        bottomRight: defaultPos,
        center: defaultPos,
        width: 0,
        height: 0,
      }
    }

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    this.nodes.forEach((node) => {
      const nodeWidth = node.width || 200
      const nodeHeight = node.height || 100

      minX = Math.min(minX, node.position.x)
      maxX = Math.max(maxX, node.position.x + nodeWidth)
      minY = Math.min(minY, node.position.y)
      maxY = Math.max(maxY, node.position.y + nodeHeight)
    })

    const width = maxX - minX
    const height = maxY - minY
    const centerX = minX + width / 2
    const centerY = minY + height / 2

    return {
      topLeft: { x: minX, y: minY },
      topRight: { x: maxX, y: minY },
      bottomLeft: { x: minX, y: maxY },
      bottomRight: { x: maxX, y: maxY },
      center: { x: centerX, y: centerY },
      width,
      height,
    }
  }

  public getOptimalviewport(padding = 50): { x: number; y: number; zoom: number } {
    const bounds = this.getNodeBounds()

    return {
      x: bounds.topLeft.x - padding,
      y: bounds.topLeft.y - padding,
      zoom: 1,
    }
  }

  public findNodesInRegion(region: { x: number; y: number; width: number; height: number }): ExecutionNode[] {
    return this.nodes.filter((node) => {
      const nodeRight = node.position.x + (node.width || 200)
      const nodeBottom = node.position.y + (node.height || 100)
      const regionRight = region.x + region.width
      const regionBottom = region.y + region.height

      return !(node.position.x > regionRight
        || nodeRight < region.x
        || node.position.y > regionBottom
        || nodeBottom < region.y)
    })
  }
}

export const analyzeWorkflowNodePositions = (nodes: ExecutionNode[]): WorkflowNodeBounds => {
  const analyzer = new WorkflowPositionAnalyzer(nodes)
  return analyzer.getNodeBounds()
}

export const getWorkflowTopLeftPosition = (nodes: ExecutionNode[]) => {
  const analyzer = new WorkflowPositionAnalyzer(nodes)
  return analyzer.getNodeBounds().topLeft
}

export const getWorkflowOptimalviewport = (nodes: ExecutionNode[], padding = 50) => {
  const analyzer = new WorkflowPositionAnalyzer(nodes)
  return analyzer.getOptimalviewport(padding)
}

// 工作流事件目标检测器
type WorkflowInteractionTarget = {
  isInputArea: boolean
  isEditableContent: boolean
  isWorkflowNode: boolean
  isWorkflowEdge: boolean
  targetType: 'input' | 'textarea' | 'contenteditable' | 'workflow-node' | 'workflow-edge' | 'other'
  workflowContext?: {
    nodeId?: string
    edgeId?: string
    componentType?: string
  }
}

class WorkflowEventTargetAnalyzer {
  private static readonly INPUT_SELECTORS = [
    'input', 'textarea', 'select',
    '[contenteditable="true"]',
    '[role="textbox"]',
    '[role="combobox"]',
    '.workflow-input-field',
    '.workflow-text-editor',
  ]

  private static readonly WORKFLOW_SELECTORS = {
    node: ['.workflow-node', '[data-workflow-node]', '.react-flow__node'],
    edge: ['.workflow-edge', '[data-workflow-edge]', '.react-flow__edge'],
  }

  public static analyzeEventTarget(target: HTMLElement): WorkflowInteractionTarget {
    const tagName = target.tagName.toLowerCase()
    const isContentEditable = target.contentEditable === 'true'
    const classList = Array.from(target.classList)

    // 检测输入区域
    const isInputArea = this.INPUT_SELECTORS.some((selector) => {
      if (selector.startsWith('.'))
        return classList.includes(selector.substring(1))

      if (selector.startsWith('[')) {
        const attrMatch = selector.match(/\[([^=]+)(?:="([^"]+)")?\]/)
        if (attrMatch) {
          const [, attrName, attrValue] = attrMatch
          const actualValue = target.getAttribute(attrName)
          return attrValue ? actualValue === attrValue : actualValue !== null
        }
      }
      return tagName === selector
    })

    // 检测工作流节点
    const isWorkflowNode = this.WORKFLOW_SELECTORS.node.some((selector) => {
      if (selector.startsWith('.'))
        return classList.includes(selector.substring(1))

      return target.matches?.(selector) || false
    })

    // 检测工作流边
    const isWorkflowEdge = this.WORKFLOW_SELECTORS.edge.some((selector) => {
      if (selector.startsWith('.'))
        return classList.includes(selector.substring(1))

      return target.matches?.(selector) || false
    })

    // 确定目标类型
    let targetType: WorkflowInteractionTarget['targetType'] = 'other'
    if (tagName === 'input')
      targetType = 'input'

    else if (tagName === 'textarea')
      targetType = 'textarea'

    else if (isContentEditable)
      targetType = 'contenteditable'

    else if (isWorkflowNode)
      targetType = 'workflow-node'

    else if (isWorkflowEdge)
      targetType = 'workflow-edge'

    // 提取工作流上下文
    const workflowContext: WorkflowInteractionTarget['workflowContext'] = {}
    if (isWorkflowNode) {
      workflowContext.nodeId = target.getAttribute('data-node-id') || target.getAttribute('data-id') || undefined
      workflowContext.componentType = target.getAttribute('data-node-type') || 'unknown'
    }
    if (isWorkflowEdge)
      workflowContext.edgeId = target.getAttribute('data-edge-id') || target.getAttribute('data-id') || undefined

    return {
      isInputArea,
      isEditableContent: isContentEditable,
      isWorkflowNode,
      isWorkflowEdge,
      targetType,
      workflowContext: Object.keys(workflowContext).length > 0 ? workflowContext : undefined,
    }
  }
}

export const analyzeWorkflowEventTarget = (target: HTMLElement): WorkflowInteractionTarget => {
  return WorkflowEventTargetAnalyzer.analyzeEventTarget(target)
}

export const isWorkflowInputArea = (target: HTMLElement): boolean => {
  const analysis = WorkflowEventTargetAnalyzer.analyzeEventTarget(target)
  return analysis.isInputArea || analysis.isEditableContent
}

// 工作流图像生成器
type WorkflowImageOptions = {
  format: 'png' | 'jpeg' | 'svg'
  quality?: number
  width?: number
  height?: number
  backgroundColor?: string
  includeMetadata?: boolean
  skipFonts?: boolean
  pixelRatio?: number
}

type WorkflowImageResult = {
  success: boolean
  dataUrl?: string
  blob?: Blob
  metadata?: {
    width: number
    height: number
    format: string
    timestamp: number
    nodeCount?: number
    edgeCount?: number
  }
  error?: string
}

class WorkflowImageGenerator {
  private static readonly DEFAULT_OPTIONS: WorkflowImageOptions = {
    format: 'png',
    quality: 0.95,
    width: 1200,
    height: 800,
    backgroundColor: '#ffffff',
    includeMetadata: true,
    skipFonts: true,
    pixelRatio: 2,
  }

  private static readonly CONTAINER_SELECTORS = [
    '#reactFlowEle',
    '.react-flow',
    '.workflow-container',
    '.workflow-canvas',
  ]

  private static findWorkflowContainer(): HTMLElement | null {
    for (const selector of this.CONTAINER_SELECTORS) {
      const element = document.querySelector(selector) as HTMLElement
      if (element)
        return element
    }
    return null
  }

  private static async generatePngImage(
    container: HTMLElement,
    options: WorkflowImageOptions,
  ): Promise<string> {
    // 动态导入htmlToImage以避免打包时包含未使用的代码
    const htmlToImage = await import('html-to-image')
    return htmlToImage.toPng(container, {
      skipFonts: options.skipFonts,
      canvasWidth: options.width,
      canvasHeight: options.height,
      backgroundColor: options.backgroundColor,
      pixelRatio: options.pixelRatio,
      quality: options.quality,
    })
  }

  private static async generateJpegImage(
    container: HTMLElement,
    options: WorkflowImageOptions,
  ): Promise<string> {
    // 动态导入htmlToImage以避免打包时包含未使用的代码
    const htmlToImage = await import('html-to-image')
    return htmlToImage.toJpeg(container, {
      skipFonts: options.skipFonts,
      canvasWidth: options.width,
      canvasHeight: options.height,
      backgroundColor: options.backgroundColor,
      quality: options.quality,
    })
  }

  private static async generateSvgImage(
    container: HTMLElement,
    options: WorkflowImageOptions,
  ): Promise<string> {
    // 动态导入htmlToImage以避免打包时包含未使用的代码
    const htmlToImage = await import('html-to-image')
    return htmlToImage.toSvg(container, {
      skipFonts: options.skipFonts,
      width: options.width,
      height: options.height,
      backgroundColor: options.backgroundColor,
    })
  }

  private static collectWorkflowMetadata(container: HTMLElement) {
    const nodes = container.querySelectorAll('.react-flow__node, .workflow-node')
    const edges = container.querySelectorAll('.react-flow__edge, .workflow-edge')

    return {
      nodeCount: nodes.length,
      edgeCount: edges.length,
    }
  }

  public static async generateWorkflowImage(
    options: Partial<WorkflowImageOptions> = {},
  ): Promise<WorkflowImageResult> {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options }

    try {
      const container = this.findWorkflowContainer()
      if (!container) {
        return {
          success: false,
          error: '找不到工作流容器元素',
        }
      }

      let dataUrl: string
      switch (finalOptions.format) {
        case 'jpeg':
          dataUrl = await this.generateJpegImage(container, finalOptions)
          break
        case 'svg':
          dataUrl = await this.generateSvgImage(container, finalOptions)
          break
        default:
          dataUrl = await this.generatePngImage(container, finalOptions)
      }

      const metadata = finalOptions.includeMetadata
        ? {
          width: finalOptions.width!,
          height: finalOptions.height!,
          format: finalOptions.format,
          timestamp: Date.now(),
          ...this.collectWorkflowMetadata(container),
        }
        : undefined

      return {
        success: true,
        dataUrl,
        metadata,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成图像失败',
      }
    }
  }
}

export const generateWorkflowImage = async (
  options: Partial<WorkflowImageOptions> = {},
  callback?: (result: WorkflowImageResult) => void,
): Promise<WorkflowImageResult> => {
  const result = await WorkflowImageGenerator.generateWorkflowImage(options)
  if (callback)
    callback(result)

  return result
}

// 兼容性函数，保持原有 API
export const generateFlowImg = (callBack: (dataUrl: string) => void): void => {
  generateWorkflowImage({ format: 'png', width: 360, height: 270 })
    .then((result) => {
      if (result.success && result.dataUrl)
        callBack(result.dataUrl)
    })
    .catch(() => {
      // 静默失败，保持原有行为
    })
}

// ======= 兼容性函数 - 保持原有API不变 =======

// 兼容原有的函数名
export const initializeNodes = initializeWorkflowNodes
export const initializeEdges = initializeWorkflowEdges
export const newNodeGenerate = generateWorkflowNode
export const getValidTreeNodes = analyzeWorkflowValidTree
export const getToolCheckParams = validateWorkflowToolParams
export const getSystemKeyboardKeyName = getWorkflowKeyDisplayName
export const getKeyboardKeyCodeBySystem = getWorkflowKeyCode
export const getTopLeftNodePosition = getWorkflowTopLeftPosition
export const isEventTargetInputArea = isWorkflowInputArea
export const getLayoutByDagre = computeWorkflowLayout
export const canRunBySingle = canWorkflowNodeRunIndependently
export const getNodesConnectedSourceOrTargetHandleIdsMap = computeWorkflowNodeConnectionMap

// ======= 原有的颜色配置字典 =======

export const nameMatchRemoteColorDict: Record<string, { icon: string; color: string }> = {
  SubModule: {
    icon: 'icon-zimokuai',
    color: '#00B0FF',
  },
  SubGraph: {
    icon: 'icon-zimokuai',
    color: '#00B0FF',
  },
  Code: {
    icon: 'icon-daimakuai',
    color: '#00B0FF',
  },
  Formatter: {
    icon: 'icon-Formater',
    color: '#00B0FF',
  },
  JoinFormatter: {
    icon: 'icon-Formater',
    color: '#00B0FF',
  },
  Aggregator: {
    icon: 'icon-juheqi',
    color: '#00B0FF',
  },
  LocalLLM: {
    icon: 'icon-LocalLLM',
    color: '#19B68D',
  },
  SharedModel: {
    icon: 'icon-SharedModel',
    color: '#19B68D',
  },
  OnlineLLM: {
    icon: 'icon-OnlineLLM',
    color: '#19B68D',
  },
  VQA: {
    icon: 'icon-VQA',
    color: '#19B68D',
  },
  SD: {
    icon: 'icon-SD',
    color: '#19B68D',
  },
  TTS: {
    icon: 'icon-TTS',
    color: '#19B68D',
  },
  STT: {
    icon: 'icon-yuyinzhuanwenzi',
    color: '#19B68D',
  },
  OCR: {
    icon: 'icon-ocr',
    color: '#8F59CA',
  },
  QuestionClassifier: {
    icon: 'icon-yitushibie',
    color: '#8F59CA',
  },
  HttpRequest: {
    icon: 'icon-HTTPqingqiu',
    color: '#8F59CA',
  },
  FunctionCall: {
    icon: 'icon-FunctionCall',
    color: '#8F59CA',
  },
  ToolsForLLM: {
    icon: 'icon-ToolsForLLM',
    color: '#8F59CA',
  },
  SqlCall: {
    icon: 'icon-Sql-Call',
    color: '#8F59CA',
  },
  Retriever: {
    icon: 'icon-Retriver',
    color: '#8F59CA',
  },
  Reranker: {
    icon: 'icon-Reranker',
    color: '#8F59CA',
  },
  Wrap: {
    icon: 'icon-Warp',
    color: '#454555',
  },
  Switch: {
    icon: 'icon-Switch',
    color: '#454555',
  },
  Ifs: {
    icon: 'icon-Ifs',
    color: '#454555',
  },
  Loop: {
    icon: 'icon-Loop',
    color: '#454555',
  },
  Template: {
    icon: 'icon-yingyongmoban1',
    color: '#454555',
  },
  ParameterExtractor: {
    icon: 'icon-canshutiquqi1',
    color: '#454555',
  },
}
