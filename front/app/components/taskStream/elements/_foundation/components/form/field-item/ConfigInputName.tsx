'use client'

import { memo } from 'react'
import { Button, Checkbox, Form, Input, Select } from 'antd'
import Icon from '@/app/components/base/iconFont'
import './ConfigInputName.scss'

// 定义基础类型选项
const dataTypeOptions = [
  { label: 'str', value: 'str' },
  { label: 'int', value: 'int' },
  { label: 'float', value: 'float' },
  { label: 'bool', value: 'bool' },
  { label: 'file', value: 'file' },
]

type FormValues = {
  variableName: string
  description: string
  dataType: string
  required: boolean
}

// 添加新的接口来支持多行
type ConfigInputNameProps = {
  name?: string
  value?: FormValues[] // 改为数组类型
  onChange?: (name: string, value: FormValues[]) => void
  disabled?: boolean
  readOnly?: boolean
}

const ConfigInputName = ({
  name,
  value,
  onChange,
  disabled = false,
  readOnly = false,
}: ConfigInputNameProps) => {
  // 添加数据转换确保 value 是数组
  const ensureArray = (val: FormValues | FormValues[] | undefined): FormValues[] => {
    if (!val) {
      return [{
        variableName: '',
        description: '',
        dataType: 'str',
        required: false,
      }]
    }

    // 如果是单个对象，转换为数组
    if (!Array.isArray(val))
      return [val]

    return val
  }

  const currentValue = ensureArray(value)

  const handleFormChange = (index: number, field: keyof FormValues, newValue: string | boolean) => {
    if (!onChange || disabled || readOnly)
      return

    const newValues = [...currentValue]
    newValues[index] = {
      ...newValues[index],
      [field]: newValue,
    }

    onChange(name || 'config__input_name', newValues)
  }

  const handleAddParam = () => {
    const newValues = [...currentValue, {
      variableName: '',
      description: '',
      dataType: 'str',
      required: false,
    }]

    onChange?.(name || 'config__input_name', newValues)
  }

  const handleDelete = (index: number) => {
    if (currentValue.length === 1)
      return // 保持至少一行

    const newValues = currentValue.filter((_, i) => i !== index)
    onChange?.(name || 'config__input_name', newValues)
  }

  return (
    <div className="config-container">
      {!readOnly && !disabled && (
        <div className="add-button-wrapper">
          <Button
            type="text"
            className="field-item-extra-add-btn"
            onClick={handleAddParam}
          >
            添加输入参数
            <Icon type="icon-tianjia1" style={{ color: '#0E5DD8' }} />
          </Button>
        </div>
      )}
      {currentValue.map((item, index) => (
        <div key={index} className="config-flex-items-center-gap-2">
          <Form.Item className='flex-items-center-gap-2'>
            <div className={`input-field-container ${(!item.variableName || !/^[a-zA-Z$_]/.test(item.variableName))
              ? 'has-error'
              : ''
            }`}>
              <p>变量名</p>
              <Input
                maxLength={10}
                value={item.variableName}
                onChange={e => handleFormChange(index, 'variableName', e.target.value)}
                disabled={disabled || readOnly}
                placeholder="请输入变量名"
              />
              {!item.variableName
                ? (
                  <div className="variable-name-tip">
                    请输入变量名称
                  </div>
                )
                : (!/^[a-zA-Z$_]/.test(item.variableName) && (
                  <div className="variable-name-tip">
                    变量名称和内容的首字符只能是字母、$ 或下划线
                  </div>
                ))}
            </div>
          </Form.Item>
          <div className='flex-items-center-gap-2'>
            <p>描述</p>
            <Input
              maxLength={20}
              value={item.description || ''}
              onChange={e => handleFormChange(index, 'description', e.target.value)}
              disabled={disabled || readOnly}
              placeholder="请输入描述"
            />
          </div>
          <div className='flex-items-center-gap-2'>
            <p>类型</p>
            <Select
              placeholder="请选择类型"
              value={item.dataType || ''}
              onChange={val => handleFormChange(index, 'dataType', val)}
              options={dataTypeOptions}
              disabled={disabled || readOnly}
            />
          </div>
          <div className='flex-items-center-gap-2-checkbox'>
            <p>必填</p>
            <Checkbox
              checked={item.required || false}
              onChange={e => handleFormChange(index, 'required', e.target.checked)}
              disabled={disabled || readOnly}
            />
          </div>
          <div
            className='flex-items-center-gap-2-delete'
            onClick={() => handleDelete(index)}
            style={{ cursor: 'pointer' }}
          >
            <Icon type="icon-shanchu1" style={{ fontSize: '16px' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default memo(ConfigInputName)
