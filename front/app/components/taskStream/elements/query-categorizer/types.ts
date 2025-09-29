import { ComparisonMethod } from '../multi-branch/types'
import type {
  CommonExecutionNodeType,
  ModelConfigType,
  Ram,
  ValueRetriever,
} from '@/app/components/taskStream/types'

// Re-export ComparisonMethod for convenience
export { ComparisonMethod }

export type ClassificationCase = {
  id: string
  cond?: string
  [key: string]: any
}

export type QuestionClassifierNodeType = CommonExecutionNodeType & {
  query_variable_selector: ValueRetriever
  model: ModelConfigType
  instruction: string
  memory?: Ram
  code_language?: string
}
