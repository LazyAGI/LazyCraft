'use client'
import type { FC } from 'react'
import React, { useCallback } from 'react'
import produce from 'immer'
import KeyValueItem from './kvItem'
import { generateKeyValueItem, list2Json } from './helpers'
type Props = {
  readonly: boolean
  nodeId: string
  nodeData: any
  formatType: string
  formatName: string
  name: string
  list: any[]
  columns: any[]
  onChange: (name: any, newValue?: any[]) => void
}

const KeyValueList: FC<Props> = ({
  readonly,
  nodeId,
  nodeData,
  name,
  formatType,
  formatName,
  list,
  columns,
  onChange,
}) => {
  const handleChange = useCallback((index: number) => {
    return (newItem: any[]) => {
      const newArr = produce(list, (draft: any) => {
        draft[index] = newItem
      })
      if (formatType === 'json' && formatName && columns) {
        onChange({
          ...nodeData,
          [name]: newArr,
          [formatName]: list2Json(newArr, columns),
        })
      }
      else {
        onChange(name, newArr)
      }
    }
  }, [list, onChange, columns, formatName, formatType])

  const handleDelete = useCallback((index: number) => {
    return () => {
      const newList = produce(list, (draft: any) => {
        draft.splice(index, 1)
      })
      if (formatType === 'json' && formatName && columns) {
        onChange({
          ...nodeData,
          [name]: newList,
          [formatName]: list2Json(newList, columns),
        })
      }
      else {
        onChange(name, newList)
      }
    }
  }, [list, onChange, columns, formatName, formatType])

  const handleAdd = useCallback((index) => {
    return () => {
      const newList = produce(list, (draft: any) => {
        draft.push(generateKeyValueItem(columns))
      })
      if (formatType === 'json' && formatName && columns) {
        onChange({
          ...nodeData,
          [name]: newList,
          [formatName]: list2Json(newList, columns),
        })
      }
      else {
        onChange(name, newList)
      }
    }
  }, [list, onChange, columns, formatName, formatType])

  return (
    <div className='border border-gray-200 rounded-lg overflow-hidden'>
      <div className='flex items-center h-7 leading-7 text-xs font-medium text-gray-500 uppercase'>
        {columns.map(({ title }, index) => {
          return (<div key={index} className='flex-1 h-full pl-3 border-r border-gray-200 w-1/2'>{title}</div>)
        })}
      </div>
      {
        list.map((item, index) => (
          <KeyValueItem
            key={item.id}
            instanceKey={item.id!}
            nodeId={nodeId}
            payload={item}
            columns={columns}
            onChange={handleChange(index)}
            onDelete={handleDelete(index)}
            isFinalItem={index === list.length - 1}
            onAdd={handleAdd(index)}
            readonly={readonly || item.readOnly}
            canDelete={list.length > 1 && !item.isDefault}
          />
        ))
      }
    </div>
  )
}
export default React.memo(KeyValueList)
