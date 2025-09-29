'use client'
import type { FC } from 'react'
import React from 'react'
import type { FieldItemProps } from '../../types'
import { Input } from '@/app/components/taskStream/elements/_foundation/components/form/base'

const DictionaryNamesInput: FC<Partial<FieldItemProps>> = ({
  nodeId,
  name,
  label,
  value,
  placeholder,
  disabled,
  readOnly,
  onChange,
  nodeData,
}) => {
  const processInputChange = (inputValue: string) => {
    const processedNames = inputValue?.replace('[', '').replace(']', '').split(',')

    onChange?.({
      [name]: inputValue,
      payload__names: processedNames,
    })
  }

  const defaultPlaceholder = placeholder || `请输入${label}`

  return (
    <Input
      className='w-full'
      value={value}
      readOnly={readOnly}
      disabled={disabled}
      onChange={processInputChange}
      placeholder={defaultPlaceholder}
    />
  )
}

export default React.memo(DictionaryNamesInput)
