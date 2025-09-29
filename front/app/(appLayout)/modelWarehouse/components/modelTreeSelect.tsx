import React from 'react'
import { Cascader, Form } from 'antd'

type IProps = {
  treeData: any
  labelProp: string
  labelName: string
  message: string
  compare: string
  bForm: any
}

export default (props: IProps) => {
  const {
    treeData = [],
    labelProp,
    labelName,
    message,
    bForm,
    compare,
  } = props

  const transformTreeData = (data: any) => {
    return data?.map((item: any) => {
      return {
        value: item.model_name,
        label: item.model_name,
        model_type: item.model_type,
        children: item.services?.map(service => ({
          value: `${item.model_name}:${service.id}`,
          label: service.name,
          model_type: item.model_type,
        })) || [],
      }
    })
  }

  const onSelect = (value, selectedOptions) => {
    if (selectedOptions?.length > 0) {
      const node = selectedOptions[selectedOptions.length - 1]
      if (labelProp === 'model_name')
        bForm.setFieldValue('model_type', node?.model_type)
      else
        bForm.setFieldValue('ai_evaluator_type', node?.model_type)
    }
  }

  return (
    <Form.Item
      name={labelProp}
      label={labelName}
      rules={[
        { required: true, message },
        {
          validator: (rule, value, callback) => {
            const tem = bForm.getFieldValue(compare)
            if (tem?.[1] === value?.[1])
              callback('评测模型与AI测评器不可重复')
            else
              callback()
          },
        },
      ]}
    >
      <Cascader
        style={{ width: '100%' }}
        options={transformTreeData(treeData)}
        placeholder={message}
        onChange={onSelect}
        changeOnSelect={false}
      />
    </Form.Item>
  )
}
