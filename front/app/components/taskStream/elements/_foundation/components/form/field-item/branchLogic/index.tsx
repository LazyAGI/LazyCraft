'use client'
import type { FC } from 'react'
import React from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { ReactSortable } from 'react-sortablejs'
import classNames from 'classnames'
import type { FieldItemProps } from '../../types'
import Field from '../../field-unit'
import { currentLanguage } from '@/app/components/taskStream/elements/script/types'
import TypeSelector from '@/app/components/taskStream/elements/_foundation/components/picker'
import { LazyCodeEditor } from '@/app/components/taskStream/elements/_foundation/components/editor'
import Button from '@/app/components/base/click-unit'

const supportedLanguages = [
  {
    label: 'Python3',
    value: currentLanguage.python3,
  },
]

const ConditionalBranchEditor: FC<Partial<FieldItemProps>> = ({
  disabled,
  readOnly,
  nodeData,
  willDeleteCaseId,
  handlecurrentLanguageChange,
  handleCodeChange,
  handleSortingCase,
  handleCreateCase,
}) => {
  const { config__output_ports } = nodeData
  const canAddNewCase = false
  const conditionalCases = config__output_ports?.filter(({ id }) => id !== 'false') || []

  const renderConditionField = (caseItem: any) => (
    <div key={caseItem.id}>
      <Field
        label={caseItem.label}
        className='py-0'
        required={true}
      >
        <div
          className={classNames(
            'group relative py-1 pr-3 min-h-[40px] rounded-[10px] bg-components-panel-bg',
            willDeleteCaseId === caseItem.id && 'bg-state-Terminate-hover',
          )}
        >
          <div className='leading-[18px] mb-1 text-xs font-normal text-text-tertiary'>
            用于定义当前if路线满足的条件
          </div>
          <LazyCodeEditor
            inWorkflow
            readOnly={readOnly || disabled}
            title={
              <TypeSelector
                options={supportedLanguages}
                value={nodeData?.code_language}
                onChange={handlecurrentLanguageChange}
              />
            }
            language={nodeData?.code_language}
            value={caseItem.cond}
            onChange={(code) => { handleCodeChange(code, caseItem) }}
          />
        </div>
      </Field>
    </div>
  )

  return (
    <div>
      <ReactSortable
        list={conditionalCases}
        setList={handleSortingCase}
        handle='.handle'
        ghostClass='bg-components-panel-bg'
        animation={100}
      >
        {conditionalCases.map(renderConditionField)}
      </ReactSortable>

      {canAddNewCase && (
        <div className='px-4 py-2'>
          <Button
            className='w-full'
            variant='tertiary'
            onClick={() => handleCreateCase()}
            disabled={readOnly || disabled}
          >
            <PlusOutlined className='mr-1 w-4 h-4' />
            ELIF
          </Button>
        </div>
      )}
    </div>
  )
}

export default React.memo(ConditionalBranchEditor)
