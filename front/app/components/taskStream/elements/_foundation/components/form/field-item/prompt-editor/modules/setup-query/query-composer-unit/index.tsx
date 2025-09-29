'use client'

import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  EditorState,
} from 'lexical'
import {
  $getRoot,
  TextNode,
} from 'lexical'
import { CodeNode } from '@lexical/code'
import { LexicalComposer as EditorComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin as RichText } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable as Editable } from '@lexical/react/LexicalContentEditable'
import ErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { OnChangePlugin as OnChange } from '@lexical/react/LexicalOnChangePlugin'
import { convertTaskStreamTextToState } from './utils'
import type {
  PulseUnit,
  VariableUnit,
} from './types'
import Placeholder from '@/app/components/base/signal-editor/plugins/placeholder'

import {
  WorkflowVariableBlockReplacementBlock as WorkflowVarBlockReplacer,
  WorkflowVariableBlock,
  WorkflowVariableBlockNode as WorkflowVariableBlockTreeNode,
} from '@/app/components/base/signal-editor/plugins/workflow-var-component'
import VariablePanel from '@/app/components/base/signal-editor/plugins/var-component'
import VariableValueBlock from '@/app/components/base/signal-editor/plugins/var-data-component'
import { VariableDataBlockNode } from '@/app/components/base/signal-editor/plugins/var-data-component/node'
import { RichTextNode } from '@/app/components/base/signal-editor/plugins/rich-text/node'
import BlurEventBlock from '@/app/components/base/signal-editor/plugins/on-blur-or-focus-component'
import PatchBlock from '@/app/components/base/signal-editor/plugins/patch-block'
import ComponentSelectorBlock from '@/app/components/base/signal-editor/plugins/component-picker-component'

type PromptEditorItemProps = {
  dense?: boolean
  className?: string
  placeholder?: string
  placeholderCls?: string
  style?: React.CSSProperties
  value?: string
  editable?: boolean
  onChange?: (text: string) => void
  onBlur?: () => void
  onFocus?: () => void
  LazyLLMvariableBlock?: VariableUnit
  LazyLLMworkflowVariableBlockType?: PulseUnit
}

