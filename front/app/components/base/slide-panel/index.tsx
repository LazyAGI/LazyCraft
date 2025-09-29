'use client'
import React from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Button from '../click-unit'
import cn from '@/shared/utils/classnames'

type DrawerComponentProps = {
  title?: string
  panelClassname?: string
  description?: string
  mask?: boolean
  children: React.ReactNode
  footer?: React.ReactNode
  centerPlacement?: boolean
  showClose?: boolean
  outsideClickBlocked?: boolean
  isOpen: boolean
  onOk?: () => void
  onClose: () => void
  onCancel?: () => void
}
export default function Drawer({
  title = '',
  children,
  showClose = false,
  panelClassname = '',
  footer,
  centerPlacement,
  mask = true,
  description = '',
  outsideClickBlocked,
  isOpen,
  onOk,
  onClose,
  onCancel,
}: DrawerComponentProps) {
  const buildContainerClassName = () => cn('flex w-screen h-screen justify-end', centerPlacement && '!justify-center')

  const buildPanelCls = () => cn(
    'relative z-50 flex flex-col justify-between bg-white w-full max-w-sm p-6 overflow-hidden text-left align-middle shadow-xl',
    panelClassname,
  )

  const buildMaskClassName = () => cn('z-40 fixed inset-0', mask && 'bg-black bg-opacity-30')

  const renderTitleSection = () => {
    if (!title && !showClose)
      return null

    return (
      <>
        {title && (
          <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
            {title}
          </Dialog.Title>
        )}
        {showClose && (
          <Dialog.Title className="flex items-center mb-4" as="div">
            <XMarkIcon className='w-4 h-4 text-gray-500' onClick={onClose} />
          </Dialog.Title>
        )}
      </>
    )
  }

  const renderDescription = () => {
    if (!description)
      return null
    return <Dialog.Description className='text-gray-500 text-xs font-normal mt-2'>{description}</Dialog.Description>
  }

  const renderFooterSection = () => {
    if (footer === null)
      return null
    if (footer)
      return footer

    return (
      <div className="mt-10 flex flex-row justify-end">
        <Button className='mr-2' onClick={onCancel}>
          {'取消'}
        </Button>
        <Button onClick={onOk}>
          {'保存'}
        </Button>
      </div>
    )
  }

  return (
    <Dialog
      open={isOpen}
      onClose={() => !outsideClickBlocked && onClose()}
      className="fixed z-30 inset-0 overflow-y-auto"
    >
      <div className={buildContainerClassName()}>
        <Dialog.Overlay className={buildMaskClassName()} />
        <div className={buildPanelCls()}>
          {renderTitleSection()}
          {renderDescription()}
          {children}
          {renderFooterSection()}
        </div>
      </div>
    </Dialog>
  )
}
