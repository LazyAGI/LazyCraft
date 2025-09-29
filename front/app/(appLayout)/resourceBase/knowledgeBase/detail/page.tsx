'use client'

import React, { Suspense, useCallback, useEffect, useState } from 'react'
import { ReadOutlined } from '@ant-design/icons'
import {
  useSearchParams,
} from 'next/navigation'
import { Breadcrumb, Button, Form, Input, Modal, Popconfirm, Table, message } from 'antd'
import type { TableProps } from 'antd'
import { useMount } from 'ahooks'
import Link from 'next/link'
import UploadModule from '../UploadModule'
import styles from './index.module.scss'
import { API_PREFIX } from '@/app-specs'
import ModalCooperation from '@/app/components/app/picker-user/ModalCooperation'
import { deleteFile, getFileList } from '@/infrastructure/api/knowledgeBase'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { getJoins } from '@/infrastructure/api/apps'
import { usePermitCheck } from '@/app/components/app/permit-check'
import useValidateSpace from '@/shared/hooks/use-validate-space'

type TableRowSelection<T extends object = object> = TableProps<T>['rowSelection']

const { Search } = Input
type DataType = {
  key: string
  name: string
  age: number
  address: string
  tags: string[]
}

const KnowledgeBaseDetailContent = () => {
  const searchParams = useSearchParams()
  const { userSpecified } = useApplicationContext()
  const id = searchParams.get('id') as string
  const { validate } = useValidateSpace()
  const state = searchParams.get('state')
  const [current, setCurrent] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [info, setInfo] = useState<any>({})
  const [uploadModuleVisible, setUploadModuleVisible] = useState(false)
  const [data, setData] = useState<DataType[]>([])
  const [fileName, setFileName] = useState('')
  const [open, setOpen] = useState(false)
  const [createFolderVisible, setCreateFolderVisible] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [joins, setJoins] = useState<any[]>([])
  const [canEdit, setCanEdit] = useState(false)
  const { hasPermit } = usePermitCheck()
  const [form] = Form.useForm()

  const getData = useCallback(async () => {
    getFileList({ url: '/kb/file/list', options: { params: { file_name: fileName, knowledge_base_id: id, page: current, page_size: pageSize } } }).then((res) => {
      setInfo(res.knowledge_base_info)
      setData(res.data)
      setTotal(res.total)
    })
  }, [current, fileName, pageSize, id])

  useEffect(() => {
    if (state === 'create') {
      validate().then((isValid) => {
      })
    }
  }, [state])

  const handleDelete = (data) => {
    deleteFile({ url: '/kb/file/delete', body: { file_ids: [data.id] } }).then(() => {
      // Toast.notify({ type: 'success', message: '删除成功' })
      message.success('删除成功')
      getData()
    })
  }
  const handleJumpDetail = (data) => {
    window.open(`/resourceBase/knowledgeBase/preview?id=${data.id}`, '_blank')
  }

  const reqDownload = ({ file_ids, filename }) => {
    const token = localStorage.getItem('console_token')
    fetch(`${API_PREFIX}/kb/download`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ file_ids }),
      })
      .then((response) => {
        if (!response.ok)
          throw new Error('网络错误，请稍后再试。')
        return response.blob()
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      })
      .catch((error) => {
        console.error('handleDownload:', error)
      })
  }

  const handleDownload = (recordData) => {
    const { id, name } = recordData
    const filename = name
    reqDownload({ file_ids: [id], filename })
  }

  const columns: TableProps<DataType>['columns'] = [
    {
      title: '文件名称',
      dataIndex: 'name',
      key: 'name',
      // render: text => <a>{text}</a>,
    },
    {
      title: '类型',
      dataIndex: 'file_type',
      key: 'file_type',
      render: v => v.split('.')[1],
    },
    {
      title: '最新同步时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
    },
    {
      title: '操作',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <>
          <Button type='link' size='small' disabled={!canEdit} onClick={() => { handleJumpDetail(record) }}>查看</Button>
          <Button type='link' size='small' onClick={() => { handleDownload(record) }}>下载</Button>
          <Popconfirm
            title="提示"
            description="是否确认删除"
            onConfirm={() => handleDelete(record)}
            okText="是"
            cancelText="否"
          >
            <Button size='small' type='link' disabled={!canEdit} danger>删除</Button>
          </Popconfirm>
        </>
      ),
    },
  ]

  useEffect(() => {
    // 获取协作数据
    getJoins({ url: '/workspaces/coop/joins', options: { params: { target_type: 'knowledgebase' } } }).then((res) => {
      setJoins(res.data)
    })
  }, [])

  useMount(() => {
    getData()
  })

  useEffect(() => {
    if (info.user_id === userSpecified.id || hasPermit('AUTH_4008') || joins.includes(info.id))
      setCanEdit(true)
    else
      setCanEdit(false)
  }, [info, joins])

  useEffect(() => {
    getData()
  }, [fileName, current, pageSize, getData])

  const onSearch = (value: string) => {
    setCurrent(1)
    if (value !== fileName)
      setFileName(value)
    else
      getData()
  }

  const handleUploadSuccess = () => {
    getData()
    setUploadModuleVisible(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('state')
    window.history.pushState({}, '', url)
  }

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys)
  }

  const rowSelection: TableRowSelection<DataType> = {
    selectedRowKeys,
    onChange: onSelectChange,
  }

  const batchDelete = () => {
    deleteFile({ url: '/kb/file/delete', body: { file_ids: selectedRowKeys } }).then(() => {
      // Toast.notify({ type: 'success', message: '删除成功' })
      message.success('删除成功')
      getData()
      setOpen(false)
      setConfirmLoading(false)
      setSelectedRowKeys([])
    }).catch(() => {
      setConfirmLoading(false)
    })
  }

  const batchDownload = () => {
    // 如果selectedRowKeys为1，则直接下载无需使用zip
    if (selectedRowKeys.length === 1)
      handleDownload(data.find(item => item.id === selectedRowKeys[0]))
    else
      reqDownload({ file_ids: selectedRowKeys, filename: `${info.name || new Date().getTime()}.zip` })
  }
  const upFile = async () => {
    const isValid = await validate()
    if (isValid)
      setUploadModuleVisible(true)
  }
  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Breadcrumb
          items={[
            {
              title: <Link href='/resourceBase/knowledgeBase'>知识库</Link>,
            },
            {
              title: '知识库详情',
            },
          ]}
        />
      </div>
      <div className={styles.card}>
        <div className={styles.header}>
          <p className={styles.title}>
            基础信息
          </p>
        </div>
        <div className={`${styles.content} ${styles.displayFlex}`}>
          <div className={styles.iconWrapper}>
            <ReadOutlined></ReadOutlined>
          </div>
          <div className={styles.info}>
            <div className={styles.name}>{info.name}</div>
            <div className={styles.desc}>{info.description}</div>
            <div className={styles.author}>账号名称: {info.user_name}</div>
          </div>
          {info.user_id === userSpecified.id && <div>
            <ModalCooperation
              btnProps={{ type: 'primary', block: true, ghost: true, className: 'mt-3' }}
              groupData={{ targetType: 'knowledgebase', targetId: info?.id }}
            />
          </div>}
        </div>
      </div>
      <div className={`${styles.card} ${styles.card2} mt-[20px]`}>
        <div className={styles.header}>
          <p className={styles.title}>
            文件列表
          </p>
        </div>
        <div className={styles.content}>
          <div className={styles.tableHeader}>
            <div className={styles.filterWrap}>
              <Search placeholder="请输入文件名称" onSearch={onSearch} style={{ width: 270 }} allowClear />
            </div>
            <div className={styles.extraWrap}>
              {/* <Button type='primary' className='mr-4' onClick={() => setCreateFolderVisible(true)}>
                新建文件夹
              </Button> */}
              <Button type="primary" disabled={selectedRowKeys.length === 0 || !canEdit} onClick={() => setOpen(true)}>
                批量删除
              </Button>
              <Button type="primary" className='ml-4' disabled={selectedRowKeys.length == 0} onClick={batchDownload}>
                批量下载
              </Button>
              <Button type="primary" className='ml-4' disabled={!canEdit} onClick={upFile}>
                新建文件
              </Button>
            </div>
          </div>
          <Table
            rowKey='id'
            columns={columns}
            rowSelection={rowSelection}
            dataSource={data}
            pagination={{
              current,
              pageSize,
              total,
              onChange: (page, pageSize) => {
                setCurrent(page)
                setPageSize(pageSize)
              },
            }
            } />
        </div>
      </div>
      <Modal
        title="提示"
        cancelText='否'
        okText='是'
        open={open}
        onOk={batchDelete}
        confirmLoading={confirmLoading}
        onCancel={() => setOpen(false)}
      >
        <p>是否确认删除？</p>
      </Modal>
      <Modal
        title="新建文件夹"
        open={createFolderVisible}
        onOk={() => {
          form.validateFields().then((values) => {
            setCreateFolderVisible(false)
          })
        }}
        onCancel={() => setCreateFolderVisible(false)}
      >
        <Form form={form}>
          <Form.Item
            name="name"
            rules={[
              { required: true, message: '请输入文件夹名称' },
              {
                validator: (_, value) => {
                  if (value && value.trim() === '')
                    return Promise.reject('文件夹名称不能为空格')

                  return Promise.resolve()
                },
              },
            ]}
          >
            <Input placeholder="请输入文件夹名称" maxLength={10} />
          </Form.Item>
        </Form>
      </Modal>
      <UploadModule visible={uploadModuleVisible} id={id} onClose={() => setUploadModuleVisible(false)} onSuccess={handleUploadSuccess}></UploadModule>
    </div>
  )
}
const KnowledgeBaseDetail = () => {
  return (
    <Suspense>
      <KnowledgeBaseDetailContent />
    </Suspense>
  )
}

export default KnowledgeBaseDetail
