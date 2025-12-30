'use client'

import React from 'react'
import { Avatar as AntdAvatar } from 'antd'
import type { AvatarProps as AntdAvatarProps } from 'antd'

export type AvatarProps = {
  /** 显示名称，用于生成首字母 */
  displayName: string
  /** 尺寸（像素） */
  dimensions?: number
  /** 自定义类名 */
  className?: string
  /** 头像图片 URL */
  src?: string
  /** 图片加载失败时的回调 */
  onError?: () => void
} & Omit<AntdAvatarProps, 'size' | 'src'>

/**
 * Avatar 头像组件
 *
 * 用于显示用户头像，支持图片或首字母显示
 * 基于 antd Avatar 组件封装
 *
 * @example
 * ```tsx
 * <Avatar displayName="张三" dimensions={40} />
 *
 * <Avatar
 *   displayName="李四"
 *   src="/avatar.jpg"
 *   dimensions={32}
 * />
 * ```
 */
export const Avatar = ({
  displayName,
  dimensions = 30,
  className,
  src,
  onError,
  ...props
}: AvatarProps) => {
  return (
    <AntdAvatar
      size={dimensions}
      src={src}
      className={className}
      onError={onError}
      {...props}
    >
      {displayName?.length > 0 ? displayName[0]?.toLocaleUpperCase() : ''}
    </AntdAvatar>
  )
}

Avatar.displayName = 'Avatar'
