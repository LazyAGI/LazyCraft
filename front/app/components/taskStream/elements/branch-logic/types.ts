import type {
  CommonExecutionNodeType as CommonNodeType,
} from '@/app/components/taskStream/types'

import type { currentLanguage } from '@/app/components/taskStream/elements/script/types'

export enum LogicalConnector {
  and = 'and',
}

export type IfElseNodeType = CommonNodeType & {
  logical_operator?: LogicalConnector
  code_language: currentLanguage
  payload__judge_on_full_input?: boolean
}
