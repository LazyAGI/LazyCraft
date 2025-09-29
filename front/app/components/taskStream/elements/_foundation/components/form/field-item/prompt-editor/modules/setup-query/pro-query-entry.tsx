'use client'
import type { FC } from 'react'
import React, { useState } from 'react'
import classNames from 'classnames'
import copy from 'copy-to-clipboard'
import { Popconfirm } from 'antd'
import s from './style.module.css'
import MessageTypeSelector from './msg-kind-picker'
import PromptEditorResizableHeightWrapper from './query-composer'
import PromptEditorItem from './query-composer-unit'
import IconFont from '@/app/components/base/iconFont'
import cn from '@/shared/utils/classnames'
import type { InstructionRole, PromptParameter } from '@/core/data/debug'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
type Props = {
  type: InstructionRole
  value: string
  onTypeUpdate: (value: InstructionRole) => void
  onChange: (value: string) => void
  canDelete: boolean
  onDelete: () => void
  promptParams: PromptParameter[]
  noResize?: boolean
  defaultEditorHeight?: number
  readOnly?: boolean
  gradientBorder?: boolean
  placeholder?: string
}

const EnhancedPromptInput: FC<Props> = ({
  type,
  value,
  readOnly,
  gradientBorder,
  onChange,
  onTypeUpdate,
  canDelete,
  onDelete,
  promptParams,
  placeholder,
  noResize,
  defaultEditorHeight = 102,
}) => {
  const [editorH, setEditorH] = useState<number>(defaultEditorHeight)
  const [isFocused, setIsFocused] = React.useState(false)
  const handlePromptChange = (newValue: string) => {
    if ((value || '') === (newValue || ''))
      return
    onChange(newValue)
  }
  const handleBlur = () => {
    setIsFocused(false)
  }

  return (
    <div className={classNames([
      'relative',
      'field-item-advanced-prompt-input',
      s.EnhancedPromptInput,
      isFocused ? s.focused : '',
      gradientBorder ? s.gradientBorder : '',
    ])}
    >
      <div className='rounded-xl bg-white'>
        <div className={cn(s.boxHeader, 'flex justify-between items-center mb-1.5 h-8 pt-[5px] pr-[12px] pb-[5px] pl-[12px] rounded-tl-xl rounded-tr-xl bg-white')}>
          <MessageTypeSelector readOnly value={type} onChange={onTypeUpdate} />

          <div className={cn(s.optionWrap, 'items-center space-x-1')}>
            {canDelete && !readOnly && (
              <Popconfirm
                title="请确认"
                description="同一组中的admin/user提示词将同时被删除，请确认"
                onConfirm={() => onDelete()}
                okText="是"
                cancelText="否"
              >
                <IconFont type='icon-shanchu1' className='h-6 w-6 p-1 text-gray-500 cursor-pointer' />
              </Popconfirm>
            )}
            <IconFont
              title='复制'
              type="icon-fuzhi"
              className="cursor-pointer"
              onClick={() => {
                copy(value || '')
                Toast.notify({ type: ToastTypeEnum.Success, message: '复制成功' })
              }}
            />

          </div>
        </div>

        <PromptEditorResizableHeightWrapper
          className='px-3 min-h-[102px] overflow-y-auto text-sm text-gray-700'
          height={editorH}
          minHeight={102}
          onHeightChange={setEditorH}
          footer={(
            <div className='pl-4 pb-2 flex'>
              <div className="h-[18px] leading-[18px] px-1 rounded-md bg-gray-100 text-xs text-gray-500">{value?.length || 0}</div>
            </div>
          )}
          disableResize={noResize}
        >
          <PromptEditorItem
            className='min-h-[84px]'
            value={value || ''}
            LazyLLMvariableBlock={{
              show: true,
              variables: promptParams?.map(item => ({
                name: item?.name || '',
                value: item?.key || '',
              })) || [],
            }}
            placeholder={placeholder}
            onChange={handlePromptChange}
            onBlur={handleBlur}
            onFocus={() => {
              setIsFocused(true)
            }}
            editable={!readOnly}
          />
        </PromptEditorResizableHeightWrapper>
      </div>
    </div>
  )
}
export default React.memo(EnhancedPromptInput)
