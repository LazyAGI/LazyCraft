import type { FC } from 'react'
import React from 'react'
import { Form, Input } from 'antd'
import useConfig from './use-config'
import { useStore } from '@/app/components/taskStream/store'
import FieldItem from '@/app/components/taskStream/elements/_foundation/components/form/field-item'

const ServerResourcePanel: FC<any> = ({
  id,
  data,
}) => {
  const [form] = Form.useForm()
  const workflowStatus = useStore(state => state.workflowStatus)
  const serverUrl = useStore(state => state.serverUrl)
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

  const renderServerUrlField = () => {
    if (workflowStatus === 'start' && serverUrl) {
      return (
        <Form.Item label="URL" style={{ padding: '0 20px' }}>
          <Input value={serverUrl} readOnly />
        </Form.Item>
      )
    }
    return null
  }

  return (
    <div className='mt-0.5 pb-4'>
      <Form
        form={form}
        layout='vertical'
        requiredMark={renderRequiredMark}
      >
        {config__parameters.map(renderParameterField)}
        {renderServerUrlField()}
      </Form>
    </div>
  )
}

export default React.memo(ServerResourcePanel)
