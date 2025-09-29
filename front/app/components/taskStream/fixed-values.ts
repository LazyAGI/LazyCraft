import type { Variable as ExecutionVar } from './types'
import { ExecutionBlockEnum, VariableType } from './types'
import EntryNodeDefaults from './elements/initiation/default'
import NodeDefault from './elements/query-categorizer/default'
import IfElseDefault from './elements/branch-logic/default'
import CodeDefault from './elements/script/default'
import ToolDefault from './elements/utility/default'
import FinalNodeDefault from './elements/conclusion/default'
import SubModuleDefault from './elements/basic-module/sub-module/default'
import UniverseDefault from './elements/scope/default'
import SwitchCaseDefault from './elements/multi-branch/default'
import parameterExtractorDefaults from './elements/param-retriever/default'
import DocumentResourceDefault from './resources/builtin/document/default'
import ServerResourceDefault from './resources/builtin/server/default'
import WebResourceDefault from './resources/builtin/web/default'
import SqlResourceDefault from './resources/builtin/sql-manager/default'
import CustomResourceDefault from './resources/custom/default'
import ToolResourceDefault from './resources/tool/default'
import { BuiltInResourceEnum, CustomResourceEnum, ToolResourceEnum } from '@/app/components/taskStream/resource-type-selector/constants'
import { SwitchCaseAggregatorBind } from '@/infrastructure/api/universeNodes/AggregatorBind'

type NodeMetadata = {
  author: string
  about: string
  checkValidity: any
  availablePrevNodes: ExecutionBlockEnum[]
  availableNextNodes: ExecutionBlockEnum[]
  getAccessiblePrevNodes: (isChatMode: boolean) => ExecutionBlockEnum[]
  getAccessibleNextNodes: (isChatMode: boolean) => ExecutionBlockEnum[]
}

const createNodeMetadata = (
  author: string,
  about: string,
  getPrevNodes: any,
  getNextNodes: any,
  checkValidity: any,
): NodeMetadata => ({
  author,
  about,
  availablePrevNodes: [],
  availableNextNodes: [],
  getAccessiblePrevNodes: getPrevNodes,
  getAccessibleNextNodes: getNextNodes,
  checkValidity,
})

const createSystemNodeMetadata = (
  getPrevNodes: any,
  getNextNodes: any,
  checkValidity: any,
) => createNodeMetadata('System__', '', getPrevNodes, getNextNodes, checkValidity)

const createCustomNodeMetadata = (
  author: string,
  getPrevNodes: any,
  getNextNodes: any,
  checkValidity: any,
) => createNodeMetadata(author, '', getPrevNodes, getNextNodes, checkValidity)

export const NODES_EXTRA_DATA: Record<ExecutionBlockEnum, NodeMetadata> = {
  [ExecutionBlockEnum.EntryNode]: createSystemNodeMetadata(
    EntryNodeDefaults.getAccessiblePrevNodes,
    EntryNodeDefaults.getAccessibleNextNodes,
    EntryNodeDefaults.checkValidity,
  ),
  [ExecutionBlockEnum.FinalNode]: createSystemNodeMetadata(
    FinalNodeDefault.getAccessiblePrevNodes,
    FinalNodeDefault.getAccessibleNextNodes,
    FinalNodeDefault.checkValidity,
  ),
  [ExecutionBlockEnum.Conditional]: createSystemNodeMetadata(
    IfElseDefault.getAccessiblePrevNodes,
    IfElseDefault.getAccessibleNextNodes,
    IfElseDefault.checkValidity,
  ),
  [ExecutionBlockEnum.Code]: createSystemNodeMetadata(
    CodeDefault.getAccessiblePrevNodes,
    CodeDefault.getAccessibleNextNodes,
    CodeDefault.checkValidity,
  ),
  [ExecutionBlockEnum.QuestionClassifier]: createSystemNodeMetadata(
    NodeDefault.getAccessiblePrevNodes,
    NodeDefault.getAccessibleNextNodes,
    NodeDefault.checkValidity,
  ),
  [ExecutionBlockEnum.Tool]: createSystemNodeMetadata(
    ToolDefault.getAccessiblePrevNodes,
    ToolDefault.getAccessibleNextNodes,
    ToolDefault.checkValidity,
  ),
  [ExecutionBlockEnum.SubModule]: createSystemNodeMetadata(
    SubModuleDefault.getAccessiblePrevNodes,
    SubModuleDefault.getAccessibleNextNodes,
    SubModuleDefault.checkValidity,
  ),
  [ExecutionBlockEnum.Universe]: createCustomNodeMetadata(
    'smat',
    UniverseDefault.getAccessiblePrevNodes,
    UniverseDefault.getAccessibleNextNodes,
    UniverseDefault.checkValidity,
  ),
  [ExecutionBlockEnum.SwitchCase]: createCustomNodeMetadata(
    'smat',
    SwitchCaseDefault.getAccessiblePrevNodes,
    SwitchCaseDefault.getAccessibleNextNodes,
    SwitchCaseDefault.checkValidity,
  ),
  [ExecutionBlockEnum.ParameterExtractor]: createSystemNodeMetadata(
    parameterExtractorDefaults.getAccessiblePrevNodes,
    parameterExtractorDefaults.getAccessibleNextNodes,
    parameterExtractorDefaults.checkValidity,
  ),
}

