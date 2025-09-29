'use client'
import type { ReactNode } from 'react'
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/20/solid'
import { createContext, useContext } from 'use-context-selector'
import classNames from '@/shared/utils/classnames'

// Toast 类型枚举定义
export enum ToastTypeEnum {
  Error = 'error',
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
}

type ToastComponentProps = {
  type?: ToastTypeEnum
  message: string
  children?: ReactNode
  className?: string
}

type ToastContextType = {
  notify: (props: ToastComponentProps) => void
}

export const ToastContext = createContext<ToastContextType>({} as ToastContextType)
export const useToastContext = () => useContext(ToastContext)

/**
 * Toast 消息组件
 * 用于显示各种类型的通知消息
 */
const Toast = ({
  type = ToastTypeEnum.Info,
  message,
  children,
  className,
}: ToastComponentProps) => {
  // 有时消息是 React 节点数组，这里不处理
  if (typeof message !== 'string')
    return null

  return <div className={classNames(
    className,
    'fixed rounded-md p-4 my-4 mx-8 z-[9999]',
    'top-0 left-1/2 transform -translate-x-1/2',
    type === ToastTypeEnum.Success ? 'bg-green-50' : '',
    type === ToastTypeEnum.Error ? 'bg-red-50' : '',
    type === ToastTypeEnum.Warning ? 'bg-yellow-50' : '',
    type === ToastTypeEnum.Info ? 'bg-blue-50' : '',
  )}>
    <div className="flex">
      <div className="flex-shrink-0">
        {type === ToastTypeEnum.Success && <CheckCircleIcon className="w-5 h-5 text-green-400" aria-hidden="true" />}
        {type === ToastTypeEnum.Error && <XCircleIcon className="w-5 h-5 text-red-400" aria-hidden="true" />}
        {type === ToastTypeEnum.Warning && <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" aria-hidden="true" />}
        {type === ToastTypeEnum.Info && <InformationCircleIcon className="w-5 h-5 text-blue-400" aria-hidden="true" />}
      </div>
      <div className="ml-3">
        <h3 className={
          classNames(
            'text-sm font-medium',
            type === ToastTypeEnum.Success ? 'text-green-800' : '',
            type === ToastTypeEnum.Error ? 'text-red-800' : '',
            type === ToastTypeEnum.Warning ? 'text-yellow-800' : '',
            type === ToastTypeEnum.Info ? 'text-blue-800' : '',
          )
        }>{message}</h3>
        {children && <div className={
          classNames(
            'mt-2 text-sm',
            type === ToastTypeEnum.Success ? 'text-green-700' : '',
            type === ToastTypeEnum.Error ? 'text-red-700' : '',
            type === ToastTypeEnum.Warning ? 'text-yellow-700' : '',
            type === ToastTypeEnum.Info ? 'text-blue-700' : '',
          )
        }>
          {children}
        </div>
        }
      </div>
    </div>
  </div>
}

/**
 * Toast 提供者组件
 * 提供 Toast 通知的上下文和状态管理
 */
export const NotificationProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const initialToastState: ToastComponentProps = {
    type: ToastTypeEnum.Info,
    message: 'Toast message',
  }
  const [toastConfig, setToastConfig] = React.useState<ToastComponentProps>(initialToastState)
  const currentDuration = (toastConfig.type === ToastTypeEnum.Success || toastConfig.type === ToastTypeEnum.Info) ? 3000 : 6000
  const [isVisible, setIsVisible] = useState(false)

  // 自动隐藏 Toast 消息
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        setIsVisible(false)
      }, currentDuration)
    }
  }, [currentDuration, isVisible])

  // 处理通知显示
  const handleNotification = (props: ToastComponentProps) => {
    setIsVisible(true)
    setToastConfig(props)
  }

  return (
    <ToastContext.Provider value={{
      notify: handleNotification,
    }}>
      {isVisible && <Toast {...toastConfig} />}
      {children}
    </ToastContext.Provider>
  )
}

// 静态方法：直接显示 Toast 消息
Toast.notify = ({
  className,
  duration,
  message,
  type,
}: Pick<ToastComponentProps, 'type' | 'message' | 'className'> & { duration?: number }) => {
  const defaultDuration = (type === ToastTypeEnum.Success || type === ToastTypeEnum.Info) ? 3000 : 6000
  if (typeof window === 'object') {
    const container = document.createElement('div')
    const root = createRoot(container)

    root.render(<Toast type={type} message={message} className={className} />)
    document.body.appendChild(container)
    setTimeout(() => {
      if (container)
        container.remove()
    }, duration || defaultDuration)
  }
}

export default Toast
