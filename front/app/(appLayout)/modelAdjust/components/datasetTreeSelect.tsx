import React from 'react'
import { Form, TreeSelect } from 'antd'

const { TreeNode } = TreeSelect
type IProps = {
  treeData: any
}

export default (props: IProps) => {
  const {
    treeData = [],
  } = props
  const renderTreeNodes = (data: any) =>
    data.map((item: any) => {
      if (item.child) {
        return (
          <TreeNode
            key={item?.val_key}
            title={
              <span>{item?.label}</span>
            }
            value={item?.val_key}
            checkable={!Object.keys(item).includes('child')}
            selectable={!Object.keys(item).includes('child')}
          >
            {renderTreeNodes(item?.child)}
          </TreeNode>
        )
      }
      return (
        <TreeNode
          {...item}
          key={item?.val_key}
          title={
            <span >
              {item?.label}
            </span>
          }
          checkable={!Object.keys(item).includes('child')}
          selectable={!Object.keys(item).includes('child')}
          value={item?.val_key}
        />
      )
    })
  return (
    <Form.Item
      name="datasets"
      label="训练数据集"
      rules={[{ required: true, message: '请选择训练数据集' }]}
    >
      <TreeSelect
        style={{ width: '100%' }}
        multiple
        dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
        placeholder='请选择模型'
      >
        {renderTreeNodes(treeData)}
      </TreeSelect>
    </Form.Item>

  )
}
