'use client'

import React from 'react'
import { Empty as AntdEmpty } from 'antd'
import type { EmptyProps as AntdEmptyProps } from 'antd'

export type EmptyProps = {
  /** 空状态描述 */
  description?: React.ReactNode
  /** 自定义图标 */
  image?: React.ReactNode
  /** 自定义类名 */
  className?: string
  /** 操作按钮 */
  action?: React.ReactNode
} & Omit<AntdEmptyProps, 'description' | 'image'>

/**
 * Empty 空状态组件
 *
 * 用于显示空数据状态
 * 基于 antd Empty 组件封装
 *
 * @example
 * ```tsx
 * <Empty description="暂无数据" />
 *
 * <Empty
 *   description="暂无内容"
 *   image={<CustomIcon />}
 *   action={<Button>创建</Button>}
 * />
 * ```
 */
export const Empty = ({
  description = '暂无数据',
  image,
  className,
  action,
  ...props
}: EmptyProps) => {
  return (
    <AntdEmpty
      description={description}
      image={image}
      className={className}
      {...props}
    >
      {action}
    </AntdEmpty>
  )
}

Empty.displayName = 'Empty'
