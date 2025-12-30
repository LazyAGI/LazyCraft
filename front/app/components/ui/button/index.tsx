'use client'

import React from 'react'
import type { CSSProperties } from 'react'
import { Button as AntdButton } from 'antd'
import type { ButtonProps as AntdButtonProps } from 'antd'
import classNames from '@/shared/utils/classnames'

export type ButtonProps = {
  /** 是否显示终止样式 */
  terminate?: boolean
  /** 按钮样式变体 */
  variant?: 'primary' | 'warning' | 'secondary' | 'secondary-accent' | 'ghost' | 'ghost-accent' | 'tertiary'
  /** 按钮尺寸 */
  size?: 'small' | 'medium' | 'large'
  /** 是否显示加载状态 */
  loading?: boolean
  /** 自定义样式 */
  styleCss?: CSSProperties
} & Omit<AntdButtonProps, 'type' | 'size' | 'loading'>

// 映射 variant 到 antd Button 的 type
const variantToType = {
  'primary': 'primary',
  'warning': 'default',
  'secondary': 'default',
  'secondary-accent': 'default',
  'ghost': 'text',
  'ghost-accent': 'text',
  'tertiary': 'link',
} as const

// 映射 size 到 antd Button 的 size
const sizeMap = {
  small: 'small',
  medium: 'middle',
  large: 'large',
} as const

/**
 * Button 按钮组件
 *
 * 提供多种样式变体和尺寸的按钮组件，支持加载状态和禁用状态
 * 基于 antd Button 组件封装
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="medium" onClick={handleClick}>
 *   点击我
 * </Button>
 *
 * <Button variant="primary" loading={isLoading}>
 *   提交
 * </Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'medium', terminate, loading, styleCss, children, ...props }, ref) => {
    const antdType = variantToType[variant] || 'default'
    const antdSize = sizeMap[size] || 'middle'

    const buttonClassName = classNames(
      terminate && 'button-Terminate',
      className,
    )

    return (
      <AntdButton
        ref={ref}
        type={antdType}
        size={antdSize}
        loading={loading}
        className={buttonClassName}
        style={styleCss}
        {...props}
      >
        {children}
      </AntdButton>
    )
  },
)

Button.displayName = 'Button'
