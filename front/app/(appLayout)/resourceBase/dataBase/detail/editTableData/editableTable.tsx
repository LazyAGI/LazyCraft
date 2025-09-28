import React, { useContext, useEffect, useRef, useState } from 'react'
import type { GetRef, InputRef, TableProps } from 'antd'
import {
  Button, Form, Input, InputNumber, Modal, Popconfirm,
  Select, Table, Upload, message,
} from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { useToggle } from 'ahooks'
import { DATA_TYPE_DICT, handleTableCellValue, handleTableData, isNumberType } from '../utils'
import useValidateSpace from '@/shared/hooks/use-validate-space'

import { downloadTemplate } from '@/infrastructure/api/database'
import { prefixUrl } from '@/shared/utils'

const { Dragger } = Upload
type FormInstance<T> = GetRef<typeof Form<T>>

const EditableContext = React.createContext<FormInstance<any> | null>(null)

type EditableRowProps = {
  index: number
}

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
  dataIndex: any
  record: any
  handleSave: (record: any) => void
  type: string
}

const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = ({
  title,
  editable,
  children,
  dataIndex,
  record,
  type,
  handleSave,
  ...restProps
}) => {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<InputRef>(null)
  const form = useContext(EditableContext)!

  const isBooleanType = type === DATA_TYPE_DICT.BOOLEAN
  const isTextType = type === DATA_TYPE_DICT.TEXT
  const isVarcharType = type === DATA_TYPE_DICT.VARCHAR
  const isBigIntType = type === DATA_TYPE_DICT.BIGINT
  const isNumericType = type === DATA_TYPE_DICT.NUMERIC

  useEffect(() => {
    if (editing)
      inputRef.current?.focus()
  }, [editing])

  const toggleEdit = () => {
    setEditing(!editing)

    form.setFieldsValue({ [dataIndex]: record[dataIndex] })
  }
  const save = async () => {
    try {
      const values = await form.validateFields()

      toggleEdit()
      handleSave({ ...record, ...handleTableCellValue(values) })
    }
    catch (errInfo) {
    }
  }

  let childNode = children

  if (editable) {
    childNode = editing
      ? (
        <Form.Item
          style={{ margin: 0 }}
          name={dataIndex}
        >
          {/* 如果选择了外键字段，则自动同步数据类型（不可修改） */}
          {
            isNumberType(type)
              ? <InputNumber
                onPressEnter={save}
                onBlur={save}
                placeholder="请输入"
                max={isNumericType ? 9999999999 : isBigIntType ? 9999999999999999999 : Number.MAX_SAFE_INTEGER}
                style={{ width: '100%' }}
                precision={isNumericType ? 4 : 0}
                stringMode={isBigIntType}
              />
              : isBooleanType
                ? <Select
                  options={[
                    { label: 'true', value: true },
                    { label: 'false', value: false },
                    { label: 'None', value: null },
                  ]}
                  onChange={save}
                  autoFocus
                  defaultOpen
                />
                : <Input
                  ref={inputRef}
                  onPressEnter={save}
                  onBlur={save}
                  placeholder="请输入"
                  showCount={!(isTextType || isVarcharType)}
                  maxLength={(isTextType || isVarcharType) ? Infinity : 100}
                />
          }
        </Form.Item>
      )
      : (
        <div
          className="cursor-pointer break-all"
          style={{ paddingInlineEnd: 24, minHeight: 20, width: '100%' }}
          onClick={toggleEdit}
        >
          {
            children && (isBooleanType
              ? (() => {
                const value = children[1] !== undefined ? children[1] : record[dataIndex]
                // 处理字符串和布尔值两种情况
                if (value === null || value === undefined)
                  return ''

                if (typeof value === 'string')
                  return value.toLowerCase() === 'true' ? 'true' : 'false'

                return value ? 'true' : 'false'
              })()
              : children)
          }
        </div>
      )
  }

  return <td {...restProps}>{childNode}</td>
}

