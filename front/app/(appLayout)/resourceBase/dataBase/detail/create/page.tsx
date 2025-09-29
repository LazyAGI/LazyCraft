'use client'

import React, { Suspense, useState } from 'react'
import { Breadcrumb, Divider, Form, Input, message } from 'antd'
import Link from 'next/link'

import {
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { useRequest } from 'ahooks'
import EditableTable from './editableTable'

import style from './index.module.scss'
import { createDatabaseTable, getDataBaseTable } from '@/infrastructure/api/database'

const DatabaseDetailCreateContent = () => {
  const [form] = Form.useForm()
  const [formVal, setFormVal] = useState([])
  const { back } = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const { data: tableList } = useRequest(() => getDataBaseTable({ database_id: id, page: 1, limit: 10000 }).then((res: any) => res.data.map(el => ({ ...el, label: el.name, value: el.name, isLeaf: false }))))

  const handleTableSubmit = async (tableData) => {
    const formValues = await form.validateFields()
    if (tableData.length === 0) {
      message.warning('请至少添加一个字段')
      return
    }
    const submitData = {
      ...formValues,
      database_id: id,
      columns: tableData.map((el: any) => {
        const { foreign_key_info, ...rest } = el
        return (foreign_key_info && foreign_key_info[1])
          ? {
            ...rest,
            foreign_key_info: {
              referred_table: el.foreign_key_info[0],
              referred_column: el.foreign_key_info[1],
              constrained_column: el.name,
            },
          }
          : rest
      }),
    }
    await createDatabaseTable(submitData)
    message.success('创建成功')
    back()
  }

  const onFormFinish = async (val) => {
    // 这个函数现在主要用于处理基础信息的验证
    // 实际提交由handleTableSubmit处理
  }

  return (
    <div className={`${style.createDatabaseTableContainer} px-[30px] pt-2`}>
      <Breadcrumb
        items={[
          { title: <Link href='/resourceBase/dataBase'>数据库</Link> },
          { title: <span className={style.middleRouter} onClick={back}>数据库详情</span> },
          { title: '新建数据库表' },
        ]}
      />
      <div className='mt-3 flex items-center'>
        <span className={style.splitLine} />
        <span className='text-[#071127] text-lg font-medium'>基础信息</span>
      </div>
      <Divider style={{ margin: '13px 0' }} />
      <Form
        layout="vertical"
        form={form}
        onFinish={onFormFinish}
      >
        <Form.Item label="数据库表名" name="table_name" wrapperCol={{ span: 8 }} rules={[{ required: true, message: '请输入数据库表名称' }]}>
          <Input placeholder="请输入数据库表名称" />
        </Form.Item>
        <Form.Item label="简介" name="comment" wrapperCol={{ span: 16 }} rules={[{ required: true, message: '请输入数据库表简介' }]}>
          <Input.TextArea placeholder="请输入数据库表简介" rows={5} maxLength={200} showCount />
        </Form.Item>

        <div className='mt-3 flex items-center'>
          <span className={style.splitLine} />
          <span className='text-[#071127] text-lg font-medium'>数据表结构</span>
        </div>
        <Divider style={{ margin: '13px 0' }} />
        <EditableTable isCreateMode onSave={setFormVal} tableList={tableList} database_id={id} onSubmit={handleTableSubmit} />
      </Form>
    </div>
  )
}
const DatabaseDetailCreate = () => {
  return (
    <Suspense>
      <DatabaseDetailCreateContent />
    </Suspense>
  )
}

export default DatabaseDetailCreate
