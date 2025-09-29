'use client'

import { Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import styles from './page.module.scss'
import Iconfont from '@/app/components/base/iconFont'
import { createApikey, deleteApikey, getApikeyList, getCurrentWorkspace, updateApikeyStatus } from '@/infrastructure/api/user'
import type { IApiKeyData, IApiResponse, ITenant, IWorkspaceResponse } from '@/core/data/common'

export default function TagsManagePage() {
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [data, setData] = useState<IApiKeyData[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<ITenant[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const showModal = () => {
    setIsModalOpen(true)
  }

  const handleCancel = () => {
    form.resetFields()
    setIsModalOpen(false)
  }
  const getdata = async () => {
    setLoading(true)
    try {
      const res = await getApikeyList()
      if (Array.isArray(res))
        setData(res)
    }
    catch (error) {
      console.error('Failed to fetch API keys:', error)
    }
    finally {
      setLoading(false)
    }
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const formattedValues = {
        ...values,
        expire_date: dayjs(values.expire_date).format('YYYY-MM-DD'),
        tenant_id: values.status ? values.status.join(',') : '',
      }
      const res = await createApikey(formattedValues) as IApiResponse
      if (res?.id) {
        message.success('创建成功')
        getdata()
        setIsModalOpen(false)
      }
      else {
        message.error(res?.message || '创建失败')
      }
    }
    catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteApikey({ id }) as IApiResponse
      if (res?.result === 'success') {
        message.success('删除成功')
        getdata()
      }
      else {
        message.error(res?.message || '删除失败')
      }
    }
    catch (error) {
      console.error('Delete failed:', error)
    }
  }
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'success', text: '正常' }
      case 'disabled':
        return { color: 'error', text: '禁用' }
      case 'deleted':
        return { color: 'default', text: '已删除' }
      case 'expired':
        return { color: 'warning', text: '已过期' }
      default:
        return { color: 'default', text: '未知' }
    }
  }
  const maskApiKey = (apiKey: string) => {
    if (!apiKey)
      return ''
    if (apiKey.length <= 10)
      return apiKey
    return `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`
  }
  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await updateApikeyStatus({ id, status }) as IApiResponse
      if (res?.id) {
        message.success('状态更新成功')
        getdata()
      }
      else {
        message.error('状态更新失败')
      }
    }
    catch (error) {
      console.error('Status update failed:', error)
    }
  }

  // 备用复制方法
  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement('textarea')
    textArea.value = text

    // 避免在页面上显示
    textArea.style.top = '0'
    textArea.style.left = '0'
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'

    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      const successful = document.execCommand('copy')
      if (successful)
        message.success('密钥已复制到剪贴板')
      else
        message.error('复制失败，浏览器不支持此功能')
    }
    catch (err) {
      message.error('复制失败，浏览器不支持此功能')
    }

    document.body.removeChild(textArea)
  }

  const copyToClipboard = (text: string) => {
    // 优先尝试使用现代 clipboard API
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(() => {
        message.success('密钥已复制到剪贴板')
      }).catch(() => {
        // 如果现代 API 失败，使用备用方法
        fallbackCopyTextToClipboard(text)
      })
    }
    else {
      // 如果不支持现代 API，直接使用备用方法
      fallbackCopyTextToClipboard(text)
    }
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '密钥',
      dataIndex: 'api_key',
      key: 'api_key',
      render: (text: string) => (
        <Space>
          <span>{maskApiKey(text)}</span>
          <Iconfont className='text-[14px]' type='icon-fuzhi' onClick={() => copyToClipboard(text)} />
        </Space>
      ),
    },

    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => text,
    },
    {
      title: '过期时间',
      dataIndex: 'expire_date',
      key: 'expire_date',
    },
    {
      title: '使用范围',
      dataIndex: 'tenant_list',
      key: 'tenant_list',
      render: (text: any, record: IApiKeyData) => {
        if (!text)
          return '--'

        const items = text.split(',').filter((item: string) => item.trim())
        const maxVisible = 2
        const isOpeneded = expandedRows.has(record.id)
        const displayItems = isOpeneded ? items : items.slice(0, maxVisible)

        const toggleExpanded = () => {
          const newExpandedRows = new Set(expandedRows)
          if (isOpeneded)
            newExpandedRows.delete(record.id)
          else
            newExpandedRows.add(record.id)

          setExpandedRows(newExpandedRows)
        }

        return (
          <div style={{ maxWidth: '200px' }}>
            {displayItems.map((item: string, index: number) => (
              <Tag key={index} bordered={false} color="geekblue" style={{ marginBottom: '4px' }}>
                {item.trim()}
              </Tag>
            ))}
            {items.length > maxVisible && (
              <Tag
                bordered={false}
                color="default"
                style={{ cursor: 'pointer' }}
                onClick={toggleExpanded}
              >
                {isOpeneded ? '收起' : '展开'}
              </Tag>
            )}
          </div>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (text: string) => {
        const { color, text: statusText } = getStatusConfig(text)
        return (
          <Tag color={color}>
            {statusText}
          </Tag>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: IApiKeyData) => {
        const isExpired = record.status === 'expired'
        return (
          <Space>
            <Popconfirm
              title="确定删除该密钥吗？"
              description="删除后不可恢复"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger>删除</Button>
            </Popconfirm>
            {!isExpired && (
              <>
                {record.status === 'disabled' && (
                  <Button type="link" style={{ color: '#52c41a' }} onClick={() => handleUpdateStatus(record.id, 'active')}>
                    启用
                  </Button>
                )}
                {record.status === 'active' && (
                  <Button type="link" danger onClick={() => handleUpdateStatus(record.id, 'disabled')}>
                    禁用
                  </Button>
                )}
              </>
            )}
          </Space>
        )
      },
    },
  ]
  const fetchCurrentWorkspace = async () => {
    const res = await getCurrentWorkspace() as IWorkspaceResponse
    if (res?.tenants)
      setCurrentWorkspace(res.tenants)
  }

  useEffect(() => {
    getdata()
    fetchCurrentWorkspace()
  }, [])

  return (
    <div className={styles.outerWrap}>
      <div className={styles.costWrap}>
        <div className={styles.topWrap}>
          <div style={{ margin: '50px' }}>
            <Button
              type="primary"
              style={{ marginRight: '10px', position: 'absolute', right: '52px', top: '70px' }}
              onClick={showModal}
            >
              添加密钥
            </Button>
            <Table
              columns={columns}
              dataSource={data}
              loading={loading}
              rowKey="id"
            />
          </div>
        </div>
      </div>

      <Modal
        title="添加新的密钥"
        open={isModalOpen}
        onCancel={handleCancel}
        onOk={handleOk}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleOk}>
            确定
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            label="名称"
            name="description"
            rules={[
              { required: true, message: '请输入名称' },
              {
                validator: (_, value) => {
                  if (value && /\s/.test(value))
                    return Promise.reject(new Error('名称不能包含空格'))
                  return Promise.resolve()
                },
              },
            ]}
          >
            <Input
              placeholder="请输入名称"
              maxLength={20}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\u4E00-\u9FA5a-zA-Z0-9]/g, '')
                e.target.value = value
              }}
            />
          </Form.Item>
          <Form.Item
            label="过期时间"
            name="expire_date"
            rules={[{ required: true, message: '请选择过期时间' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="请选择日期"
              format="YYYY-MM-DD"
            />
          </Form.Item>
          <Form.Item
            label="使用范围"
            name="status"
            rules={[{ required: true, message: '请选择使用范围' }]}
          >
            <Select
              mode="multiple"
              allowClear
              showSearch
              style={{ width: '100%' }}
              placeholder="请选择使用范围"
              optionFilterProp="label"
              options={currentWorkspace?.map(item => ({
                label: item.name,
                value: item.id,
              })) || []}
              onChange={(values) => {
                form.setFieldValue('status', values)
              }}
              maxTagCount={3}
              dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
            />
          </Form.Item>

        </Form>
      </Modal>
    </div>
  )
}
