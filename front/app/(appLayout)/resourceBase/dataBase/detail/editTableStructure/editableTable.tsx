import React, { useContext, useEffect, useRef, useState } from 'react'
import type { GetRef, InputRef, TableProps } from 'antd'
import {
  Button, Cascader, Form, Input, Popconfirm, Select,
  Table, Tooltip,
} from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { isEmpty } from 'lodash'
import { COLUMN_DICT, booleanTypeOptions, dataTypeOptions, defaultAddVal, handleTableCellValue } from '../utils'
import { getDataBaseTableStructureByName } from '@/infrastructure/api/database'

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
  tableList: any
  database_id
  handleSave: (record: any) => void
}

const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = ({
  title,
  editable,
  children,
  dataIndex,
  record,
  handleSave,
  tableList,
  database_id,
  ...restProps
}) => {
  const [editing, setEditing] = useState(false)
  const [isDisableDataType, setDisableDataType] = useState(false)
  const inputRef = useRef<InputRef>(null)
  const form = useContext(EditableContext)!
  const [optionList, setOptionList] = useState(tableList)

  const isMainKey = dataIndex === COLUMN_DICT.MAIN_KEY
  const isRequiredKey = dataIndex === COLUMN_DICT.IS_REQUIRED
  const isBooleanType = isMainKey || dataIndex === COLUMN_DICT.IS_ONLY_ONE || isRequiredKey
  const isSavedKey = dataIndex === COLUMN_DICT.SAVED_KEY
  const isDataType = dataIndex === COLUMN_DICT.TYPE
  const isUnionKey = dataIndex === COLUMN_DICT.UNION_KEY
  const isDescriptionKey = dataIndex === COLUMN_DICT.DESCRIPTION

  useEffect(() => {
    if (editing)
      inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    if (record?.[COLUMN_DICT.UNION_KEY])
      setDisableDataType(true)
    else
      setDisableDataType(false)
  }, [record?.[COLUMN_DICT.UNION_KEY]])

  const toggleEdit = () => {
    setEditing(!editing)
    // 对于外键做单独的处理
    let currentVal = record[dataIndex]
    if (isUnionKey) {
      if (currentVal && currentVal.referred_table) {
        // 保持现有的外键值
        currentVal = [currentVal.referred_table, currentVal.referred_columns]
        form.setFieldsValue({ [dataIndex]: currentVal })
      }
    }
    else {
      form.setFieldsValue({ [dataIndex]: currentVal })
    }

    if (isDataType && record[COLUMN_DICT.UNION_KEY])
      setDisableDataType(true)
  }

  const loadData = (selectedOptions: any[]) => {
    const targetOption = selectedOptions[selectedOptions.length - 1]

    getDataBaseTableStructureByName({ database_id, table_name: targetOption.name })
      .then((res: any) => {
        const temp = res.data.columns.filter(el => (el.is_primary_key || el.is_unique))
        targetOption.children = temp.map(el => ({ ...el, label: el.name, value: el.name }))
        setOptionList([...optionList])
      })
  }

  const handleLast = (arr, key1, key2) => {
    if (!key1 || !key2)
      return null
    let str = ''
    arr.forEach((el) => {
      if (el.value === key1) {
        el.children?.forEach((item) => {
          if (item.value === key2)
            str = item.label
        })
      }
    })
    return str
  }

  const save = async () => {
    try {
      let values = await form.validateFields()

      if (isUnionKey) {
        const temp = values[COLUMN_DICT.UNION_KEY]

        if (!temp || temp.length === 0) {
          // 如果清除了选择，才清空值
          values = {
            ...handleTableCellValue(values),
            [COLUMN_DICT.UNION_KEY]: null,
            [COLUMN_DICT.TYPE]: null,
          }
          setDisableDataType(false)
        }
        else {
          let type = ''
          optionList.forEach((el) => {
            if (el.value === temp[0]) {
              el.children?.forEach((item) => {
                if (item.value === temp[1])
                  type = item.type
              })
            }
          })

          if (type) {
            form.setFieldsValue({ [COLUMN_DICT.TYPE]: type })
            values = {
              ...handleTableCellValue(values),
              [COLUMN_DICT.TYPE]: type,
              [COLUMN_DICT.UNION_KEY]: temp,
            }
            setDisableDataType(true)
          }
        }
      }
      else {
        // 对于非外键字段，统一处理空字符串转null
        values = handleTableCellValue(values)
      }

      handleSave({ ...record, ...values })
      setEditing(false)
    }
    catch (errInfo) {
    }
  }

  let childNode = children

  // 修复：只有当记录已经保存到后端（有__order属性）且是外键关联的字段时，才禁止编辑存储字段名称和数据类型
  let isEditable = editable
  if (record?.__order !== undefined && isUnionKey && (isSavedKey || isDataType))
    isEditable = false

  const echoValue = record ? record[dataIndex] : null
  if (isEditable) {
    childNode = editing
      ? (
        <Form.Item
          style={{ margin: 0 }}
          name={dataIndex}
        >
          {/* 如果选择了外键字段，则自动同步数据类型（不可修改） */}
          {
            isBooleanType
              ? <Select options={booleanTypeOptions} onChange={save} />
              : isDataType
                ? <Select options={dataTypeOptions} onChange={save} disabled={isDisableDataType} />
                : isUnionKey
                  ? <Cascader
                    allowClear={true}
                    displayRender={(label) => {
                      return <span className='text-[#0E5DD8]'>
                        {label[0]}.{label[1]}
                      </span>
                    }}
                    options={optionList}
                    onChange={save}
                    loadData={loadData}
                    changeOnSelect={false}
                  />
                  : <Input
                    ref={inputRef}
                    onPressEnter={save}
                    onBlur={save}
                    placeholder={`请输入${isDescriptionKey ? '字段描述' : isSavedKey ? '存储字段名称' : title}`}
                    showCount
                    maxLength={isDescriptionKey ? 200 : 100}
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
              ? children[1] ? '是' : '否'
              : isUnionKey
                ? <span className='text-[#0E5DD8]'>
                  {children[1] ? `${children[1][0]}.` : !isEmpty(echoValue) ? `${echoValue.referred_table}.${echoValue.referred_columns}` : ''}
                  {handleLast(optionList, children[1] ? children[1][0] : null, children[1] ? children[1][1] : null)}
                </span>
                : children)
          }
        </div>
      )
  }

  return <td {...restProps}>{childNode}</td>
}

