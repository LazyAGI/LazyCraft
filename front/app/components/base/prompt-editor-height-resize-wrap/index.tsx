'use client'
import React, { useCallback, useEffect, useState } from 'react'
import type { FC } from 'react'
import { useDebounceFn } from 'ahooks'
import cn from '@/shared/utils/classnames'

type PromptEditorResizableHeightWrapperProps = {
  className?: string
  height: number
  minHeight: number
  onHeightChange: (height: number) => void
  children: JSX.Element
  footer?: JSX.Element
  disableResize?: boolean
}

/**
 * 提示编辑器高度调整包装器组件
 * 提供拖拽调整编辑器高度的功能
 */
const PromptEditorResizableHeightWrapperper: FC<PromptEditorResizableHeightWrapperProps> = ({
  className,
  height,
  minHeight,
  onHeightChange,
  children,
  footer,
  disableResize,
}) => {
  const [mouseYPosition, setMouseYPosition] = useState(0)
  const [isBeingResized, setIsBeingResized] = useState(false)
  const [originalUserSelect, setOriginalUserSelect] = useState(getComputedStyle(document.body).userSelect)

  // 处理调整开始事件
  const handleResizeStart = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setMouseYPosition(e.clientY)
    setIsBeingResized(true)
    setOriginalUserSelect(getComputedStyle(document.body).userSelect)
    document.body.style.userSelect = 'none'
  }, [])

  // 处理调整结束事件
  const handleResizeStop = useCallback(() => {
    setIsBeingResized(false)
    document.body.style.userSelect = originalUserSelect
  }, [originalUserSelect])

  // 处理调整移动事件（防抖处理）
  const { run: handleResizeMove } = useDebounceFn((e) => {
    if (!isBeingResized)
      return

    const offset = e.clientY - mouseYPosition
    let newHeight = height + offset
    setMouseYPosition(e.clientY)
    if (newHeight < minHeight)
      newHeight = minHeight
    onHeightChange(newHeight)
  }, {
    wait: 0,
  })

  const processResize = useCallback(handleResizeMove, [isBeingResized, height, minHeight, mouseYPosition])

  // 监听鼠标移动事件
  useEffect(() => {
    document.addEventListener('mousemove', processResize)
    return () => {
      document.removeEventListener('mousemove', processResize)
    }
  }, [processResize])

  // 监听鼠标释放事件
  useEffect(() => {
    document.addEventListener('mouseup', handleResizeStop)
    return () => {
      document.removeEventListener('mouseup', handleResizeStop)
    }
  }, [handleResizeStop])

  // 渲染调整手柄
  const renderResizeHandler = () => {
    if (disableResize)
      return null

    return (
      <div
        className='absolute bottom-0 left-0 w-full flex justify-center h-2 cursor-row-resize'
        onMouseDown={handleResizeStart}>
        <div className='w-5 h-[3px] rounded-sm bg-gray-300'></div>
      </div>
    )
  }

  return (
    <div className='relative'>
      <div
        className={cn(className, 'prompt-editor-height-resize-wrapper', 'overflow-y-auto')}
        style={{ height }}
      >
        {children}
      </div>
      {footer}
      {renderResizeHandler()}
    </div>
  )
}

export default React.memo(PromptEditorResizableHeightWrapperper)
