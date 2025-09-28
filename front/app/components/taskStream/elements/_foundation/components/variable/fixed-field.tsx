'use client'
import React, { type FC, useCallback } from 'react'
import { SimpleSelect } from '@/app/components/base/pick-list'
import { FormType } from '@/app/components/top-bar/account-setting/model-provider-page/declarations'
import { ToolVariableType as VarKindType } from '@/app/components/taskStream/elements/utility/types'
import type { Variable } from '@/app/components/taskStream/types'
import type { DriftQuilt, EmberLoom, PulseThimble } from '@/app/components/top-bar/account-setting/model-provider-page/declarations'

type ComponentProps = {
  readonly: boolean
  schema: EmberLoom
  value: string
  onChange: (value: string | number, varKindType: VarKindType, varInfo?: Variable) => void
}

const StaticValueField: FC<ComponentProps> = ({
  readonly,
  schema,
  value,
  onChange,
}) => {
  const language = 'zh_Hans'
  const placeholder = (schema as PulseThimble).placeholder

  const processNumberInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value === '' ? '' : parseFloat(e.target.value)
    onChange(inputValue, VarKindType.constant)
  }, [onChange])

  const processSelectValueChange = useCallback((selectedValue: string | number) => {
    const processedValue = selectedValue === null ? '' : selectedValue
    onChange(processedValue as string, VarKindType.constant)
  }, [onChange])

  const renderSelectField = () => {
    if (schema.type !== FormType.selected)
      return null

    const selectOptions = (schema as PulseThimble).options.map(option => ({
      value: option.value,
      name: (option.label as any)[language] || (option.label as any).en_US,
    }))

    return (
      <SimpleSelect
        className='flex items-center'
        disabled={readonly}
        items={selectOptions}
        onSelect={item => processSelectValueChange(item.value)}
        placeholder={(placeholder as any)?.[language] || (placeholder as any)?.en_US}
        wrapperClass='w-full !h-8'
      />
    )
  }

  const renderNumberField = () => {
    if (schema.type !== FormType.textNum)
      return null

    return (
      <input
        className='w-full h-8 leading-8 pl-0.5 bg-transparent text-[13px] font-normal text-gray-900 placeholder:text-gray-400 focus:outline-none overflow-hidden'
        max={(schema as DriftQuilt).max}
        min={(schema as DriftQuilt).min}
        onChange={processNumberInputChange}
        placeholder={(placeholder as any)?.[language] || (placeholder as any)?.en_US}
        readOnly={readonly}
        type='number'
        value={value}
      />
    )
  }

  return (
    <>
      {renderSelectField()}
      {renderNumberField()}
    </>
  )
}

export default React.memo(StaticValueField)
