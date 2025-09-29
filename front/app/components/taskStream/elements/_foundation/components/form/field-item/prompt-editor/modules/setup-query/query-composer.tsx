'use client'
import React, { useCallback, useEffect, useState } from 'react'
import type { FC } from 'react'
import { useDebounceFn } from 'ahooks'
import cn from '@/shared/utils/classnames'

type Props = {
  className?: string
  height: number
  minHeight: number
  onHeightChange: (height: number) => void
  children: JSX.Element
  footer?: JSX.Element
  disableResize?: boolean
}

const PromptEditorResizableHeightWrapper: FC<Props> = ({
  className,
  height,
  minHeight,
  onHeightChange,
  children,
  footer,
  disableResize,
}) => {
  const [clientY, setClientY] = useState(0)
  const [isBeingResized, setIsBeingResized] = useState(false)
  const [previousUserSelectStyle, setPreviousUserSelectStyle] = useState(getComputedStyle(document.body).userSelect)

  const handleResizeBegin = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setClientY(e.clientY)
    setIsBeingResized(true)
    setPreviousUserSelectStyle(getComputedStyle(document.body).userSelect)
    document.body.style.userSelect = 'none'
  }, [])

  const resizeStopHandler = useCallback(() => {
    setIsBeingResized(false)
    document.body.style.userSelect = previousUserSelectStyle
  }, [previousUserSelectStyle])

  const { run: didHandleResize } = useDebounceFn((e) => {
    if (!isBeingResized)
      return

    const offset = e.clientY - clientY
    let newHeight = height + offset
    setClientY(e.clientY)
    if (newHeight < minHeight)
      newHeight = minHeight
    onHeightChange(newHeight)
  }, {
    wait: 0,
  })

  const handleResize = useCallback(didHandleResize, [isBeingResized, height, minHeight, clientY])

  useEffect(() => {
    document.addEventListener('mouseup', resizeStopHandler)
    return () => {
      document.removeEventListener('mouseup', resizeStopHandler)
    }
  }, [resizeStopHandler])

  useEffect(() => {
    document.addEventListener('mousemove', handleResize)
    return () => {
      document.removeEventListener('mousemove', handleResize)
    }
  }, [handleResize])



  return (
    <div
      className='relative'
    >
      <div className={cn(className, 'prompt-editor-height-resize-wrapper', 'overflow-y-auto')}
        style={{ height: !disableResize ? height : 'auto', minHeight: disableResize ? minHeight : undefined }}
      >
        {children}
      </div>
      {footer}
      {(!disableResize) && (
        <div
          className='absolute bottom-0 left-0 w-full flex justify-center h-2 cursor-row-resize'
          onMouseDown={handleResizeBegin}>
          <div className='w-5 h-[3px] rounded-sm bg-gray-300'></div>
        </div>
      )}
    </div>
  )
}
export default React.memo(PromptEditorResizableHeightWrapper)
