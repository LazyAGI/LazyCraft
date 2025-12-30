'use client'

import React from 'react'
import { Divider as AntdDivider } from 'antd'
import type { DividerProps as AntdDividerProps } from 'antd'

export type DividerProps = {
  /** 分割线方向 */
  orientation?: 'horizontal' | 'vertical'
  /** 是否显示文字 */
  children?: React.ReactNode
  /** 自定义类名 */
  className?: string
  /** 是否虚线 */
  dashed?: boolean
} & Omit<AntdDividerProps, 'type' | 'orientation'>

/**
 * Divider 分割线组件
 *
 * 用于分隔内容区域
 * 基于 antd Divider 组件封装
 *
 * @example
 * ```tsx
 * <Divider />
 *
 * <Divider orientation="vertical" />
 *
 * <Divider dashed>或</Divider>
 * ```
 */
export const Divider = ({
  orientation = 'horizontal',
  children,
  className,
  dashed = false,
  ...props
}: DividerProps) => {
  return (
    <AntdDivider
      variant={dashed ? 'dashed' : 'solid'}
      orientation={orientation === 'vertical' ? 'left' : 'center'}
      className={className}
      {...props}
    >
      {children}
    </AntdDivider>
  )
}

Divider.displayName = 'Divider'
