import { useContext } from 'react'
import {
  useStore as useZustandStore,
} from 'zustand'
import { createStore } from 'zustand/vanilla'
import { debounce } from 'lodash-es'
import type { Viewport } from 'reactflow'
import type {
  HorizontalHelpLinePosition,
  VerticalHelpLinePosition,
} from './guideStrip/types'
import type {
  EnvVar,
  ExecutionEdge,
  ExecutionNode,
  ToolWithProvider,
} from './types'
import { WorkflowContext } from './scope-context'

type PreviewRunningData = any & {
  ResponseTabActive?: boolean
  resultText?: string
}

type Shape = {
  appId: string
  nodePanelWidth: number
  resourcePanelWidth: number
  runPanelWidth: number
  showSingleRunPanel: boolean
  setShowSingleRunPanel: (showSingleRunPanel: boolean) => void
  workflowLiveData?: PreviewRunningData
  setWorkflowRunningData: (workflowData: PreviewRunningData) => void
  historyWorkflowData?: any
  setHistoryWorkflowData: (historyWorkflowData?: any) => void
  showRunHistory: boolean
  setShowRunHistory: (showRunHistory: boolean) => void
  showFeaturesPanel: boolean
  setShowFeaturesPanel: (showFeaturesPanel: boolean) => void
  helpLineHorizontal?: HorizontalHelpLinePosition
  setHorizontalHelpline: (helpLineHorizontal?: HorizontalHelpLinePosition) => void
  helpLineVertical?: VerticalHelpLinePosition
  setVerticalHelpline: (helpLineVertical?: VerticalHelpLinePosition) => void
  draftUpdatedAt: number
  setDraftUpdatedAt: (draftUpdatedAt: number) => void
  publicationDate: number
  setPublishedAt: (publicationDate: number) => void
  displayInputsPanel: boolean
  setInputsPanelVisible: (displayInputsPanel: boolean) => void
  showMultiTurnDebugPanel: boolean
  setShowMultiTurnDebugPanel: (showMultiTurnDebugPanel: boolean) => void
  inputs: Record<string, string>
  setInputs: (inputs: Record<string, string>) => void
  toolPublished: boolean
  setToolPublished: (toolPublished: boolean) => void
  files: any[]
  setFiles: (files: any[]) => void
  backupDraft?: {
    nodes: ExecutionNode[]
    edges: ExecutionEdge[]
    viewport: Viewport
    features: Record<string, any>
    environmentVariables: EnvVar[]
  }
  setBackupDraft: (backupDraft?: Shape['backupDraft']) => void
  notInitialWorkflow: boolean
  setNotInitialWorkflow: (notInitialWorkflow: boolean) => void
  nodesDefaultConfigs: Record<string, any>
  setNodesDefaultConfigs: (nodesDefaultConfigs: Record<string, any>) => void
  nodeAnimation: boolean
  setNodeAnimation: (nodeAnimation: boolean) => void
  isRestoring: boolean
  setIsRestoring: (isRestoring: boolean) => void
  isHistoryPreviewed: boolean
  setIsHistoryPreviewed: (isHistoryPreviewed: boolean) => void
  debouncedSyncWorkflowDraft: (fn: () => void) => void
  buildInTools: ToolWithProvider[]
  setBuildInTools: (tools: ToolWithProvider[]) => void
  customTools: ToolWithProvider[]
  setCustomTools: (tools: ToolWithProvider[]) => void
  workflowTools: ToolWithProvider[]
  setWorkflowTools: (tools: ToolWithProvider[]) => void
  clipboardElements: ExecutionNode[]
  setClipboardElements: (clipboardElements: ExecutionNode[]) => void
  shortcutsDisabled: boolean
  setShortcutsDisabled: (shortcutsDisabled: boolean) => void
  displayDebugAndPreviewPanel: boolean
  setDebugPreviewPanelVisible: (displayDebugAndPreviewPanel: boolean) => void
  showEnvPanel: boolean
  setShowEnvPanel: (showEnvPanel: boolean) => void
  environmentVariables: EnvVar[]
  setEnvironmentVariables: (environmentVariables: EnvVar[]) => void
  envSecrets: Record<string, string>
  setEnvSecrets: (envSecrets: Record<string, string>) => void
  selection: null | { x1: number; y1: number; x2: number; y2: number }
  setSelection: (selection: Shape['selection']) => void
  controlMode: 'pointer' | 'hand'
  setCommandMode: (controlMode: Shape['controlMode']) => void
  edgeMode: 'bezier' | 'step'
  setEdgeMode: (edgeMode: Shape['edgeMode']) => void
  setEdgeModeFromDraft: (edgeMode?: 'bezier' | 'step') => void // 添加从draft数据设置edgeMode的方法
  optionNode?: ExecutionNode
  setOptionNode: (optionNode?: ExecutionNode) => void
  panelMenu?: {
    top: number
    left: number
  }
  setPanelMenu: (panelMenu: Shape['panelMenu']) => void
  nodeMenu?: {
    top: number
    left: number
    nodeId: string
  }
  setNodeMenu: (nodeMenu: Shape['nodeMenu']) => void
  mousePosition: { pageX: number; pageY: number; elementX: number; elementY: number }
  setMousePosition: (mousePosition: Shape['mousePosition']) => void
  syncWorkflowDraftHash: string
  setSyncWorkflowHash: (hash: string) => void
  showConfirm?: { title: string; desc?: string; onConfirm: () => void }
  setShowConfirm: (showConfirm: Shape['showConfirm']) => void
  nodeConnectingPayload?: { nodeId: string; nodeType: string; handleType: string; handleId: string | null }
  setNodeLinkingPayload: (startConnectingPayload?: Shape['nodeConnectingPayload']) => void
  inProgressNodePayload?: {
    nodeId: string
    nodeData: any
  }
  updateEnteringNodePayload: (inProgressNodePayload?: Shape['inProgressNodePayload']) => void
  isSyncingWorkflowDraft: boolean
  setIsSyncingWorkflowDraft: (isSyncingWorkflowDraft: boolean) => void
  controlPromptEditorRerenderKey: number
  setControlPromptEditorRerenderKey: (controlPromptEditorRerenderKey: number) => void
  initDraftData: Record<string, any>
  patentState: Record<string, any>
  setPatentState: (patentState: Record<string, any>) => void
  instanceState: Record<string, any>
  setInstanceState: (instanceState: Record<string, any>) => void
  universeNodes: any[]
  setUniverseNodes: (universeNodes: any[]) => void
  customResourceTypes: any[] // custom resource types
  setCustomResourceTypes: (customResourceTypes: any[]) => void
  resources: any[]
  setResources: (resources: any[]) => void
  webUrl: string
  serverUrl: string
  workflowStatus: string // start | stop
  costAccount: {
    run_call_num?: number
    run_token_num?: number
    release_call_num?: number
    release_token_num?: number
  } | null
  setCostAccount: (costAccount: Shape['costAccount']) => void
  refreshKey: number
  debugStatus?: string
  setDebugStatus: (debugStatus?: string) => void
}

