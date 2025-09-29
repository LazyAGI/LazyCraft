'use client'
import React, { useEffect, useRef } from 'react'
import { useMount } from 'ahooks'
import Viewer from '../lib/viewerBase'
import '@toast-ui/editor/dist/toastui-editor-viewer.css'
import { customHTMLRenderer, isLatexPatt, loadMathjaxResource } from '../mathUtils'

type IViewerProps = {
  value?: string
  isNeedMath?: boolean
}
declare const window: any
function MarkdownViewer(props: IViewerProps) {
  const viewerRef = useRef<any>()
  const { value, isNeedMath, ...rest } = props

  // 加载mathjax外网资源
  useMount(() => {
    if (isNeedMath)
      loadMathjaxResource()
  })

  useEffect(() => {
    if (isNeedMath && isLatexPatt(value) && window.MathJax && window.MathJax.typesetPromise)
      window.MathJax.typesetPromise()
  }, [value, window.MathJax])

  const configMath = isNeedMath ? { customHTMLRenderer } : {}

  return <Viewer initialValue={value} ref={viewerRef} {...configMath} {...rest} />
}

export default MarkdownViewer
