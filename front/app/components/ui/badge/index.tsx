'use client'

import React from 'react'
import { Badge as AntdBadge } from 'antd'
import type { BadgeProps as AntdBadgeProps } from 'antd'

export type BadgeProps = {
  /** 徽章内容 */
  children?: React.ReactNode
  /** 变体样式（映射到 antd 的 color） */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** 尺寸（保留以兼容旧 API，antd Badge 不支持自定义尺寸） */
  size?: 'small' | 'medium' | 'large'
  /** 自定义类名 */
  className?: string
  /** 是否显示为圆点 */
  dot?: boolean
  /** 数量或状态 */
  count?: React.ReactNode
} & Omit<AntdBadgeProps, 'color' | 'dot' | 'count'>

// 映射 variant 到 antd Badge 的 color
const variantToColor = {
  default: 'default',
  primary: 'blue',
  success: 'green',
  warning: 'orange',
  error: 'red',
  info: 'cyan',
} as const

/**
 * Badge 徽章组件
 *
 * 用于显示标记、数量、状态等信息
 * 基于 antd Badge 组件封装
 *
 * @example
 * ```tsx
 * <Badge variant="primary" count={5}>
 *   <Button>消息</Button>
 * </Badge>
 *
 * <Badge variant="error" count={99}>
 *   <span>通知</span>
 * </Badge>
 *
 * <Badge dot variant="success">
 *   <span>状态</span>
 * </Badge>
 * ```
 */
export const Badge = ({
  children,
  variant = 'default',
  size: _size,
  className,
  dot = false,
  count,
  ...props
}: BadgeProps) => {
  const color = variantToColor[variant] || 'default'

  // 如果只有 dot，使用 dot 模式
  if (dot && !count && !children) {
    return (
      <AntdBadge
        dot
        color={color}
        className={className}
        {...props}
      />
    )
  }

  // 如果有 children，包裹 children
  if (children) {
    return (
      <AntdBadge
        count={count}
        dot={dot}
        color={color}
        className={className}
        {...props}
      >
        {children}
      </AntdBadge>
    )
  }

  // 否则直接显示 Badge
  return (
    <AntdBadge
      count={count}
      dot={dot}
      color={color}
      className={className}
      {...props}
    />
  )
}

Badge.displayName = 'Badge'
