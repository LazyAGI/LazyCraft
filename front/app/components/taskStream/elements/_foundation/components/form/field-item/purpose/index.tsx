'use client'
import type { FC } from 'react'
import React from 'react'
import type { FieldItemProps } from '../../types'
import IconFont from '@/app/components/base/iconFont'
import WorkflowAddButton from '@/app/components/taskStream/elements/_foundation/components/workflow-add-button'
import { LazyTextEditor } from '@/app/components/taskStream/elements/_foundation/components/editor'

/** 意图识别表单组件 */
const IntentionComponent: FC<Partial<FieldItemProps>> = ({
  // nodeId,
  disabled,
  readOnly,
  nodeData,
  handleCodeChange,
  handleDeleteCase,
  handleCreateCase,
}) => {
  const { config__output_ports } = nodeData
  const cases = config__output_ports?.filter(({ id }) => id !== 'false') || []

  return (
    <div>
      {cases.map((item, index) => {
        return (
          <LazyTextEditor
            key={index}
            inWorkflow
            title={<div>
              <div className='w-[200px]'>
                <div
                  className='leading-4 text-xs font-semibold text-gray-700'
                >
                  {`意图 ${index + 1}`}
                </div>
              </div>
            </div>}
            value={item.cond}
            onChange={(code) => { handleCodeChange(code, item) }}
            placeholder={'在这里输入你的主题内容'}
            headerActions={(
              <div className='flex items-center h-full'>
                <div className='text-xs font-medium text-gray-500'>{item.cond?.length || 0}</div>
                <div className='mx-3 h-3 w-px bg-gray-200'></div>
                {(!readOnly && !disabled && cases.length > 1) && (
                  <IconFont type='icon-shanchu1'
                    className='mr-1 w-3.5 h-3.5 text-gray-500 cursor-pointer'
                    onClick={() => handleDeleteCase(item.id)}
                  />
                )}
              </div>
            )}
            readonly={readOnly || disabled}
            minHeight={64}
          />
        )
      })}
      {(!readOnly && !disabled) && (
        <WorkflowAddButton
          onClick={handleCreateCase}
          text={'添加分类'}
        />
      )}
    </div>
  )
}
export default React.memo(IntentionComponent)
