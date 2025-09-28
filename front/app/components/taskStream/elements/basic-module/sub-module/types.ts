import type { CommonExecutionNodeType } from '@/app/components/taskStream/types'

export type SubModuleNodeType = CommonExecutionNodeType & {
  [key: string]: any
  patent_data: any
  payload__patent_id: string | undefined
}
