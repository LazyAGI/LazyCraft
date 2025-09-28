import type { FC } from 'react'
import { memo } from 'react'
import { Form } from 'antd'
import useFinalNodeConfig from './use-config'
import type { FinalNodeType } from './types'
import FieldItem from '@/app/components/taskStream/elements/_foundation/components/form/field-item'
import type { ExecutionNodeProps } from '@/app/components/taskStream/types'

const FinalNodePanel: FC<ExecutionNodeProps<FinalNodeType>> = ({ id, data }) => {
  const { inputs, readOnly, handleFieldChange } = useFinalNodeConfig(id, data)
  const { config__parameters = [] } = data
  const [form] = Form.useForm()

  const renderRequiredMark = (label: any, info: { required: boolean }) => (
    <span className="flex items-center">
      {label}
      {info.required && (
        <span className="field-item-required-mark text-red-500 ml-1">*</span>
      )}
    </span>
  )

  return (
    <div className="mt-0.5 pb-4 lazyllm-end-panel">
      <Form form={form} layout="vertical" requiredMark={renderRequiredMark}>
        {config__parameters.map((parameter, index) => {
          const { name } = parameter
          const value = inputs[name]
          const isReadOnly = !!parameter?.readOnly || readOnly

          return (
            <FieldItem
              key={`${name}-${index}`}
              nodeId={id}
              nodeData={data}
              {...parameter}
              value={value}
              readOnly={isReadOnly}
              onChange={handleFieldChange}
            />
          )
        })}
      </Form>
    </div>
  )
}

export default memo(FinalNodePanel)
