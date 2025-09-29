'use client'

import {
  memo,
  useCallback,
  useMemo,
} from 'react'
import type { EditorState } from 'lexical'
import { RichTextPlugin as RichText } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable as Editable } from '@lexical/react/LexicalContentEditable'
import { ClickableLinkPlugin as ClickableLink } from '@lexical/react/LexicalClickableLinkPlugin'
import { LinkPlugin as Link } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin as List } from '@lexical/react/LexicalListPlugin'
import { LexicalErrorBoundary as ErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin as History } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin as OnChange } from '@lexical/react/LexicalOnChangePlugin'
import { useWorkflowExecutionStore } from '../../workflow-execution-manager'
import WorkflowLinkPlugin from './addons/connection-maker-addon'
import WorkflowFormatDetectorPlugin from './addons/style-sensor-addon'
import Placeholder from '@/app/components/base/signal-editor/plugins/placeholder'

type MemoEditorProps = {
  readonly containerElement: HTMLDivElement | null
  readonly onChange?: (editorState: EditorState) => void
  readonly placeholder?: string
}

const MemoEditor = ({
  containerElement,
  onChange,
  placeholder = '请输入笔记内容...',
}: MemoEditorProps) => {
  const { enableShortcuts } = useWorkflowExecutionStore()

  // 处理编辑器状态变化
  const processEditorStateChange = useCallback((editorState: EditorState) => {
    onChange?.(editorState)
  }, [onChange])

  // 处理焦点事件
  const processFocusEvent = useCallback(() => {
    enableShortcuts(false)
  }, [enableShortcuts])

  const processBlurEvent = useCallback(() => {
    enableShortcuts(true)
  }, [enableShortcuts])

  // 内容编辑器配置
  const contentEditableConfig = useMemo(() => ({
    className: 'w-full h-full outline-none caret-primary-600 resize-none',
    onBlur: processBlurEvent,
    onFocus: processFocusEvent,
    placeholder,
    spellCheck: false,
  }), [processBlurEvent, processFocusEvent, placeholder])

  // 编辑器插件配置
  const editorPlugins = useMemo(() => [
    <ClickableLink key="clickable-link" disabled />,
    <Link key="link" />,
    <List key="list" />,
    <WorkflowLinkPlugin key="workflow-link-editor" containerElement={containerElement} />,
    <WorkflowFormatDetectorPlugin key="workflow-format-detector" />,
    <History key="history" />,
    <OnChange key="on-change" onChange={processEditorStateChange} />,
  ], [containerElement, processEditorStateChange])

  return (
    <div className='relative workflow-memo-editor-container'>
      <RichText
        contentEditable={
          <div className='editor-content-wrapper'>
            <Editable {...contentEditableConfig} />
          </div>
        }
        placeholder={
          <Placeholder
            dense
            value={placeholder}
          />
        }
        ErrorBoundary={ErrorBoundary}
      />
      {editorPlugins}
    </div>
  )
}

export default memo(MemoEditor)
