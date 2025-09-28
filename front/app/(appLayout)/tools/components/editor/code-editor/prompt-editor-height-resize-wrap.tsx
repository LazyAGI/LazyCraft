'use client'

import React, { useCallback, useEffect, useState } from 'react'
import type { FC } from 'react'
import { useDebounceFn } from 'ahooks'
import cn from '@/shared/utils/classnames'

/**
 * 提示编辑器高度调整包装器属性类型
 * 定义了可调整高度的编辑器组件的所有配置选项
 */
type PromptEditorResizableHeightWrapperProps = {
  className?: string // 自定义CSS类名
  height: number // 当前编辑器高度
  minHeight: number // 最小允许高度
  onHeightChange: (height: number) => void // 高度变化回调函数
  children: JSX.Element // 子组件内容
  footer?: JSX.Element // 底部内容（可选）
  disableResize?: boolean // 是否隐藏调整手柄
}

/**
 * 提示编辑器高度调整包装器组件
 * 提供拖拽调整编辑器高度的功能，支持最小高度限制
 */
const PromptEditorResizableHeightWrapper: FC<PromptEditorResizableHeightWrapperProps> = ({
  children,
  className,
  footer,
  height,
  disableResize,
  minHeight,
  onHeightChange,
}) => {
  // 鼠标Y轴位置状态，用于计算拖拽偏移量
  const [mouseYPosition, setMouseYPosition] = useState(0)
  // 拖拽状态标志
  const [isDragging, setIsDragging] = useState(false)
  // 原始用户选择样式，用于拖拽时临时禁用文本选择
  const [originalUserSelect, setOriginalUserSelect] = useState(getComputedStyle(document.body).userSelect)

  /**
   * 处理拖拽移动事件
   * 使用防抖优化性能，计算新高度并更新状态
   */
  const { run: handleResizeMove } = useDebounceFn((e) => {
    if (!isDragging)
      return

    // 计算鼠标移动的偏移量
    const offset = e.clientY - mouseYPosition
    let newHeight = height + offset
    setMouseYPosition(e.clientY)

    // 确保高度不小于最小限制
    if (newHeight < minHeight)
      newHeight = minHeight

    // 通知父组件高度变化
    onHeightChange(newHeight)
  }, {
    wait: 0, // 无延迟，确保拖拽响应及时
  })

  /**
   * 处理拖拽开始事件
   * 初始化拖拽状态并禁用页面文本选择
   */
  const handleResizeStart = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setMouseYPosition(e.clientY)
    setIsDragging(true)
    setOriginalUserSelect(getComputedStyle(document.body).userSelect)
    document.body.style.userSelect = 'none'
  }, [])

  /**
   * 处理拖拽结束事件
   * 重置拖拽状态并恢复页面文本选择
   */
  const handleResizeStop = useCallback(() => {
    setIsDragging(false)
    document.body.style.userSelect = originalUserSelect
  }, [originalUserSelect])

  /**
   * 处理拖拽移动的包装函数
   * 使用useCallback优化性能，避免不必要的重新创建
   */
  const processResize = useCallback(handleResizeMove, [isDragging, height, minHeight, mouseYPosition])

  /**
   * 监听鼠标移动事件
   * 在拖拽过程中实时更新编辑器高度
   */
  useEffect(() => {
    document.addEventListener('mousemove', processResize)
    return () => {
      document.removeEventListener('mousemove', processResize)
    }
  }, [processResize])

  /**
   * 监听鼠标释放事件
   * 拖拽结束时清理状态
   */
  useEffect(() => {
    document.addEventListener('mouseup', handleResizeStop)
    return () => {
      document.removeEventListener('mouseup', handleResizeStop)
    }
  }, [handleResizeStop])

  /**
   * 渲染高度调整手柄
   * 提供可视化的拖拽区域，支持隐藏功能
   */
  const renderResizeHandler = () => {
    if (disableResize)
      return null

    return (
      <div
        className='absolute bottom-0 left-0 w-full flex justify-center h-2 cursor-row-resize'
        onMouseDown={handleResizeStart}
      >
        {/* 拖拽手柄的视觉指示器 */}
        <div className='w-5 h-[3px] rounded-sm bg-gray-300'></div>
      </div>
    )
  }

  return (
    <div className='relative'>
      {/* 主要内容容器，高度可动态调整 */}
      <div
        className={cn(className)}
        style={{ height }}
      >
        {children}
      </div>

      {/* 底部内容区域 */}
      {footer}

      {/* 高度调整手柄 */}
      {renderResizeHandler()}
    </div>
  )
}

export default React.memo(PromptEditorResizableHeightWrapper)
