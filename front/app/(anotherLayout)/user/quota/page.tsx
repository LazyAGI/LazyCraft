'use client'

import React, { useEffect, useState } from 'react'
import { Button, Space, Table, message } from 'antd'
import type { TableProps } from 'antd'
import dayjs from 'dayjs'
import styles from './index.module.scss'
import QuotaApprovalModal from './pageModel'
import type { QuotaRecord } from './types'
import { getquotaApproval, getquotaList } from '@/infrastructure/api/user'

const QuotaPage = () => {
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<QuotaRecord | null>(null)
  const [modalType, setModalType] = useState<'approve' | 'reject'>('approve')
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [data, setData] = useState<QuotaRecord[]>([])

  // 获取配额列表数据
  const getQuotaData = async (params = {}) => {
    try {
      setLoading(true)
      const result = await getquotaList({
        page: pagination.current,
        page_size: pagination.pageSize,
        ...params,
      })
      if (result?.data) {
        setData(result.data)
        setPagination({
          ...pagination,
          total: result.total || 0,
        })
      }
      setLoading(false)
    }
    catch (error) {
      setLoading(false)
    }
  }

  // 页面加载时获取数据
  useEffect(() => {
    getQuotaData()
  }, [pagination.current, pagination.pageSize])
  // 批准
  const handleApprove = (record: QuotaRecord) => {
    setCurrentRecord(record)
    setModalType('approve')
    setIsModalOpen(true)
  }
  // 驳回
  const handleReject = (record: QuotaRecord) => {
    setCurrentRecord(record)
    setModalType('reject')
    setIsModalOpen(true)
  }

  const handleModalOk = async (values: any) => {
    setLoading(true)
    try {
      const result = await getquotaApproval({
        id: currentRecord?.id,
        action: values.action,
        amount: values.amount,
        reason: values.reason || '',
      })
      if (result?.code === 200) {
        setData(prevData => prevData.map((item) => {
          if (item.id === currentRecord?.id) {
            return {
              ...item,
              status: values.comment,
              updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            } as QuotaRecord
          }
          return item
        }))
        setIsModalOpen(false)
        message.success('审批成功')
        getQuotaData() // 刷新列表
      }
    }
    catch (error) {
      message.error('审批失败')
    }
    finally {
      setLoading(false)
    }
  }

  const handleModalCancel = () => {
    setIsModalOpen(false)
    setCurrentRecord(null)
  }

  const handleTableChange = (newPagination: any) => {
    setPagination({
      ...pagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    })
  }

  const columns: TableProps<QuotaRecord>['columns'] = [
    {
      title: '申请种类',
      dataIndex: 'request_type',
      key: 'request_type',
      render: (type: string) => ({
        gpu: 'GPU配额',
        storage: '存储配额',
      }[type] || type),
    },
    {
      title: '申请人',
      dataIndex: 'account_name',
      key: 'account_name',
    },
    {
      title: '申请理由',
      dataIndex: 'reason',
      key: 'reason',
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      key: 'created_at',
    },
    {
      title: '处理时间',
      dataIndex: 'processed_at',
      key: 'processed_at',
    },
    {
      title: '工作空间',
      dataIndex: 'tenant_name',
      key: 'tenant_name',
    },
    {
      title: '审批状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap = {
          pending: '待审批',
          approved: '已批准',
          rejected: '已驳回',
          expired: '已过期',
        }
        const colorMap = {
          pending: '#faad14',
          approved: '#52c41a',
          rejected: '#ff4d4f',
          expired: '#d9d9d9',
        }
        return <span style={{ color: colorMap[status] }}>{statusMap[status]}</span>
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          {record.status === 'pending' && (
            <>
              <Button
                type="primary"
                size="small"
                onClick={() => handleApprove(record)}
                loading={loading}
              >
                批准
              </Button>
              <Button
                danger
                size="small"
                onClick={() => handleReject(record)}
                loading={loading}
              >
                驳回
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className={styles.quotaContainer}>
      <h1>配额审批列表</h1>
      <div className={styles.quotaContent}>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: total => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          rowKey="id"
        />

        <QuotaApprovalModal
          isOpen={isModalOpen}
          currentRecord={currentRecord}
          onOk={handleModalOk}
          onCancel={handleModalCancel}
          loading={loading}
          modalType={modalType}
        />
      </div>
    </div>
  )
}

export default QuotaPage