const filterAvailableBlocks = (excludeBlocks: ExecutionBlockEnum[]) =>
  Object.keys(NODES_EXTRA_DATA).filter(key => !excludeBlocks.includes(key as ExecutionBlockEnum)) as ExecutionBlockEnum[]

export const ALL_CHAT_ENABLED_BLOCKS = filterAvailableBlocks([ExecutionBlockEnum.FinalNode, ExecutionBlockEnum.EntryNode])
export const ALL_COMPLETION_AVAILABLE_BLOCKS = filterAvailableBlocks([ExecutionBlockEnum.EntryNode])

const createBaseNodeData = (type: ExecutionBlockEnum, title: string, desc: string, defaultValue: any) => ({
  type,
  title,
  desc,
  ...defaultValue,
})

const createAggregatorConfig = (title: string, desc: string) => ({
  ...SwitchCaseAggregatorBind,
  title,
  desc,
  createWithIntention: true,
})

const createIntentionNodeData = (
  type: ExecutionBlockEnum,
  title: string,
  desc: string,
  defaultValue: any,
  aggregatorTitle: string,
  aggregatorDesc: string,
) => ({
  ...createBaseNodeData(type, title, desc, defaultValue),
  _createAggregator: true,
  _aggregatorConfig: createAggregatorConfig(aggregatorTitle, aggregatorDesc),
  linkNodeId: '',
})

export const NODES_INITIAL_DATA: any = {
  [ExecutionBlockEnum.EntryNode]: createBaseNodeData(
    ExecutionBlockEnum.EntryNode,
    '',
    '',
    EntryNodeDefaults.defaultValue,
  ),
  [ExecutionBlockEnum.FinalNode]: createBaseNodeData(
    ExecutionBlockEnum.FinalNode,
    '',
    '',
    FinalNodeDefault.defaultValue,
  ),
  [ExecutionBlockEnum.Conditional]: createIntentionNodeData(
    ExecutionBlockEnum.Conditional,
    '',
    '',
    IfElseDefault.defaultValue,
    '条件分支聚合器',
    '聚合条件分支的结果',
  ),
  [ExecutionBlockEnum.Code]: {
    ...createBaseNodeData(
      ExecutionBlockEnum.Code,
      '',
      '',
      CodeDefault.defaultValue,
    ),
    code_language: 'python3',
    variables: [],
    outputs: [],
    code: '',
  },
  [ExecutionBlockEnum.QuestionClassifier]: createIntentionNodeData(
    ExecutionBlockEnum.QuestionClassifier,
    '',
    '',
    NodeDefault.defaultValue,
    '意图识别聚合器',
    '聚合多个意图分支的结果',
  ),
  [ExecutionBlockEnum.Tool]: createBaseNodeData(
    ExecutionBlockEnum.Tool,
    '',
    '',
    ToolDefault.defaultValue,
  ),
  [ExecutionBlockEnum.SubModule]: {
    ...createBaseNodeData(
      ExecutionBlockEnum.SubModule,
      '',
      '',
      SubModuleDefault.defaultValue,
    ),
    variables: [],
    code_language: 'python3',
    code: '',
    outputs: [],
  },
  [ExecutionBlockEnum.Universe]: createBaseNodeData(
    ExecutionBlockEnum.Universe,
    '',
    '',
    UniverseDefault.defaultValue,
  ),
  [ExecutionBlockEnum.SwitchCase]: createIntentionNodeData(
    ExecutionBlockEnum.SwitchCase,
    '',
    '',
    SwitchCaseDefault.defaultValue,
    '多路选择聚合器',
    '聚合多路选择的结果',
  ),
  [ExecutionBlockEnum.ParameterExtractor]: createBaseNodeData(
    ExecutionBlockEnum.ParameterExtractor,
    '',
    '',
    parameterExtractorDefaults.defaultValue,
  ),
}

