import type { NodeMonitoring } from '@/shared/types/workflow'
import type { ExecutionexecutionStatus as WorkflowexecutionStatus } from '@/app/components/taskStream/types'
// 工作流处理的类型定义
export type WorkflowExecution = {
  status: WorkflowexecutionStatus
  tracing: NodeMonitoring[]
  expand?: boolean
  resultText?: string
}
