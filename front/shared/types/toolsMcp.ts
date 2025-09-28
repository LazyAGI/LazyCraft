// MCP工具相关类型定义

// 标签项类型
export type TagItem = {
  name: string
  [key: string]: any
}

// MCP列表查询参数
export type McpListParams = {
  page: number
  page_size: number
  search_tags?: string[]
  search_name?: string
  user_id?: string[]
  tool_mode?: (string | number | undefined)[]
  published?: (string | number | undefined)[]
}

// MCP项目数据结构
export type McpItem = {
  id: string
  name: string
  description: string
  icon?: string
  user_name: string
  user_id: string
  tags?: string[]
  enable: boolean
  publish: boolean
  updated_at: string
  created_at?: string
  headers?: Array<{ key: string; value: string }> | Record<string, string> | null // 支持数组和对象两种格式
  http_url?: string | null
  publish_at?: string | null
  publish_type?: string | null
  stdio_arguments?: string
  stdio_command?: string
  stdio_env?: Record<string, string> | null
  tenant_id?: string
  test_state?: string
  timeout?: number
  transport_type?: string
  [key: string]: any
}

// MCP列表响应数据
export type McpListResponse = {
  data: McpItem[]
  page?: number
  page_size?: number
  total?: number
  hasAdditional?: boolean
  [key: string]: any
}

// 删除MCP参数
export type DeleteMcpParams = {
  id: string
}

// 删除MCP响应
export type DeleteMcpResponse = {
  code?: number
  message?: string
  [key: string]: any
}

// 创建/编辑MCP参数
export type CreateUpdateMcpParams = {
  id?: string
  name: string
  description?: string
  icon?: string
  transport_type?: string
  stdio_command?: string
  stdio_arguments?: string
  stdio_env?: Record<string, string>
  http_url?: string
  headers?: Record<string, string>
  timeout?: number
  [key: string]: any
}

// 创建/编辑MCP响应
export type CreateUpdateMcpResponse = {
  id: string | number // 实际返回可能是数字类型的ID
  name: string
  description: string
  created_at: string
  updated_at: string
  enable: boolean
  publish: boolean
  publish_at: string | null
  publish_type: string
  headers: Array<{ key: string; value: string }> | Record<string, string> | null
  http_url: string | null
  icon: string
  stdio_arguments: string | null
  stdio_command: string | null
  stdio_env: Record<string, string> | null
  sync_tools_at: string | null
  tags: string[] // 实际返回是数组格式
  tenant_id: string
  test_state: string
  timeout: number
  transport_type: string
  user_id: string
  user_name: string
  // API 通用响应字段
  code?: number
  message?: string
  [key: string]: any
}

// 检查名称参数
export type CheckNameMcpParams = {
  name: string
  id?: string
}

// 检查名称响应
export type CheckNameMcpResponse = {
  code: number | string
  message: string
  status?: number
  [key: string]: any
}

// 获取MCP工具参数
export type GetMcpParams = {
  mcp_server_id?: string
  [key: string]: any
}

// MCP工具项
export type McpTool = {
  name: string
  description?: string
  inputSchema?: any
  input_schema?: {
    properties?: Record<string, JsonSchemaField>
    required?: string[]
  }
  [key: string]: any
}

// JSON Schema 字段类型
export type JsonSchemaField = {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array'
  description?: string
  default?: any
  enum?: string[]
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  [key: string]: any
}

// 获取MCP工具响应
export type GetMcpResponse = {
  data: McpTool[]
  code?: number
  message?: string
  [key: string]: any
}

// 同步工具参数
export type SyncMcpParams = {
  id: string
  [key: string]: any
}

// 同步工具响应
export type SyncMcpResponse = {
  code?: number
  message?: string
  synced_count?: number
  [key: string]: any
}
// 测试MCP工具响应
export type TestMcpResponse = {
  code?: number
  message?: string
  data?: any
  result?: any
  [key: string]: any
}
