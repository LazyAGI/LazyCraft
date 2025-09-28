import type { CommonExecutionNodeType as CommonNodeType } from '@/app/components/taskStream/types'

export type UniverseNodeType = CommonNodeType & {
  name: string
  style?: any
  [key: string]: any
}
