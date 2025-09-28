import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 面板调整大小Hook参数接口
 */
type UseWorkflowNodeResizePanelParams = {
  /** 调整方向：both(双向)、horizontal(水平)、vertical(垂直) */
  direction?: 'both' | 'horizontal' | 'vertical'
  /** 最大高度限制 */
  maxHeight?: number
  /** 最大宽度限制 */
  maxWidth?: number
  /** 最小高度限制 */
  minHeight?: number
  /** 最小宽度限制 */
  minWidth?: number
  /** 调整过程中的回调函数 */
  handleResize?: (width: number, height: number) => void
  /** 调整完成后的回调函数 */
  handleResized?: (width: number, height: number) => void
  /** 触发器方向：支持8个方向 */
  triggerDirection?: 'bottom' | 'bottom-left' | 'bottom-right' | 'left' | 'right' | 'top' | 'top-left' | 'top-right'
}

/**
 * 工作流节点面板调整大小Hook
 *
 * 该Hook用于管理工作流节点面板的大小调整，支持：
 * - 双向、水平、垂直调整
 * - 最大/最小尺寸限制
 * - 8个方向的触发器
 * - 调整过程和完成回调
 * - 用户选择样式管理
 * - 鼠标事件处理
 *
 * @param params Hook参数
 * @returns 容器引用和触发器引用
 */
export const useWorkflowNodeResizePanel = (params?: UseWorkflowNodeResizePanelParams) => {
  // 解构参数，设置默认值
  const {
    direction = 'both',
    maxHeight = Infinity,
    maxWidth = Infinity,
    minHeight = -Infinity,
    minWidth = -Infinity,
    handleResize,
    handleResized,
    triggerDirection = 'bottom-right',
  } = params || {}

  // 引用管理
  const wrapperRef = useRef<HTMLDivElement>(null)
  const initializeContainerHeightRef = useRef(0)
  const initializeContainerWidthRef = useRef(0)
  const initializeXRef = useRef(0)
  const initializeYRef = useRef(0)
  const isAdjustingRef = useRef(false)
  const triggerRef = useRef<HTMLDivElement>(null)

  // 用户选择样式状态管理
  const [previousUserSelectStyle, setPreviousUserSelectStyle] = useState('')

  /**
   * 获取初始的用户选择样式
   * 用于在调整过程中禁用文本选择
   */
  const getInitialUserSelectStyle = useCallback(() => {
    if (typeof document !== 'undefined' && document.body)
      return getComputedStyle(document.body).userSelect
    return ''
  }, [])

  // 初始化用户选择样式
  useEffect(() => {
    setPreviousUserSelectStyle(getInitialUserSelectStyle())
  }, [getInitialUserSelectStyle])

  /**
   * 开始调整大小的处理函数
   * 记录初始位置和尺寸，设置调整状态
   */
  const handleResizeBegin = useCallback((e: MouseEvent) => {
    initializeXRef.current = e.clientX
    initializeYRef.current = e.clientY
    initializeContainerWidthRef.current = wrapperRef.current?.offsetWidth || minWidth
    initializeContainerHeightRef.current = wrapperRef.current?.offsetHeight || minHeight
    isAdjustingRef.current = true
    setPreviousUserSelectStyle(getComputedStyle(document.body).userSelect)
    document.body.style.userSelect = 'none'
  }, [minHeight, minWidth])

  /**
   * 调整大小过程中的处理函数
   * 根据方向和触发器位置计算新尺寸
   */
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isAdjustingRef.current || !wrapperRef.current)
      return

    // 水平方向调整
    if (direction === 'both' || direction === 'horizontal') {
      const offsetX = e.clientX - initializeXRef.current
      let width = 0

      // 根据触发器方向计算宽度变化
      if (triggerDirection === 'bottom-left' || triggerDirection === 'left' || triggerDirection === 'top-left')
        width = initializeContainerWidthRef.current - offsetX
      else if (triggerDirection === 'bottom-right' || triggerDirection === 'right' || triggerDirection === 'top-right')
        width = initializeContainerWidthRef.current + offsetX

      // 应用尺寸限制
      if (width < minWidth)
        width = minWidth
      if (width > maxWidth)
        width = maxWidth

      wrapperRef.current.style.width = `${width}px`
      handleResize?.(width, 0)
    }

    // 垂直方向调整
    if (direction === 'both' || direction === 'vertical') {
      const offsetY = e.clientY - initializeYRef.current
      let height = 0

      // 根据触发器方向计算高度变化
      if (triggerDirection === 'bottom' || triggerDirection === 'bottom-left' || triggerDirection === 'bottom-right')
        height = initializeContainerHeightRef.current + offsetY
      else if (triggerDirection === 'top' || triggerDirection === 'top-left' || triggerDirection === 'top-right')
        height = initializeContainerHeightRef.current - offsetY

      // 应用尺寸限制
      if (height < minHeight)
        height = minHeight
      if (height > maxHeight)
        height = maxHeight

      wrapperRef.current.style.height = `${height}px`
      handleResize?.(0, height)
    }
  }, [
    direction,
    maxHeight,
    maxWidth,
    minHeight,
    minWidth,
    handleResize,
    triggerDirection,
  ])

  /**
   * 停止调整大小的处理函数
   * 恢复用户选择样式，触发完成回调
   */
  const resizeStopHandler = useCallback(() => {
    isAdjustingRef.current = false
    document.body.style.userSelect = previousUserSelectStyle

    // 触发调整完成回调
    if (handleResized && wrapperRef.current)
      handleResized(wrapperRef.current.offsetWidth, wrapperRef.current.offsetHeight)
  }, [handleResized, previousUserSelectStyle])

  // 事件监听器管理
  useEffect(() => {
    const element = triggerRef.current
    element?.addEventListener('mousedown', handleResizeBegin)
    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', resizeStopHandler)

    // 清理事件监听器
    return () => {
      if (element)
        element.removeEventListener('mousedown', handleResizeBegin)
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', resizeStopHandler)
    }
  }, [handleResizeMove, handleResizeBegin, resizeStopHandler])

  return {
    /** 容器元素的引用，用于设置尺寸 */
    wrapperRef,
    /** 触发器元素的引用，用于监听拖拽事件 */
    triggerRef,
  }
}
