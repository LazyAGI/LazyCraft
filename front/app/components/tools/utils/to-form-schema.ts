import type { ToolParameterType } from '../types'

/**
 * 将类型字符串转换为表单类型
 * @param type 原始类型字符串
 * @returns 对应的表单类型字符串
 */
const convertTypeToFormType = (type: string) => {
  switch (type) {
    case 'number':
      return 'number-input'
    case 'string':
      return 'text-input'
    default:
      return type
  }
}

/**
 * 将工具参数转换为表单模式
 * @param parameters 工具参数数组
 * @returns 表单模式数组
 */
export const argToFormSchema = (parametersArr: ToolParameterType[]) => {
  if (!parametersArr)
    return []

  const argToFormSchemas = parametersArr.map((parameterObj) => {
    return {
      ...parameterObj,
      variable: parameterObj.name,
      type: convertTypeToFormType(parameterObj.type),
      show_on: [],
      _type: parameterObj.type,
      options: parameterObj.options?.map((option) => {
        return {
          ...option,
          show_on: [],
        }
      }),
      tooltip: parameterObj.human_description,
    }
  })
  return argToFormSchemas
}
