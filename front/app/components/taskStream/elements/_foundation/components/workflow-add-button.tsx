'use client'

import type { FC } from 'react'
import React from 'react'
import {PlusOutlined} from '@ant-design/icons'
import cn from '@/shared/utils/classnames'

type WorkflowAddButtonProps = {
  /** 自定义CSS类名 */
  className?: string
  /** 按钮显示的文本 */
  text: string
  /** 点击事件处理函数 */
  onClick: () => void
  /** 是否禁用按钮 */
  disabled?: boolean
  /** 按钮大小 */
  size?: 'small' | 'medium' | 'large'
}

const WorkflowAddButton: FC<WorkflowAddButtonProps> = ({
  className,
  text,
  onClick,
  disabled = false,
  size = 'medium',
}) => {
  const sizeClasses = {
    small: 'h-6 text-xs',
    medium: 'h-7 text-xs',
    large: 'h-8 text-sm',
  }

  const iconSizes = {
    small: 'w-3 h-3',
    medium: 'w-3.5 h-3.5',
    large: 'w-4 h-4',
  }

  return (
    <button
      type="button"
      className={cn(
        'flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer font-medium text-gray-700 space-x-1 transition-colors duration-200 w-full',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 ',
        sizeClasses[size],
        className,
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={`添加 ${text}`}
    >
      <PlusOutlined className={iconSizes[size]} />
      <span>{text}</span>
    </button>
  )
}

export default React.memo(WorkflowAddButton)
