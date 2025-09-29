'use client'
import type { FC } from 'react'
import React, { useCallback, useEffect } from 'react'
import { useBoolean } from 'ahooks'
import cn from '@/shared/utils/classnames'
import HttpInputComponent from '@/app/components/taskStream/elements/_foundation/components/input-var-picker'
import { useCurrentNodeInputVars } from '@/app/components/taskStream/elements/_foundation/hooks/gain-part-detail'

type VariableInputProps = {
  instanceKey?: string
  className?: string
  placeholder?: string
  placeholderCls?: string
  value: string
  onChange: (value: string) => void
  onFocusChange?: (value: boolean) => void
  readOnly?: boolean
  nodeId: string
  nodeData: any
  fieldType: 'url' | 'headers' | 'params' | 'body'
  tooltip?: string
}

const HttpVariableInput: FC<VariableInputProps> = ({
  instanceKey,
  className,
  placeholder,
  placeholderCls,
  value,
  onChange,
  onFocusChange,
  readOnly,
  nodeId,
  fieldType,
  tooltip,
}) => {
  const [hasFocus, { setTrue: setFocus }] = useBoolean(false)

  const { inputVars, enabledNodes } = useCurrentNodeInputVars(nodeId)

  useEffect(() => {
    onFocusChange?.(hasFocus)
  }, [hasFocus, onFocusChange])

  const updateInputValue = useCallback((newValue: string) => {
    onChange(newValue)
  }, [onChange])

  const generateFieldPlaceholder = () => {
    const placeholderMap = {
      url: 'https://api.example.com/users/{user_id}',
      headers: 'Authorization: Bearer {token}',
      params: 'page={page_num}&size={page_size}',
      body: '{"user_id": "{user_id}", "name": "{user_name}"}',
    }
    return placeholderMap[fieldType] || placeholder
  }

  const generateFieldTooltip = () => {
    const tooltipMap = {
      url: '配置需要请求的API地址。支持变量引用，如：https://api.example.com/users/{user_id}',
      headers: 'HTTP请求头，支持变量引用。默认包含Content-Type: application/json',
      params: 'URL查询参数，支持变量引用，如：page={page_num}&size={page_size}',
      body: '请求体内容，支持变量引用。JSON格式示例：{"user_id": "{user_id}", "name": "{user_name}"}',
    }
    return tooltipMap[fieldType] || tooltip
  }

  return (
    <div className={cn(className, 'relative')}>
      <HttpInputComponent
        instanceKey={instanceKey}
        className={cn(
          hasFocus ? 'shadow-xs bg-gray-50 border-gray-300' : 'bg-gray-100 border-gray-100',
          'w-full rounded-lg px-3 py-[6px] border',
        )}
        placeholder={placeholder || generateFieldPlaceholder()}
        placeholderCls={placeholderCls}
        value={value}
        onChange={updateInputValue}
        onFocusChange={setFocus}
        readOnly={readOnly}
        nodesOutputVars={inputVars}
        enabledNodes={enabledNodes.map(node => ({
          ...node,
          position: { x: 0, y: 0 }, // 添加必需的position属性
        }))}
      />

      {tooltip && (
        <div className="mt-1 text-xs text-gray-500">
          {generateFieldTooltip()}
        </div>
      )}
    </div>
  )
}

export default React.memo(HttpVariableInput)
