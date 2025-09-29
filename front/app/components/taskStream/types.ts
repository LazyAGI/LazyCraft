import type {
  Viewport,
  Edge as WorkFlowEdge,
  Node as WorkFlowNode,
} from 'reactflow'
import type { RefObject } from 'react'
import type { BuiltInResourceEnum, CustomResourceEnum, ToolResourceEnum } from './resource-type-selector/constants'
import type { Resolution } from '@/shared/types/app'
import type { Inventory, Tool } from '@/app/components/tools/types'

type ToolDefaultValue = {
  provider_id: string
  provider_type: string
  provider_name: string
  tool_name: string
}

export enum ExecutionBlockEnum {
  Code = 'code',
  FinalNode = 'end',
  Conditional = 'if-else',
  // 功能模块
  ParameterExtractor = 'parameter-extractor',
  QuestionClassifier = 'question-classifier',
  EntryNode = 'start',
  // 基础模型部分
  SubModule = 'sub-module',
  // 控制流
  SwitchCase = 'switch-case',
  Tool = 'tool',
  // 自定义节点
  Universe = 'universe',
}

export type ExecutionBranch = {
  id: string
  label?: string
}

export type CommonExecutionNodeType<T = {}> = {
  // 基本信息
  type: ExecutionBlockEnum
  name: string
  title: string
  title_en?: string
  desc: string
  about?: string
  categorization: string
  icon?: string

  // UI状态
  selected?: boolean
  width?: number
  height?: number

  // 执行状态
  status: boolean
  _executionStatus?: ExecutionNodeStatus
  _singleexecutionStatus?: ExecutionNodeStatus
  _isSingleRun?: boolean
  _isCandidate?: boolean
  _isPacked?: boolean
  _isEntering?: boolean

  // 连接状态
  _connectedSourceHandleIds?: string[]
  _connectedTargetHandleIds?: string[]
  _children?: string[]

  // 迭代相关
  isIterationStart?: boolean
  isInIteration?: boolean
  iteration_id?: string
  _iterationLength?: number
  _iterationIndex?: number

  // 验证状态
  _valid_check_success?: boolean
  _valid_form_success?: boolean

  // 配置信息
  payload__kind: string
  payload__name?: string
  enable_backflow?: boolean
  config__can_run_by_single?: boolean
  config__input_ports?: any[]
  config__output_ports?: any[]
  config__input_shape?: any[]
  config__input_shape_transform?: any
  config__output_shape?: any[]
  config__parameters?: any[]
} & T & Partial<Pick<ToolDefaultValue, 'provider_id' | 'provider_type' | 'provider_name' | 'tool_name'>>

type CommonExecutionEdgeType = {
  // 连接信息
  sourceType: ExecutionBlockEnum
  targetType: ExecutionBlockEnum

  // 状态信息
  _mouseOver?: boolean
  _relatedNodeIsHovering?: boolean
  _runned?: boolean

  // 迭代相关
  isInIteration?: boolean
}
export type PanelProps = {
  getInputVars: (textList: string[]) => InputVar[]
  toVarInputs: (variables: ExecutionVariable[]) => InputVar[]
  executionInputData: Record<string, any>
  executionInputDataRef: RefObject<Record<string, any>>
  setexecutionInputData: (data: Record<string, any>) => void
  runResult: any
}
export type PatentExecutionNodeProps = { isolateNode?: boolean }
export type ExecutionNode<T = {}> = WorkFlowNode<CommonExecutionNodeType<T>>
export type ExecutionNodeProps<T = unknown> = { id: string; data: CommonExecutionNodeType<T> } & PatentExecutionNodeProps
export type ExecutionEdge = WorkFlowEdge<CommonExecutionEdgeType>
export type NodePanelProps<T> = {
  id: string
  data: CommonExecutionNodeType<T>
  panelProps: PanelProps
}

export type ExecutionDataUpdator = {
  nodes: ExecutionNode[]
  edges: ExecutionEdge[]
  viewport: Viewport
}

export type ValueRetriever = string[] // [nodeId, key | obj key path]

export type ExecutionVariable = {
  // 基本信息
  variable: string
  value_selector: ValueRetriever

  // 显示信息
  label?: string | {
    nodeType: ExecutionBlockEnum
    nodeName: string
    variable: string
  }

  // 验证信息
  required?: boolean
}

export type EnvVar = {
  id: string
  name: string
  value: any
  value_type: 'string' | 'number' | 'secret'
}

export enum IInputVarType {
  textInput = 'text-input',
  paragraph = 'paragraph',
  text = 'text', // text input
  number = 'number',
  boolean = 'boolean',
  select = 'select',
  files = 'files',
  json = 'json', // obj, array
  sql = 'sql', // sql input
  contexts = 'contexts', // knowledge retrieval
  iterator = 'iterator', // iteration input
}

export type InputVar = {
  // 基本信息
  type: IInputVarType
  variable: string
  required: boolean

  // 显示信息
  label: string | {
    nodeType: ExecutionBlockEnum
    nodeName: string
    variable: string
  }
  hint?: string

  // 值信息
  default?: string
  options?: string[]
  value_selector?: ValueRetriever

  // 验证信息
  max_length?: number
}

export type ModelConfigType = {
  provider: string
  name: string
  mode: string
  completion_params: Record<string, any>
}

type RolePrefix = {
  user: string
  agent: string
}

export type Ram = {
  role_marker?: RolePrefix
  window: {
    enabled: boolean
    size: number | string | null
  }
}

export enum VariableType {
  string = 'string',
  number = 'number',
  secret = 'secret',
  object = 'object',
  array = 'array',
  arrayString = 'array[string]',
  arrayNumber = 'array[number]',
  arrayObject = 'array[object]',
  arrayFile = 'array[file]',
  file = 'file',
  any = 'any',
}

export type Variable = {
  // 基本信息
  variable: string
  type: VariableType
  required?: boolean

  // 显示信息
  isParagraphBlock?: boolean
  isSelect?: boolean
  options?: string[]

  // 嵌套结构
  children?: Variable[] // if type is obj, has the children struct
}

export type ExecutionNodeOutPutVar = {
  nodeId: string
  title: string
  vars: Variable[]
  isEntryNode?: boolean
}

export type Resource = {
  categorization?: string
  type: BuiltInResourceEnum | CustomResourceEnum | ToolResourceEnum
  title: string
  description?: string
} | any

export type ExecutionNodeDefault<T> = {
  defaultValue: Partial<T>
  getAccessiblePrevNodes: (isChatMode: boolean) => ExecutionBlockEnum[]
  getAccessibleNextNodes: (isChatMode: boolean) => ExecutionBlockEnum[]
  checkValidity: (payload: T, t: any, moreDataForCheckValid?: any) => { isValid: boolean; errorMessage?: string }
}

export type ResourceDefault<T> = {
  defaultValue: Partial<T>
}

export enum ExecutionexecutionStatus {
  Running = 'running',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Stopped = 'stopped',
}

export enum ExecutionNodeStatus {
  NotStart = 'not-start',
  Running = 'running',
  Succeeded = 'succeeded',
  Failed = 'failed',
}

export enum ChangeType {
  changeVarName = 'changeVarName',
}

export type ExtraInfo = {
  type: ChangeType
  payload?: {
    beforeKey: string
    afterKey?: string
  }
}

export type ToolWithProvider = Inventory & {
  tools: Tool[]
}

export type VisionConfig = {
  variable_picker: ValueRetriever
  detail: Resolution
}
