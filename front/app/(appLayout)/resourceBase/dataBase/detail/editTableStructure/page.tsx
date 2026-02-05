'use client'

import React, { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Breadcrumb, Divider, Form, Input, message } from 'antd'
import Link from 'next/link'

import { useRequest } from 'ahooks'
import style from '../index.module.scss'
import EditableTable from './editableTable'
import { Service } from '@/infrastructure/api/generated'

const EditTableStructureContent = () => {
  const searchParams = useSearchParams()
  const [form] = Form.useForm()
  const [formVal, setFormVal] = useState([])
  const { back } = useRouter()
  const database_id = searchParams.get('database_id')
  const table_id = searchParams.get('table_id')

  const { data: tableList } = useRequest(() =>
    Service.getDatabaseTableList(Number(database_id), 1, 10000, '')
      .then((res: any) =>
        res.data
          .filter(el => el.id !== Number(table_id))
          .map(el => ({ ...el, label: el.name, value: el.name, isLeaf: false })),
      ),
  )
  const { data } = useRequest<any, any>(
    () => Service.getDatabaseTable(Number(database_id), Number(table_id)).then(res => res.data),
    {
      onSuccess: (res) => {
        if (res)
          setFormVal(res.columns ?? [])
      },
    },
  )

  const onFormFinish = async (val) => {
    if (formVal.length === 0) {
      message.warning('请至少添加一个字段')
      return
    }

    const submitData = {
      table_name: val.table_name ?? data.table_name,
      comment: val.comment ?? data.comment,
      columns: formVal.map((el: any) => {
        const { foreign_key_info, __order, ...rest } = el
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
    await Service.putDatabaseTable(Number(database_id), Number(table_id), submitData)
    message.success('更新成功')
    back()
  }

  return (
    <div className={`${style.editDatabaseTableContainer} px-[30px] pt-2`}>
      <Breadcrumb
        items={[
          { title: <Link href='/resourceBase/dataBase'>数据库</Link> },
          { title: <span className={style.middleRouter} onClick={back}>数据库详情</span> },
          { title: '编辑数据库表结构' },
        ]}
      />
      <div className='mt-3 flex items-center'>
        <span className={style.splitLine} />
        <span className='text-[#071127] text-lg font-medium'>基础信息</span>
      </div>
      <Divider style={{ margin: '13px 0' }} />
      {
        data && <Form
          layout="vertical"
          form={form}
          onFinish={onFormFinish}
          initialValues={data ? { table_name: data.table_name, comment: data.comment } : {}}
        >
          <Form.Item label="数据库表名" name="table_name" wrapperCol={{ span: 8 }}>
            <Input placeholder="请输入数据库表名称" disabled />
          </Form.Item>
          <Form.Item label="简介" name="comment" wrapperCol={{ span: 16 }}>
            <Input.TextArea placeholder="请输入数据库表简介" rows={5} maxLength={200} showCount disabled />
          </Form.Item>

          <div className='mt-3 flex items-center'>
            <span className={style.splitLine} />
            <span className='text-[#071127] text-lg font-medium'>数据表结构</span>
          </div>
          <Divider style={{ margin: '13px 0' }} />
          <EditableTable
            onSave={setFormVal}
            remoteData={(data.columns ?? []).map((el, i) => ({ ...el, __order: i }))}
            tableList={tableList}
            database_id={database_id}
          />
        </Form>
      }
    </div>
  )
}
const EditTableStructure = () => {
  return (
    <Suspense>
      <EditTableStructureContent />
    </Suspense>
  )
}

export default EditTableStructure
