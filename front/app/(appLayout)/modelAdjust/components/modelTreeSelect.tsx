import React from 'react'
import { Form, TreeSelect } from 'antd'

const { TreeNode } = TreeSelect
type IProps = {
  treeData: any
  setType: any
}

export default (props: IProps) => {
  const {
    treeData = [],
    setType,
  } = props
  const renderTreeNodes = (data: any, parentModelType?: string) => {
    if (!Array.isArray(data))
      return null

    return data.map((item: any) => {
      const type = item?.model_type || parentModelType
      if (item.child) {
        return (
          <TreeNode
            key={item?.model}
            model_type={type}
            title={
              <span>{item?.model || item?.model_key}</span>
            }
            value={`${item?.model}:${item?.source?.split('/')[1]}`}
          >
            {renderTreeNodes(item.child, type)}
          </TreeNode>
        )
      }
      return (
        <TreeNode
          {...item}
          key={item?.model}
          model_type={type}
          title={
            <span >
              {item?.model || item?.model_key}
            </span>
          }
          // checkable={item.can_select}
          // selectable={item.can_select}
          value={`${item?.model}:${item?.source?.split('/')[1]}`}
        />
      )
    })
  }
  const onSelect = (value, node) => {
    setType(`${node?.model}:${node?.source?.split('/')[1]}`)
  }
  return (
    <Form.Item
      name="base_model"
      label="选择模型"
      rules={[{ required: true, message: '请选择模型' }]}
    >
      <TreeSelect
        style={{ width: '100%' }}
        dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
        placeholder='请选择模型'
        onSelect={onSelect}
      >
        {renderTreeNodes(treeData)}
      </TreeSelect>
    </Form.Item>

  )
}
