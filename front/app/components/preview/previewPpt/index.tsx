import React, { useEffect, useRef, useState } from 'react'
import { init } from 'pptx-preview'
import { Spin } from 'antd'

type PreviewPptProps = {
  url: string
}

const PreviewPpt = (props: PreviewPptProps) => {
  const { url } = props
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const previewerRef = useRef<any>(null)

  const renderPptx = async () => {
    try {
      setLoading(true)
      setError(null)

      // 检查文件扩展名
      const fileExtension = url.split('.').pop()?.toLowerCase()
      if (fileExtension !== 'pptx' && fileExtension !== 'ppt') {
        setError('仅支持.ppt和.pptx格式文件预览')
        setLoading(false)
        return
      }

      if (!wrapperRef.current) {
        setError('容器初始化失败')
        setLoading(false)
        return
      }

      // 清理旧的预览器实例（如果存在）
      if (previewerRef.current) {
        // 如果库提供了销毁方法，应该调用它
        // previewerRef.current.destroy?.()
        previewerRef.current = null
      }

      // 清空容器内容
      wrapperRef.current.innerHTML = ''

      // 重新初始化预览器
      previewerRef.current = init(wrapperRef.current, {
        width: 960,
        // height: 540
      })

      // 获取文件的ArrayBuffer数据
      const response = await fetch(url)
      if (!response.ok)
        throw new Error(`文件无法访问: ${response.status}`)

      const arrayBuffer = await response.arrayBuffer()

      // 调用预览器的preview方法
      await previewerRef.current.preview(arrayBuffer)

      setLoading(false)
    }
    catch (err) {
      console.error('PPTX预览失败:', err)
      setError(`PPTX文件加载失败: ${err instanceof Error ? err.message : '未知错误'}`)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (url)
      renderPptx()
  }, [url])

  // 清理预览器
  useEffect(() => {
    return () => {
      if (previewerRef.current)
        previewerRef.current = null
    }
  }, [])

  if (error) {
    return (
      <div className='p-5 text-center'>
        <div className='mb-4 text-red-600'>{error}</div>
        <a href={url} download className='inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>
          下载文件
        </a>
      </div>
    )
  }

  return (
    <Spin spinning={loading}>
      <div className='w-full h-full'>
        <div ref={wrapperRef} className='w-full h-full overflow-auto'></div>
      </div>
    </Spin>
  )
}

export default PreviewPpt
