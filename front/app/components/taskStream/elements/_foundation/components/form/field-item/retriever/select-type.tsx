'use client'
import type { FC } from 'react'
import React, { useMemo } from 'react'
import { Form, Typography } from 'antd'
import type { FieldItemProps } from '../../types'
import { Select } from '@/app/components/taskStream/elements/_foundation/components/form/base'
import { useResources } from '@/app/components/taskStream/logicHandlers/resStore'

const SelectComponent: FC<Partial<FieldItemProps>> = ({
  nodeId,
  name,
  label,
  value,
  options,
  optionsTip,
  placeholder,
  disabled,
  readOnly,
  allowClear = true,
  onChange,
  nodeData,
}) => {
  const { payload__group_name, payload__doc } = nodeData
  const { resources: allResourceList } = useResources()
  const formInstance = Form.useFormInstance()
  // 动态获取目标group选项
  const targetOptions = useMemo(() => {
    // 获取选中的知识库资源ID
    const selectedResourceId = payload__doc || formInstance?.getFieldValue('payload__doc')
    if (!selectedResourceId)
      return []

    // 从资源列表中找到对应的知识库资源
    const selectedResource = allResourceList.find(
      el => el.type === 'document' && el.id === selectedResourceId,
    )
    if (!selectedResource?.data)
      return []

    // 合并来自两个数据源的选项：payload__activated_groups 和 payload__node_group
    let combinedOptions: any[] = []
    // 获取激活的内置节点组（如 CoarseChunk, MediumChunk, FineChunk）
    const activatedGroups = selectedResource.data.payload__activated_groups
    if (activatedGroups && Array.isArray(activatedGroups)) {
      const activatedOptions = activatedGroups.filter(item => item.name && item.name !== payload__group_name).map(el => ({ label: el.name === 'CoarseChunk' ? '长段分块' : el.name === 'MediumChunk' ? '段落分块' : '短句分块', value: el.name }))
      combinedOptions = [...combinedOptions, ...activatedOptions]
    }

    // 获取用户自定义的节点组（如 Group 1）
    const nodeGroups = selectedResource.data.payload__node_group
    if (nodeGroups && Array.isArray(nodeGroups)) {
      const nodeGroupOptions = nodeGroups
        .filter(item => item.name && item.name !== payload__group_name)
        .map(el => ({ label: el.name, value: el.name }))
      if (activatedGroups && Array.isArray(activatedGroups))
        combinedOptions = [...combinedOptions, ...nodeGroupOptions]
      else
        combinedOptions = [...nodeGroupOptions]
    }
    const uniqueOptions = combinedOptions.filter((option, index, self) =>
      index === self.findIndex(o => o.value === option.value),
    )
    return uniqueOptions
  }, [allResourceList, payload__doc, payload__group_name, formInstance])

  return (
    <>
      {(typeof value !== 'undefined' && optionsTip)
        ? <Typography.Text className="ant-form-text" type="secondary" style={{ transform: 'translateY(-8px)' }}>
          {optionsTip}
        </Typography.Text>
        : null}
      <Select
        className='w-full'
        value={targetOptions.find(item => item.value === value)?.value}
        allowClear={allowClear}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(_value) => {
          onChange && onChange(name, _value)
        }}
        placeholder={placeholder || `请选择${label}`}
        options={targetOptions}
      />
    </>
  )
}
export default React.memo(SelectComponent)
