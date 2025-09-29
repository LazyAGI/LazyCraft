'use client'
import React from 'react'
import type { FC } from 'react'
import IconFont from '@/app/components/base/iconFont'
import cn from '@/shared/utils/classnames'

type DeleteButtonProps = {
  className?: string
  onClick: (e: React.MouseEvent) => void
}

const DeleteButton: FC<DeleteButtonProps> = ({
  className,
  onClick,
}) => {
  const buttonClasses = cn(
    className,
    'p-1 cursor-pointer rounded-md hover:bg-black/5 text-gray-500 hover:text-gray-800',
  )

  return (
    <div className={buttonClasses} onClick={onClick}>
      <IconFont type='icon-shanchu1' className='w-4 h-4' />
    </div>
  )
}

export default React.memo(DeleteButton)
