import {
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import type { TextNode } from 'lexical'
import { useLexicalComposerContext as useEditor } from '@lexical/react/LexicalComposerContext'
import { useLexicalEntity } from '../../hooks'
import {
  $createLazyLLMVariableNode,
  LazyLLMVariableDisplayNode,
} from './node'
import { generateLazyLLMVariablePattern, getValidVariables } from './utils'

/**
 * LazyLLM 变量值渲染处理器
 * 负责在编辑器中自动识别和渲染变量值块
 */
const LazyLLMVariableRenderer = ({ validVariables = [] }: { validVariables?: string[] } = {}) => {
  const [editorInstance] = useEditor()

  // LazyLLM 变量匹配模式 - 优化的正则表达式缓存
  const variableMatchPattern = useMemo(() => {
    return new RegExp(generateLazyLLMVariablePattern(), 'i')
  }, [])

  // LazyLLM 编辑器节点验证
  useEffect(() => {
    if (!editorInstance.hasNodes([LazyLLMVariableDisplayNode])) {
      throw new Error(
        'LazyLLM VariableRenderer: LazyLLMVariableDisplayNode 未在编辑器中注册。'
        + '请确保在编辑器配置中包含了 LazyLLMVariableDisplayNode。',
      )
    }
  }, [editorInstance])

  // LazyLLM 变量节点工厂 - 优化的节点创建
  const createLazyLLMVariableDisplayNode = useCallback(
    (sourceTextNode: TextNode): LazyLLMVariableDisplayNode => {
      const variableContent = sourceTextNode.getTextContent()
      return $createLazyLLMVariableNode(variableContent)
    },
    [],
  )

  // LazyLLM 变量文本匹配处理器 - 增强的匹配算法
  const processVariableTextMatch = useCallback((inputText: string) => {
    // 重置正则表达式状态确保准确匹配
    variableMatchPattern.lastIndex = 0

    const matchResult = variableMatchPattern.exec(inputText)

    if (!matchResult)
      return null

    // 提取变量名（去掉花括号）
    const variableName = matchResult[0].slice(1, -1) // 去掉 { 和 }

    // 检查变量是否在有效变量列表中
    const currentValidVariables = validVariables.length > 0 ? validVariables : getValidVariables()
    if (!currentValidVariables.includes(variableName))
      return null

    const matchedLength = matchResult[0].length
    const matchStartPosition = matchResult.index
    const matchEndPosition = matchStartPosition + matchedLength

    return {
      start: matchStartPosition,
      end: matchEndPosition,
    }
  }, [variableMatchPattern, validVariables])

  // LazyLLM 文本实体注册器 - 自动化的变量识别
  useLexicalEntity<LazyLLMVariableDisplayNode>(
    processVariableTextMatch,
    LazyLLMVariableDisplayNode,
    createLazyLLMVariableDisplayNode,
  )

  // 该组件不渲染任何 UI，仅作为功能处理器
  return null
}

// 设置组件显示名称以便调试
LazyLLMVariableRenderer.displayName = 'LazyLLMVariableRenderer'

export default LazyLLMVariableRenderer

// 向后兼容的别名导出
export const VariableValueBlock = LazyLLMVariableRenderer
