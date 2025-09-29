import type { CommonExecutionNodeType as CommonNodeType, InputVar } from '@/app/components/taskStream/types'

export type EntryNodeCategory = CommonNodeType & {
  variables: InputVar[]
}
