import type { ToolNodeType } from './types'

export const validateToolNode = (payload: ToolNodeType) => {
  return true
}

export const convertListToJson = (list: any[] = [], nameKey = 'key', valueKey = 'value') => {
  return list.reduce((accumulator, current) => {
    const key = current[nameKey]
    const value = current[valueKey]
    
    if (key) {
      return {
        ...accumulator,
        [key]: value,
      }
    }
    return accumulator
  }, {})
}
