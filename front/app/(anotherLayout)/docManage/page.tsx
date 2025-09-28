'use client'
import React from 'react'
import { Button, Popconfirm, Space, Table } from 'antd'
import { useAntdTable } from 'ahooks'
import { useRouter } from 'next/navigation'
import styles from './page.module.scss'
import Toast from '@/app/components/base/flash-notice'
import { deleteDoc, getDocList, publishDoc } from '@/infrastructure/api/docManage'

type Result = {
  total: number
  list: any
}
const Articles = () => {
  const router = useRouter()
  const getTableData = ({ current, pageSize }, formData): Promise<Result> => {
    return getDocList({ url: '/doc/manage/list', options: { params: { page: current, limit: pageSize } } }).then((res) => {
      sessionStorage.setItem('doc_total_size', (res?.total + 1) || 1)
      return {
        total: res.total,
        list: res.data,
      }
    })
  }
  const { tableProps, pagination, search } = useAntdTable(getTableData, {
    defaultPageSize: 10,
  })
  const handleJumpDetail = (record) => {
    router.push(`/docManage/create?id=${record.id}`)
  }
  const handleAction = async (record) => {
    const fetchUrl = record?.status === 'unpublish' ? 'doc/manage/publish' : 'doc/manage/unpublish'
    const res = await publishDoc({ url: fetchUrl, options: { params: { id: record?.id } } })
    if (res) {
      Toast.notify({ type: 'success', message: '操作成功' })
      search.submit()
    }
  }
  const handleDelete = async (record) => {
    const res = await deleteDoc({ url: `/doc/manage?id=${record?.id}`, options: { params: { id: record?.id } } })
    if (res) {
      Toast.notify({ type: 'success', message: '删除成功' })
      search.submit()
    }
  }
  const columns: any = [
    {
      title: '序号',
      dataIndex: 'index',
    },
    {
      title: '文档标题',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status_label',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
    },
    {
      title: '操作',
      render: (_, record: any) => (
        <Space size="middle">
          <Button type='link' onClick={() => handleJumpDetail(record)}>编辑</Button>
          <Button type='link' onClick={() => handleAction(record)}>{record?.status === 'unpublish' ? '发布' : '下架'}</Button>
          <Popconfirm
            title="请确认"
            description="删除后文章不可恢复"
            onConfirm={() => handleDelete(record)}
            okText="是"
            cancelText="否"
          >
            <Button type='link' danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const handleCreate = () => {
    router.push('/docManage/create')
  }

  return (
    <div className={styles.outerWrap}>
      <div className={styles.docWrap}>
        <div className={styles.topWrap}>
          <Button type='primary' onClick={handleCreate}>创建文档</Button>
        </div>
        <div className='mt-[20px]'>
          <Table
            rowKey='id'
            columns={columns}
            {...tableProps}
            pagination={{
              pageSizeOptions: ['10', '20', '50', '100'],
              showQuickJumper: true,
              showSizeChanger: true,
              total: pagination?.total || 0,
              showTotal: (total, range) => <span style={{ position: 'absolute', left: 0 }}>共 {total} 条</span>,
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default Articles
