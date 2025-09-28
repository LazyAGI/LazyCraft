'use client'
import type { GetRef, InputRef, TableProps } from 'antd'
import { Button, Form, Input, InputNumber, Modal, Table } from 'antd'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { ExclamationCircleFilled } from '@ant-design/icons'

import { useUpdate } from 'ahooks'
import { handleUploadCsvData } from '../utils'

import FileUploader from '@/app/components/taskStream/elements/_foundation/components/form/field-item/docUploader'

type FormInstance<T> = GetRef<typeof Form<T>>

const EditableContext = React.createContext<FormInstance<any> | null>(null)

type Item = {
  key: string
  name: string
  age: string
  address: string
}

type EditableRowProps = {
  index: number
}
type ColumnTypes = Exclude<TableProps<any>['columns'], undefined>

const EditableRow: React.FC<EditableRowProps> = ({ index, ...props }) => {
  const [form] = Form.useForm()
  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form} key={`row${index}`}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  )
}

type EditableCellProps = {
  title: React.ReactNode
  editable: boolean
  dataIndex: keyof Item
  record: Item
  handleSave: (record: Item) => void
}

const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = ({
  title,
  editable,
  children,
  dataIndex,
  record,
  handleSave,
  ...restProps
}) => {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<InputRef>(null)
  const form = useContext(EditableContext)!

  useEffect(() => {
    if (editing)
      inputRef.current?.focus()
  }, [editing])

  const toggleEdit = () => {
    setEditing(!editing)
    form.setFieldsValue({ [dataIndex]: typeof record[dataIndex] === 'string' ? record[dataIndex].trim() : record[dataIndex] })
  }

  const save = async (shouldToggleEdit = true) => {
    try {
      const values = await form.validateFields()

      shouldToggleEdit && toggleEdit()
      handleSave({ ...record, ...values })
    }
    catch (errInfo) {
    }
  }

  let childNode = children
  if (editable) {
    // 此处需要根据title字段来判断输入的类型
    const tempFileType = title?.split(':')[1]
    const editProps = {
      ref: inputRef,
      onPressEnter: save,
      onBlur: save,
      style: { width: '100%' },
    }

    childNode = editing
      ? (
        <Form.Item
          style={{ margin: 0 }}
          name={dataIndex}
        >
          {
            /file/.test(tempFileType)
              ? <FileUploader
                name={dataIndex}
                onChange={((key: any, value: any) => {
                  handleSave({ ...record, [dataIndex]: value })
                }) as any}
                fileUrlReadOny
                nodeData={{ ...record }}
              />

              : /int/.test(tempFileType)
                ? <InputNumber {...editProps} precision={0} />
                : /float/.test(tempFileType) ? <InputNumber {...editProps} stringMode /> : <Input {...editProps} />

          }
        </Form.Item>
      )
      : (
        <div
          className="editable-cell-value-wrap"
          style={{ paddingInlineEnd: 24, minHeight: 20 }}
          onClick={toggleEdit}
        >
          {children}
        </div>
      )
  }

  return <td {...restProps}>{childNode}</td>
}

const EditableTable = (props: any) => {
  const { csvHeader, uploadeCsvData, handleSaveTableData } = props
  const updateView = useUpdate()

  const [dataSource, setDataSource] = useState<any[]>([])
  useEffect(() => {
    if (uploadeCsvData) {
      const convertData = handleUploadCsvData(uploadeCsvData, csvHeader)
      setDataSource(convertData)
      handleSaveTableData(convertData)
    }
  }, [uploadeCsvData])

  const onConfirmDelete = (index: number) => {
    Modal.confirm({
      title: '确认删除该行数据？',
      className: 'controller-modal-confirm',
      icon: <ExclamationCircleFilled />,
      onOk() {
        dataSource.splice(index, 1)
        setDataSource(dataSource)
        updateView()
        handleSaveTableData(dataSource)
      },
    })
  }

  const defaultColumns: (ColumnTypes[number] & { editable?: boolean; dataIndex: string })[] = [
    ...csvHeader.map((el: any) => ({ ...el, editable: true })),
    {
      title: '操作',
      dataIndex: 'operation',
      render: (_, __, i: number) =>
        dataSource.length >= 1 && <Button type="text" danger onClick={() => onConfirmDelete(i)}>删除</Button>,
    },
  ]

  const handleAdd = () => {
    const newData = { key: dataSource ? dataSource.length : 0, editable: true }
    csvHeader.forEach((val) => {
      newData[val.dataIndex] = ' '
    })
    setDataSource(dataSource ? [...dataSource, newData] : [newData])
  }

  const handleSave = (row: any) => {
    const newData = [...dataSource]
    const index = newData.findIndex(item => row.key === item.key)
    const item = newData[index]
    newData.splice(index, 1, {
      ...item,
      ...row,
    })
    setDataSource(newData)
    handleSaveTableData(newData)
  }

  const columns = defaultColumns.map((col) => {
    if (!col.editable)
      return col

    return {
      ...col,
      onCell: (record: any) => ({
        record,
        ...col,
        handleSave,
      }),
    }
  })

  return (
    <div>
      <Button onClick={handleAdd} type="primary" className='mb-4'>
        增加一行数据
      </Button>
      <Table
        components={{
          body: {
            row: EditableRow,
            cell: EditableCell,
          },
        }}
        rowClassName={() => 'editable-row'}
        bordered
        dataSource={dataSource}
        columns={columns as ColumnTypes}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: '暂无数据，请上传csv，xls表格数据或者新增行,表格里数据可单击编辑' }}
      />
    </div>
  )
}

export default EditableTable
