import type {
  CommonExecutionNodeType as CommonNodeType,
  ExecutionBlockEnum,
} from '@/app/components/taskStream/types'

export type RepetitionNodeType = CommonNodeType & {
  EntryNodeCategory?: ExecutionBlockEnum
  start_node_id: string
}