type ColumnTypes = Exclude<TableProps<any>['columns'], undefined>

const EditableTable = (props: any) => {
  const { onSave, database_id, table_id, requestInstance } = props
  const { data } = requestInstance
  const { validate } = useValidateSpace()
  const dynamicColumns = data.columns.columns
  const [page, setPage] = useState<number>(1)
  const [modalPage, setModalPage] = useState<number>(1)

  const [dataSource, setDataSource] = useState<any[]>(handleTableData(data.data, page))

  const [uploadModalDataSource, setUploadModalDataSource] = useState<any[]>([])

  const [modalVisible, { toggle }] = useToggle(false)
  const [confirmExcelModalVisible, { toggle: toggleConfirmExcel }] = useToggle(false)

  const handleDelete = (key: number, isUploadModalMode) => {
    if (isUploadModalMode) {
      const newData = uploadModalDataSource.filter((item, i) => i !== (key + (modalPage - 1) * 10))
      setUploadModalDataSource(newData)
    }
    else {
      const newData = dataSource.filter((item, i) => i !== (key + (page - 1) * 10))
      setDataSource(newData)
      onSave && onSave(newData)
    }
  }

  const handleAdd = async () => {
    const isValid = await validate()
    if (isValid) {
      const defaultAddVal = {}
      dynamicColumns.forEach((el: any) => {
        const { name, type } = el
        defaultAddVal[name] = isNumberType(type) ? (Number(el.default) || 0) : el.default
      })
      const newDataSource = [...dataSource, defaultAddVal]
      setDataSource(newDataSource)
      onSave && onSave(newDataSource)

      // 计算新的总页数并自动切换到最新页
      const newTotalPages = Math.ceil(newDataSource.length / 10)
      if (newTotalPages > page)
        setPage(newTotalPages)
    }
  }
  const handleUpload = async () => {
    const isValid = await validate()
    if (isValid)
      toggle()
  }
  const handleSave = (row: any, isUploadModalMode, editIndex) => {
    const newData = isUploadModalMode ? [...uploadModalDataSource] : [...dataSource]
    const item = newData[editIndex]
    // 对bigint做处理
    newData.splice(editIndex, 1, {
      ...item,
      ...row,
    })

    if (isUploadModalMode) {
      setUploadModalDataSource(newData)
    }
    else {
      onSave && onSave(newData)
      setDataSource(newData)
    }
  }

  const generateColumns = isModalMode => [
    ...(dynamicColumns
      ? dynamicColumns.map(el => ({
        ...el,
        editable: true,
        title: el.nullable
          ? el.name
          : <span>
            <span className='text-[#FD8383]'>*</span>&nbsp;
            {el.name}
          </span>,
        dataIndex: el.name,
        onCell: (record: any, index, r) => {
          return {
            record,
            editable: true,
            type: el.type || DATA_TYPE_DICT.TEXT,
            title: el.name,
            dataIndex: el.name,
            handleSave: val => handleSave(val, isModalMode, ((isModalMode ? modalPage : page) - 1) * 10 + index),
          }
        },
      }))
      : {}),
    {
      title: '操作',
      dataIndex: '',
      render: (_, __, index) =>
        <Popconfirm title="确认删除?" onConfirm={() => handleDelete(index, isModalMode)}>
          <Button type="link" danger>删除</Button>
        </Popconfirm>,
    },
  ]

  const onConfirmExcelSubmit = () => {
    setDataSource([...dataSource, ...uploadModalDataSource])
    onSave && onSave([...dataSource, ...uploadModalDataSource])
    toggleConfirmExcel()
  }

  const uploadProps = {
    name: 'file',
    multiple: false,
    action: `${prefixUrl}/console/api/database/import/${database_id}/${table_id}?action=preview`,
    headers: { Authorization: `Bearer ${localStorage.getItem('console_token')}` },
    onChange(info) {
      const { status } = info.file
      if (status !== 'uploading') {
        const res = info.file.response
        if (res) {
          // 对数据做容错处理 特别是NaN的值
          setUploadModalDataSource(res.data.map((el) => {
            const obj = {}
            for (const key in el) {
              if (Number.isNaN(el[key]))
                obj[key] = ''
              else
                obj[key] = el[key]
            }
            return obj
          }))
          toggle()
          toggleConfirmExcel()
        }
      }
      if (status === 'done') {
        // message.success(`${info.file.name} file uploaded successfully.`);
      }
      else if (status === 'error') {
        message.error(`${info.file.name} file upload failed.`)
      }
    },
    onDrop(e) {
    },
  }

  const handleDownloadTemplate = () => {
    downloadTemplate({ database_id, table_id }).then((res: any) => {
      // 创建一个链接元素
      const link = document.createElement('a')
      link.href = URL.createObjectURL(res) // 创建 Blob URL
      link.download = '数据模版.xlsx' // 设置下载的文件名

      // 模拟点击链接以下载文件
      link.click()

      // 释放 Blob URL
      URL.revokeObjectURL(link.href)
    })
  }

  return (
    <div>
      <div className='text-right mb-5'>
        <div>
          <Button onClick={handleAdd} type="primary" ghost className='mr-2'>
            添加一列数据
          </Button>
          <Button onClick={handleUpload} type="primary" ghost>
            导入数据
          </Button>
        </div>

      </div>
      <Table
        components={{
          body: {
            row: EditableRow,
            cell: EditableCell,
          },
        }}
        pagination={{
          current: page,
          pageSize: 10,
          pageSizeOptions: [10],
          showTotal: total => `共${total}条数据`,
        }}
        rowClassName={() => 'editable-row'}
        bordered
        dataSource={dataSource}
        columns={generateColumns(false) as ColumnTypes}
        onChange={(pagination: any) => {
          setPage(pagination.current)
        }}
      />

      <div className='text-right mt-5 mb-5'>
        <Button type="primary" htmlType='submit'>保存</Button>
      </div>

      <Modal
        title="导入数据"
        open={modalVisible}
        footer={null}
        onCancel={toggle}
        destroyOnClose
        centered
        modalRender={dom => <Form
          layout="vertical"
          name="upload_excel_modal"
          clearOnDestroy
        >
          {dom}
        </Form>}
      >
        <Form.Item name="name" label='导入文件' rules={[{ required: true, message: '请上传文件' }]}>
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">将文件拖拽至此区域或选择文件上传</p>
          </Dragger>
        </Form.Item>
        <div className='text-[#8F949E] mb-5'>
          <div>导入要求：</div>
          <div>
            1. 点击<Button type="link" style={{ padding: 0 }} onClick={handleDownloadTemplate}>下载模版</Button>，并按照规定格式填写数据，*部分为必填字段；
          </div>
          <div>
            2. 注意至少添加一行数据。
          </div>
        </div>
      </Modal>

      <Modal
        title="导入数据"
        open={confirmExcelModalVisible}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ autoFocus: true, htmlType: 'submit' }}
        onCancel={toggleConfirmExcel}
        destroyOnClose
        centered
        width={1000}
        modalRender={dom => <Form
          layout="vertical"
          name="confirm_excel_form"
          clearOnDestroy
          onFinish={onConfirmExcelSubmit}
        >
          {dom}
        </Form>}
      >
        <Table
          components={{
            body: {
              row: EditableRow,
              cell: EditableCell,
            },
          }}
          rowClassName={() => 'editable-row'}
          bordered
          dataSource={uploadModalDataSource}
          columns={generateColumns(true) as ColumnTypes}
          onChange={(pagination: any) => {
            setModalPage(pagination.current)
          }}
        />
      </Modal>
    </div>
  )
}

export default EditableTable
