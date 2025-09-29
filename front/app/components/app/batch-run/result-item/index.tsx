'use client'
import type { FC } from 'react'
import React, { useState } from 'react'
import copy from 'copy-to-clipboard'
import { HashtagIcon } from '@heroicons/react/24/solid'
import ResponseTab from './result-tab'
import cn from '@/shared/utils/classnames'
import Loading from '@/app/components/base/loading'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import Iconfont from '@/app/components/base/iconFont'

import type { WorkflowExecution } from '@/app/components/base/chat/types'

type GenerationItemComponentProps = {
  className?: string
  content: any
  isError: boolean
  isLoading?: boolean
  isMobileView?: boolean
  messageId?: string | null
  onRetry: () => void
  taskId?: string
  varOutputs?: any
  workflowExecutionData?: WorkflowExecution
}

const GenerationItem: FC<GenerationItemComponentProps> = ({
  className,
  content,
  isError,
  isLoading,
  isMobileView,
  messageId,
  onRetry,
  taskId,
  varOutputs,
  workflowExecutionData,
}) => {
  const [currentTab, setActiveTab] = useState<string>('DETAIL')

  return (
    <div
      className={cn(
        `rounded-xl border ${isError ? 'border-[#FECDCA] bg-[#FEF3F2]' : 'border-gray-200 bg-white'}`,
        className,
      )}
      style={{ boxShadow: '0px 1px 2px rgba(16, 24, 40, 0.05)' }}
    >
      {isLoading
        ? (
          <div className='flex items-center h-10'><Loading type='area' /></div>
        )
        : (
          <div className="p-4">
            {/* 任务ID标签 */}
            {taskId && (
              <div className='mb-2 text-gray-500 border border-gray-200 box-border flex items-center rounded-md italic text-[11px] pl-1 pr-1.5 font-medium w-fit group-hover:opacity-100'>
                <HashtagIcon className='w-3 h-3 text-gray-400 fill-current mr-1 stroke-current stroke-1' />
                {taskId}
              </div>
            )}

            {/* 内容区域 */}
            <div className='flex'>
              <div className='grow w-0'>
                {workflowExecutionData && !isError && (
                  <ResponseTab
                    data={workflowExecutionData}
                    content={content}
                    currentTab={currentTab}
                    onCurrentTabChange={setActiveTab}
                    varOutputs={varOutputs}
                  />
                )}
                {isError && (
                  <div className='text-gray-400 text-sm'>{'无输出内容'}</div>
                )}
              </div>
            </div>

            {/* 操作按钮区域 */}
            <div className='flex items-center justify-between mt-3'>
              <div className='flex items-center'>
                {(currentTab === 'RESULT') && (
                  <div
                    className={cn(
                      (isError || !messageId) ? 'border-gray-100 text-gray-300' : 'border-gray-200 text-gray-700 cursor-pointer hover:border-gray-300 hover:shadow-sm',
                      'flex items-center h-7 px-3 rounded-md border text-xs font-medium',
                      isMobileView && '!px-1.5', 'space-x-1',
                    )}
                    onClick={() => {
                      if (isError || !messageId)
                        return
                      const contentToCopy = workflowExecutionData?.resultText
                      if (typeof contentToCopy === 'string')
                        copy(contentToCopy)
                      else
                        copy(JSON.stringify(contentToCopy))
                      Toast.notify({ type: ToastTypeEnum.Success, message: '复制成功' })
                    }}
                  >
                    <Iconfont type='icon-jianqieban' className='w-3.5 h-3.5' />
                    {!isMobileView && <div>{'复制'}</div>}
                  </div>
                )}

                {isError && (
                  <div
                    className={cn(
                      'border-gray-200 text-gray-700 cursor-pointer hover:border-gray-300 hover:shadow-sm',
                      'flex items-center h-7 px-3 rounded-md border text-xs font-medium',
                      isMobileView && '!px-1.5', 'ml-2 space-x-1',
                    )}
                    onClick={onRetry}
                  >
                    <Iconfont type='icon-shuaxin' className='w-3.5 h-3.5' />
                    {!isMobileView && <div>{'重试'}</div>}
                  </div>
                )}
              </div>
              <div>
                {!workflowExecutionData && (
                  <div className='text-xs text-gray-500'>{content?.length} {'个字符'}</div>
                )}
              </div>
            </div>
          </div>
        )}

    </div>
  )
}

export default React.memo(GenerationItem)
