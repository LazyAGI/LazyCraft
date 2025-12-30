'use client'

import React from 'react'
import { Switch as AntdSwitch } from 'antd'
import type { SwitchProps as AntdSwitchProps } from 'antd'

export type SwitchProps = {
  /** 值变化回调 */
  onChange?: (value: boolean) => void
  /** 默认值 */
  defaultValue?: boolean
  /** 受控值 */
  value?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
} & Omit<AntdSwitchProps, 'checked' | 'defaultChecked' | 'onChange'>

/**
 * Switch 开关组件
 *
 * 用于切换开关状态的组件
 * 基于 antd Switch 组件封装
 *
 * @example
 * ```tsx
 * <Switch
 *   defaultValue={false}
 *   onChange={(checked) => console.log(checked)}
 * />
 *
 * <Switch
 *   value={isEnabled}
 *   onChange={setIsEnabled}
 *   disabled={isLoading}
 * />
 * ```
 */
export const Switch = ({
  onChange,
  defaultValue = false,
  value,
  disabled = false,
  className,
  ...props
}: SwitchProps) => {
  const handleChange = (checked: boolean) => {
    onChange?.(checked)
  }

  return (
    <AntdSwitch
      checked={value}
      defaultChecked={defaultValue}
      onChange={handleChange}
      disabled={disabled}
      className={className}
      {...props}
    />
  )
}

Switch.displayName = 'Switch'
