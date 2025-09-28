'use client'

import React, { Suspense } from 'react'
import {
  useRouter,
  useSearchParams,
} from 'next/navigation'
import {
  Breadcrumb, Button, Card, Col, Divider, Form,
  Input, Popconfirm, Row, Table, message,
} from 'antd'
import Link from 'next/link'
import Image from 'next/image'

import { useAntdTable } from 'ahooks'
import dayjs from 'dayjs'
import { deleteDatabaseTable, getDataBaseTable } from '@/infrastructure/api/database'
import useValidateSpace from '@/shared/hooks/use-validate-space'

import DatabaseIcon from '@/public/images/resource-base/database.png'

const { Column } = Table

const prefixDirectUrl = '/resourceBase/dataBase/detail'
const DatabaseDetailContent = () => {
  const { push } = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id') as string
  const { validate } = useValidateSpace()
  const [form] = Form.useForm()

  const getTableData = ({ current, pageSize }, formData): Promise<any> => {
    const obj = {}
    for (const key in formData) {
      if (formData[key])
        obj[key] = formData[key]
    }
    return getDataBaseTable({ database_id: id, page: current, limit: pageSize, ...obj })
      .then((res: any) => {
        return {
          total: res.total,
          list: res.data,
        }
      })
  }

  const { tableProps, search, refresh } = useAntdTable(getTableData, {
    defaultPageSize: 10,
    form,
  })

  const handleDelete = (data) => {
    deleteDatabaseTable({ database_id: id, table_id: data.id }).then(() => {
      message.success('删除成功')
      refresh()
    })
  }

  const handleDirect = ({ id: table_id }: any, routeName) => push(`${prefixDirectUrl}/${routeName}?database_id=${id}&table_id=${table_id}`)
  const createNew = async () => {
    const isValid = await validate()
    if (isValid)
      push(`${prefixDirectUrl}/create?id=${id}`)
  }
  return (
    <div className='px-[30px] pt-5'>
      <Breadcrumb
        items={[
          { title: <Link href='/resourceBase/dataBase'>数据库</Link> },
          { title: '数据库详情' },
        ]}
      />
      <div className='mt-2'>
        <Card title="数据库" >
          <Row gutter={10}>
            <Col flex="80px">
              <Image src={DatabaseIcon} alt="" width={80} />
            </Col>
            <Col flex="auto">
              <div className='c-[#071127] font-bold text-lg'>{searchParams.get('name')}</div>
              <div className='c-[#5E6472]'>{searchParams.get('comment')}</div>
            </Col>
          </Row>
        </Card>
      </div>

      <div className='mt-5'>
        <Card title="数据库表" className='mt-5'>
          <div className='my-4 flex justify-end'>
            <Form form={form}>
              <Form.Item name="table_name">
                <Input.Search placeholder='请输入数据表名称' style={{ width: 270 }} onSearch={search.submit} allowClear />
              </Form.Item>
            </Form>
            <Button type="primary" ghost className='ml-[10px]' onClick={createNew}>新建数据库表</Button>
          </div>
          <Table
            rowKey='id'
            rowSelection={undefined}
            {...tableProps}
          >
            <Column title="数据表名" dataIndex="name" />
            <Column title="数据量" dataIndex="row_count" />
            <Column title="创建时间" dataIndex="created_at" render={v => dayjs(v).format('YYYY-MM-DD HH:mm:ss')} />
            <Column title="创建人" dataIndex="created_by_account" render={v => v.name} />
            <Column title="操作" width={400} render={(_, record) => (
              <>
                <Button type='link' size='small' onClick={() => handleDirect(record, 'editTableStructure')}>编辑表结构</Button>
                <Divider type='vertical' />
                <Button type='link' size='small' onClick={() => handleDirect(record, 'editTableData')}>编辑表数据</Button>
                <Divider type='vertical' />
                <Button type='link' size='small' onClick={() => handleDirect(record, 'individualTableDetail')}>数据表详情</Button>
                <Divider type='vertical' />
                <Popconfirm
                  title="提示"
                  description="该数据库及名下的所有数据表将被删除不可恢复，请确认。确认后，该条记录删除。如果该表作为其他的表的外键，不可删除"
                  onConfirm={() => handleDelete(record)}
                  okText="是"
                  cancelText="否"
                >
                  <Button size='small' type='link' danger>删除</Button>
                </Popconfirm>
              </>
            )} />
          </Table>
        </Card>
      </div>
    </div>
  )
}
const DatabaseDetail = () => {
  return (
    <Suspense>
      <DatabaseDetailContent />
    </Suspense>
  )
}

export default DatabaseDetail
