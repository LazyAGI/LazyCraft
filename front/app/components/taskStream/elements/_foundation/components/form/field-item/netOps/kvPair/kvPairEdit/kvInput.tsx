'use client'
import type { FC } from 'react'
import React, { useCallback, useState } from 'react'
import cn from '@/shared/utils/classnames'
import RemoveButton from '@/app/components/taskStream/elements/_foundation/components/delete-btn'
import HttpInputComponent from '@/app/components/taskStream/elements/_foundation/components/input-var-picker'
import { useCurrentNodeInputVars } from '@/app/components/taskStream/elements/_foundation/hooks/gain-part-detail'

type Props = {
  className?: string
  instanceKey?: string
  nodeId: string
  nodeData?: any
  value: string
  onChange: (newValue: string) => void
  onFocusChange: (newValue: string) => void
  hasDelete: boolean
  onDelete?: () => void
  placeholder?: string
  readOnly?: boolean
}

const InputItem: FC<Props> = ({
  className,
  instanceKey,
  nodeId,
  value,
  onChange,
  onFocusChange,
  hasDelete,
  onDelete,
  placeholder,
  readOnly,
}) => {
  const hasValue = !!value

  // 获取当前节点的输入参数
  const { inputVars, enabledNodes } = useCurrentNodeInputVars(nodeId)

  const [isFocus, setIsFocus] = useState(false)
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.()
  }, [onDelete])

  const handleFocusChange = useCallback((value) => {
    setIsFocus(value)
    onFocusChange?.(value)
  }, [onFocusChange])

  return (
    <div className={cn(className, 'hover:bg-gray-50 hover:cursor-text', 'relative flex h-full')}>
      {(!readOnly)
        ? (
          <HttpInputComponent
            instanceKey={instanceKey}
            className={cn(isFocus ? 'bg-gray-100' : 'bg-width', 'w-0 grow px-3 py-1')}
            value={value}
            onChange={onChange}
            readOnly={readOnly}
            onFocusChange={handleFocusChange}
            placeholder={placeholder}
            placeholderCls='!leading-[21px]'
            promptMinHeightCls='min-h-[28px]'
            nodesOutputVars={inputVars}
            enabledNodes={enabledNodes.map(node => ({
              ...node,
              position: { x: 0, y: 0 }, // 添加必需的position属性
            }))}
          />
        )
        : <div
          className="w-full h-[28px] leading-[28px]"
        >
          {!hasValue && <div className='text-gray-300 px-3 py-1 text-xs font-normal'>{placeholder}</div>}
          {hasValue && (
            <HttpInputComponent
              instanceKey={instanceKey}
              className={cn(isFocus ? 'shadow-xs bg-gray-50 border-gray-300' : 'bg-gray-100 border-gray-100', 'w-full grow px-3 py-[6px] border')}
              value={value}
              onChange={onChange}
              readOnly={readOnly}
              onFocusChange={handleFocusChange}
              placeholder={placeholder}
              placeholderCls='!leading-[21px]'
              promptMinHeightCls='min-h-[28px]'
              nodesOutputVars={inputVars}
              enabledNodes={enabledNodes.map(node => ({
                ...node,
                position: { x: 0, y: 0 }, // 添加必需的position属性
              }))}
            />
          )}

        </div>}
      {hasDelete && !isFocus && (
        <RemoveButton
          className='group-hover:block hidden absolute right-1 top-0.5'
          onClick={handleDelete}
        />
      )}
    </div>
  )
}
export default React.memo(InputItem)
