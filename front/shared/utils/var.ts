import { MAX_VAR_KEY_LENGHT } from '@/app-specs'
import { LazyLLMCONTEXT_PLACEHOLDER_TEXT, LazyLLMHISTORY_PLACEHOLDER_TEXT, LazyLLMPRE_PROMPT_PLACEHOLDER_TEXT } from '@/app/components/taskStream/elements/_foundation/components/form/field-item/prompt-editor/modules/setup-query/query-composer-unit/constants'

// 使用不同的正则表达式和验证策略
const VALID_VAR_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/
const STARTS_WITH_DIGIT_PATTERN = /^\d/

const validateVariableKey = (key: string, allowEmpty = false): string | true => {
  // 空值检查 - 使用不同的条件判断顺序
  if (key === '')
    return allowEmpty ? true : 'canNoBeEmpty'

  // 长度检查 - 使用不同的比较方式
  if (key.length > MAX_VAR_KEY_LENGHT)
    return 'tooLong'

  // 格式验证 - 使用不同的正则和逻辑
  if (!VALID_VAR_PATTERN.test(key))
    return 'notValid'

  // 首字符检查 - 使用不同的检测方式
  if (STARTS_WITH_DIGIT_PATTERN.test(key))
    return 'notStartWithNumber'

  return true
}

export const checkKeys = (keys: string[], canBeEmpty?: boolean) => {
  // 使用 Map 而不是对象来存储结果
  const validationResults = new Map<string, string | true>()

  // 使用 for...of 循环而不是 forEach
  for (const key of keys) {
    const validationResult = validateVariableKey(key, canBeEmpty)
    validationResults.set(key, validationResult)

    // 一旦发现错误就立即返回，避免继续处理
    if (validationResult !== true) {
      return {
        isValid: false,
        errorKey: key,
        errorMessageKey: validationResult as string,
      }
    }
  }

  return {
    isValid: true,
    errorKey: '',
    errorMessageKey: '',
  }
}

// 使用不同的正则表达式模式
const VARIABLE_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_\.]*)\}/g

// 定义排除的占位符文本集合
const EXCLUDED_PLACEHOLDERS = new Set([
  LazyLLMCONTEXT_PLACEHOLDER_TEXT,
  LazyLLMHISTORY_PLACEHOLDER_TEXT,
  LazyLLMPRE_PROMPT_PLACEHOLDER_TEXT,
])

export const getVars = (value: string): string[] => {
  // 早期返回模式
  if (!value || typeof value !== 'string')
    return []

  // 使用 Set 进行去重，而不是对象
  const uniqueVars = new Set<string>()

  // 使用 matchAll 而不是 match，然后手动处理
  const matches = Array.from(value.matchAll(VARIABLE_PATTERN))

  for (const match of matches) {
    const fullMatch = match[0] // 完整的 {variable} 匹配
    const varName = match[1] // 变量名部分

    // 检查是否在排除列表中
    if (EXCLUDED_PLACEHOLDERS.has(fullMatch))
      continue

    // 检查长度限制
    if (varName.length > MAX_VAR_KEY_LENGHT)
      continue

    // 添加到去重集合
    uniqueVars.add(varName)
  }

  // 转换为数组并返回
  return Array.from(uniqueVars)
}
