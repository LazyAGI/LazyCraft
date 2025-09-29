'use client'
import type { FC } from 'react'
import React from 'react'
import { Tooltip as ReactTooltip } from 'react-tooltip'
import classNames from '@/shared/utils/classnames'
import 'react-tooltip/dist/react-tooltip.css'

type TooltipComponentProps = {
  selector: string
  content?: string
  disabled?: boolean
  htmlContent?: React.ReactNode
  className?: string
  clickable?: boolean
  children: React.ReactNode
  noArrow?: boolean
  position?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * 工具提示组件
 * 基于 react-tooltip 的自定义工具提示组件
 */
const HoverTip: FC<TooltipComponentProps> = ({
  selector,
  content,
  disabled,
  position = 'top',
  children,
  htmlContent,
  className,
  clickable,
  noArrow,
}) => {
  // 构建工具提示的样式类名
  const buildTooltipClassName = () => classNames(
    '!z-[999] !bg-white !text-xs !font-normal !text-gray-700 !shadow-lg !opacity-100',
    className,
  )

  // 渲染工具提示内容
  const renderTooltipContent = () => {
    if (htmlContent)
      return htmlContent

    return null
  }

  return (
    <div className='tooltip-container'>
      {React.cloneElement(children as React.ReactElement, {
        'data-tooltip-id': selector,
      })}
      <ReactTooltip
        id={selector}
        content={content}
        className={buildTooltipClassName()}
        place={position}
        clickable={clickable}
        isOpen={disabled ? false : undefined}
        noArrow={noArrow}
      >
        {renderTooltipContent()}
      </ReactTooltip>
    </div>
  )
}

export default HoverTip
