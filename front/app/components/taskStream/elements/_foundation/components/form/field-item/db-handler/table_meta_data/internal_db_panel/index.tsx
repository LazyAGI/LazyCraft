'use client'
import React, { useEffect, useState } from 'react'
import { Form, Input, Modal, Select, Table } from 'antd'
import { useRequest } from 'ahooks'
import { getDataBaseTable, getDataBaseTableStructureByName } from '@/infrastructure/api//database'

type TableEditModalProps = {
  type: 'add' | 'edit'
  visible: boolean
  record: any
  setVisible: (visible: boolean) => void
  onOk: (data: any, type: 'add' | 'edit') => void
  database_id: string
}

const TableEditModal: React.FC<any> = (props: TableEditModalProps) => {
  const { database_id, type, visible, record, setVisible, onOk } = props
  const [form] = Form.useForm()
  const [dataSource, setDataSource] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const { data } = useRequest(() =>
    getDataBaseTable({ database_id, page: 1, limit: 999999 })
      .then((res: any) => ({ ...res, data: res.data.map(el => ({ ...el, label: el.name, value: el.name })) })),
  {
    refreshDeps: [database_id],
    ready: !!database_id,
  },
  )
  useEffect(() => {
    if (visible) {
      if (record) {
        form.setFieldsValue(record)
        setDataSource(record.columns)
        const allKeys = record.columns.map((_, index) => index.toString())
        setSelectedKeys(allKeys)
      }
      else {
        form.resetFields()
        setDataSource([])
        setSelectedKeys([])
      }
    }
  }, [visible, record])

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      const filteredData = dataSource.filter((_, index) => selectedKeys.includes(index.toString()))
      const data = {
        ...record,
        ...values,
        columns: filteredData,
      }
      onOk && onOk(data, type)
      form.resetFields()
      setVisible(false)
    })
  }

  const defaultColumns: any[] = [
    {
      title: '字段名称',
      dataIndex: 'name',
      width: '22%',
    },
    {
      title: '描述',
      dataIndex: 'comment',
      width: '26%',
    },
    {
      title: '类型',
      dataIndex: 'data_type',
      width: '15%',
    },
    {
      title: '是否可为空',
      dataIndex: 'nullable',
      width: '12%',
      render: v => v ? '是' : '否',
    },
    {
      title: '是否为主键',
      dataIndex: 'is_primary_key',
      width: '15%',
      render: v => v ? '是' : '否',
    },
  ]

  const handleSingleDatabaseTable = async (e) => {
    const res: any = await getDataBaseTableStructureByName({ database_id, table_name: e, page: 1, limit: 99999 })
    setDataSource(res.data.columns)
    const allKeys = res.data.columns.map((_, index) => index.toString())
    setSelectedKeys(allKeys)
    form.setFieldValue('name', res.data.table_name)
    form.setFieldValue('comment', res.data.comment)
  }

  return (
    <Modal
      width={1022}
      cancelText="取消"
      okText={'确定'}
      title={`${type === 'add' ? '添加' : '编辑'}数据表`}
      open={visible}
      onOk={handleOk}
      onCancel={() => setVisible(false)}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label='数据库表'
          rules={[
            { required: true, message: '请选择数据库表' },
          ]}
        >
          <Select
            placeholder="请选择数据库表"
            options={data?.data}
            onChange={handleSingleDatabaseTable}
          />
        </Form.Item>
        <Form.Item
          name="comment"
          label="数据库表描述"
        >
          <Input.TextArea
            placeholder="请选择数据库表"
            rows={4}
            disabled
          />
        </Form.Item>
        <Table
          rowKey={(_record, index) => (index || 0).toString()}
          bordered
          dataSource={dataSource}
          rowSelection={{
            type: 'checkbox',
            onChange: (selectedRowKeys) => {
              setSelectedKeys(selectedRowKeys as string[])
            },
            selectedRowKeys: selectedKeys,
          }}
          columns={defaultColumns}
          pagination={{
            pageSizeOptions: [10],
            showTotal: total => `共${total}条数据`,
          }}
          onChange={(pagination: any) => {
            setPage(pagination.current)
          }}
        />
      </Form>
    </Modal>
  )
}

export default TableEditModal