const PromptEditorItem: FC<PromptEditorItemProps> = ({
  dense,
  className,
  placeholder,
  placeholderCls,
  style,
  value,
  editable = true,
  onChange,
  onBlur,
  onFocus,
  LazyLLMvariableBlock,
  LazyLLMworkflowVariableBlockType,
}) => {
  const [instanceKey, setInstanceKey] = useState<string>('prompt-editor-item')
  const [initialConfig, setInitialConfig] = useState<any>({})
  const [editorValue, setEditorValue] = useState<string>('')

  // 使用 ref 来跟踪是否正在处理编辑器变化，避免循环更新
  const isProcessingChangeRef = useRef(false)
  const lastProcessedValueRef = useRef<string>('')
  const prevValueRef = useRef<string>('')

  // 缓存有效变量列表
  const validVariables = useMemo(() => {
    const vars = LazyLLMvariableBlock?.variables?.map(v => v.value)
    const workflowVars = LazyLLMworkflowVariableBlockType?.variables?.flatMap(v => v.vars?.map(varItem => varItem.variable) || [])
    const allVars = [...(vars || []), ...(workflowVars || [])]
    return allVars.length > 0 ? allVars : ['query']
  }, [LazyLLMvariableBlock?.variables, LazyLLMworkflowVariableBlockType?.variables])

  // 注意：setValidVariables 函数在当前版本的 utils 中不存在
  // 变量验证逻辑已集成到组件内部处理

  // 处理初始配置和值更新
  useEffect(() => {
    // 避免在处理编辑器变化时更新配置
    if (isProcessingChangeRef.current)
      return

    const processedValue = value?.split('||output_format_split||')[0] || ''

    // 只有当值真正发生变化时才更新
    if (prevValueRef.current !== value) {
      prevValueRef.current = value || ''

      setInitialConfig({
        editorState: convertTaskStreamTextToState(processedValue),
      })

      // 只有当外部传入的值与当前编辑器值真正不同时才更新
      if (String(value) !== String(editorValue) && value !== lastProcessedValueRef.current) {
        setEditorValue(value || '')
        setInstanceKey(`prompt-editor-item_${Math.random().toString(36).slice(2, 9)}`)
      }
    }
  }, [value, editorValue]) // 添加 editorValue 依赖

  const handleEditorChange = useCallback((editorState: EditorState) => {
    // 设置标志，表示正在处理编辑器变化
    isProcessingChangeRef.current = true

    const text = editorState.read(() => {
      return $getRoot().getChildren().map(p => p.getTextContent()).join('\n')
    })

    // 处理非变量的花括号
    let processedText = text

    // 找出所有花括号对，但排除已转义的花括号
    type BracketPair = {
      full: string
      content: string
      start: number
      end: number
    }

    const bracketPairs: BracketPair[] = []

    // 识别LaTeX表达式的正则表达式
    const latexRegex = /(\$\$[\s\S]*?\$\$)|(\$[\s\S]*?\$)|(\$\$[^\$]*)|(\$[^\$]*)/g
    const latexMatches: Array<{ start: number; end: number }> = []

    // 先找出所有LaTeX表达式的位置
    let latexMatch: RegExpExecArray | null
    // eslint-disable-next-line no-cond-assign
    while ((latexMatch = latexRegex.exec(text)) !== null) {
      latexMatches.push({
        start: latexMatch.index,
        end: latexMatch.index + latexMatch[0].length,
      })
    }

    // 检查一个位置是否在任何LaTeX表达式内
    const isInsideLatex = (position: number): boolean => {
      return latexMatches.some(match => position >= match.start && position < match.end)
    }

    // 使用更精确的方法检测花括号
    // 1. 先匹配已转义的双花括号（避免重复转义）
    const escapedBracketRegex = /\{\{([^{}]*)\}\}/g
    const escapedMatches: Array<{ start: number; end: number }> = []

    let escapedMatch: RegExpExecArray | null
    // eslint-disable-next-line no-cond-assign
    while ((escapedMatch = escapedBracketRegex.exec(text)) !== null) {
      escapedMatches.push({
        start: escapedMatch.index,
        end: escapedMatch.index + escapedMatch[0].length,
      })
    }

    // 检查一个位置是否在已转义的花括号内
    const isInsideEscapedBracket = (position: number): boolean => {
      return escapedMatches.some(match => position >= match.start && position < match.end)
    }

    // 2. 再匹配普通的单花括号和变量花括号
    const allBracketRegex = /(\$\{([^{}]*)\})|(\{([^{}]*)\})/g
    let matchResult: RegExpExecArray | null

    // eslint-disable-next-line no-cond-assign
    while (matchResult = allBracketRegex.exec(text)) {
      const start = matchResult.index

      // 如果这个括号在LaTeX表达式内或已转义花括号内，跳过它
      if (isInsideLatex(start) || isInsideEscapedBracket(start))
        continue

      // 判断是哪种括号匹配，并正确提取内容
      const isBracketMatch = matchResult[3] !== undefined
      const content = isBracketMatch ? matchResult[4] : matchResult[2]

      bracketPairs.push({
        full: matchResult[0],
        content: content || '',
        start,
        end: start + matchResult[0].length,
      })
    }

    // 检查每对花括号是否是有效变量
    if (bracketPairs.length > 0) {
      // 从后向前处理，避免索引变化问题
      for (let i = bracketPairs.length - 1; i >= 0; i--) {
        const pair = bracketPairs[i]

        // 检查是否是有效变量 - 使用当前的 validVariables 列表
        const isValidVariable = validVariables.includes(pair.content.trim())
        if (!isValidVariable) {
          // 非有效变量，进行转义（由于前面已经过滤了转义的花括号，这里不需要再检查）
          const before = processedText.substring(0, pair.start)
          const escaped = pair.full.replace('{', '{{').replace('}', '}}')
          const after = processedText.substring(pair.end)
          processedText = before + escaped + after
        }
      }
    }

    // 处理换行符前后的花括号：{\n 和 \n} 直接转义，但排除已转义的情况
    // 先找出所有已转义的花括号位置
    const newlineEscapedBracketRegex = /\{\{([^{}]*)\}\}/g
    const newlineEscapedMatches: Array<{ start: number; end: number }> = []

    let newlineEscapedMatch: RegExpExecArray | null
    // eslint-disable-next-line no-cond-assign
    while ((newlineEscapedMatch = newlineEscapedBracketRegex.exec(processedText)) !== null) {
      newlineEscapedMatches.push({
        start: newlineEscapedMatch.index,
        end: newlineEscapedMatch.index + newlineEscapedMatch[0].length,
      })
    }

    // 检查一个位置是否在已转义的花括号内
    const isInsideNewlineEscapedBracket = (position: number): boolean => {
      return newlineEscapedMatches.some(match => position >= match.start && position < match.end)
    }

    // 使用字符遍历处理 {\n 和 \n} 的情况
    let i = 0
    while (i < processedText.length) {
      // 跳过已转义的花括号
      if (isInsideNewlineEscapedBracket(i)) {
        i++
        continue
      }

      // 处理 {\n 的情况
      if (processedText[i] === '{') {
        let j = i + 1
        // 跳过空格
        while (j < processedText.length && processedText[j] === ' ')
          j++
        // 检查是否跟换行符
        if (j < processedText.length && processedText[j] === '\n') {
          // 转义这个花括号
          const before = processedText.substring(0, i)
          const after = processedText.substring(i)
          processedText = `${before}{{${after.substring(1)}`
          i += 2 // 跳过新增的字符
          continue
        }
      }

      // 处理 \n} 的情况
      if (processedText[i] === '\n') {
        let j = i + 1
        // 跳过空格
        while (j < processedText.length && processedText[j] === ' ')
          j++
        // 检查是否跟花括号
        if (j < processedText.length && processedText[j] === '}') {
          // 转义这个花括号
          const before = processedText.substring(0, j)
          const after = processedText.substring(j)
          processedText = `${before}}}${after.substring(1)}`
          i = j + 1 // 跳过处理过的字符
          continue
        }
      }

      i++
    }

    // 记录最后处理的值
    lastProcessedValueRef.current = processedText

    // 只有当处理后的文本与当前编辑器值不同时才更新
    if (processedText !== editorValue)
      setEditorValue(processedText)

    // 通知父组件变化
    if (onChange)
      onChange(processedText)

    // 使用 setTimeout 来重置标志，确保在下一个事件循环中重置
    setTimeout(() => {
      isProcessingChangeRef.current = false
    }, 0)
  }, [editorValue, validVariables, onChange])

  return (
    <EditorComposer
      key={instanceKey}
      initialConfig={{
        ...initialConfig,
        namespace: 'prompt-editor',
        nodes: [
          CodeNode,
          RichTextNode,
          {
            replace: TextNode,
            with: (node: TextNode) => new RichTextNode(node.__text),
          },
          WorkflowVariableBlockTreeNode,
          VariableDataBlockNode,
        ],
        onError: (error: Error) => {
          throw error
        },
        editable,
      }}
    >
      <div className='relative h-full'>
        <RichText
          contentEditable={<Editable className={`${className} outline-none ${dense ? 'leading-5 text-[13px]' : 'leading-6 text-sm'} text-gray-700`} style={style || {}} />}
          placeholder={<Placeholder value={placeholder} className={placeholderCls} dense={dense} />}
          ErrorBoundary={ErrorBoundary}
        />
        <ComponentSelectorBlock
          triggerString='{'
          variableBlock={LazyLLMvariableBlock}
          workflowVariableComponent={LazyLLMworkflowVariableBlockType}
        />

        {/* 总是渲染变量值块，确保变量能被正确识别和渲染 */}
        <VariableValueBlock validVariables={validVariables} />
        {
          LazyLLMvariableBlock?.show && (
            <VariablePanel />
          )
        }
        {
          LazyLLMworkflowVariableBlockType?.show && (
            <>
              <WorkflowVariableBlock {...LazyLLMworkflowVariableBlockType} workflowNodesRecord={{}} />
              <WorkflowVarBlockReplacer {...LazyLLMworkflowVariableBlockType} workflowNodesRecord={{}} />
            </>
          )
        }
        <OnChange onChange={handleEditorChange} />
        <BlurEventBlock onBlur={onBlur} onFocus={onFocus} />
        <PatchBlock instanceId={instanceKey} />
      </div>
    </EditorComposer>
  )
}

export default PromptEditorItem
