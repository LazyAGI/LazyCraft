import React, { useState } from 'react'
import { Button, Table } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

const TableForm = (props) => {
  const { columns, data } = props
  const [dataSource, setDataSource] = useState(data || [])
  const [count, setCount] = useState(0)

  const handleAdd = () => {
    const newData = {
      key: count,
      paramName: '',
      paramDesc: '',
      paramType: 'String',
      isRequired: true,
    }
    setDataSource([...dataSource, newData])
    setCount(count + 1)
  }

  return (
    <div>
      <Button
        type="dashed"
        onClick={handleAdd}
        style={{ width: '100%', marginTop: 16, marginBottom: 16 }}
        icon={<PlusOutlined />}
      >
        添加参数
      </Button>
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        rowKey="key"
      />
    </div>
  )
}

export default TableForm
