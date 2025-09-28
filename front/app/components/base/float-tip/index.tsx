import { Popover, Transition } from '@headlessui/react'
import { Fragment, cloneElement, useRef } from 'react'
import s from './style.module.css'
import cn from '@/shared/utils/classnames'

type PopoverContentProps = {
  onClick?: () => void
  onClose?: () => void
}

type CustomPopoverComponentProps = {
  htmlContent: React.ReactElement<PopoverContentProps>
  className?: string
  buttonElement?: string | React.ReactNode
  closeManually?: boolean
  trigger?: 'click' | 'hover'
  popupCls?: string
  position?: 'bottom' | 'br' | 'bl'
  btnClassName?: string | ((isOpen: boolean) => string)
}

const HOVER_TIMEOUT_DURATION = 100

export default function FloatingCustomPanel({
  position = 'bottom',
  trigger = 'hover',
  popupCls,
  htmlContent,
  className,
  buttonElement,
  closeManually,
  btnClassName,
}: CustomPopoverComponentProps) {
  const buttonRefwarrod = useRef<HTMLButtonElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 处理鼠标进入事件
  const processMouseEnter = (isOpen: boolean) => {
    if (hoverTimeoutRef.current)
      clearTimeout(hoverTimeoutRef.current)

    if (!isOpen && buttonRefwarrod.current)
      buttonRefwarrod.current.click()
  }

  // 处理鼠标离开事件
  const processMouseLeave = (isOpen: boolean) => {
    hoverTimeoutRef.current = setTimeout(() => {
      if (isOpen && buttonRefwarrod.current)
        buttonRefwarrod.current.click()
    }, HOVER_TIMEOUT_DURATION)
  }

  // 构建按钮样式类名
  const buildButtonClassName = (isOpen: boolean) => {
    const baseClass = `group ${s.popupBtn}`
    const openStateClass = isOpen ? '' : 'bg-gray-100'
    const customClass = !btnClassName
      ? ''
      : typeof btnClassName === 'string'
        ? btnClassName
        : btnClassName?.(isOpen)

    return `${baseClass} ${openStateClass} ${customClass}`.trim()
  }

  // 构建面板样式类名
  const buildPanelCls = () => {
    const baseClass = s.popupPanel
    const positionClass = position === 'bottom' && '-translate-x-1/2 left-1/2'
    const leftClass = position === 'bl' && 'left-0'
    const rightClass = position === 'br' && 'right-0'

    return cn(baseClass, positionClass, leftClass, rightClass, className)
  }

  // 渲染触发按钮
  const renderTriggerButton = (isOpen: boolean) => (
    <Popover.Button
      ref={buttonRefwarrod}
      className={buildButtonClassName(isOpen)}
    >
      {buttonElement}
    </Popover.Button>
  )

  // 渲染弹出面板
  const renderPopoverPanel = (isOpen: boolean) => (
    <Transition as={Fragment}>
      <Popover.Panel
        className={buildPanelCls()}
        {...(trigger !== 'hover'
          ? {}
          : {
            onMouseLeave: () => processMouseLeave(isOpen),
            onMouseEnter: () => processMouseEnter(isOpen),
          })
        }
      >
        {({ close }) => (
          <div
            className={cn(s.panelContainer, popupCls)}
            {...(trigger !== 'hover'
              ? {}
              : {
                onMouseLeave: () => processMouseLeave(isOpen),
                onMouseEnter: () => processMouseEnter(isOpen),
              })
            }
          >
            {cloneElement(htmlContent as React.ReactElement<PopoverContentProps>, {
              onClose: () => processMouseLeave(isOpen),
              ...(closeManually
                ? {
                  onClick: close,
                }
                : {}),
            })}
          </div>
        )}
      </Popover.Panel>
    </Transition>
  )

  return (
    <Popover className="relative">
      {({ open }: { open: boolean }) => (
        <>
          <div
            {...(trigger !== 'hover'
              ? {}
              : {
                onMouseLeave: () => processMouseLeave(open),
                onMouseEnter: () => processMouseEnter(open),
              })}
          >
            {renderTriggerButton(open)}
            {renderPopoverPanel(open)}
          </div>
        </>
      )}
    </Popover>
  )
}
