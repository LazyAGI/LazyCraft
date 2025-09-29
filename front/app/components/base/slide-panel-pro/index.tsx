'use client'
import type { FC } from 'react'
import React, { useRef } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import cn from '@/shared/utils/classnames'
import Drawer from '@/app/components/base/slide-panel'
import useResponsiveBreakpoints from '@/shared/hooks/use-breakpoints'

type DrawerPlusComponentProps = {
  isShow: boolean
  onHide: () => void
  panelCls?: string
  outsideClickBlocked?: boolean
  contentCls?: string
  maxWidthClassName?: string
  titleDescription?: string | JSX.Element
  height?: number | string
  title: string | JSX.Element
  headerCls?: string
  foot?: JSX.Element
  centerPlacement?: boolean
  isShowMask?: boolean
  body: JSX.Element
}

const DrawerPlus: FC<DrawerPlusComponentProps> = ({
  isShow,
  onHide,
  panelCls = '',
  maxWidthClassName = '!max-w-[641px]',
  height = 'calc(100vh - 70px)',
  outsideClickBlocked = true,
  title,
  contentCls,
  headerCls,
  foot,
  isShowMask,
  titleDescription,
  body,
  centerPlacement,
}) => {
  const wrapperRef = useRef(null)
  const deviceType = useResponsiveBreakpoints()
  const isMobileView = deviceType === 'mobile'

  if (!isShow)
    return null

  const buildPanelCls = () => cn('mt-16 mx-2 sm:mr-2 mb-3 !p-0 rounded-xl', panelCls, maxWidthClassName)

  const buildContentClassName = () => cn(
    contentCls,
    'w-full flex flex-col bg-white border-[0.5px] border-gray-200 rounded-xl shadow-xl',
  )

  const buildHeaderClassName = () => cn(headerCls, 'shrink-0 border-b border-b-gray-100 py-4')

  const renderHeaderSection = () => (
    <div className={buildHeaderClassName()}>
      <div className='flex justify-between items-center pl-6 pr-5 h-6'>
        <div className='text-base font-semibold text-gray-900'>
          {title}
        </div>
        <div className='flex items-center'>
          <div
            onClick={onHide}
            className='flex justify-center items-center w-6 h-6 cursor-pointer'
          >
            <CloseOutlined className='w-4 h-4 text-gray-500' />
          </div>
        </div>
      </div>
      {titleDescription && (
        <div className='pl-6 pr-10 leading-[18px] text-xs font-normal text-gray-500'>
          {titleDescription}
        </div>
      )}
    </div>
  )

  const renderFooterSection = () => {
    if (!foot)
      return null
    return (
      <div className='shrink-0'>
        {foot}
      </div>
    )
  }

  return (
    <Drawer
      isOpen={isShow}
      outsideClickBlocked={outsideClickBlocked}
      onClose={onHide}
      footer={null}
      mask={isMobileView || isShowMask}
      centerPlacement={centerPlacement}
      panelClassname={buildPanelCls()}
    >
      <div
        className={buildContentClassName()}
        style={{ height }}
        ref={wrapperRef}
      >
        {renderHeaderSection()}
        <div className='grow overflow-y-auto'>
          {body}
        </div>
        {renderFooterSection()}
      </div>
    </Drawer>
  )
}

export default React.memo(DrawerPlus)
