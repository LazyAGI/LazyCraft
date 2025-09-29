'use client'
import type { FC } from 'react'
import React, { useState } from 'react'
import { ArrowDownOutlined } from '@ant-design/icons'
import { IHttpVerb } from './types'
import Selector from '@/app/components/taskStream/elements/_foundation/components/picker'
import cn from '@/shared/utils/classnames'
import HttpInputComponent from '@/app/components/taskStream/elements/_foundation/components/input-var-picker'
import { useCurrentNodeInputVars } from '@/app/components/taskStream/elements/_foundation/hooks/gain-part-detail'
import { toNodeOutputVars } from '@/app/components/taskStream/elements/_foundation/components/variable/utils'

const HttpMethodChoices = [
  { label: 'GET', value: IHttpVerb.Get },
  { label: 'POST', value: IHttpVerb.Post },
  { label: 'HEAD', value: IHttpVerb.Head },
  { label: 'PATCH', value: IHttpVerb.Patch },
  { label: 'PUT', value: IHttpVerb.Put },
  { label: 'DELETE', value: IHttpVerb.Delete },
]

type HttpSelectInputProps = {
  nodeId: string
  nodeData: any
  readOnly: boolean
  name: string
  value: any
  selectName: string
  selectOptions: any[]
  onChange: (name: string, url: string) => void
  placeholder?: string
}

const HttpMethodUrlInput: FC<HttpSelectInputProps> = ({
  nodeId,
  nodeData,
  readOnly,
  selectOptions = HttpMethodChoices,
  selectName = 'payload__method',
  name = 'payload__url',
  onChange,
  placeholder,
}) => {
  const [hasFocus, setHasFocus] = useState(false)

  const { inputVars, enabledNodes } = useCurrentNodeInputVars(nodeId)
  const convertedOutputVars = toNodeOutputVars(enabledNodes || [], false)

  const handleMethodSelection = (selectedValue) => {
    onChange && onChange(selectName, selectedValue)
  }

  const currentUrlValue = nodeData[name]
  const currentMethodValue = nodeData[selectName]

  return (
    <div className='flex items-start space-x-1'>
      <Selector
        value={currentMethodValue}
        onChange={handleMethodSelection}
        options={selectOptions}
        trigger={
          <div className={cn(readOnly && 'cursor-pointer', 'h-8 shrink-0 flex items-center px-2.5 bg-gray-100 border-black/5 rounded-lg')}>
            <div className='w-12 pl-0.5 leading-[18px] text-xs font-medium text-gray-900 uppercase'>{currentMethodValue}</div>
            {!readOnly && <ArrowDownOutlined className='ml-1 w-3.5 h-3.5 text-gray-700' />}
          </div>
        }
        popupCls='top-[34px] w-[108px]'
        showChecked
        readonly={readOnly}
      />

      <HttpInputComponent
        instanceKey='http-api-url'
        className={cn(hasFocus ? 'shadow-xs bg-gray-50 border-gray-300' : 'bg-gray-100 border-gray-100', 'w-0 grow rounded-lg px-3 py-[6px] border')}
        value={currentUrlValue}
        onChange={(inputValue) => { onChange(name, inputValue) }}
        readOnly={readOnly}
        onFocusChange={setHasFocus}
        placeholder={!readOnly ? (placeholder) : ''}
        placeholderCls='!leading-[21px]'
        nodesOutputVars={inputVars}
        enabledNodes={enabledNodes.map(node => ({
          ...node,
          position: { x: 0, y: 0 }, // 添加必需的position属性
        }))}
      />
    </div>
  )
}

export default React.memo(HttpMethodUrlInput)
