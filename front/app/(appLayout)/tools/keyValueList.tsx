import React from 'react'
import { Button, Form, Input } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'

type KeyValueListProps = {
  name: string
  label: string
  disabled?: boolean
  keyPlaceholder?: string
  valuePlaceholder?: string
  addButtonText?: string
  keyLabel?: string
  valueLabel?: string
  keyValidationMessage?: string
  valueValidationMessage?: string
}

const KeyValueList: React.FC<KeyValueListProps> = ({
  name,
  label,
  disabled = false,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  addButtonText = '添加',
  keyLabel = 'Key',
  valueLabel = 'Value',
  keyValidationMessage = '请输入Key',
  valueValidationMessage = '请输入Value',
}) => {
  return (
    <Form.Item
      label={label}
    >
      <Form.List name={name} initialValue={[{ key: '', value: '' }]}>
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name: fieldName, ...restField }) => (
              <div key={key} style={{ display: 'flex', marginBottom: 8, alignItems: 'flex-start', gap: '8px' }}>
                <Form.Item
                  {...restField}
                  name={[fieldName, 'key']}
                  rules={[
                    { whitespace: true, message: `${keyLabel}不能为空或仅包含空格` },
                  ]}
                  style={{ flex: 1, marginBottom: 0 }}
                >
                  <Input disabled={disabled} placeholder={keyPlaceholder} />
                </Form.Item>
                <Form.Item
                  {...restField}
                  name={[fieldName, 'value']}
                  rules={[
                    { whitespace: true, message: `${valueLabel}不能为空或仅包含空格` },
                  ]}
                  style={{ flex: 1, marginBottom: 0 }}
                >
                  <Input disabled={disabled} placeholder={valuePlaceholder} />
                </Form.Item>
                {!disabled && fields.length > 1 && (
                  <MinusCircleOutlined
                    onClick={() => remove(fieldName)}
                    style={{
                      color: '#ff4d4f',
                      cursor: 'pointer',
                      marginTop: '6px',
                      fontSize: '16px',
                    }}
                  />
                )}
              </div>
            ))}
            {!disabled && (
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  {addButtonText}
                </Button>
              </Form.Item>
            )}
          </>
        )}
      </Form.List>
    </Form.Item>
  )
}

export default KeyValueList
