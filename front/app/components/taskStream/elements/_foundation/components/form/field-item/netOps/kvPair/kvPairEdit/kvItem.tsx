'use client'
import type { FC } from 'react'
import React, { useCallback } from 'react'
import produce from 'immer'
import InputItem from './kvInput'
import cn from '@/shared/utils/classnames'

type Props = {
  instanceKey: string
  className?: string
  nodeId: string
  nodeData?: any
  readonly: boolean
  canDelete: boolean
  columns: any[]
  payload: any
  onChange: (value: any) => void
  onDelete: () => void
  isFinalItem: boolean
  onAdd: () => void
}

const KeyValueItem: FC<Props> = ({
  instanceKey,
  className,
  nodeId,
  nodeData,
  readonly,
  columns,
  canDelete,
  payload,
  onChange,
  onDelete,
  isFinalItem,
  onAdd,
}) => {
  const handleChange = useCallback((key: string) => {
    return (value: string) => {
      const newData = produce(payload, (draft: any) => {
        draft[key] = value
      })
      onChange(newData)
    }
  }, [onChange, payload])

  const handleFocusChange = useCallback((key: string) => {
    return (value: string) => {
      if (key === columns[columns.length - 1].key && isFinalItem && value)
        onAdd()
    }
  }, [onAdd, isFinalItem, columns])
  return (
    // group class name is for hover row show remove button
    <div className={cn(className, 'group flex min-h-6 border-t border-gray-200')}>
      {
        columns.map(({ key, placeholder }, index) => {
          // 检查是否为键字段且设置了keyReadOnly
          const isKeyField = key === 'key'
          const isKeyReadOnly = payload.keyReadOnly && isKeyField

          return (
            <div className='w-1/2 border-r border-gray-200' key={key}>
              <InputItem
                instanceKey={`http-${key}-${instanceKey}`}
                nodeId={nodeId}
                nodeData={nodeData}
                value={payload[key]}
                onChange={handleChange(key)}
                onFocusChange={handleFocusChange(key)}
                onDelete={onDelete}
                hasDelete={!readonly && canDelete && index === (columns.length - 1)}
                placeholder={placeholder}
                readOnly={readonly || isKeyReadOnly}
              />
            </div>
          )
        })
      }
    </div>
  )
}
export default React.memo(KeyValueItem)
