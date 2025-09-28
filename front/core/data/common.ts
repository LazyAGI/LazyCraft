// 通用响应结构
export type BaseResponse = any

// 用户信息相关类型
export type UserProfileResult = {
  id: string
  name: string
  tenant?: any
}
export type ITenant = {
  id: string
  name: string
}

export type IWorkspaceResponse = {
  tenants: ITenant[]
}

// API Key 相关类型
export type IApiKeyData = {
  id: string
  api_key: string
  description: string
  expire_date: string
  status: string
  user_id: string
  user_name: string
  created_at: number
  updated_at: number
  tenant_id: string
}

export type IApiResponse = {
  id?: string
  code?: number
  message?: string
  data?: any
  result?: 'success' | 'fail'
}
// AI 工具相关类型
export type AiToolsBody = {
  data: {
    id: number | string
    name: string
    content: string
    inferservice: string
    model_name: string
  }[]
  tenant_id?: string | number
}

export type EnableAiBody = {
  enable: boolean
  tenant_id: string | number
}

// API 响应类型
export type ApiResponse = BaseResponse & {
  code: number
  message?: string
  param?: string
}

// 参数相关类型
export type ParamItem = {
  name: string
  describe: string
  type: string
  required: boolean
}

export type ParamData = {
  input: ParamItem[]
  output: ParamItem[]
}

// AI 代码生成响应
export type CodeAIResponse = {
  message: string
  param?: ParamData
  session?: string
}

// AI 提示词生成响应
export type PromptAIResponse = {
  message: string
  session?: string
}

// 应用项目类型
export type AppItem = {
  id: string
  name: string
  description?: string
  icon?: string
  enable_api: boolean
  enable_api_call: string
  status?: string
  tags?: string[]
  created_by_account: {
    id: string
    name: string
  }
  workflow_updated_at?: string
  engine_status?: string
  [key: string]: any
}

// 模型列表响应
export type ModelListResponse = {
  message: string
  code: number
  data: string[]
}
