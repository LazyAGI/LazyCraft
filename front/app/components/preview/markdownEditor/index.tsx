'use client'
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'

import chart from '@toast-ui/editor-plugin-chart'
import codeSyntaxHighlight from '@toast-ui/editor-plugin-code-syntax-highlight/dist/toastui-editor-plugin-code-syntax-highlight-all.js'
import colorSyntax from '@toast-ui/editor-plugin-color-syntax'
import tableMergedCell from '@toast-ui/editor-plugin-table-merged-cell'
import uml from '@toast-ui/editor-plugin-uml'

// 引入样式文件
import '@toast-ui/chart/dist/toastui-chart.css'
import '@toast-ui/editor-plugin-table-merged-cell/dist/toastui-editor-plugin-table-merged-cell.css'
import './lib/styles/code.css'
import './lib/styles/color-syntax.css'
import './lib/styles/editor.css'

import '@toast-ui/editor-plugin-code-syntax-highlight/dist/toastui-editor-plugin-code-syntax-highlight.css'

// 引入中文语言包
import '@toast-ui/editor/dist/i18n/zh-cn'

// 工具类
// import { Dialog } from '@alifd/next';
import { useInterval, useMount, useToggle, useUpdateEffect } from 'ahooks'
import Editor from './lib/editorBase'
import { handleFullScreen } from './fullscreenUtils'
import { createMathFormulaButtonUtil, customHTMLRenderer, isLatexPatt, loadMathjaxResource } from './mathUtils'
import { defaultToolbarItems } from './utils'

const chartOptions = {
  minWidth: 100,
  maxWidth: 600,
  minHeight: 100,
  maxHeight: 300,
}

type IMarkdownEditorProps = {
  value?: any
  placeholder?: string
  onChange: (e: string) => void
  height?: number
  imageUploadCb?: (blob: any, callback: () => void) => void
  isNeedMath?: boolean
}

declare const window: any
const MarkdownEditor = forwardRef((props: IMarkdownEditorProps, ref) => {
  const { value, onChange, placeholder = '请输入', height = 500, imageUploadCb, isNeedMath = false } = props

  // hooks  start
  const editorRef = useRef<any>()
  const mathIframeDomRef = useRef<any>()
  const [ins, setIns] = useState<any>(null)
  const [isMathDialogShow, { toggle: toggleMathDialog }] = useToggle(false)

  // 加载mathjax外网资源
  useMount(() => {
    if (isNeedMath)
      loadMathjaxResource()
  })

  useImperativeHandle(ref, () => ({
    getContent: () => ins?.getMarkdown() || value,
  }))
  // 获取编辑器的实例同时监听iframe中数学公式编辑器的事件
  useInterval(
    () => {
      if (editorRef.current) {
        const tempInstance = editorRef.current.getInstance()
        setIns(tempInstance)
        if (isNeedMath) {
          window.addEventListener('message', (e) => {
            const temp = e.data
            if (temp.mceAction === 'markdownEditorContent') {
              tempInstance.insertText(temp.content)
              toggleMathDialog()
            }
          })
        }
      }
    },
    (editorRef.current && ins) ? undefined : 50,
  )
  useUpdateEffect(() => {
    if (value && ins)
      ins.setMarkdown(value, false)
  }, [value, ins])
  // hooks end

  const onEditorChange = () => {
    const val = ins.getMarkdown()
    if (isNeedMath && isLatexPatt(val) && window.MathJax && window.MathJax.typesetPromise)
      window.MathJax.typesetPromise()
    onChange && onChange(val)
  }

  const mathPluginConfigs = isNeedMath ? { customHTMLRenderer } : {}

  const createFullscreenButtonUtil = () => {
    const button = document.createElement('button')
    button.className = 'toastui-editor-toolbar-icons last'

    button.innerHTML = 'F'
    button.style.backgroundImage = 'none'
    button.style.margin = '0'

    button.addEventListener('click', () => handleFullScreen(editorRef.current?.getRootElement()))
    return button
  }

  const comToolbarItem = [
    'scrollSync',
    {
      el: createFullscreenButtonUtil(),
      command: '',
      tooltip: '全屏',
    },
  ]

  const editorProps: any = {
    previewStyle: 'vertical',
    useCommandShortcut: false,
    onChange: onEditorChange,
    usageStatistics: false,
    // initialValue: value,
    // placeholder: '请输入',
    language: 'zh-CN',
    frontMatter: true,
    // initialEditType: 'markdown',
    height: `${height}px`,
    hooks: imageUploadCb
      ? {
        addImageBlobHook(blob: Blob, callback: any) {
          imageUploadCb(blob, callback)
        },
      }
      : {},
    ...mathPluginConfigs,
    plugins: [[chart, chartOptions], colorSyntax, codeSyntaxHighlight, uml, tableMergedCell],
    toolbarItems: [
      ...defaultToolbarItems,
      !isNeedMath
        ? comToolbarItem
        : [
          ...comToolbarItem,
          {
            el: createMathFormulaButtonUtil(toggleMathDialog),
            command: '',
            tooltip: '插入数学公式',
          },
        ],
    ],
  }

  return (
    <div>
      <Editor ref={editorRef} {...editorProps} />

      {/* {isNeedMath && (
        <Dialog
          v2
          width={920}
          title="插入数学公式"
          visible={isMathDialogShow}
          onOk={() => mathIframeDomRef.current?.contentWindow.postMessage('save', '*')}
          onCancel={toggleMathDialog}
          onClose={toggleMathDialog}
        >
          <iframe ref={mathIframeDomRef} width={880} height={400} src="/static/plugins/kityFormula.html" />
        </Dialog>
      )} */}
    </div>
  )
})

export default MarkdownEditor
