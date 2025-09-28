'use client'
import type { FC } from 'react'
import React, { useCallback, useState } from 'react'
import { useBoolean } from 'ahooks'
import type { ParameterDefinition } from '../../types'
import WorkflowEmptyListPlaceholder from '../../../_foundation/components/workflow-empty-list-placeholder'
import ParameterItem from './item'
import EditParameter from './update'
import type { ExtraInfo } from '@/app/components/taskStream/types'

type ParameterListProps = {
  readonly: boolean
  isRunning?: boolean
  list: ParameterDefinition[]
  onChange: (list: ParameterDefinition[], moreInfo?: ExtraInfo) => void
}

const ParameterList: FC<ParameterListProps> = ({
  readonly,
  isRunning = false,
  list,
  onChange,
}) => {
  const [currentEditIndex, setCurrentEditIndex] = useState<number>(-1)

  const [isEditModalVisible, {
    setTrue: showEditModal,
    setFalse: hideEditModal,
  }] = useBoolean(false)

  const handleParameterEdit = useCallback((index: number) => {
    return () => {
      setCurrentEditIndex(index)
      showEditModal()
    }
  }, [showEditModal])

  const handleParameterDelete = useCallback((index: number) => {
    return () => {
      const updatedList = list.filter((_, i) => i !== index)
      onChange(updatedList)
    }
  }, [list, onChange])

  const handleParameterUpdate = useCallback((index: number) => {
    return (payload: ParameterDefinition, moreInfo?: ExtraInfo) => {
      const updatedList = list.map((item, i) => {
        if (i === index)
          return payload
        return item
      })
      onChange(updatedList, moreInfo)
      hideEditModal()
    }
  }, [hideEditModal, list, onChange])

  if (list.length === 0) {
    return (
      <WorkflowEmptyListPlaceholder>提取参数未设置</WorkflowEmptyListPlaceholder>
    )
  }

  return (
    <div className='space-y-1'>
      {list.map((item, index) => (
        <ParameterItem
          key={index}
          payload={item}
          readonly={readonly}
          isRunning={isRunning}
          onDelete={handleParameterDelete(index)}
          onEdit={handleParameterEdit(index)}
        />
      ))}
      {isEditModalVisible && (
        <EditParameter
          type='edit'
          payload={list[currentEditIndex]}
          onSave={handleParameterUpdate(currentEditIndex)}
          onCancel={hideEditModal}
        />
      )}
    </div>
  )
}

export default React.memo(ParameterList)
