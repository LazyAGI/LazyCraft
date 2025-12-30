'use client'

import React from 'react'
import { Input as AntdInput } from 'antd'
import type { InputProps as AntdInputProps } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import classNames from '@/shared/utils/classnames'

export type InputProps = {
  /** 占位符文本 */
  placeholder?: string
  /** 受控值 */
  value?: string
  /** 非受控默认值 */
  defaultValue?: string
  /** 值变化回调 */
  onChange?: (inputValue: string) => void
  /** 输入框自定义类名 */
  className?: string
  /** 外层容器自定义类名 */
  wrapperClass?: string
  /** 输入框类型 */
  type?: string
  /** 是否显示前缀图标 */
  showPrefix?: boolean
  /** 自定义前缀图标 */
  prefixIcon?: React.ReactNode
  /** 是否禁用 */
  disabled?: boolean
} & Omit<AntdInputProps, 'prefix' | 'onChange' | 'value' | 'defaultValue'>

/**
 * Input 输入框组件
 *
 * 提供基础的文本输入功能，支持前缀图标、搜索模式等
 * 基于 antd Input 组件封装
 *
 * @example
 * ```tsx
 * <Input
 *   placeholder="请输入内容"
 *   value={value}
 *   onChange={(val) => setValue(val)}
 * />
 *
 * <Input
 *   showPrefix
 *   placeholder="搜索..."
 *   onChange={handleSearch}
 * />
 * ```
 */
export const Input = ({
  value,
  defaultValue,
  onChange,
  className = '',
  wrapperClass = '',
  placeholder,
  type,
  showPrefix,
  prefixIcon,
  disabled,
  ...props
}: InputProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }

  const placeholderText = placeholder || (showPrefix ? '搜索' : 'please input')
  const prefix = showPrefix ? (prefixIcon || <SearchOutlined />) : undefined

  return (
    <div className={classNames('relative inline-flex w-full', wrapperClass)}>
      <AntdInput
        type={type || 'text'}
        placeholder={placeholderText}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        disabled={disabled}
        prefix={prefix}
        className={className}
        {...props}
      />
    </div>
  )
}

Input.displayName = 'Input'
