import type { ComponentType } from 'react'
import { ExecutionBlockEnum } from '../types'

// LazyLLM基础节点组件
import EntryNode from './initiation'
import EntryPanel from './initiation/panel'
import FinalNode from './conclusion'
import FinalPanel from './conclusion/panel'

// 控制流节点组件
import IfElseNode from './branch-logic'
import IfElsePanel from './branch-logic/panel'
import SwitchCaseNode from './multi-branch'
import SwitchCasePanel from './multi-branch/panel'

// 功能节点组件
import CodePanel from './script/panel'
import ToolNode from './utility'
import ToolPanel from './utility/panel'

// 参数提取器组件
import ParameterExtractorNode from './param-retriever'

// 子模块组件
import BasicModuleSubModule from './basic-module/sub-module'
import SubModulePanel from './basic-module/sub-module/panel'

// 万能节点组件
import UniverseNode from './scope'
import UniversePanel from './scope/panel'

// 节点组件映射表
export const NodeComponentMap: Record<string, ComponentType<any>> = {
  [ExecutionBlockEnum.EntryNode]: EntryNode,
  [ExecutionBlockEnum.FinalNode]: FinalNode,
  [ExecutionBlockEnum.Conditional]: IfElseNode,
  [ExecutionBlockEnum.Tool]: ToolNode,
  [ExecutionBlockEnum.SubModule]: BasicModuleSubModule,
  [ExecutionBlockEnum.Universe]: UniverseNode,
  [ExecutionBlockEnum.SwitchCase]: SwitchCaseNode,
  [ExecutionBlockEnum.ParameterExtractor]: ParameterExtractorNode,
} as const

// 面板组件映射表
export const PanelComponentMap: Record<string, ComponentType<any>> = {
  [ExecutionBlockEnum.EntryNode]: EntryPanel,
  [ExecutionBlockEnum.FinalNode]: FinalPanel,
  [ExecutionBlockEnum.Conditional]: IfElsePanel,
  [ExecutionBlockEnum.Code]: CodePanel,
  [ExecutionBlockEnum.Tool]: ToolPanel,
  [ExecutionBlockEnum.SubModule]: SubModulePanel,
  [ExecutionBlockEnum.Universe]: UniversePanel,
  [ExecutionBlockEnum.SwitchCase]: SwitchCasePanel,
  [ExecutionBlockEnum.ParameterExtractor]: UniversePanel,
} as const

// 可用节点类型列表
export const AVAILABLE_NODE_TYPES = Object.keys(NodeComponentMap) as ExecutionBlockEnum[]

// 可用面板类型列表
export const AVAILABLE_PANEL_TYPES = Object.keys(PanelComponentMap) as ExecutionBlockEnum[]
