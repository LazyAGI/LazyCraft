'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './page.module.scss'
import PreviewTxt from '@/app/components/preview/previewTxt'
import PreviewDoc from '@/app/components/preview/previewDoc'
import PreviewExcel from '@/app/components/preview/previewExcel'
import PreviewPdf from '@/app/components/preview/previewPdf'
import { getFilePathById } from '@/infrastructure/api/knowledgeBase'
import PreviewJson from '@/app/components/preview/previewJSON'
import PreviewMD from '@/app/components/preview/previewMD'
import PreviewHtml from '@/app/components/preview/previewHTML'
import PreviewPpt from '@/app/components/preview/previewPpt'

const PreviewPageContent = () => {
  const seachParams = useSearchParams()
  const [path, setPath] = useState('')
  const [type, setType] = useState('')

  const renderPreview = () => {
    const fileUrl = path.replace('/app', '/static')

    const suffix = type.split('.').pop()
    if (suffix === 'txt') { return <div className='p-5'><PreviewTxt url={fileUrl} /></div> }
    else if (suffix === 'docx') { return <PreviewDoc url={fileUrl} /> }
    else if (suffix === 'doc') {
      return <div className='p-5 text-center'>
        <div className='mb-4 text-gray-600'>暂不支持.doc文件预览</div>
        <div className='text-sm text-gray-500'>建议将文件转换为.docx格式后重新上传</div>
        <a href={fileUrl} download className='inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>下载文件</a>
      </div>
    }
    else if (suffix === 'xlsx' || suffix === 'xls' || suffix === 'csv') { return <PreviewExcel url={fileUrl} /> }
    else if (suffix === 'pdf') { return <PreviewPdf url={fileUrl} /> }
    else if (suffix === 'md') { return <div className='p-5'> <PreviewMD url={fileUrl} /></div> }
    else if (suffix === 'json') { return <div className='p-5'><PreviewJson url={fileUrl} /></div> }
    else if (suffix === 'html') { return <PreviewHtml url={fileUrl} /> }
    else if (suffix === 'pptx') { return <PreviewPpt url={fileUrl} /> }
    else if (suffix === 'ppt') {
      return <div className='p-5 text-center'>
        <div className='mb-4 text-gray-600'>暂不支持.ppt文件预览</div>
        <div className='text-sm text-gray-500'>建议将文件转换为.pptx格式后重新上传</div>
        <a href={fileUrl} download className='inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>下载文件</a>
      </div>
    }
    else {
      return <div className='p-5 text-center'>
        <div className='mb-4 text-gray-600'>暂不支持该文件类型预览</div>
        <div className='text-sm text-gray-500 mb-4'>支持的文件格式：.txt, .docx, .xlsx, .xls, .csv, .pdf, .md, .json, .html, .ppt, .pptx</div>
        <a href={fileUrl} download className='inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>下载文件</a>
      </div>
    }
  }
  const getPath = async () => {
    try {
      const res = await getFilePathById({ url: '/kb/file/get', body: { file_id: seachParams.get('id') } }) as any
      setPath(res.file_path)
      setType(res.file_type)
    }
    catch (error) {
      console.error('获取文件路径失败:', error)
    }
  }
  useEffect(() => {
    getPath()
  }, [])

  return (
    <div className="page">
      <div className={styles.fileWrap}>
        {path && renderPreview()}
      </div>
    </div>
  )
}

const PreviewPage = () => {
  return (
    <Suspense>
      <PreviewPageContent />
    </Suspense>
  )
}

export default PreviewPage
