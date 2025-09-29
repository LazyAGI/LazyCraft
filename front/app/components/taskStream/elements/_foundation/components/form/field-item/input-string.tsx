'use client'
import type { FC } from 'react'
import React, { useCallback, useMemo } from 'react'
import type { FieldItemProps } from '../types'
import { ValueType, formatValueByType } from './utils'
import { Input } from '@/app/components/taskStream/elements/_foundation/components/form/base'

const StringInputField: FC<Partial<FieldItemProps>> = ({
  name,
  label,
  value: originalValue,
  readOnly,
  disabled,
  placeholder,
  onChange,
}) => {
  // 使用 useMemo 缓存 processedValue，避免每次渲染时都重新计算
  const processedValue = useMemo(() => {
    // 如果原始值为空字符串或null，直接返回空字符串
    if (originalValue === null || originalValue === undefined) {
      return ''
    }
    return formatValueByType(originalValue, ValueType.String)
  }, [originalValue])

  // 使用 useCallback 缓存 handleInputChange 函数，避免不必要的重新渲染
  const handleInputChange = useCallback((inputValue: string) => {
    // 确保onChange存在且name有效时才调用
    if (onChange && name) {
      // 直接调用onChange，避免setTimeout干扰中文输入法
      onChange(name, inputValue)
    }
  }, [onChange, name])

  const defaultPlaceholder = placeholder || `请输入${label}`

  return (
    <Input
      className='w-full'
      value={processedValue}
      readOnly={readOnly}
      disabled={disabled}
      onChange={handleInputChange}
      placeholder={defaultPlaceholder}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
    />
  )
}

export default React.memo(StringInputField)
