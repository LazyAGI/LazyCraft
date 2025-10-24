/* eslint-disable import/no-mutable-exports */

// 正则表达式常量
const zhRegex = /^[\u4E00-\u9FA5]$/m
export const userEmailValidationRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i
export const VAR_REGEX = /\{\{(#[a-zA-Z0-9_-]{1,50}(\.[a-zA-Z_][a-zA-Z0-9_]{0,29}){1,10}#)\}\}/gi

// 长度限制常量
const MAX_ZN_VAR_NAME_LENGHT = 8
const MAX_EN_VAR_VALUE_LENGHT = 30
export const MAX_VAR_KEY_LENGHT = 30

// 超时时间常量
export const TEXT_GENERATION_TIMEOUT = 60000 * 4

// 工具函数
export const calculateVariableNameLimit = (inputValue: string) => {
  const containsChinese = zhRegex.test(inputValue)
  return containsChinese ? MAX_ZN_VAR_NAME_LENGHT : MAX_EN_VAR_VALUE_LENGHT
}

// API前缀配置
let apiPrefix = ''
let publicApiPrefix = ''
if (process.env.FRONTEND_CORE_API && process.env.FRONTEND_APP_API) {
  apiPrefix = process.env.FRONTEND_CORE_API
  publicApiPrefix = process.env.FRONTEND_APP_API
}
else if (
  globalThis.document?.body?.getAttribute('data-api-prefix')
  && globalThis.document?.body?.getAttribute('data-pubic-api-prefix')
) {
  apiPrefix = globalThis.document.body.getAttribute('data-api-prefix') as string
  publicApiPrefix = globalThis.document.body.getAttribute('data-pubic-api-prefix') as string
}
else {
  apiPrefix = process.env.FRONTEND_CORE_API || '/console/api'
  publicApiPrefix = process.env.FRONTEND_APP_API || '/api'
}

// 导出API前缀
export const API_PREFIX: string = apiPrefix
export const PUBLIC_API_PREFIX: string = publicApiPrefix
export { apiPrefix }