const createResourceData = (type: any, title: string, desc: string, defaultValue: any) => ({
  type,
  title,
  desc,
  ...defaultValue,
})

export const RESOURCE_INITIAL_DATA = {
  [BuiltInResourceEnum.Document]: createResourceData(
    BuiltInResourceEnum.Document,
    '',
    '',
    DocumentResourceDefault.defaultValue,
  ),
  [BuiltInResourceEnum.Web]: createResourceData(
    BuiltInResourceEnum.Web,
    '',
    '',
    WebResourceDefault.defaultValue,
  ),
  [BuiltInResourceEnum.Server]: createResourceData(
    BuiltInResourceEnum.Server,
    '',
    '',
    ServerResourceDefault.defaultValue,
  ),
  [BuiltInResourceEnum.SqlManager]: createResourceData(
    BuiltInResourceEnum.SqlManager,
    '',
    '',
    SqlResourceDefault.defaultValue,
  ),
  [CustomResourceEnum.Custom]: createResourceData(
    CustomResourceEnum.Custom,
    '',
    '',
    CustomResourceDefault.defaultValue,
  ),
  [ToolResourceEnum.Tool]: createResourceData(
    ToolResourceEnum.Tool,
    '',
    '',
    ToolResourceDefault.defaultValue,
  ),
  [ToolResourceEnum.MCP]: createResourceData(
    ToolResourceEnum.MCP,
    '',
    '',
    ToolResourceDefault.defaultValue,
  ),
  [ExecutionBlockEnum.ParameterExtractor]: createResourceData(
    ExecutionBlockEnum.ParameterExtractor,
    '',
    '',
    parameterExtractorDefaults.defaultValue,
  ),
}

export const NODE_WIDTH = 240
export const X_OFFSET_NUM = 60
export const NODE_WIDTH_AND_X_OFFSET = NODE_WIDTH + X_OFFSET_NUM
export const Y_OFFSET_NUM = 39
export const MAX_TREE_level = 50
export const START_INITIAL_POSITION_POINT = { x: 80, y: 282 }
export const END_INITIAL_POSITION = { x: 850, y: 282 }
export const AUTO_LAYOUT_OFFSET_POINT = { x: -42, y: 243 }
export const Z_INDEX_OF_ITERATION_NODE = 1
export const Z_INDEX_OF_ITERATION_CHILDREN = 1002
export const ITERATION_NODE_PADDING = {
  top: 85,
  left: 16,
  right: 16,
  bottom: 20,
}

export const SUPPORT_OUTPUT_VARS_NODES = [
  ExecutionBlockEnum.EntryNode, ExecutionBlockEnum.Code, ExecutionBlockEnum.Tool, ExecutionBlockEnum.QuestionClassifier,
  ExecutionBlockEnum.ParameterExtractor,
]

export const TOOL_OUTPUT_STRUCTS: ExecutionVar[] = [
  {
    type: VariableType.string,
    variable: 'text',
  },
  {
    type: VariableType.arrayFile,
    variable: 'files',
  },
  {
    type: VariableType.arrayObject,
    variable: 'json',
  },
]

export const PARAMETER_EXTRACTOR_COMMON_STRUCTS: ExecutionVar[] = [
  {
    type: VariableType.number,
    variable: '__is_success',
  },
  {
    type: VariableType.string,
    variable: '__reason',
  },
]

export const WORKFLOW_DATA_UPDATE_EVENT = 'WORKFLOW_DATA_UPDATE'
export const CUSTOM_NODE_TYPE = 'custom'
export const DSL_EXPORT_CHECK_EVENT = 'DSL_EXPORT_CHECK'

export const NODE_NAME_FIELD = 'payload__name'

export const BranchNodeTypes = ['Ifs', 'Switch', 'Intention']
