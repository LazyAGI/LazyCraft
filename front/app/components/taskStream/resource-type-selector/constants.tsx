import type { Resource } from '../types'
import { ResourceClassificationEnum } from './types'

export enum BuiltInResourceEnum {
  Document = 'document',
  SqlManager = 'sql-manager',
  Web = 'web',
  Server = 'server',
}

export enum CustomResourceEnum {
  Custom = 'custom',
}

export enum ToolResourceEnum {
  Tool = 'tool',
  MCP = 'mcp',
}

export const BUILTIN_RESOURCE_TYPES: Resource[] = [
  {
    categorization: ResourceClassificationEnum.Internal,
    type: BuiltInResourceEnum.Document,
    name: BuiltInResourceEnum.Document,
    title: '文档管理',
    title_en: '文档管理',
    description: '文档管理器',
  },
  {
    categorization: ResourceClassificationEnum.Internal,
    type: BuiltInResourceEnum.Server,
    name: BuiltInResourceEnum.Server,
    title: '接口生成',
    title_en: '接口生成',
    description: '将当前画布生成API服务',
  },
  {
    categorization: ResourceClassificationEnum.Internal,
    type: BuiltInResourceEnum.SqlManager,
    name: BuiltInResourceEnum.SqlManager,
    title: '数据库管理',
    title_en: '数据库管理',
    description: '数据库管理器',
  },
]

export const RESOURCE_CLASSIFICATIONS: string[] = [
  ResourceClassificationEnum.Internal, // 内置资源类别
  ResourceClassificationEnum.Custom, // 自定义资源类别
  ResourceClassificationEnum.Tool, // 工具资源类别
]
