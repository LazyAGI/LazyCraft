'use client'

import React, { useEffect, useRef, useState } from 'react'
import { renderAsync } from 'docx-preview'

type PreviewDocProps = {
  url: string
}

const PreviewDoc = (props: PreviewDocProps) => {
  const { url } = props
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  const renderCurrent = () => {
    // 检查文件扩展名
    const fileExtension = url.split('.').pop()?.toLowerCase()
    if (fileExtension !== 'docx') {
      setError('仅支持.docx格式文件预览')
      return
    }

    fetch(url)
      .then((res) => {
        if (!res.ok)
          throw new Error(`HTTP error! status: ${res.status}`)

        return res.arrayBuffer()
      })
      .then((data) => {
        if (wrapperRef.current) {
          renderAsync(data, wrapperRef.current).catch((err) => {
            console.error('渲染文档失败:', err)
            setError('文档渲染失败，请检查文件格式是否正确')
          })
        }
      })
      .catch((err) => {
        console.error('获取文档失败:', err)
        setError('文档加载失败')
      })
  }

  useEffect(() => {
    setError(null)
    renderCurrent()
  }, [url])

  if (error) {
    return (
      <div className='p-5 text-center'>
        <div className='mb-4 text-red-600'>{error}</div>
        <a href={url} download className='inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>下载文件</a>
      </div>
    )
  }

  return <div ref={wrapperRef}></div>
}

export default PreviewDoc
