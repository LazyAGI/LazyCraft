'use client'
import type { FC } from 'react'
import React, { useCallback } from 'react'
import type { FieldItemProps } from '../types'
import { ValueType, formatValueByType } from './utils'
import { InputNumber } from '@/app/components/taskStream/elements/_foundation/components/form/base'

const FieldItem: FC<Partial<FieldItemProps>> = ({
  name,
  min,
  max,
  label,
  placeholder,
  precision,
  value: _value,
  readOnly,
  disabled,
  onChange,
}) => {
  const value = formatValueByType(_value, ValueType.Number)
  const handleChange = useCallback((value) => {
    let _value = value
    if (typeof min !== 'undefined')
      _value = Math.max(min, _value)

    if (typeof max !== 'undefined')
      _value = Math.min(max, _value)

    onChange && onChange(name, _value)
  }, [onChange, min, max])
  return (
    <InputNumber
      className='w-full'
      style={{ width: '100%' }}
      placeholder={placeholder || `请输入${label}`}
      // formatter={value => value!.replace(/\D/g, '')}
      // parser={value => Number(value)}
      precision={precision}
      value={value}
      readOnly={readOnly}
      disabled={disabled}
      onChange={handleChange}
      min={min}
      max={max}
    />
  )
}
export default React.memo(FieldItem)
