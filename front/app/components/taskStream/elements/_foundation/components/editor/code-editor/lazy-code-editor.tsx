'use client'
import type { FC } from 'react'
import { useRef, useState } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import EditorBaseComponent from '../editor-base'
import cn from '@/shared/utils/classnames'
import { currentLanguage } from '@/app/components/taskStream/elements/script/types'

import './lazy-editor.css'

loader.config({ paths: { vs: '/monaco-editor' } })

const LINE_HEIGHT = 18

const EDITOR_THEME_CONFIG = {
  default: {
    base: 'vs' as const,
    inherit: true,
    rules: [],
    colors: { 'editor.background': '#F2F4F7' },
  },
  focused: {
    base: 'vs' as const,
    inherit: true,
    rules: [],
    colors: { 'editor.background': '#ffffff' },
  },
  blurred: {
    base: 'vs' as const,
    inherit: true,
    rules: [],
    colors: { 'editor.background': '#F2F4F7' },
  },
}

const LANGUAGE_MAPPING = {
  [currentLanguage.javascript]: 'javascript',
  [currentLanguage.python3]: 'python',
  [currentLanguage.json]: 'json',
  [currentLanguage.sql]: 'sql',
}

export type CodeEditorComponentProps = {
  value?: string | object
  placeholder?: string
  onChange?: (value: string) => void
  title?: JSX.Element
  language: currentLanguage
  headerActions?: JSX.Element
  readOnly?: boolean
  beautifyJSON?: boolean
  height?: number
  inWorkflow?: boolean
  onMount?: (editor: any, monaco: any) => void
  noContainer?: boolean
  isOpened?: boolean
  className?: string
  headerRight?: JSX.Element
}

const CodeEditorComponent: FC<CodeEditorComponentProps> = ({
  value = '',
  placeholder = '',
  onChange = () => { },
  title = '',
  headerActions,
  language,
  readOnly,
  beautifyJSON,
  height,
  inWorkflow,
  onMount,
  noContainer,
  isOpened,
  className,
  headerRight,
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [editorContentHeight, setEditorContentHeight] = useState(56)
  const monacoEditorRef = useRef<any>(null)
  const editorMinHeight = height || 200
  const isWorkflowMode = inWorkflow || window.location.pathname.includes('/workflow')

  const processedValue = (() => {
    // 如果value是对象（包括数组），先序列化
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value, null, 2)
      }
      catch {
        return String(value)
      }
    }

    // 如果value是字符串且需要美化JSON
    if (typeof value === 'string' && beautifyJSON) {
      try {
        const parsed = JSON.parse(value)
        return JSON.stringify(parsed, null, 2)
      }
      catch {
        return value
      }
    }

    // 其他情况直接返回
    return value as string
  })()

  const activeTheme = (() => {
    if (noContainer)
      return 'lazyllm-default'
    return isFocused ? 'lazyllm-focused' : 'lazyllm-blurred'
  })()

  const updateEditorHeight = () => {
    if (monacoEditorRef.current) {
      const height = monacoEditorRef.current.getContentHeight()
      setEditorContentHeight(height)
    }
  }

  const handleValueChange = (newValue: string | undefined) => {
    onChange(newValue || '')
    setTimeout(updateEditorHeight, 10)
  }

  const handleEditorMount = (editor: any, monaco: any) => {
    monacoEditorRef.current = editor
    updateEditorHeight()

    editor.onDidFocusEditorText(() => setIsFocused(true))
    editor.onDidBlurEditorText(() => setIsFocused(false))

    Object.entries(EDITOR_THEME_CONFIG).forEach(([name, theme]) => {
      monaco.editor.defineTheme(`lazyllm-${name}`, theme)
    })

    monaco.editor.setTheme('lazyllm-default')
    onMount?.(editor, monaco)
    setIsMounted(true)
  }

  const editorComponent = (
    <>
      <Editor
        language={LANGUAGE_MAPPING[language] || 'javascript'}
        theme={isMounted ? activeTheme : 'lazyllm-default'}
        value={processedValue}
        onChange={handleValueChange}
        options={{
          readOnly,
          domReadOnly: true,
          quickSuggestions: false,
          minimap: { enabled: false },
          lineNumbersMinChars: 1,
          wordWrap: 'on',
          unicodeHighlight: { ambiguousCharacters: false },
          suggestOnTriggerCharacters: false,
        }}
        onMount={handleEditorMount}
      />
      {!processedValue && (
        <div className='pointer-events-none absolute left-[40px] top-0 leading-[18px] text-[13px] font-normal text-gray-300'>
          {placeholder}
        </div>
      )}
    </>
  )

  if (noContainer) {
    return (
      <div className={cn('lazyllm-code-editor', className, isOpened && 'h-full')}>
        <div
          className='relative no-wrapper'
          style={{
            height: isOpened ? '100%' : editorContentHeight / 2 + LINE_HEIGHT,
            minHeight: LINE_HEIGHT,
          }}
        >
          {editorComponent}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('lazyllm-code-editor', className, isOpened && 'h-full')}>
      <EditorBaseComponent
        className='relative'
        title={title}
        content={processedValue}
        headerActions={headerActions || headerRight}
        focused={isFocused && !readOnly}
        minHeight={editorMinHeight}
        inWorkflow={isWorkflowMode}
      >
        {editorComponent}
      </EditorBaseComponent>
    </div>
  )
}

export default CodeEditorComponent
