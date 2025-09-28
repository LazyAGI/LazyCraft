'use client'
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Button, Form, Input, Modal, Select, Switch, Table } from 'antd'
import { v4 as uuid4 } from 'uuid'
import classNames from 'classnames'
import style from './index.module.scss'
import IconFont from '@/app/components/base/iconFont'

type TableEditModalProps = {
  type: 'add' | 'edit'
  visible: boolean
  record: any
  dbType: string
  setVisible: (visible: boolean) => void
  onOk: (data: any, type: 'add' | 'edit') => void
}

const commonDBTypes = [
  { label: 'Integer', value: 'Integer' },
  { label: 'Text', value: 'Text' },
  { label: 'Boolean', value: 'Boolean' },
  { label: 'Float', value: 'Float' },
  { label: 'DateTime', value: 'DateTime' },
  { label: 'LargeBinary', value: 'LargeBinary' },
  { label: 'Date', value: 'Date' },
  { label: 'Time', value: 'Time' },
  { label: 'JSON', value: 'JSON' },
]

const TableEditModal: React.FC<any> = (props: TableEditModalProps) => {
  const { type, visible, record, dbType, setVisible, onOk } = props
  const [form] = Form.useForm()
  const dataSourceRef = useRef<any[]>([])
  const [dataSource, setDataSource] = useState<any[]>([])

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        name: record?.name,
        comment: record?.comment,
      })
      const currentDataSource = type === 'add'
        ? [
          {
            key: '0',
            nullable: true,
            is_primary_key: false,
            data_type: 'Text',
          },
        ]
        : (record?.columns || [])
      dataSourceRef.current = currentDataSource
      setDataSource(dataSourceRef.current)
    }
  }, [visible, record])

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      const data = {
        ...record,
        ...values,
        columns: dataSourceRef.current,
      }
      onOk && onOk(data, type)
      form.resetFields()
      setVisible(false)
    })
  }

  const handleCancel = () => {
    setVisible(false)
  }

  const handleDelete = (key: React.Key) => {
    const newData = dataSourceRef.current.filter(item => item.key !== key)
    dataSourceRef.current = newData
    setDataSource(dataSourceRef.current)
  }

  const handleAdd = () => {
    const newData: any = {
      key: uuid4(),
      nullable: true,
      is_primary_key: false,
      data_type: 'Text',
    }
    dataSourceRef.current = [...dataSourceRef.current, newData]
    setDataSource(dataSourceRef.current)
  }

  const handleSave = (row: any) => {
    let newData = [...dataSourceRef.current]
    newData = newData.map((item) => {
      if (item.key === row.key) {
        return {
          ...item,
          ...row,
        }
      }
      return item
    })
    dataSourceRef.current = newData
    // 保存时不需要setDataSource，避免table row强制刷新重新渲染
  }

  const defaultColumns: any[] = [
    {
      title: <span>字段名称<span className={classNames('text-red-500 ml-1', style.requiredMark)}>*</span></span>,
      dataIndex: 'name',
      width: '22%',
      editable: true,
      required: true,
      requiredMessage: '字段名称为必填项',
      type: 'input',
      placeholder: '字段名称',
    },
    {
      title: '描述',
      dataIndex: 'comment',
      width: '26%',
      editable: true,
      type: 'input',
      placeholder: '描述',
    },
    {
      title: <span>类型<span className={classNames('text-red-500 ml-1', style.requiredMark)}>*</span></span>,
      dataIndex: 'data_type',
      width: '15%',
      editable: true,
      required: true,
      requiredMessage: '类型为必填项',
      type: 'select',
      placeholder: 'data_type',
      options: dbType === 'MySQL'
        ? [{ label: 'Text', value: 'Text' }]
        : dbType === 'PostgreSQL'
          ? [...commonDBTypes, { label: 'Uuid', value: 'Uuid' }]
          : [...commonDBTypes],
    },
    {
      title: '是否可为空',
      dataIndex: 'nullable',
      width: '12%',
      editable: true,
      type: 'switch',
    },
    {
      title: '是否为主键',
      dataIndex: 'is_primary_key',
      width: '15%',
      editable: true,
      type: 'switch',
    },
    {
      title: '操作',
      dataIndex: 'operation',
      render: (_, record) =>
        dataSource.length >= 1
          ? (
            <IconFont
              type="icon-shanchu1"
              className={style.tableDeleteIcon}
              onClick={() => handleDelete(record.key)}
            />
          )
          : null,
    },
  ]

  const columns = defaultColumns.map((col) => {
    if (!col.editable)
      return col

    return {
      ...col,
      onCell: (record: any) => ({
        record,
        editable: col.editable,
        dataIndex: col.dataIndex,
        title: col.title,
        type: col.type,
        required: col.required,
        requiredMessage: col.requiredMessage,
        placeholder: col.placeholder,
        options: col.options,
        handleSave,
      }),
    }
  })

  type EditableRowProps = {
    index: number
  }

  const EditableContext = React.createContext<any>(null)
  const EditableRow: React.FC<EditableRowProps> = ({ index, ...props }) => {
    const [form] = Form.useForm()
    return (
      <Form form={form} component={false}>
        <EditableContext.Provider value={form}>
          <tr {...props} />
        </EditableContext.Provider>
      </Form>
    )
  }

  type EditableCellProps = {
    title: React.ReactNode
    editable: boolean
    type: 'input' | 'select' | 'switch'
    required?: boolean
    requiredMessage?: string
    dataIndex: string
    record: any
    placeholder?: string
    options?: Array<{ label: string; value: string }>
    handleSave: (record: any) => void
  }

  const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = useCallback(({
    title,
    editable,
    required,
    requiredMessage,
    type,
    children,
    dataIndex,
    record,
    placeholder,
    options,
    handleSave,
    ...restProps
  }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [editing] = useState(true)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const inputRef = useRef<any>(null)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const form = useContext(EditableContext)

    const save = async () => {
      try {
        const values = await form.validateFields()

        handleSave({ ...record, ...values })
      }
      catch (errInfo) {
      }
    }

    let childNode = children

    if (editable) {
      childNode = editing
        ? type === 'select'
          ? (
            <Form.Item
              style={{ margin: 0 }}
              name={dataIndex}
              rules={[{ required, message: requiredMessage || `${title} 为必填项` }]}
              initialValue={record[dataIndex]}
            >
              <Select ref={inputRef} placeholder={placeholder} onBlur={save} options={options || []} />
            </Form.Item>
          )
          : type === 'switch'
            ? (
              <Form.Item
                style={{ margin: 0 }}
                name={dataIndex}
                rules={[{ required, message: requiredMessage || `${title} 为必填项` }]}
                initialValue={record[dataIndex]}
              >
                <Switch ref={inputRef} onChange={save} />
              </Form.Item>
            )
            : (
              <Form.Item
                style={{ margin: 0 }}
                name={dataIndex}
                rules={[{ required, message: requiredMessage || `${title} 为必填项` }]}
                initialValue={record[dataIndex]}
              >
                <Input ref={inputRef} placeholder={placeholder} onPressEnter={save} onBlur={save} />
              </Form.Item>
            )
        : (
          <div
            className="editable-cell-value-wrap"
            style={{ paddingInlineEnd: 24 }}
          >
            {children}
          </div>
        )
    }

    return <td {...restProps}>{childNode}</td>
  }, [dataSource, EditableContext])

  const components = {
    body: {
      row: EditableRow,
      cell: EditableCell,
    },
  }

  return (
    <Modal
      width={1022}
      cancelText="取消"
      okText={'确定'}
      title={type === 'add' ? '添加 Table' : '编辑 Table'}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
    >
      <div className={style.createWrap}>
        <Form form={form} className={style.resetForm} layout="vertical">
          <Form.Item
            name="name"
            validateTrigger="onBlur"
            label='Table 名称'
            initialValue={record?.name}
            rules={[
              { required: true, message: '请输入 Table 名称' },
              { whitespace: true, message: '输入不能为空或仅包含空格' },
            ]}
          >
            <Input
              placeholder="请输入Table 名称"
              className={style.antInput}
            />
          </Form.Item>
          <Form.Item
            name="comment"
            validateTrigger="onBlur"
            label="Table 描述"
            initialValue={record?.comment}
          >
            <Input.TextArea
              placeholder="请输入 Table 描述"
              rows={4}
            />
          </Form.Item>

          <Form.Item>
            <Table
              rowKey='key'
              components={components}
              rowClassName={() => 'editable-row'}
              bordered
              dataSource={dataSource}
              columns={columns as any[]}
              pagination={false}
            />
            <Button onClick={handleAdd} type="primary" ghost style={{ marginTop: 16 }}>
              添加一行
            </Button>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  )
}

export default TableEditModal
