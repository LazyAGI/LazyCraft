'use client'
import type { SVGProps } from 'react'
import React, { useState } from 'react'
import s from './style.module.css'

type InputComponentProps = {
  placeholder?: string
  value?: string
  defaultValue?: string
  onChange?: (inputValue: string) => void
  className?: string
  wrapperClass?: string
  type?: string
  showPrefix?: React.ReactNode
  prefixIcon?: React.ReactNode
}

// 搜索图标组件
const SearchIcon = ({ className }: SVGProps<SVGElement>) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className ?? ''}>
    <path d="M12.25 12.25L10.2084 10.2083M11.6667 6.70833C11.6667 9.44675 9.44675 11.6667 6.70833 11.6667C3.96992 11.6667 1.75 9.44675 1.75 6.70833C1.75 3.96992 3.96992 1.75 6.70833 1.75C9.44675 1.75 11.6667 3.96992 11.6667 6.70833Z" stroke="#344054" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const Input = ({
  value,
  defaultValue,
  onChange,
  className = '',
  wrapperClass = '',
  placeholder,
  type,
  showPrefix,
  prefixIcon,
}: InputComponentProps) => {
  const [inputValue, setInputValue] = useState(value ?? defaultValue)

  // 处理输入值变化
  const processInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    setInputValue(newValue)
    onChange && onChange(newValue)
  }

  // 构建输入框样式类名
  const buildInputClassName = () => {
    const baseClass = s.inputContainer
    const prefixClass = showPrefix ? '!pl-7' : ''
    return `${baseClass} ${prefixClass} ${className}`.trim()
  }

  // 获取占位符文本
  const getPlaceholderText = () => {
    if (placeholder)
      return placeholder
    if (showPrefix)
      return '搜索'
    return 'please input'
  }

  // 渲染前缀图标
  const renderPrefixIcon = () => {
    if (!showPrefix)
      return null

    const iconToShow = prefixIcon ?? <SearchIcon className='h-3.5 w-3.5 stroke-current text-gray-700 stroke-2' />

    return <span className={s.prefixIcon}>{iconToShow}</span>
  }

  return (
    <div className={`relative inline-flex w-full ${wrapperClass}`}>
      {renderPrefixIcon()}
      <input
        type={type ?? 'text'}
        className={buildInputClassName()}
        placeholder={getPlaceholderText()}
        value={inputValue}
        onChange={processInputChange}
      />
    </div>
  )
}

export default Input
