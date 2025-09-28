import type { CommonExecutionNodeType as CommonNodeType, ExecutionVariable } from '@/app/components/taskStream/types'

export type FinalNodeType = CommonNodeType & {
  outputs: ExecutionVariable[]
}
