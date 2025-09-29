'use client'
import type { FC } from 'react'
import React, { useCallback } from 'react'
import type { FieldItemProps } from '../types'
import ParameterList from '@/app/components/taskStream/elements/param-retriever/components/retrieveParameter/list'
import ParameterEditor from '@/app/components/taskStream/elements/param-retriever/components/retrieveParameter/update'
import type { ParameterDefinition } from '@/app/components/taskStream/elements/param-retriever/types'
import type { ExtraInfo } from '@/app/components/taskStream/types'
import { generateShape } from '@/infrastructure/api/universeNodes/universe_default_config'
import { ExecutionNodeStatus } from '@/app/components/taskStream/types'

const FieldItem: FC<Partial<FieldItemProps>> = ({
  disabled,
  readOnly,
  onChange,
  nodeId,
  nodeData,
  resourceData,
}) => {
  const inputs = nodeData || resourceData || {}

  // 判断是否为运行状态
  const isRunning = nodeData?._executionStatus === ExecutionNodeStatus.Running

  // 运行后允许修改参数类型，但不允许添加新参数
  const canEditParams = !disabled && (!readOnly || isRunning)
  const canAddParams = !disabled && !readOnly && !isRunning

  // 添加参数处理函数
  const handleAddExtractParameter = useCallback((param: ParameterDefinition, moreInfo?: ExtraInfo) => {
    const currentParams = inputs.payload__params || []
    const newParams = [...currentParams, param]

    onChange && onChange({
      payload__params: newParams,
      config__output_shape: newParams.map(i => generateShape(i.name, i.type)),
    })
  }, [inputs.payload__params, onChange])

  // 参数变化处理函数
  const handleExactParamsChange = useCallback((params: ParameterDefinition[], moreInfo?: ExtraInfo) => {
    onChange && onChange({
      payload__params: params,
      config__output_shape: params.map(i => generateShape(i.name, i.type)),
    })
  }, [onChange])

  return (
    <div className='space-y-1 relative'>
      <ParameterList
        readonly={!canEditParams}
        isRunning={isRunning}
        list={inputs.payload__params || []}
        onChange={handleExactParamsChange}
      />
      {canAddParams && (
        <div className='absolute top-[-40px] right-0 flex items-center space-x-1'>
          <ParameterEditor type='add' onSave={handleAddExtractParameter} />
        </div>
      )}
    </div>
  )
}

export default React.memo(FieldItem)
