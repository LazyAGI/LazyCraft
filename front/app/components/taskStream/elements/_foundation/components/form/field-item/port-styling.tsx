'use client'
import type { FC } from 'react'
import React, { useEffect, useState } from 'react'
import { v4 as uuid4 } from 'uuid'
import {
  useStoreApi,
} from 'reactflow'
import produce from 'immer'
import { Button } from 'antd'
import type { FieldItemProps } from '../types'
import Input from '../base/input'
import IconFont from '@/app/components/base/iconFont'
import cn from '@/shared/utils/classnames'
import {
  useLazyLLMEdgesInteractions,
} from '@/app/components/taskStream/logicHandlers'
import './config-ports.scss'

import {
  updateNodeInternalsAsync,
} from '@/app/components/taskStream/logicHandlers/itemDataUpdate'

const ConfigPorts: FC<Partial<FieldItemProps>> = ({
  label,
  nodeId = 0,
  name,
  value = [],
  nodeData,
  min,
  max,
  disabled,
  readOnly,
  onChange,
}) => {
  const filedTitle = label || ((name === 'config__input_ports') ? '输入端点' : '输出端点')
  const { handleEdgeDeleteByDeleteBranch } = useLazyLLMEdgesInteractions()
  const store = useStoreApi()
  const [willDeleteId, setWillDeleteId] = useState('')

  const handleAddPort = () => {
    const newValue = produce(value, (draft) => {
      draft.push({
        id: uuid4(),
      })
    })
    onChange && onChange(name, newValue)
    // onChange && onChange(name, newInputs[name])
  }

  const handleRemovePort = (id: string, index: number) => {
    const newValue = produce(value, (draft) => {
      draft.splice(index, 1)
    })
    handleEdgeDeleteByDeleteBranch(nodeId, id)
    onChange && onChange(name, newValue)

    // onChange && onChange(name, _value)
  }

  useEffect(() => {
    const {
      updateNodeDimensions,
    } = store.getState()
    updateNodeInternalsAsync(nodeId, document.body, updateNodeDimensions)
  }, [nodeId, value?.length])

  const shapeName = name === 'config__input_ports' ? 'config__input_shape' : 'config__output_shape'
  const shapeData = nodeData[shapeName]
  const shapeLength = (Array.isArray(shapeData) ? shapeData : []).filter(({ variable_mode }) => variable_mode !== 'mode-const').length
  min = typeof min === 'number' ? min : (shapeLength ? 1 : 0)
  max = typeof max === 'number' ? max : shapeLength
  return (
    <div className={cn(
      'config-ports relative pd-20 min-h-[32px]',
    )}>
      {!readOnly && (Array.isArray(value) && value.length < max) && <div className={cn(
        'absolute top-[-40px] right-0 z-1',
      )}>
        <Button
          type="text"
          className="field-item-extra-add-btn"
          onClick={() => handleAddPort()}
        >
          添加{filedTitle}
          <IconFont type="icon-tianjia1" style={{ color: '#0E5DD8' }} />
        </Button>
      </div>}
      {(Array.isArray(value) && value.length)
        ? (
          <div className={cn('relative clearfix pb-[6px] pr-[6px] bg-[#F5F6F7] rounded-[4px]')}>
            {
              value.map((item: any, index: number) => (
                <div key={item.id} className={cn('w-[25%] float-left mt-[6px] pl-[6px]')}>

                  <div className={cn(
                    'flex flex-1',
                    // willDeleteId === item.id && 'bg-state-Terminate-hover',
                  )}>
                    <div className={cn(
                      'flex-1',
                    )}><Input className={cn('!bg-[#FFFFFF]')} value={index + 1} readOnly /></div>
                    {
                      (Array.isArray(value) && value.length > min) && !readOnly && (
                        <div
                          className='cursor-pointer h-[32px] pl-[6px] pt-[8px] hover:text-components-button-Terminate-ghost-text'
                          onClick={() => handleRemovePort(item.id, index)}
                          onMouseEnter={() => setWillDeleteId(item.id)}
                          onMouseLeave={() => setWillDeleteId('')}
                        >
                          <IconFont type='icon-shanchu1' className='w-[16px] h-[16px]' />
                          {/* 移除 */}
                        </div>
                      )
                    }
                  </div>
                </div>
              ))
            }
          </div>)
        : <span style={{ display: 'inline-block', margin: '4px 0 0 8px' }}>无</span>}
    </div >
  )
}

export default ConfigPorts
