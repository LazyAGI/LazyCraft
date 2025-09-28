'use client'
import type { FC } from 'react'
import React from 'react'
import type { ParameterDefinition } from '../../types'
import Iconfont from '@/app/components/base/iconFont'

type ParameterItemProps = {
  payload: ParameterDefinition
  readonly?: boolean
  isRunning?: boolean
  onEdit: () => void
  onDelete: () => void
}

const ParameterItem: FC<ParameterItemProps> = ({
  payload,
  readonly = false,
  isRunning = false,
  onEdit,
  onDelete,
}) => {
  const allowEdit = !readonly
  const allowDelete = !readonly && !isRunning

  return (
    <div className='group relative rounded-lg bg-gray-50 px-3 py-3 hover:shadow-xs'>
      <div className='flex justify-between'>
        <div className='flex items-center'>
          <Iconfont type='icon-x' className='h-3.5 w-3.5 text-primary-400' />
          <div className='ml-1 text-[13px] font-medium text-gray-900'>{payload.name}</div>
          <div className='ml-2 text-xs font-normal capitalize text-gray-600'>{payload.type}</div>
        </div>
        {payload.require && (
          <div className='text-xs font-normal uppercase leading-4 text-gray-600'>必填</div>
        )}
      </div>
      <div className='mt-0.5 text-xs font-normal leading-[18px] text-gray-600'>{payload.description}</div>
      {(allowEdit || allowDelete) && (
        <div
          className='absolute right-0 top-0 hidden h-full w-[119px] items-center justify-end space-x-1 rounded-lg bg-gradient-to-l from-white to-transparent pr-1 group-hover:flex'
        >
          {allowEdit && (
            <div
              className='cursor-pointer rounded-md p-1 hover:bg-gray-100'
              onClick={onEdit}
            >
              <Iconfont type='icon-bianji2' className='h-4 w-4 text-gray-600' />
            </div>
          )}

          {allowDelete && (
            <div
              className='group shrink-0 cursor-pointer rounded-md p-1 hover:!bg-red-50'
              onClick={onDelete}
            >
              <Iconfont type='icon-shanchu1' className='h-4 w-4 text-gray-600 group-hover:text-red-600' />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default React.memo(ParameterItem)
