import type { FC } from 'react'
import React, { forwardRef, useCallback, useImperativeHandle, useMemo } from 'react'
import { Form } from 'antd'
import cn from 'classnames'
import FieldItem from '@/app/components/taskStream/elements/_foundation/components/form/field-item'

type Props = {
  className?: string
  resources?: any[]
  fields: any[]
  values: Record<string, string>
  onChange: (name: string | number, value: any) => void
  ref?: any
}

const FieldForm: FC<Props> = forwardRef((props: Props, ref) => {
  const {
    className,
    fields = [],
    resources,
    values,
    onChange,
  } = props
  const [form] = Form.useForm()

  useImperativeHandle(ref, () => ({
    formInstance: form,
  }))

  // 使用 useCallback 缓存 onChange 函数，避免子组件不必要的重新渲染
  const handleFieldChange = useCallback((name: string | number, value: any) => {
    onChange(name, value)
  }, [onChange])

  // 使用 useMemo 缓存 initialValues，避免每次 values 变化时都重新设置表单
  // 只有当values真正发生变化时才更新initialValues
  const initialValues = useMemo(() => {
    // 如果values为空对象，返回空对象避免不必要的重新渲染
    if (!values || Object.keys(values).length === 0) {
      return {}
    }
    return values
  }, [JSON.stringify(values)])

  return (
    <Form
      form={form}
      initialValues={initialValues}
      layout='vertical'
      className={cn(className)}
      requiredMark={(label: any, info: { required: boolean }) => (
        <span className="flex items-center">
          {label} {info.required && <span className='field-item-required-mark text-red-500 ml-1'>*</span>}
        </span>
      )}
    >
      {React.useMemo(() => fields.map((parameter, index) => {
        const { name } = parameter
        const value = values[name]
        return (
          <FieldItem
            key={`${index}-${name}`}
            {...parameter}
            value={value}
            nodeData={values}
            resources={resources}
            onChange={handleFieldChange}
          />
        )
      }), [fields, values, resources, handleFieldChange])}
    </Form>
  )
})

FieldForm.displayName = 'FieldForm'

export default React.memo(FieldForm)
