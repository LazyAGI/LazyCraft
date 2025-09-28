'use client'
import type { FC } from 'react'
import React from 'react'
import classNames from 'classnames'
import type { FieldItemProps } from '../types'
import { ValueType, formatValueByType } from './utils'
import { Switch } from '@/app/components/taskStream/elements/_foundation/components/form/base'

const FieldItem: FC<Partial<FieldItemProps>> = ({
  name,
  value,
  disabled,
  readOnly,
  onChange,
  itemProps = {},
}) => {
  const { className } = itemProps

  // 使用 formatValueByType 处理 value，确保它是布尔值
  const formattedValue = formatValueByType(value, ValueType.Boolean, false)

  return (
    <Switch
      checked={formattedValue}
      className={classNames(className)}
      disabled={disabled}
      readOnly={readOnly}
      onChange={(checked) => {
        onChange && onChange(name, checked)
      }}
    />
  )
}
export default React.memo(FieldItem)
