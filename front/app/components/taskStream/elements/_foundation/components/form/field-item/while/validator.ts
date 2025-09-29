import type { ConditionType, ValidationError, WhileLoopCondition } from './types'

export const validateCondition = (condition: WhileLoopCondition, nameSet?: Set<string>): ValidationError[] => {
  const errors: ValidationError[] = []

  if (!condition.variable_name) {
    errors.push({
      id: condition.id,
      field: 'variable_name',
      message: '请选择变量名',
    })
  }
  else if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(condition.variable_name)) {
    errors.push({
      id: condition.id,
      field: 'variable_name',
      message: '变量名只能包含字母、数字和下划线, 且不能以数字开头',
    })
  }
  else if (nameSet && !nameSet.has(condition.variable_name)) {
    errors.push({
      id: condition.id,
      field: 'variable_name',
      message: '请重新选择',
    })
  }

  if (!condition.operator) {
    errors.push({
      id: condition.id,
      field: 'operator',
      message: '请选择运算符',
    })
  }

  if (!condition.value && condition.value !== 0) {
    errors.push({
      id: condition.id,
      field: 'value',
      message: '请输入值',
    })
  }

  return errors
}

export const validateWhileLoop = (conditions: ConditionType[], payload): ValidationError[] => {
  const nameSet = new Set<string>(payload?.config__input_shape?.map(item => item.variable_name) || [])
  return conditions.flatMap((condition) => {
    return validateCondition(condition, nameSet)
  })
}
