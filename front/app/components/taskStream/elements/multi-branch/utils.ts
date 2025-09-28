import { ComparisonMethod } from './types'
import { VariableType } from '@/app/components/taskStream/types'
import type { ExecutionBranch as Branch } from '@/app/components/taskStream/types'

export const isOperatorRelatedToEmpty = (operator: ComparisonMethod) => {
  return [ComparisonMethod.empty, ComparisonMethod.notEmpty, ComparisonMethod.isNull, ComparisonMethod.isNotNull].includes(operator)
}

export const isComparisonOperatorNeedTranslate = (operator?: ComparisonMethod) => {
  if (!operator)
    return false

  const operatorsNotNeedingTranslation = [
    ComparisonMethod.equal, ComparisonMethod.notEqual,
    ComparisonMethod.largerThan, ComparisonMethod.largerThanOrEqual,
    ComparisonMethod.lessThan, ComparisonMethod.lessThanOrEqual,
  ]

  return !operatorsNotNeedingTranslation.includes(operator)
}

export const getAvailableOperators = (type?: VariableType) => {
  switch (type) {
    case VariableType.string:
      return [
        ComparisonMethod.contains,
        ComparisonMethod.notContains,
        ComparisonMethod.startWith,
        ComparisonMethod.endWith,
        ComparisonMethod.is,
        ComparisonMethod.isNot,
        ComparisonMethod.empty,
        ComparisonMethod.notEmpty,
      ]
    case VariableType.number:
      return [
        ComparisonMethod.equal,
        ComparisonMethod.notEqual,
        ComparisonMethod.largerThan,
        ComparisonMethod.lessThan,
        ComparisonMethod.largerThanOrEqual,
        ComparisonMethod.lessThanOrEqual,
        ComparisonMethod.empty,
        ComparisonMethod.notEmpty,
      ]
    case VariableType.arrayString:
    case VariableType.arrayNumber:
      return [
        ComparisonMethod.contains,
        ComparisonMethod.notContains,
        ComparisonMethod.empty,
        ComparisonMethod.notEmpty,
      ]
    case VariableType.array:
    case VariableType.arrayObject:
      return [
        ComparisonMethod.empty,
        ComparisonMethod.notEmpty,
      ]
    default:
      return [
        ComparisonMethod.is,
        ComparisonMethod.isNot,
        ComparisonMethod.empty,
        ComparisonMethod.notEmpty,
      ]
  }
}

export const doesOperatorRequireValue = (operator?: ComparisonMethod) => {
  if (!operator)
    return false

  return ![ComparisonMethod.empty, ComparisonMethod.notEmpty, ComparisonMethod.isNull, ComparisonMethod.isNotNull].includes(operator)
}

export const branchNameValid = (branches: Branch[]) => {
  const branchCount = branches.length
  if (branchCount < 2)
    throw new Error('error')

  return branches.map((branch, index) => ({ ...branch, label: branch.id === 'false' ? 'DEFAULT' : `CASE ${index + 1}` }))
}
