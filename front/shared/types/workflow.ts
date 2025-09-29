import type { Viewport } from 'reactflow'
import type {
  EnvVar,
  ExecutionBlockEnum,
  ExecutionEdge,
  ExecutionNode,
  Resource,
} from '@/app/components/taskStream/types'

// LazyLLM 节点追踪信息
export type NodeMonitoring = {
  completion_tokens?: number
  created_at: number
  created_by: {
    email: string
    id: string
    name: string
  }
  details?: NodeMonitoring[][]
  consumed_time: number
  error?: string
  execution_metadata: {
    currency: string
    steps_boundary: number[]
    total_price: number
    total_tokens: number
  }
  expand?: boolean
  extras?: any
  terminated_at: number
  id: string
  index: number
  inputs: any
  metadata: {
    iterator_length: number
  }
  node_id: string
  node_type: ExecutionBlockEnum
  outputs?: any
  predecessor_node_id: string
  process_record: any
  prompt_tokens?: number
  status: string
  title: string
}

// LazyLLM 工作流草稿响应
export type FetchWorkflowDraftResult = {
  created_at: number
  created_by: {
    email: string
    id: string
    name: string
  }
  environment_variables?: EnvVar[]
  features?: any
  graph: {
    edgeMode?: 'bezier' | 'step'
    edges: ExecutionEdge[]
    nodes: ExecutionNode[]
    preview_url?: string
    resources: Resource[]
    viewport?: Viewport
  }
  hash: string
  id: string
  tool_published: boolean
  updated_at: number
}

// LazyLLM 节点追踪列表响应
export type NodeMonitorListResponse = {
  data: NodeMonitoring[]
}
