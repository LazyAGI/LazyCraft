'use client'

import React from 'react'
import { Modal as AntdModal } from 'antd'
import type { ModalProps as AntdModalProps } from 'antd'
import classNames from '@/shared/utils/classnames'

export type ModalProps = {
  /** 子元素 */
  children?: React.ReactNode
  /** 内容区域自定义类名 */
  className?: string
  /** 描述信息 */
  description?: React.ReactNode
  /** 是否显示关闭按钮 */
  closable?: boolean
  /** 是否显示模态框 */
  isShow: boolean
  /** 关闭回调 */
  onClose?: () => void
  /** 标题 */
  title?: React.ReactNode
  /** 外层容器自定义类名 */
  wrapperClass?: string
  /** 点击遮罩是否关闭 */
  maskClosable?: boolean
} & Omit<AntdModalProps, 'open' | 'onCancel' | 'title' | 'closable' | 'maskClosable'>

/**
 * Modal 模态框组件
 *
 * 用于显示对话框、确认框等弹窗内容
 * 基于 antd Modal 组件封装
 *
 * @example
 * ```tsx
 * <Modal
 *   isShow={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="标题"
 *   description="描述信息"
 *   closable
 * >
 *   <div>模态框内容</div>
 * </Modal>
 * ```
 */
export const Modal = ({
  children,
  className,
  description,
  closable = false,
  isShow,
  onClose,
  title,
  wrapperClass,
  maskClosable = true,
  ...props
}: ModalProps) => {
  return (
    <AntdModal
      open={isShow}
      onCancel={onClose}
      title={title}
      closable={closable}
      maskClosable={maskClosable}
      className={classNames(className, wrapperClass)}
      footer={null}
      {...props}
    >
      {description && (
        <div className="text-gray-500 text-xs font-normal mt-2 mb-4">
          {description}
        </div>
      )}
      {children}
    </AntdModal>
  )
}

Modal.displayName = 'Modal'
