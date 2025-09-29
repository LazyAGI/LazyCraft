import type {
  CommonExecutionNodeType,
} from '@/app/components/taskStream/types'
import type { currentLanguage } from '@/app/components/taskStream/elements/script/types'

export enum ComparisonMethod {
  contains = 'contains',
  empty = 'empty',
  endWith = 'end with',
  equal = '=',
  is = 'is',
  isNot = 'is not',
  isNotNull = 'is not null',
  isNull = 'is null',
  largerThan = '>',
  largerThanOrEqual = '≥',
  lessThan = '<',
  lessThanOrEqual = '≤',
  notContains = 'not contains',
  notEmpty = 'not empty',
  notEqual = '≠',
  startWith = 'start with',
}

export type SwitchCaseItem = {
  id: string
  cond?: string
  [key: string]: any
}

export type SwitchCaseNodeType = CommonExecutionNodeType & {
  code_language: currentLanguage
  payload__code?: string
}

export type IfElseNodeType = SwitchCaseNodeType
