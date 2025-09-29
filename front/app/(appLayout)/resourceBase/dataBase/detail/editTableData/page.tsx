'use client'

import React, { Suspense, useState } from 'react'
import {
  useRouter, useSearchParams,
} from 'next/navigation'
import { Breadcrumb, Divider, Form, Input, message } from 'antd'
import Link from 'next/link'
import { useRequest } from 'ahooks'
import { isEqual } from 'lodash'
import { handleTableData } from '../utils'

import style from '../index.module.scss'
import EditableTable from './editableTable'
import { getDataBaseSubTableList, updateDatabaseTable } from '@/infrastructure/api/database'

const EditTableDataContent = () => {
  const searchParams = useSearchParams()
  const [formVal, setFormVal] = useState([])
  const { back } = useRouter()
  const [form] = Form.useForm()
  const database_id = searchParams.get('database_id')
  const table_id = searchParams.get('table_id')

  const requestInstance = useRequest<any, any>(() => getDataBaseSubTableList({ database_id, table_id, page: 1, limit: 99999 }), {
    onSuccess: (res) => {
      if (res)
        setFormVal(handleTableData(res.data))
    },
  })
  const onFormFinish = async () => {
    // 需要额外处理 update_items    add_items   delete_items  等字段
    const add_items: any = []
    const update_items: any = []
    const delete_items: any = []
    const remoteData = requestInstance.data.data

    // 记录已经处理过的新行，避免重复添加
    const processedNewRows = new Set()

    formVal.forEach((el: any) => {
      const { __order, ...rest } = el
      if (__order === undefined) {
        // 检查是否已经有相同内容的新行
        const existingNewRow = add_items.find(item =>
          Object.keys(rest).every(key => item[key] === rest[key]),
        )
        if (!existingNewRow && !processedNewRows.has(JSON.stringify(rest))) {
          add_items.push(rest)
          processedNewRows.add(JSON.stringify(rest))
        }
      }
      else {
        const temp = remoteData[__order]
        if (!isEqual(rest, temp)) { // 不一样的情况下会进入update_items
          update_items.push({
            new_data: rest,
            old_data: temp,
          })
        }
      }
    })

    remoteData.forEach((el, i) => {
      const temp = formVal.find((val: any) => val.__order === i)
      if (!temp)
        delete_items.push(el)
    })
    await updateDatabaseTable({
      database_id,
      table_id,
      add_items,
      update_items,
      delete_items,
    })
    message.success('编辑数据库表成功')
    back()
  }

  return (
    <div className='px-[30px] pt-5'>
      <Breadcrumb
        items={[
          { title: <Link href='/resourceBase/dataBase'>数据库</Link> },
          { title: <span className={style.middleRouter} onClick={back}>数据库详情</span> },
          { title: '编辑表数据' },
        ]}
      />
      <div className='mt-3 flex items-center'>
        <span className={style.splitLine} />
        <span className='text-[#071127] text-lg font-medium'>基础信息</span>
      </div>
      <Divider style={{ margin: '13px 0' }} />
      {
        requestInstance.data && <Form
          layout="vertical"
          form={form}
          onFinish={onFormFinish}
          initialValues={requestInstance.data ? requestInstance.data.columns : {}}
        >
          <Form.Item label="数据库表名" name="table_name" wrapperCol={{ span: 8 }}>
            <Input placeholder="请输入数据库表名称" disabled />
          </Form.Item>
          <Form.Item label="简介" name="comment" wrapperCol={{ span: 16 }}>
            <Input.TextArea placeholder="请输入数据库表简介" rows={5} maxLength={200} showCount disabled />
          </Form.Item>

          <div className='mt-3 flex items-center'>
            <span className={style.splitLine} />
            <span className='text-[#071127] text-lg font-medium'>表数据</span>
          </div>
          <Divider style={{ margin: '13px 0' }} />
          <EditableTable
            onSave={setFormVal}
            database_id={database_id}
            table_id={table_id}
            requestInstance={requestInstance}
          />
        </Form>
      }
    </div>
  )
}
const EditTableData = () => {
  return (
    <Suspense>
      <EditTableDataContent />
    </Suspense>
  )
}

export default EditTableData
