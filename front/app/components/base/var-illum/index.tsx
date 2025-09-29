'use client'
import type { FC } from 'react'
import React from 'react'

import s from './style.module.css'

type VariableHighlightComponentProps = {
  name: string
  className?: string
}

/**
 * 变量高亮组件
 * 用于高亮显示变量名称，添加花括号装饰
 */
const VarHighlight: FC<VariableHighlightComponentProps> = ({
  name,
  className = '',
}) => {
  // 构建容器样式类名
  const containerClasses = `${s.variableHighlightItem} ${className} flex mb-2 items-center justify-center rounded-md px-1 h-5 text-xs font-medium text-primary-600`
  // 花括号样式
  const bracketStyle = 'opacity-60'

  // 渲染左花括号
  const renderOpeningBracket = () => <span className={bracketStyle}>{'{'}</span>
  // 渲染右花括号
  const renderClosingBracket = () => <span className={bracketStyle}>{'}'}</span>

  return (
    <div
      key={name}
      className={containerClasses}
    >
      {renderOpeningBracket()}
      <span>{name}</span>
      {renderClosingBracket()}
    </div>
  )
}

/**
 * 生成变量高亮的 HTML 字符串
 * 用于在非 React 环境中显示变量高亮
 */
export const generateVariableHighlightHTML = ({ name, className = '' }: VariableHighlightComponentProps) => {
  const htmlContent = `<div class="${s.variableHighlightItem} ${className} inline-flex mb-2 items-center justify-center px-1 rounded-md h-5 text-xs font-medium text-primary-600">
  <span class='opacity-60'>{</span>
  <span>${name}</span>
  <span class='opacity-60'>}</span>
</div>`
  return htmlContent
}

export default React.memo(VarHighlight)
