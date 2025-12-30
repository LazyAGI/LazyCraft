'use client'

import type { FC } from 'react'
import React from 'react'
import { Spin } from 'antd'
import type { SpinProps } from 'antd'
import classNames from '@/shared/utils/classnames'

export type LoadingProps = {
  /** 子元素 */
  children?: React.ReactNode
  /** 自定义类名 */
  className?: string
  /** 是否显示加载状态 */
  loading?: boolean
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large'
} & Omit<SpinProps, 'size' | 'spinning'>

// 映射 size 到 antd Spin 的 size
const sizeMap = {
  small: 'small',
  medium: 'default',
  large: 'large',
} as const

/**
 * Loading 加载指示器组件
 *
 * 提供旋转动画的加载状态显示
 * 基于 antd Spin 组件封装
 *
 * @example
 * ```tsx
 * <Loading loading={isLoading} />
 *
 * <Loading loading={isLoading} size="large" className="text-blue-500" />
 *
 * <Loading loading={isLoading}>
 *   <div>内容区域</div>
 * </Loading>
 * ```
 */
export const LoaderIndicator: FC<LoadingProps> = ({
  children,
  className,
  loading = true,
  size = 'medium',
  ...props
}) => {
  const antdSize = sizeMap[size] || 'default'

  return (
    <Spin
      spinning={loading}
      size={antdSize}
      className={classNames(className)}
      {...props}
    >
      {children}
    </Spin>
  )
}

LoaderIndicator.displayName = 'LoaderIndicator'

// 导出别名以保持向后兼容
export const Loading = LoaderIndicator
