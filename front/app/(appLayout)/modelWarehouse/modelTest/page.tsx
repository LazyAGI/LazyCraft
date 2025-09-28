'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button, Form, Input, Popconfirm, Radio, Table } from 'antd'
import type { TableProps } from 'antd'
import { useAntdTable } from 'ahooks'
import { useRouter } from 'next/navigation'
import styles from './index.module.scss'
import useRadioAuth from '@/shared/hooks/use-radio-auth'
import Toast from '@/app/components/base/flash-notice'
import { deleteTest, getTestList } from '@/infrastructure/api/modelTest'
import { apiPrefix } from '@/app-specs'

type DataType = {
  key: string
  name: string
  age: number
  address: string
  tags: string[]
}
type Result = {
  total: number
  list: DataType[]
}
const authOptions = [
  { label: '我的任务', value: 'mine' },
  { label: '组内任务', value: 'group' },
]
const mineAuthOptions = [
  { label: '我的任务', value: 'mine' },
]
const { Search } = Input
const ModelAdjust = () => {
  const router = useRouter()
  const [form] = Form.useForm()
  const authRadio = useRadioAuth()
  const [authValue, setAuthValue] = useState('mine')
  const canEdit = authValue == 'mine' || authRadio.isAdministrator || (authRadio.editPermit && authValue === 'group')
  const canAddDelete = authValue == 'mine' || authRadio.isAdministrator || (authRadio.addDeletePermit && authValue === 'group')

  // 添加轮询相关状态
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)

  const getTableData = ({ current, pageSize }, formData): Promise<Result> => {
    return getTestList({
      url: '/model_evalution/list',
      options: {
        params: {
          page: current,
          per_page: pageSize,
          keyword: formData.name || '',
          qtype: authValue,
        } as any,
      },
    })
      .then((res: any) => {
        return {
          total: res?.result?.total,
          list: res?.result?.tasks,
        }
      })
  }

  const { tableProps, search } = useAntdTable(getTableData, {
    defaultPageSize: 10,
    form,
  })

  // 轮询逻辑
  useEffect(() => {
    // 先清理之前的轮询（如果存在）
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }

    // 直接检查当前页面数据是否需要轮询
    const needPollingStatuses = ['dataset_processing', 'ai_evaluating', 'manual_evaluating']
    const currentPageNeedsPoll = tableProps.dataSource?.some((task: any) =>
      needPollingStatuses.includes(task.status),
    )

    if (currentPageNeedsPoll) {
      pollTimerRef.current = setInterval(() => {
        search.submit()
      }, 20000) // 20秒轮询一次
    }

    // 清理函数
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [tableProps.dataSource, tableProps.current, search, form])
  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (pollTimerRef.current)
        clearInterval(pollTimerRef.current)
    }
  }, [])

  const handleCreate = () => {
    router.push('/modelWarehouse/modelTest/create')
  }

  const handleJump = (record, name) => {
    router.push(`/modelWarehouse/modelTest/${record.id}/${name}`)
  }
  const handleJumpView = (record, name) => {
    router.push(`/modelWarehouse/modelTest/${record.id}/${name}?option_id=view`)
  }
  const handleDownload = async (record) => {
    const token = window.localStorage.getItem('console_token')
    try {
      const response = await fetch(`${apiPrefix}/model_evalution/evaluation_summary_download/${record?.id}?token=${token}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok)
        throw new Error(`下载失败: ${response.status}`)

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `测评报告_${record?.name || record?.id}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }
    catch (error) {
      console.error('下载出错:', error)
      Toast.notify({ type: 'error', message: '下载失败，请稍后重试' })
    }
  }

  const handleDelete = async (record) => {
    const res = await deleteTest({ url: `/model_evalution/delete_task/${record?.id}` })
    if (res) {
      Toast.notify({ type: 'success', message: '删除成功' })
      search.submit()
    }
  }
  const altChange = ({ target: { value } }: any) => {
    setAuthValue(value)
    search.submit()
  }
  const columns: TableProps<DataType>['columns'] = [
    {
      title: '序号',
      render: (text, record, index) => <div>{(tableProps?.pagination?.current - 1) * tableProps?.pagination?.pageSize + index + 1}</div>,
    },
    {
      title: '任务名称',
      dataIndex: 'name',
    },
    {
      title: '测评模型',
      dataIndex: 'model_name',
      render: (text) => {
        const temp = text?.split(':')
        return temp[0]
      },
    },
    {
      title: '测评方式',
      dataIndex: 'evaluation_method',
      render: text => <span>{text === 'manual' ? '人工测评' : 'AI测评'}</span>,
    },
    {
      title: '测评进度',
      dataIndex: 'process',
    },
    {
      title: '状态',
      dataIndex: 'status_zh',
    },
    {
      title: '创建时间',
      dataIndex: 'created_time',
    },
    {
      title: '创建人',
      dataIndex: 'creator',
    },
    {
      title: '操作',
      align: 'right',
      width: 240,
      render: (_, record: any) => {
        const { status } = record
        const btnDisabled = status === 'dataset_processing' || record?.status === 'ai_evaluating'
        return (
          <>
            {canEdit
              ? <Button disabled={btnDisabled} size="small" type='link' onClick={() => handleJump(record, record?.evaluation_method === 'manual' ? 'dimension' : 'aiDimension')}>标注</Button>
              : <Button disabled={btnDisabled} size="small" type='link' onClick={() => handleJumpView(record, record?.evaluation_method === 'manual' ? 'dimension' : 'aiDimension')}>查看</Button>
            }
            <Button type='link' disabled={btnDisabled} size="small" onClick={() => handleJump(record, 'testReport')}>测评报告</Button>
            <Button type='link' disabled={btnDisabled} size="small" onClick={() => handleDownload(record)}>下载</Button>
            {canAddDelete && <Popconfirm
              title="提示"
              disabled={btnDisabled}
              description="是否确认删除"
              onConfirm={() => handleDelete(record)}
              okText="是"
              cancelText="否"
            >
              <Button disabled={btnDisabled} type='link' size="small" danger>删除</Button>
            </Popconfirm>}
          </>
        )
      },
    },
  ]
  return <div className={styles.modelAdjustWrap}>
    <div className={styles.content}>
      <div className={styles.craBtn}>
        <Radio.Group options={authRadio.is_self_space ? mineAuthOptions : authOptions} onChange={altChange} value={authValue} optionType="button" />
        {authValue === 'mine' && <Button type='primary' onClick={handleCreate}>创建测评任务</Button>}
      </div>
      <div className={styles.tableHeader}>
        <Form form={form} >
          <Form.Item name="name">
            <Search placeholder="请输入任务名称" onSearch={search.submit} style={{ width: 270 }} allowClear />
          </Form.Item>
        </Form>
      </div>
      <Table rowKey="id" columns={columns} {...tableProps} />
    </div>
  </div>
}

export default ModelAdjust
