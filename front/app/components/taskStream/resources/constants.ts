import type { ComponentType } from 'react'
// 自定义资源
import CustomResourcePanel from './custom/panel'
import CustomResourceSelector from './custom/selector'
// 工具资源
import ToolResourcePanel from './tool/panel'
import ToolResourceSelector from './tool/selector'
// MCP工具资源
import McpResourcePanel from './mcp/panel'
// Sql
import SqlManagerResourcePanel from './builtin/sql-manager/panel'
import SqlManagerResourceSelector from './builtin/sql-manager/selector'
// Web
import WebResourcePanel from './builtin/web/panel'
import WebResourceSelector from './builtin/web/selector'
// Server
import ServerResourcePanel from './builtin/server/panel'
import ServerResourceSelector from './builtin/server/selector'
// Document
import DocumentResourcePanel from './builtin/document/panel'
import DocumentResourceSelector from './builtin/document/selector'
import { BuiltInResourceEnum, CustomResourceEnum, ToolResourceEnum } from '@/app/components/taskStream/resource-type-selector/constants'
export const ResourcePanelComponentMap: Record<string, ComponentType<any>> = {
  [BuiltInResourceEnum.Document]: DocumentResourcePanel,
  [BuiltInResourceEnum.SqlManager]: SqlManagerResourcePanel,
  [BuiltInResourceEnum.Server]: ServerResourcePanel,
  [BuiltInResourceEnum.Web]: WebResourcePanel,
  [CustomResourceEnum.Custom]: CustomResourcePanel,
  [ToolResourceEnum.Tool]: ToolResourcePanel,
  [ToolResourceEnum.MCP]: McpResourcePanel,
}

export const ResourceSelectorComponentMap = {
  [BuiltInResourceEnum.Document]: DocumentResourceSelector,
  [BuiltInResourceEnum.SqlManager]: SqlManagerResourceSelector,
  [BuiltInResourceEnum.Web]: WebResourceSelector,
  [BuiltInResourceEnum.Server]: ServerResourceSelector,
  [CustomResourceEnum.Custom]: CustomResourceSelector,
  [ToolResourceEnum.Tool]: ToolResourceSelector,
}
