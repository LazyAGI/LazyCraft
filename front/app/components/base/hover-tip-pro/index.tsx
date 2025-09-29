'use client'
import { useBoolean } from 'ahooks'
import type { OffsetOptions, Placement } from '@floating-ui/react'
import React, { useEffect, useRef, useState } from 'react'
import type { FC } from 'react'
import { AnchorPortal, AnchorPortalLauncher, BindPortalContent } from '@/app/components/base/promelement'
import cn from '@/shared/utils/classnames'

type TooltipPlusProps = {
  position?: Placement
  triggerMethod?: 'hover' | 'click'
  disabled?: boolean
  popupContent: React.ReactNode
  children: React.ReactNode
  hideArrow?: boolean
  popupCls?: string
  offset?: OffsetOptions
  asElement?: boolean
}

const renderArrow = (
  <svg className="absolute text-white h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
    <polygon className="fill-current" points="0,0 127.5,127.5 255,0"></polygon>
  </svg>
)

const HoverGuide: FC<TooltipPlusProps> = ({
  asElement,
  children,
  disabled = false,
  hideArrow,
  offset,
  popupCls,
  popupContent,
  position = 'top',
  triggerMethod = 'hover',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isHoveringPopup, {
    setTrue: activatePopupHover,
    setFalse: deactivatePopupHover,
  }] = useBoolean(false)

  const popupHoverRef = useRef(isHoveringPopup)
  useEffect(() => {
    popupHoverRef.current = isHoveringPopup
  }, [isHoveringPopup])

  const [isHoveringTrigger, { setTrue: activateTriggerHover, setFalse: deactivateTriggerHover }] = useBoolean(false)

  const triggerHoverRef = useRef(isHoveringTrigger)
  useEffect(() => {
    triggerHoverRef.current = isHoveringTrigger
  }, [isHoveringTrigger])

  const processMouseLeave = (isFromTrigger: boolean) => {
    if (isFromTrigger)
      deactivateTriggerHover()
    else
      deactivatePopupHover()

    setTimeout(() => {
      if (!popupHoverRef.current && !triggerHoverRef.current)
        setIsOpen(false)
    }, 500)
  }

  const buildpopupCls = () => cn(
    'relative px-3 py-2 text-xs font-normal text-gray-700 bg-white rounded-md shadow-lg',
    popupCls,
  )

  const handleTriggerClick = () => {
    if (triggerMethod === 'click')
      setIsOpen(currentState => !currentState)
  }

  const handleTriggerMouseEnter = () => {
    if (triggerMethod === 'hover') {
      activateTriggerHover()
      setIsOpen(true)
    }
  }

  const handleTriggerMouseLeave = () => {
    if (triggerMethod === 'hover')
      processMouseLeave(true)
  }

  const handlePopupMouseEnter = () => {
    if (triggerMethod === 'hover')
      activatePopupHover()
  }

  const handlePopupMouseLeave = () => {
    if (triggerMethod === 'hover')
      processMouseLeave(false)
  }

  return (
    <AnchorPortal
      open={disabled ? false : isOpen}
      onOpenChange={setIsOpen}
      placement={position}
      offset={offset ?? 10}
    >
      <AnchorPortalLauncher
        onClick={handleTriggerClick}
        onMouseEnter={handleTriggerMouseEnter}
        onMouseLeave={handleTriggerMouseLeave}
        asElement={asElement}
      >
        {children}
      </AnchorPortalLauncher>
      <BindPortalContent className="z-[9999]">
        <div
          className={buildpopupCls()}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        >
          {popupContent}
          {!hideArrow && renderArrow}
        </div>
      </BindPortalContent>
    </AnchorPortal>
  )
}

export default React.memo(HoverGuide)
