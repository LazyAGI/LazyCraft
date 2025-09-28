'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { FC } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import Base from '../base'
import cn from '@/shared/utils/classnames'
import type { ParamData } from '@/core/data/common'
import './find-widget.css'

loader.config({ paths: { vs: '/monaco-editor' } })

const EDITOR_LINE_HEIGHT = 18

type CodeEditorProps = {
  headerRight?: JSX.Element
  height?: number
  isOpened?: boolean
  isNodeEnv?: boolean
  isBeautifiedJSONString?: boolean
  language?: string
  noContainer?: boolean
  onChange?: (value: string) => void
  onGenerated?: (code: string, params?: ParamData) => void
  onMount?: (editor: any, monaco: any) => void
  placeholder?: string
  readOnly?: boolean
  title?: JSX.Element
  value?: string | object
}

const CUSTOM_THEME = {
  base: 'vs',
  colors: {
    'editor.background': '#F2F4F7',
  },
  inherit: true,
  rules: [],
}

const CodeEditor: FC<CodeEditorProps> = ({
  headerRight,
  height,
  isOpened,
  isNodeEnv,
  isBeautifiedJSONString,
  language,
  noContainer,
  onChange = () => { },
  onGenerated,
  onMount,
  placeholder = '',
  readOnly,
  title = '',
  value = '',
}) => {
  const [isFocused, setIsFocused] = React.useState(false)
  const [isReady, setIsReady] = React.useState(false)
  const minHeight = height || 200
  const [contentHeight, setContentHeight] = useState(56)

  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  const compilerRef = useRef<any>(null)

  const setupFindWidgetStyling = (findDomNode: HTMLElement) => {
    if (!findDomNode)
      return

    setTimeout(() => {
      findDomNode.style.visibility = 'visible'
      findDomNode.style.display = 'flex'

      const buttons = findDomNode.querySelectorAll('.button') as NodeListOf<HTMLElement>
      buttons.forEach((button) => {
        button.style.display = 'flex'
        button.style.alignItems = 'center'
        button.style.justifyContent = 'center'
      })

      const inputBox = findDomNode.querySelector('.monaco-inputbox') as HTMLElement
      if (inputBox) {
        inputBox.style.height = '28px'
        inputBox.style.minWidth = '150px'

        const input = inputBox.querySelector('input') as HTMLElement
        if (input) {
          input.style.height = '26px'
          input.style.lineHeight = '26px'
        }
      }

      const matchesCount = findDomNode.querySelector('.matchesCount') as HTMLElement
      if (matchesCount) {
        matchesCount.style.minWidth = '50px'
        matchesCount.style.textAlign = 'center'
      }

      const replacePart = findDomNode.querySelector('.replace-part') as HTMLElement
      if (replacePart) {
        replacePart.style.display = 'flex'
        replacePart.style.alignItems = 'center'
      }

      const closeButton = findDomNode.querySelector('.button.codicon-widget-close') as HTMLElement
      if (closeButton) {
        closeButton.style.display = 'flex'
        closeButton.style.position = 'absolute'
        closeButton.style.right = '4px'
        closeButton.style.top = '6px'
        closeButton.style.width = '24px'
        closeButton.style.height = '24px'
        closeButton.style.backgroundColor = '#f3f4f6'
        closeButton.style.borderRadius = '3px'
        closeButton.style.alignItems = 'center'
        closeButton.style.justifyContent = 'center'
        closeButton.style.zIndex = '11'

        closeButton.onmouseover = () => {
          closeButton.style.backgroundColor = '#e5e7eb'
          closeButton.style.opacity = '1'
        }
        closeButton.onmouseout = () => {
          closeButton.style.backgroundColor = '#f3f4f6'
          closeButton.style.opacity = '0.9'
        }
      }
      else {
        const existingCloseBtn = findDomNode.querySelector('.close-fw') as HTMLElement
        if (!existingCloseBtn) {
          const newCloseBtn = document.createElement('div')
          newCloseBtn.className = 'button close-fw codicon-widget-close'
          newCloseBtn.innerHTML = '✕'
          newCloseBtn.style.position = 'absolute'
          newCloseBtn.style.right = '4px'
          newCloseBtn.style.top = '6px'
          newCloseBtn.style.width = '24px'
          newCloseBtn.style.height = '24px'
          newCloseBtn.style.display = 'flex'
          newCloseBtn.style.alignItems = 'center'
          newCloseBtn.style.justifyContent = 'center'
          newCloseBtn.style.fontSize = '12px'
          newCloseBtn.style.fontWeight = 'bold'
          newCloseBtn.style.color = '#6b7280'
          newCloseBtn.style.backgroundColor = '#f3f4f6'
          newCloseBtn.style.borderRadius = '3px'
          newCloseBtn.style.cursor = 'pointer'
          newCloseBtn.style.zIndex = '11'

          newCloseBtn.onclick = () => {
            findDomNode.style.visibility = 'hidden'
            findDomNode.style.display = 'none'
          }

          newCloseBtn.onmouseover = () => {
            newCloseBtn.style.backgroundColor = '#e5e7eb'
            newCloseBtn.style.color = '#111827'
          }

          newCloseBtn.onmouseout = () => {
            newCloseBtn.style.backgroundColor = '#f3f4f6'
            newCloseBtn.style.color = '#6b7280'
          }

          findDomNode.appendChild(newCloseBtn)
        }
      }
    }, 0)
  }

  const adjustEditorHeight = () => {
    if (compilerRef.current) {
      const contentHeight = compilerRef.current.getContentHeight()
      setContentHeight(contentHeight)
    }
  }

  const handleValueChange = (value: string | undefined) => {
    onChange(value || '')
    setTimeout(() => {
      adjustEditorHeight()
    }, 100)
  }

  const fixFindWidgetLayout = () => {
    setTimeout(() => {
      const findDomNode = document.querySelector('.monaco-editor .find-widget') as HTMLElement
      if (findDomNode && findDomNode.style.visibility !== 'hidden')
        setupFindWidgetStyling(findDomNode)
    }, 50)
  }

  const registerFindControllerListener = () => {
    try {
      const findController = compilerRef.current._contributions['editor.contrib.findController']
      if (findController) {
        findController.onDidUpdateState(() => {
          fixFindWidgetLayout()
        })
      }
    }
    catch (error) {
      console.error('查找控制器监听器注册失败:', error)
    }
  }

  const onCompilerAttached = (compiler: any, monacoEditor: any) => {
    compilerRef.current = compiler
    adjustEditorHeight()

    compiler.onDidFocusEditorText(() => {
      setIsFocused(true)
    })
    compiler.onDidBlurEditorText(() => {
      setIsFocused(false)
    })

    registerFindControllerListener()

    compiler.addAction({
      id: 'toggle-find',
      label: '显示查找框',
      keybindings: [monacoEditor.KeyMod.CtrlCmd | monacoEditor.KeyCode.KeyF],
      run: () => {
        compiler.trigger('', 'actions.find', null)

        setTimeout(() => {
          const findDomNode = document.querySelector('.monaco-editor .find-widget') as HTMLElement
          if (findDomNode) {
            findDomNode.style.visibility = 'visible'
            findDomNode.style.display = 'flex'
            setupFindWidgetStyling(findDomNode)

            const findPart = findDomNode.querySelector('.find-part') as HTMLElement
            if (findPart) {
              findPart.style.display = 'flex'
              findPart.style.alignItems = 'center'

              const replaceBtn = findDomNode.querySelector('.replace') as HTMLElement
              if (replaceBtn) {
                replaceBtn.style.minWidth = '40px'
                replaceBtn.style.textAlign = 'center'
              }
            }

            const closeButton = findDomNode.querySelector('.button.codicon-widget-close') as HTMLElement
            if (!closeButton || closeButton.style.display === 'none')
              setupFindWidgetStyling(findDomNode)
          }
        }, 50)
      },
    })

    compiler.addAction({
      id: 'toggle-replace',
      label: '显示替换框',
      keybindings: [monacoEditor.KeyMod.CtrlCmd | monacoEditor.KeyMod.Shift | monacoEditor.KeyCode.KeyF],
      run: () => {
        compiler.trigger('', 'editor.action.startFindReplaceAction', null)

        setTimeout(() => {
          const findDomNode = document.querySelector('.monaco-editor .find-widget') as HTMLElement
          if (findDomNode) {
            findDomNode.style.visibility = 'visible'
            findDomNode.style.display = 'flex'
            setupFindWidgetStyling(findDomNode)

            const replacePart = findDomNode.querySelector('.replace-part') as HTMLElement
            if (replacePart) {
              replacePart.style.display = 'flex'
              replacePart.style.alignItems = 'center'
              replacePart.style.marginTop = '0'
            }

            const replaceBtn = findDomNode.querySelector('.replace') as HTMLElement
            const replaceAllBtn = findDomNode.querySelector('.replace-all') as HTMLElement

            if (replaceBtn) {
              replaceBtn.style.minWidth = '40px'
              replaceBtn.style.textAlign = 'center'
              replaceBtn.style.marginLeft = '4px'
            }

            if (replaceAllBtn) {
              replaceAllBtn.style.minWidth = '70px'
              replaceAllBtn.style.textAlign = 'center'
            }

            const closeButton = findDomNode.querySelector('.button.codicon-widget-close') as HTMLElement
            if (!closeButton || closeButton.style.display === 'none')
              setupFindWidgetStyling(findDomNode)
          }
        }, 50)
      },
    })

    compiler.onDidChangeCursorPosition(() => {
      setTimeout(() => {
        adjustEditorHeight()
      }, 100)
    })

    compiler.onDidContentSizeChange(() => {
      setTimeout(() => {
        adjustEditorHeight()

        const findDomNode = document.querySelector('.monaco-editor .find-widget') as HTMLElement
        if (findDomNode && findDomNode.style.visibility !== 'hidden') {
          const editorContainer = compiler.getDomNode()
          if (editorContainer) {
            const editorWidth = editorContainer.clientWidth
            if (editorWidth > 0) {
              findDomNode.style.left = '50%'
              findDomNode.style.transform = 'translateX(-50%)'
              findDomNode.style.top = '5px'
            }
          }
          setupFindWidgetStyling(findDomNode)
        }
      }, 100)
    })

    compiler.onDidScrollChange(() => {
      const findDomNode = document.querySelector('.monaco-editor .find-widget') as HTMLElement
      if (findDomNode && findDomNode.style.visibility !== 'hidden')
        findDomNode.style.top = '5px'
    })

    monacoEditor.editor.defineTheme('default-theme', CUSTOM_THEME)

    monacoEditor.editor.defineTheme('blur-theme', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
      },
    })

    monacoEditor.editor.defineTheme('focus-theme', {
      base: 'vs',
      colors: {
        'editor.background': '#ffffff',
      },
      inherit: true,
      rules: [],
    })

    monacoEditor.editor.setTheme('default-theme')

    onMount?.(compiler, monacoEditor)
    setIsReady(true)
  }

  const processedValue = (() => {
    if (!isBeautifiedJSONString)
      return value as string

    try {
      return JSON.stringify(value as object, null, 2)
    }
    catch (e) {
      return value as string
    }
  })()

  const currentTheme = (() => {
    if (noContainer)
      return 'default-theme'

    return isFocused ? 'focus-theme' : 'blur-theme'
  })()

  const editorContent = (
    <>
      <Editor
        language={language || 'phthon'}
        theme={isReady ? currentTheme : 'default-theme'}
        value={processedValue}
        onChange={handleValueChange}
        options={{
          readOnly,
          domReadOnly: true,
          quickSuggestions: false,
          minimap: {
            enabled: false,
          },
          lineNumbersMinChars: 1,
          wordWrap: 'on',
          unicodeHighlight: {
            ambiguousCharacters: false,
          },
          find: {
            addExtraSpaceOnTop: false,
            autoFindInSelection: 'never',
            seedSearchStringFromSelection: 'never',
          },
        }}
        onMount={onCompilerAttached}
      />
      {!processedValue && <div className='pointer-events-none absolute left-[36px] top-0 leading-[18px] text-[13px] font-normal text-gray-300'>{placeholder}</div>}
    </>
  )

  return (
    <div className={cn(isOpened && 'h-full')}>
      {noContainer
        ? (
          <div className='relative no-wrapper' style={{
            height: isOpened ? '100%' : (contentHeight) / 2 + EDITOR_LINE_HEIGHT,
            minHeight: EDITOR_LINE_HEIGHT,
          }}>
            {editorContent}
          </div>
        )
        : (
          <Base
            className='relative'
            title={title}
            value={processedValue}
            headerRight={headerRight}
            isFocus={isFocused && !readOnly}
            minHeight={minHeight}
            height={height}
            isNodeEnv={isNodeEnv}
            onGenerated={onGenerated}
          >
            {editorContent}
          </Base>
        )}
    </div>
  )
}

export default React.memo(CodeEditor)
