'use client'
import React, { useEffect, useState } from 'react'
import { Switch as OriginalSwitch } from '@headlessui/react'
import classNames from '@/shared/utils/classnames'

type SwitchComponentProps = {
  onChange?: (value: boolean) => void
  defaultValue?: boolean
  disabled?: boolean
  className?: string
}

/**
 * 开关组件
 * 基于 Headless UI 的自定义开关组件
 */
const Switch = ({ onChange, defaultValue = false, disabled = false, className }: SwitchComponentProps) => {
  const [isActive, setIsActive] = useState(defaultValue)

  // 同步默认值变化
  useEffect(() => {
    setIsActive(defaultValue)
  }, [defaultValue])

  // 容器尺寸
  const containerDimension = 'h-5 w-9'

  // 滑块尺寸
  const knobDimension = 'h-4 w-4'

  // 激活状态下的滑块位移值
  const activeTransformValue = 'translate-x-4'

  // 处理开关状态变更
  const handleToggleChange = (checked: boolean) => {
    if (disabled)
      return

    setIsActive(checked)
    onChange?.(checked)
  }

  // 构建容器样式类名
  const buildContainerClassName = () => classNames(
    containerDimension,
    isActive ? 'bg-components-toggle-bg' : 'bg-components-toggle-bg-unchecked',
    'relative inline-flex flex-shrink-0 cursor-pointer rounded-[5px] border-2 border-transparent transition-colors duration-200 ease-in-out',
    disabled ? '!opacity-50 !cursor-not-allowed' : '',
    className,
  )

  // 构建滑块样式类名
  const buildKnobClassName = () => classNames(
    knobDimension,
    isActive ? activeTransformValue : 'translate-x-0',
    'pointer-events-none inline-block transform rounded-[3px] bg-components-toggle-knob shadow ring-0 transition duration-200 ease-in-out',
  )

  return (
    <OriginalSwitch
      checked={isActive}
      onChange={handleToggleChange}
      className={buildContainerClassName()}
    >
      <span
        aria-hidden="true"
        className={buildKnobClassName()}
      />
    </OriginalSwitch>
  )
}

export default React.memo(Switch)
