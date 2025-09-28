export type ConditionType = {
  variable_name: string
  value: string
  id: string
  operator: string
  conjunction?: 'and' | 'or'
}

export type WhileLoopCondition = {
  conjunction?: 'and' | 'or'
  variable_name: string
  id: string
  operator: string
  value: string | number
}

export type ValidationError = {
  id: string
  message: string
  field: string
}

type ValidateResult = {
  validateStatus: 'success' | 'error'
  help: string
  errors: ValidationError[]
}
