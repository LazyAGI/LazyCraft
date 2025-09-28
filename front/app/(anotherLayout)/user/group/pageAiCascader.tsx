'use client'

import React from 'react'
import { Cascader } from 'antd'

type CascaderOptionType = {
  value: string
  label: string
  id?: string
  isLeaf?: boolean
  children?: CascaderOptionType[]
}

type PageAiCascaderProps = {
  cascaderOptions: CascaderOptionType[]
  selectedModels: Record<string, string[]>
  handleModelSelect: (value: string[], record: any) => void
  loadData: (selectedOptions: any[]) => Promise<void>
  record?: any
}

const PageAiCascader: React.FC<PageAiCascaderProps> = ({
  cascaderOptions,
  selectedModels,
  handleModelSelect,
  loadData,
  record,
}) => {
  return (
    <Cascader
      placeholder="选择模型"
      size="small"
      style={{ width: '100%' }}
      options={cascaderOptions}
      value={record ? selectedModels[record.key] : undefined}
      onChange={value => handleModelSelect(value as string[], record)}
      loadData={loadData}
      changeOnSelect
      disabled={!record?.serviceType}
      showSearch={{
        filter: (inputValue, path) => {
          return path.some(option =>
            (option.label as string).toLowerCase().includes(inputValue.toLowerCase()),
          )
        },
      }}
    />
  )
}

export default PageAiCascader
