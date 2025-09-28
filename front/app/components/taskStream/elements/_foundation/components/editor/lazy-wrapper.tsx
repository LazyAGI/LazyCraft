'use client'
import type { FC } from 'react'
import { useRef, useState } from 'react'
import classNames from 'classnames'
import { useMutationObserver } from 'ahooks'

type WrapperComponentProps = {
  inWorkflow?: boolean
  isOpened: boolean
  className: string
  style: React.CSSProperties
  children: React.ReactNode
}

const WebAppWrapperComponent: FC<WrapperComponentProps> = ({ className, style, children }) => {
  return <div className={className} style={style}>{children}</div>
}

const WorkflowWrapperComponent: FC<WrapperComponentProps> = ({
  className,
  style,
  isOpened,
  children,
}) => {
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, left: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)

  const workflowPanel = wrapperRef.current?.closest('.canvas-panel-wrap') as HTMLElement

  useMutationObserver(() => {
    const rect = workflowPanel?.getBoundingClientRect()
    if (rect) {
      setContainerDimensions({
        width: rect.width,
        left: rect.left,
      })
    }
  }, workflowPanel, {
    attributes: true,
    childList: true,
    characterData: true,
  })

  const computedStyle = isOpened
    ? {
      ...style,
      width: containerDimensions.width - 1,
      left: containerDimensions.left,
    }
    : style

  return (
    <div
      ref={wrapperRef}
      className={classNames(className)}
      style={computedStyle}
    >
      {children}
    </div>
  )
}

const DynamicWrapperComponent: FC<WrapperComponentProps> = ({ inWorkflow, ...props }) => {
  return inWorkflow ? <WorkflowWrapperComponent {...props} /> : <WebAppWrapperComponent {...props} />
}

export default DynamicWrapperComponent
