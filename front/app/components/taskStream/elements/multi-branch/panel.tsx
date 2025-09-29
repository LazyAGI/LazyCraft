import type { FC } from 'react'
import {
  memo,
  useState,
} from 'react'
import { Form } from 'antd'

import useConfig from './use-config'
import type { SwitchCaseNodeType } from './types'
import type { NodePanelProps } from '@/app/components/taskStream/types'
import Field from '@/app/components/taskStream/elements/_foundation/components/form/field-unit'
import FieldItem from '@/app/components/taskStream/elements/_foundation/components/form/field-item'
const Panel: FC<NodePanelProps<SwitchCaseNodeType>> = ({
  id,
  data,
}) => {
  const [form] = Form.useForm()
  const {
    readOnly,
    inputs,
    handleCodeChange,
    handleSortingCase,
    handleDeleteCase,
    handleCreateCase,
    handleFieldChange,
  } = useConfig(id, data)
  const [willDeleteCaseId, setWillDeleteCaseId] = useState('')
  const { config__parameters = [] } = inputs

  return (
    <div className='mt-0.5 pb-4'>
      <Form
        form={form}
        layout='vertical'
        requiredMark={(label: any, info: { required: boolean }) => (
          <span className="flex items-center">
            {label} {info.required && <span className='field-item-required-mark text-red-500 ml-1'>*</span>}
          </span>
        )}
      >
        {config__parameters.map((parameter, index) => {
          const { name } = parameter
          const value: any = (inputs as any)[name]

          return (
            <FieldItem
              key={index}
              nodeId={id}
              nodeData={data}
              {...parameter}
              value={value}
              readOnly={!!parameter?.readOnly || readOnly} // 并集，fieldItem readOnly=true或者node readOnly=true时皆为true
              onChange={handleFieldChange}
              willDeleteCaseId={willDeleteCaseId}
              handleCodeChange={handleCodeChange}
              handleSortingCase={handleSortingCase}
              handleDeleteCase={handleDeleteCase}
              handleCreateCase={handleCreateCase}
              setWillDeleteCaseId={setWillDeleteCaseId}
            />
          )
        })}
        <div className='my-2 mx-3 h-[1px] bg-divider-subtle'></div>
        <Field
          label='DEFAULT'
          className='py-2'
        >
          <div className='leading-[18px] text-xs font-normal text-text-tertiary'>用于定义所有 case 条件都不满足时应执行的逻辑</div>
        </Field>
      </Form >
    </div >
  )
}

export default memo(Panel)
