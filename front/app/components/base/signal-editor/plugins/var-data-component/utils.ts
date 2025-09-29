/**
 * LazyLLM 变量模式匹配工具集
 * 提供优化的正则表达式和变量识别功能
 */

// 存储有效变量列表
let _validVariables: string[] = ['query']

/**
 * 更新有效变量列表
 * @param variables 新的有效变量列表
 */
export function setValidVariables(variables: string[]) {
  const cleaned = Array.isArray(variables)
    ? variables.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    : []
  _validVariables = cleaned.length > 0 ? cleaned : ['query']
}

/**
 * 获取当前有效变量列表
 * @returns 有效变量列表
 */
export function getValidVariables(): string[] {
  return [..._validVariables]
}

/**
 * LazyLLM 变量标识符模式生成器
 * 生成用于匹配 LazyLLM 变量语法的正则表达式字符串
 * 支持格式: {variable_name} 或 {camelCaseVariable}
 *
 * @returns 优化的正则表达式模式字符串
 */
export function generateLazyLLMVariablePattern(): string {
  // LazyLLM 变量命名规则:
  // - 必须以字母或下划线开头
  // - 可包含字母、数字、下划线
  // - 长度限制在1-50个字符之间（优化性能）
  // - 支持驼峰命名和下划线命名
  const lazyLLMVariableRegex = '\\{[a-zA-Z_][a-zA-Z0-9_]{0,49}\\}'

  return lazyLLMVariableRegex
}

/**
 * LazyLLM 变量验证器
 * 验证给定文本是否符合 LazyLLM 变量命名规范
 *
 * @param variableText 待验证的变量文本
 * @returns 是否为有效的 LazyLLM 变量格式
 */
export function validateLazyLLMVariable(variableText: string): boolean {
  if (!variableText || typeof variableText !== 'string')
    return false

  const validationPattern = new RegExp(`^${generateLazyLLMVariablePattern()}$`, 'i')
  return validationPattern.test(variableText)
}

/**
 * LazyLLM 变量提取器
 * 从文本中提取所有有效的 LazyLLM 变量
 *
 * @param inputText 输入文本
 * @returns 提取到的变量数组
 */
export function extractLazyLLMVariables(inputText: string): string[] {
  if (!inputText)
    return []

  const extractionPattern = new RegExp(generateLazyLLMVariablePattern(), 'gi')
  const matches = inputText.match(extractionPattern)

  return matches || []
}

// 向后兼容的别名导出
export const getHashtagRegexString = generateLazyLLMVariablePattern
