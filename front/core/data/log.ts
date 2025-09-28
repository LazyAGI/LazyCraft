import type { Viewport } from 'reactflow'
import type { ExecutionEdge as Edge, ExecutionNode as Node } from '@/app/components/taskStream/types'

export type Reference = {
  id: string
  authorName: string
  created_at?: number
}

// 操作日志请求
export type OperationLogsRequest = {
  page: number
  per_page: number
  organization_id?: string
  start_date?: string
  end_date?: string
  details?: string
}

// 操作日志响应
export type OperationLogsResponse = {
  result: {
    data: any[]
    total: number
  }
}

// 工作流运行详情响应
export type WorkflowxEcutionDetailResponse = {
  created_at: number
  created_by_account?: {
    id: string
    name: string
    email: string
  }
  created_by_end_user?: {
    id: string
    type: 'browser' | 'service_api'
    is_anonymous: boolean
    session_id: string
  }
  created_by_role: 'account' | 'end_user'
  detail_error?: string
  consumed_time?: number
  error?: string
  terminated_at: number
  graph: {
    nodes: Node[]
    edges: Edge[]
    viewport?: Viewport
  }
  id: string
  input_files?: Array<{ url: string }>
  inputs: string
  outputs?: string
  sequence_number: number
  status: 'running' | 'succeeded' | 'failed' | 'stopped'
  total_steps: number
  total_tokens?: number
  version: string
}
