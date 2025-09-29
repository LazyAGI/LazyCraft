'use client'
import type { FC } from 'react'
import React from 'react'
import { Button, Divider, Form } from 'antd'
import { PlusCircleOutlined } from '@ant-design/icons'
import { v4 as uuid4 } from 'uuid'
import type { FieldItemProps } from '../types'
import CodeEditor from './code'
import IconFont from '@/app/components/base/iconFont'
import { TextArea } from '@/app/components/taskStream/elements/_foundation/components/form/base'
import { currentLanguage } from '@/app/components/taskStream/elements/script/types'

const SelectComponent: FC<Partial<FieldItemProps>> = ({
  name,
  value = [],
  readOnly,
  onChange,
}) => {
  value = value?.map(item => ({ ...item, key: item?.key || uuid4() }))

  const addGroup = () => {
    onChange && onChange(name, [...value, { key: uuid4() }])
  }

  const removeGroup = (key) => {
    const currentValue = value?.filter((item: any) => item.key !== key)
    onChange && onChange({
      [name]: currentValue,
      payload__sql_examples: JSON.stringify(
        currentValue.map((item: any) => ({ Question: item.Question || '', Answer: item.Answer || '' })),
      ),
    })
  }

  const handleGroupChange = (group_key: string, data: any) => {
    const currentValue = value?.map((item: any) => (item.key === group_key ? { ...item, ...data } : item))
    onChange && onChange({
      [name]: currentValue,
      payload__sql_examples: JSON.stringify(
        currentValue.map((item: any) => ({ Question: item.Question || '', Answer: item.Answer || '' })),
      ),
    })
  }

  return (
    <div className="sql_examples_group_wrapper">
      <div
        className="sql_examples_group_title w-full"
        style={{ paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid #e8e8e8' }}
      >
        <label style={{ color: '#5E6472' }}>
          <Divider type="vertical" style={{ backgroundColor: '#1677ff', width: 3, marginLeft: 0 }} />
          自然语言转SQL脚本的样例
        </label>
        {!readOnly && <Button
          size='small'
          type='text'
          style={{ color: '#1677ff', float: 'right' }}
          onClick={addGroup}
          disabled={readOnly}
        >
          <PlusCircleOutlined style={{ fontSize: '14px' }} />添加
        </Button>}
      </div>
      <div className="sql_examples_group_list w-full">
        {value?.map(item => (
          <div key={item.key} style={{ position: 'relative' }}>
            <GroupItem data={{ ...item }} onChange={handleGroupChange} />
            {!readOnly && <Button
              size='small'
              danger
              disabled={readOnly}
              onClick={() => removeGroup(item?.key)}
              style={{ position: 'absolute', right: 0, top: 0 }}
            >
              <IconFont type='icon-shanchu1' className='mr-1 w-3.5 h-3.5' />
              移除
            </Button>}
            <Divider />
          </div>
        ))}
      </div>
    </div>
  )
}
export default React.memo(SelectComponent)

function GroupItem({ data, onChange }) {
  const [form] = Form.useForm()

  const handleFormItemChange = (key: string, value: any) => {
    const newData = { ...data, [key]: value }

    onChange(data.key, {
      ...newData,
    })
    form.setFieldValue(key, value)
    form.validateFields([key])
  }

  return (
    <Form
      form={form}
      initialValues={data}
      layout='vertical'
      validateTrigger='onBlur'
      requiredMark={(label: any, info: { required: boolean }) => (
        <span className="flex items-center">
          {label} {info.required && <span className='field-item-required-mark text-red-500 ml-1'>*</span>}
        </span>
      )}
    >
      <Form.Item name="Question" label="Question" required className='field-item'>
        <TextArea
          className='w-full'
          placeholder='请输入Question'
          onChange={e => handleFormItemChange('Question', e.target.value)}
        />
      </Form.Item>

      <Form.Item name="Answer" label="Answer" required className='field-item'>
        <FragmentComponent>
          <CodeEditor
            name="Answer"
            value={data?.Answer}
            nodeData={data}
            code_language_options={[{ label: 'sql', value: currentLanguage.sql }]}
            onChange={handleFormItemChange as any}
          />
        </FragmentComponent>
      </Form.Item>
    </Form>
  )
}

function FragmentComponent({ children }) {
  return (<>{children}</>)
}
