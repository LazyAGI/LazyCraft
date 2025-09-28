'use client'
import { message } from 'antd'
import type { FC } from 'react'
import React, { useState } from 'react'
import {
  PlayIcon,
} from '@heroicons/react/24/solid'
import { LoadingOutlined } from '@ant-design/icons'
import { useCSVDownloader, useCSVReader } from 'react-papaparse'
import { handleEditableTableSavedData } from '../utils'
import s from './style.module.css'
import EditableTable from './editable-table'
import Iconfont from '@/app/components/base/iconFont'
import cn from '@/shared/utils/classnames'
import Button from '@/app/components/base/click-unit'
type BatchExecutionProps = {
  csvHeader: any
  onSend: (data: any) => void
  isAllFinished: boolean
}

const BatchExecution: FC<BatchExecutionProps> = ({
  csvHeader,
  onSend,
  isAllFinished,
}) => {
  const { CSVDownloader, Type } = useCSVDownloader()
  const { CSVReader } = useCSVReader()
  const [isDragOver, setIsDragOver] = useState(false)

  // 生成CSV模板数据
  const generateTemplateData = (() => {
    const templateData: Record<string, string> = {}
    csvHeader.forEach((headerItem) => {
      templateData[headerItem.title] = ''
    })
    return templateData
  })()

  const [tableData, setTableData] = React.useState<any[]>([])
  const [csvUploadData, setCsvUploadData] = React.useState<string[][]>([])
  const [hasData, setHasData] = React.useState(false)

  // 保存表格数据的处理函数
  const processTableDataSave = (tableDataArray: string[][]) => {
    // 可编辑表格所获取的数据无表头，需要再次增加表头处理
    setTableData(tableDataArray)
    setHasData(true)
  }

  // 执行批量运行的主函数
  const executeBatchRun = () => {
    if (!tableData || (tableData && !tableData.length)) {
      message.info('暂无数据，请先上传csv或者编辑数据')
      return
    }

    // 上传数据之前提前对数据做处理
    // 如果有编辑表格则使用表格的数据，否则使用上传表格的数据
    const processedData = {
      arrayKeyValueObjData: tableData,
      multiDimensionData: handleEditableTableSavedData(tableData, csvHeader),
    }
    onSend(processedData)
  }

  // 动态选择图标组件
  const DynamicIcon = isAllFinished ? PlayIcon : LoadingOutlined

  // 处理CSV文件上传成功的回调
  const handleCsvUploadSuccess = (uploadResults: any) => {
    // 上传的数据可能最后一条是数组空字符串，则需要特别处理
    const filteredData: any[] = []
    uploadResults.data.forEach((rowData) => {
      if (!(rowData.length === 1 && rowData[0] === ''))
        filteredData.push(rowData)
    })
    setCsvUploadData(filteredData)
    setHasData(true)
    setIsDragOver(false)
  }

  // 处理拖拽悬停事件
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  // 处理拖拽离开事件
  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  // 渲染CSV上传区域
  const renderCsvUploadZone = ({ getRootProps, acceptedFile }: any) => (
    <>
      <div
        {...getRootProps()}
        className={cn(s.zone, isDragOver && s.zoneHover, acceptedFile ? 'px-6' : 'justify-center border-dashed text-gray-500')}
      >
        {
          acceptedFile
            ? (
              <div className='w-full flex items-center space-x-2'>
                <Iconfont type="icon-CSVIcon-copy" style={{ fontSize: 32 }}/>
                <div className='flex w-0 grow'>
                  <span className='max-w-[calc(100%_-_30px)] text-ellipsis whitespace-nowrap overflow-hidden text-gray-800'>{acceptedFile.name.replace(/.csv$/, '')}</span>
                  <span className='shrink-0 text-gray-500'>.csv</span>
                </div>
              </div>
            )
            : (
              <div className='flex items-center justify-center space-x-2'>
                <Iconfont type="icon-CSVIcon-copy" style={{ fontSize: 32 }}/>
                <div className='text-gray-500'>{'将您的 CSV 文件拖放到此处，或'}<span className='text-primary-400'>{'浏览'}</span></div>
              </div>
            )}
      </div>
    </>
  )

  // 渲染模板下载区域
  const renderTemplateDownload = () => (
    <div className='text-sm text-gray-900 font-medium flex space-x-1'>
      CSV表格文件必须符合以下结构：
      <CSVDownloader
        className="block mt-2 cursor-pointer"
        type={Type.Link}
        filename="template"
        bom={true}
        config={{}}
        data={[generateTemplateData]}
      >
        <div className='flex items-center h-[18px] space-x-1 text-[#155EEF] text-xs font-medium' style={{ position: 'relative', top: -6 }}>
          <Iconfont type='icon-xiazaianniu' className='w-3 h-3' />
          <span>下载模版</span>
        </div>
      </CSVDownloader>
    </div>
  )

  // 渲染可编辑表格区域
  const renderEditableTableSection = () => (
    <div className='mt-2 max-h-[500px] overflow-auto'>
      <EditableTable
        handleSaveTableData={processTableDataSave}
        csvHeader={csvHeader}
        uploadeCsvData={csvUploadData}
      />
    </div>
  )

  // 渲染执行按钮区域
  const renderExecutionButton = () => (
    <div className='flex justify-end mb-8 mt-4'>
      <Button
        variant="primary"
        className='pl-3 pr-4'
        onClick={executeBatchRun}
        disabled={!hasData || !isAllFinished}
      >
        <DynamicIcon className={cn(!isAllFinished && 'animate-spin', 'shrink-0 w-4 h-4 mr-1')} aria-hidden="true" />
        <span className='uppercase text-[13px]'>{'运行'}</span>
      </Button>
    </div>
  )

  return (
    <div className='pt-4'>
      <CSVReader
        onUploadAccepted={handleCsvUploadSuccess}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {renderCsvUploadZone}
      </CSVReader>

      <div className='mt-6'>
        {renderTemplateDownload()}
        {renderEditableTableSection()}
      </div>

      <div className='mt-4 h-[1px] bg-gray-100'></div>
      {renderExecutionButton()}
    </div>
  )
}

export default React.memo(BatchExecution)
