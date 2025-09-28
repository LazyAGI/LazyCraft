import type { FC } from 'react'
import {
  memo,
} from 'react'
import { Form } from 'antd'
import useConfig from './use-config'
import type { QuestionClassifierNodeType } from './types'
import type { NodePanelProps } from '@/app/components/taskStream/types'
import Field from '@/app/components/taskStream/elements/_foundation/components/form/field-unit'
import FieldItem from '@/app/components/taskStream/elements/_foundation/components/form/field-item'

const Panel: FC<NodePanelProps<QuestionClassifierNodeType>> = ({
  id,
  data,
}) => {
  const [form] = Form.useForm()
  const {
    readOnly,
    inputs,
    handleCodeChange,
    handleDeleteCase,
    handleCreateCase,
    handleFieldChange,
  } = useConfig(id, data)
  const { config__parameters = [], config__output_ports = [] } = inputs
  const cases = config__output_ports.filter(({ id }) => id !== 'false')
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
              readOnly={!!parameter?.readOnly || readOnly}
              onChange={handleFieldChange}
              handleCodeChange={handleCodeChange}
              handleDeleteCase={handleDeleteCase}
              handleCreateCase={handleCreateCase}
            />
          )
        })}

        <div>
          <div className='my-2 mx-3 h-[1px] bg-divider-subtle'></div>
          <Field
            label='默认'
            className='py-2'
          >
            <div className='leading-[18px] text-xs font-normal text-text-tertiary'>用于定义所有意图条件都不满足时应执行的逻辑</div>
          </Field>
        </div>
      </Form>
    </div>
  )
}

export default memo(Panel)
