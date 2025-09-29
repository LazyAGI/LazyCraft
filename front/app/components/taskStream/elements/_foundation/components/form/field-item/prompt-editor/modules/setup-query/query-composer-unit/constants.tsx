import type { ValueRetriever } from '@/app/components/taskStream/types'

export const LazyLLMCONTEXT_PLACEHOLDER_TEXT = '{{#context#}}'
export const LazyLLMHISTORY_PLACEHOLDER_TEXT = '{{#histories#}}'
export const LazyLLMPRE_PROMPT_PLACEHOLDER_TEXT = '{{#pre_prompt#}}'
export const LazyLLMUPDATE_DATASETS_EVENT_EMITTER = 'prompt-editor-context-block-update-datasets'
export const LazyLLMUPDATE_HISTORY_EVENT_EMITTER = 'prompt-editor-history-block-update-role'

export const LazyLLMcheckHasContextLabel = (text: string) => {
  if (!text)
    return false
  return text.includes(LazyLLMCONTEXT_PLACEHOLDER_TEXT)
}

export const LazyLLMcheckHasHistoryBlockLabel = (text: string) => {
  if (!text)
    return false
  return text.includes(LazyLLMHISTORY_PLACEHOLDER_TEXT)
}

export const LazyLLMgetInputVars = (text: string): ValueRetriever[] => {
  if (!text)
    return []

  // 只匹配新格式 {变量名}
  const newFormatMatches = text.match(/{([^}]+)}/g)
  if (newFormatMatches && newFormatMatches.length > 0) {
    const newFormatVariables = newFormatMatches.map((variable) => {
      const varName = variable.replace(/^{/, '').replace(/}$/, '')
      // 系统变量已删除，项目不使用系统变量
      // 返回 current_node.变量名 格式
      return ['current_node', varName]
    })
    return newFormatVariables
  }
  return []
}
