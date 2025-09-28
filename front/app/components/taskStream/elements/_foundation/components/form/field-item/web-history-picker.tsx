'use client'
import type { FC } from 'react'
import React, { useEffect } from 'react'
import classNames from 'classnames'
import { useNodes } from 'reactflow'
import type { FieldItemProps } from '../types'
import { Select } from '@/app/components/taskStream/elements/_foundation/components/form/base'

const SelectComponent: FC<Partial<FieldItemProps>> = ({
  name,
  label,
  value,
  placeholder,
  disabled,
  readOnly,
  allowClear,
  onChange,
  itemProps = {},
}) => {
  const nodes = useNodes()
  const targetNodes = nodes?.filter((node: any) =>
    node?.data?.payload__kind === 'LocalLLM' || node?.data?.payload__kind === 'OnlineLLM', // 本地模型节点+在线模型节点
  ) || []
  const { className, ...restProps } = itemProps

  useEffect(() => {
    // 若有节点被删除，则从已选项过滤掉
    if (value?.find((item: any) => !nodes?.find((node: any) => node?.id === item)))
      onChange && onChange(name, value?.filter((item: any) => !!nodes?.find((node: any) => node?.id === item)))
  }, [nodes, value])

  return (
    <Select
      mode="multiple"
      className={classNames(className, 'w-full')}
      value={value}
      allowClear={allowClear}
      disabled={disabled}
      readOnly={readOnly}
      onChange={(_value) => {
        onChange && onChange(name, _value)
      }}
      placeholder={placeholder || `请选择${label}`}
      options={targetNodes.map((node: any) => ({
        value: node.id,
        label: node?.data?.title,
      }))}
      {...restProps}
    />
  )
}
export default React.memo(SelectComponent)
