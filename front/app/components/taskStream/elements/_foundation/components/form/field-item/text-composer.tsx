'use client'
import type { FC } from 'react'
import React from 'react'
import type { FieldItemProps } from '../types'
import { LazyTextEditor } from '@/app/components/taskStream/elements/_foundation/components/editor'

const FieldItem: FC<Partial<FieldItemProps>> = ({
  name,
  title,
  value,
  readOnly,
  placeholder,
  onChange,
  minHeight,
}) => {
  return (
    <LazyTextEditor
      inWorkflow
      title={(title && (<div>
        <div className='w-[200px]'>
          <div
            className='leading-4 text-xs font-semibold text-gray-700'
          >
            {title}
          </div>
        </div>
      </div>)) || ''}
      value={value}
      onChange={(_value) => {
        onChange && onChange(name, _value)
      }}
      placeholder={placeholder}
      // headerRight={(
      //   <div className='flex items-center h-full'>
      //     <div className='text-xs font-medium text-gray-500'>{value?.length || 0}</div>
      //     <div className='mx-3 h-3 w-px bg-gray-200'></div>
      //   </div>
      // )}
      readonly={readOnly}
      minHeight={minHeight || 200}
    />
  )
}
export default React.memo(FieldItem)
