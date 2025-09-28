// 集合类型枚举
export enum ContainerType {
  builtin = 'builtin',
  custom = 'api',
  workflow = 'workflow',
}

// 工具参数类型定义
export type ToolParameterType = {
  label: string
  name: string
  type: string
  human_description: string
  llm_description: string
  form: string
  default: string
  min?: number
  required: boolean
  max?: number
  options?: {
    label: string
    value: string
  }[]
}

// 工具类型定义
export type Tool = {
  label: string
  name: string
  description: any
  author: string
  labels: string[]
  parameters: ToolParameterType[]
}

// 集合类型定义
export type Inventory = {
  id: string
  name: string
  author: string
  description: string
  icon: string
  type: ContainerType
  is_team_authorization: boolean
  allow_delete: boolean
  labels: string[]
  label: string
}
