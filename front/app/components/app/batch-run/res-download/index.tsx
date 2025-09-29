'use client'
import type { FC } from 'react'
import React from 'react'
import {
  useCSVDownloader,
} from 'react-papaparse'
import Button from '@/app/components/base/click-unit'
import Iconfont from '@/app/components/base/iconFont'
// 结果下载组件的属性类型定义
type ResultDownloadComponentProps = {
  values: Record<string, string>[]
}

const ResultDownloadComponent: FC<ResultDownloadComponentProps> = ({
  values,
}) => {
  const { CSVDownloader, Type } = useCSVDownloader()

  // 数据验证：确保有有效的数据
  const hasValidData = values && values.length > 0 && values.some(item =>
    Object.values(item).some(value => value && value.toString().trim() !== ''),
  )

  // 渲染下载按钮内容
  const renderDownloadButtonContent = () => (
    <Button className='space-x-2 bg-white' disabled={!hasValidData}>
      <Iconfont type='icon-xiazaianniu' className='w-4 h-4 text-[#155EEF]' />
      <span className='text-[#155EEF]'>
        {hasValidData ? '下载' : '暂无数据'}
      </span>
    </Button>
  )

  // 配置CSV下载器的参数
  const csvDownloaderConfig = {
    className: hasValidData ? 'block cursor-pointer' : 'block cursor-not-allowed',
    type: Type.Link,
    filename: 'result',
    bom: true,
    config: {},
    data: hasValidData ? values : [],
  }

  // 如果没有有效数据，直接返回按钮而不使用CSVDownloader
  if (!hasValidData)
    return renderDownloadButtonContent()

  return (
    <CSVDownloader {...csvDownloaderConfig}>
      {renderDownloadButtonContent()}
    </CSVDownloader>
  )
}

export default React.memo(ResultDownloadComponent)
