import type { FC } from 'react'
import React from 'react'
import { Form } from 'antd'
import useConfig from './use-config'
import FieldItem from '@/app/components/taskStream/elements/_foundation/components/form/field-item'

const DocumentResourcePanel: FC<any> = ({
  id,
  data,
}) => {
  const [form] = Form.useForm()
  const {
    inputs,
    readOnly,
    handleFieldChange,
  } = useConfig(id, data)

  const { config__parameters = [] } = data

  const renderRequiredMark = (label: any, info: { required: boolean }) => (
    <span className="flex items-center">
      {label} {info.required && <span className='field-item-required-mark text-red-500 ml-1'>*</span>}
    </span>
  )

  const renderParameterField = (parameter: any, index: number) => {
    const { name } = parameter
    const fieldValue = inputs[name]
    const isFieldReadOnly = !!parameter?.readOnly || readOnly

    return (
      <FieldItem
        key={index}
        {...parameter}
        resourceId={id}
        resourceData={data}
        value={fieldValue}
        readOnly={isFieldReadOnly}
        onChange={handleFieldChange}
      />
    )
  }

  return (
    <div className='mt-0.5 pb-4'>
      <Form
        form={form}
        layout='vertical'
        requiredMark={renderRequiredMark}
      >
        {config__parameters.map(renderParameterField)}
      </Form>
    </div>
  )
}

export default React.memo(DocumentResourcePanel)