export const createWorkflowStore = () => {
  return createStore<Shape>(set => ({
    appId: '',
    nodePanelWidth: localStorage.getItem('workflow-node-panel-width') ? parseFloat(localStorage.getItem('workflow-node-panel-width')!) : 584,
    resourcePanelWidth: localStorage.getItem('workflow-resource-panel-width') ? parseFloat(localStorage.getItem('workflow-resource-panel-width')!) : 420,
    runPanelWidth: localStorage.getItem('workflow-run-panel-width') ? parseFloat(localStorage.getItem('workflow-run-panel-width')!) : 420,
    refreshKey: 0,
    debugStatus: undefined,
    setDebugStatus: debugStatus => set(() => ({ debugStatus })),
    showSingleRunPanel: false,
    setShowSingleRunPanel: showSingleRunPanel => set(() => ({ showSingleRunPanel })),
    workflowLiveData: undefined,
    setWorkflowRunningData: workflowLiveData => set(() => ({ workflowLiveData })),
    historyWorkflowData: undefined,
    setHistoryWorkflowData: historyWorkflowData => set(() => ({ historyWorkflowData })),
    showRunHistory: false,
    setShowRunHistory: showRunHistory => set(() => ({ showRunHistory })),
    showFeaturesPanel: false,
    setShowFeaturesPanel: showFeaturesPanel => set(() => ({ showFeaturesPanel })),
    helpLineHorizontal: undefined,
    setHorizontalHelpline: helpLineHorizontal => set(() => ({ helpLineHorizontal })),
    helpLineVertical: undefined,
    setVerticalHelpline: helpLineVertical => set(() => ({ helpLineVertical })),
    draftUpdatedAt: 0,
    setDraftUpdatedAt: draftUpdatedAt => set(() => ({ draftUpdatedAt: draftUpdatedAt ? draftUpdatedAt * 1000 : 0 })),
    publicationDate: 0,
    setPublishedAt: publicationDate => set(() => ({ publicationDate: publicationDate ? publicationDate * 1000 : 0 })),
    displayInputsPanel: false,
    setInputsPanelVisible: displayInputsPanel => set(() => ({ displayInputsPanel })),
    showMultiTurnDebugPanel: false,
    setShowMultiTurnDebugPanel: showMultiTurnDebugPanel => set(() => ({ showMultiTurnDebugPanel })),
    inputs: {},
    setInputs: inputs => set(() => ({ inputs })),
    toolPublished: false,
    setToolPublished: toolPublished => set(() => ({ toolPublished })),
    files: [],
    setFiles: files => set(() => ({ files })),
    backupDraft: undefined,
    setBackupDraft: backupDraft => set(() => ({ backupDraft })),
    notInitialWorkflow: false,
    setNotInitialWorkflow: notInitialWorkflow => set(() => ({ notInitialWorkflow })),
    nodesDefaultConfigs: {},
    setNodesDefaultConfigs: nodesDefaultConfigs => set(() => ({ nodesDefaultConfigs })),
    nodeAnimation: false,
    setNodeAnimation: nodeAnimation => set(() => ({ nodeAnimation })),
    isRestoring: false,
    setIsRestoring: isRestoring => set(() => ({ isRestoring })),
    debouncedSyncWorkflowDraft: debounce((syncWorkflowDraft) => {
      syncWorkflowDraft()
    }, 5000),
    buildInTools: [],
    setBuildInTools: buildInTools => set(() => ({ buildInTools })),
    customTools: [],
    setCustomTools: customTools => set(() => ({ customTools })),
    workflowTools: [],
    setWorkflowTools: workflowTools => set(() => ({ workflowTools })),
    clipboardElements: [],
    setClipboardElements: clipboardElements => set(() => ({ clipboardElements })),
    shortcutsDisabled: false,
    setShortcutsDisabled: shortcutsDisabled => set(() => ({ shortcutsDisabled })),
    displayDebugAndPreviewPanel: false,
    setDebugPreviewPanelVisible: displayDebugAndPreviewPanel => set(() => ({ displayDebugAndPreviewPanel })),
    showEnvPanel: false,
    setShowEnvPanel: showEnvPanel => set(() => ({ showEnvPanel })),
    environmentVariables: [],
    setEnvironmentVariables: environmentVariables => set(() => ({ environmentVariables })),
    envSecrets: {},
    setEnvSecrets: envSecrets => set(() => ({ envSecrets })),
    selection: null,
    setSelection: selection => set(() => ({ selection })),
    controlMode: localStorage.getItem('workflow-operation-mode') === 'pointer' ? 'pointer' : 'hand',
    setCommandMode: (controlMode) => {
      set(() => ({ controlMode }))
      localStorage.setItem('workflow-operation-mode', controlMode)
    },
    edgeMode: 'bezier', // 默认值，将从后端数据中更新
    setEdgeMode: (edgeMode) => {
      set(() => ({ edgeMode }))
    },
    setEdgeModeFromDraft: (edgeMode) => {
      set(() => ({ edgeMode: edgeMode || 'bezier' }))
    },
    optionNode: undefined,
    setOptionNode: optionNode => set(() => ({ optionNode })),
    panelMenu: undefined,
    setPanelMenu: panelMenu => set(() => ({ panelMenu })),
    nodeMenu: undefined,
    setNodeMenu: nodeMenu => set(() => ({ nodeMenu })),
    mousePosition: { pageX: 0, pageY: 0, elementX: 0, elementY: 0 },
    setMousePosition: mousePosition => set(() => ({ mousePosition })),
    syncWorkflowDraftHash: '',
    setSyncWorkflowHash: syncWorkflowDraftHash => set(() => ({ syncWorkflowDraftHash })),
    showConfirm: undefined,
    setShowConfirm: showConfirm => set(() => ({ showConfirm })),
    nodeConnectingPayload: undefined,
    setNodeLinkingPayload: nodeConnectingPayload => set(() => ({ nodeConnectingPayload })),
    inProgressNodePayload: undefined,
    updateEnteringNodePayload: inProgressNodePayload => set(() => ({ inProgressNodePayload })),
    isSyncingWorkflowDraft: false,
    setIsSyncingWorkflowDraft: isSyncingWorkflowDraft => set(() => ({ isSyncingWorkflowDraft })),
    controlPromptEditorRerenderKey: 0,
    setControlPromptEditorRerenderKey: controlPromptEditorRerenderKey => set(() => ({ controlPromptEditorRerenderKey })),
    patentState: {},
    initDraftData: {},
    setPatentState: patentState => set(() => ({ patentState })),
    instanceState: {},
    setInstanceState: instanceState => set(() => ({ instanceState })),
    universeNodes: [],
    setUniverseNodes: universeNodes => set(() => ({ universeNodes })),
    customResourceTypes: [],
    setCustomResourceTypes: customResourceTypes => set(() => ({ customResourceTypes })),
    resources: [],
    setResources: resources => set(() => ({ resources })),
    webUrl: '',
    serverUrl: '',
    workflowStatus: '',
    costAccount: null,
    setCostAccount: costAccount => set(() => ({ costAccount })),
    isHistoryPreviewed: false,
    setIsHistoryPreviewed: isHistoryPreviewed => set(() => ({ isHistoryPreviewed })),
  }))
}

export const shapeSelectors = {
  canRun: (s: Shape) => s.instanceState.debugStatus === 'start',
}

export function useStore<T>(selector: (state: Shape) => T): T {
  const store = useContext(WorkflowContext)
  if (!store)
    throw new Error('缺少 WorkflowContext.Provider，请确保在组件树中提供该上下文')

  return useZustandStore(store, selector)
}

export const useWorkflowStore = () => {
  return useContext(WorkflowContext)!
}
