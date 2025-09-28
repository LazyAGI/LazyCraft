import type { FC } from 'react'
import React from 'react'
import { Form } from 'antd'
import useConfig from './use-config'
import FieldItem from '@/app/components/taskStream/elements/_foundation/components/form/field-item'
import type { ResourcePanelProps } from '@/app/components/taskStream/types'
import IconFont from '@/app/components/base/iconFont'

const McpResourcePanel: FC<ResourcePanelProps<any>> = ({
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

  const renderInputParametersTable = () => {
    if (config__parameters.length === 0)
      return null

    return (
      <div className='px-3'>
        <div className='flex items-center mb-3'>
          <div className='w-1 h-4 bg-blue-500 rounded mr-2'></div>
          <div className='text-sm font-medium text-gray-900'>输入</div>
        </div>

        <div className='bg-gray-50 rounded-lg overflow-hidden'>
          <div className='grid grid-cols-2 bg-gray-100 px-4 py-2'>
            <div className='text-xs text-gray-500 font-medium'>参数名称</div>
            <div className='text-xs text-gray-500 font-medium'>参数描述</div>
          </div>

          {config__parameters.map((parameter: any, index: number) => (
            <div key={index} className='grid grid-cols-2 px-4 py-3 border-t border-gray-200'>
              <div className='text-sm text-gray-900'>{parameter.name}</div>
              <div className='text-sm text-gray-700'>
                {parameter.label || parameter.description || 'XXXXXXXXXXX'}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderHiddenForm = () => {
    if (config__parameters.length === 0)
      return null

    return (
      <div className='hidden'>
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
          })}
        </Form>
      </div>
    )
  }

  const renderNoParametersMessage = () => {
    if (config__parameters.length > 0)
      return null

    return (
      <div className='px-3'>
        <div className='text-center py-8 text-gray-500'>
          <div className='text-sm'>暂无参数配置</div>
          <div className='text-xs mt-1'>此工具无需额外参数</div>
        </div>
      </div>
    )
  }

  const renderDownArrow = () => (
    <div className='flex justify-center mt-4'>
      <IconFont type='icon-arrow-down' className='text-gray-400' style={{ fontSize: 16 }} />
    </div>
  )

  return (
    <div className='mt-0.5 pb-4'>
      {renderInputParametersTable()}
      {renderHiddenForm()}
      {renderNoParametersMessage()}
      {renderDownArrow()}
    </div>
  )
}

export default McpResourcePanel