type ColumnTypes = Exclude<TableProps<any>['columns'], undefined>

const EditableTable = (props: any) => {
  const { onSave, remoteData, tableList, database_id } = props
  const [dataSource, setDataSource] = useState<any[]>(remoteData)
  const [page, setPage] = useState<number>(1)

  const handleDelete = (key: number) => {
    const newData = dataSource.filter((item, i) => i !== key)
    setDataSource(newData)
    onSave && onSave(newData)
  }

  const defaultColumns: (ColumnTypes[number] & { editable?: boolean; dataIndex: string })[] = [
    {
      title: <span>
        存储字段名称
        <span className='text-[#FD8383]'>*</span>&nbsp;
        <Tooltip title={<div>
          命名规则： 包含小写字母或数字或必须以英文字母开头最多100字符
          <div>如果为外键，格式为表名.字段名，其对应的数据类型，是否为空，默认值等应与外键一致</div>
        </div>}>
          <InfoCircleOutlined />
        </Tooltip>
      </span>,
      dataIndex: COLUMN_DICT.SAVED_KEY,
      editable: true,
    },
    {
      title: <span>
        主键
        <span className='text-[#FD8383]'>*</span>&nbsp;
        <Tooltip title="如果只有一个主键，该字段为唯一；如果是多个主键，字段可以不唯一">
          <InfoCircleOutlined />
        </Tooltip>
      </span>,
      dataIndex: COLUMN_DICT.MAIN_KEY,
      editable: true,
    },
    {
      title: '外键',
      dataIndex: COLUMN_DICT.UNION_KEY,
      editable: true,
    },
    {
      title: '唯一',
      dataIndex: COLUMN_DICT.IS_ONLY_ONE,
      editable: true,
    },
    {
      title: <span>
        描述&nbsp;
        <Tooltip title="对存储字段的补充说明">
          <InfoCircleOutlined />
        </Tooltip>
      </span>,
      dataIndex: COLUMN_DICT.DESCRIPTION,
      editable: true,
    },
    {
      title: '数据类型',
      dataIndex: COLUMN_DICT.TYPE,
      editable: true,
    },
    {
      title: '是否为空',
      dataIndex: COLUMN_DICT.IS_REQUIRED,
      editable: true,
    },
    {
      title: '默认值',
      dataIndex: COLUMN_DICT.DEFAULT_VALUE,
      editable: true,
    },
    {
      title: '操作',
      dataIndex: '',
      render: (_, __, index) => {
        return dataSource.length >= 1
          ? (
            <Popconfirm title="确认删除?" onConfirm={() => handleDelete((page - 1) * 10 + index)}>
              <Button type="link" danger>删除</Button>
            </Popconfirm>
          )
          : null
      }
      ,
    },
  ]

  const handleAdd = () => {
    setDataSource([...dataSource, defaultAddVal])
  }

  const handleSave = (row: any, index) => {
    const newData = [...dataSource]
    const item = newData[index]
    newData.splice(index, 1, {
      ...item,
      ...row,
    })
    onSave && onSave(newData)
    setDataSource(newData)
  }

  const columns = defaultColumns.map((col) => {
    if (!col.editable)
      return col

    return {
      ...col,
      onCell: (record: any, index) => ({
        record,
        editable: col.editable,
        dataIndex: col.dataIndex,
        title: col.title,
        handleSave: val => handleSave(val, (page - 1) * 10 + index),
        tableList,
        database_id,
      }),
    }
  })

  return (
    <div>
      <div className='flex justify-between'>
        <span className='text-[#5E6472] text-sm'>输入数据表信息</span>
        <Button onClick={handleAdd} type="link">
          添加字段
        </Button>
      </div>
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
        pagination={{
          pageSizeOptions: [10],
          showTotal: total => `共${total}条数据`,
        }}
        onChange={(pagination: any) => {
          setPage(pagination.current)
        }}
      />

      <div className='text-right mt-5'>
        <Button type="primary" htmlType='submit'>保存</Button>
      </div>
    </div>
  )
}

export default EditableTable
