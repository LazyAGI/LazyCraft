import type { FC } from 'react'
import React, { useMemo } from 'react'
import { Form } from 'antd'
import useConfig from './use-config'
import FieldItem from '@/app/components/taskStream/elements/_foundation/components/form/field-item'

const SqlManagerResourcePanel: FC<any> = ({
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
  // 直接从inputs中获取数据来源值，确保实时响应
  const databaseSourceValue = inputs?.payload__source || 'outer'

  const renderRequiredMark = (label: any, info: { required: boolean }) => (
    <span className="flex items-center">
      {label} {info.required && <span className='field-item-required-mark text-red-500 ml-1'>*</span>}
    </span>
  )

  // 使用useMemo优化字段渲染逻辑，确保当inputs变化时重新计算
  const visibleParameters = useMemo(() => {
    return config__parameters.filter((parameter: any) => {
      const { name } = parameter
      
      // 数据来源字段和表信息字段始终显示
      if (name === 'payload__source' || name === 'payload__tables_info_dict_array')
        return true

      // 根据数据来源决定显示哪些字段
      if (databaseSourceValue === 'platform') {
        // 平台数据库：只显示平台数据库选择字段
        return name === 'payload__database_id'
      } else if (databaseSourceValue === 'outer') {
        // 外部数据库：显示所有外部数据库相关字段，但不显示平台数据库选择字段
        return name !== 'payload__database_id'
      }

      // 默认情况下不显示任何字段
      return false
    })
  }, [config__parameters, databaseSourceValue])

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
        {visibleParameters.map(renderParameterField)}
      </Form>
    </div>
  )
}

export default React.memo(SqlManagerResourcePanel)
