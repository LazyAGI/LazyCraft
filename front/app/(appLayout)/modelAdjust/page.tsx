'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button, Form, Input, Popconfirm, Table, Tag } from 'antd'
import type { TableProps } from 'antd'
import { useAntdTable, useUpdateEffect } from 'ahooks'
import { useRouter } from 'next/navigation'
import styles from './index.module.scss'
import Toast from '@/app/components/base/flash-notice'
import ClassifyMode from '@/app/components/tagSelect/ClassifyMode'
import CreatorSelect from '@/app/components/tagSelect/creatorSelect'
import useRadioAuth from '@/shared/hooks/use-radio-auth'
import useValidateSpace from '@/shared/hooks/use-validate-space'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { cancelModel, deleteModel, getModelList, startModel, stopModel } from '@/infrastructure/api/modelAdjust'

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
const _tags: any = {
  InQueue: { text: '排队中', color: 'warning' },
  Pending: { text: '排队中', color: 'warning' },
  InProgress: { text: '运行中', color: 'processing' },
  Completed: { text: '已完成', color: 'success' },
  Failed: { text: '失败', color: 'error' },
  Cancel: { text: '已取消', color: 'default' },
  Suspended: { text: '已暂停', color: 'default' },
  Download: { text: '下载中', color: 'default' },
}
const ModelAdjust = () => {
  const router = useRouter()
  const [form] = Form.useForm()
  const authRadio = useRadioAuth()
  const [authValue, setAuthValue] = useState('mine')
  const { validate } = useValidateSpace()
  const [selectLabels, setSelectLabels] = useState([]) as any
  const [creator, setCreator] = useState([]) as any
  const [name, setSName] = useState('')
  const [sValue, setSValue] = useState('')
  const { userSpecified } = useApplicationContext()
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const canEdit = (val) => {
    if (val === '00000000-0000-0000-0000-000000000000')
      return authRadio.isAdministrator
    else if (val === userSpecified?.id)
      return true
    else
      return authRadio.isAdministrator || authRadio.editPermit
  }
  const canAddDelete = (val) => {
    if (val === '00000000-0000-0000-0000-000000000000')
      return authRadio.isAdministrator
    else if (val === userSpecified?.id)
      return true
    else
      return authRadio.isAdministrator || authRadio.addDeletePermit
  }

  // 检查是否需要轮询
  const checkNeedPolling = (data: any[]) => {
    return data.some(item => item.status === 'InProgress' || item.status === 'InQueue' || item.status === 'Pending' || item.status === 'Download')
  }

  // 开始轮询 - 声明函数但稍后定义
  let startPolling: () => void
  let stopPolling: () => void

  const getTableData = ({ current, pageSize }): Promise<Result> => {
    return getModelList({ url: '/finetune/list/page', body: { page: current, limit: pageSize, search_name: sValue, user_id: creator, status: selectLabels.map(item => item?.id) } }).then((res: any) => {
      const responseData = {
        total: res.total,
        list: res.data,
      }

      // 检查是否需要轮询
      if (checkNeedPolling(res.data)) {
        if (!isPolling)
          startPolling()
      }
      else {
        if (isPolling)
          stopPolling()
      }

      return responseData
    })
  }
  const { tableProps, search } = useAntdTable(getTableData, {
    defaultPageSize: 10,
    form,
  })

  // 现在定义轮询函数
  startPolling = () => {
    if (pollingTimerRef.current)
      clearInterval(pollingTimerRef.current)

    setIsPolling(true)
    pollingTimerRef.current = setInterval(() => {
      search.submit()
    }, 30000) // 30秒轮询
  }

  // 停止轮询
  stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current)
      pollingTimerRef.current = null
    }
    setIsPolling(false)
  }

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current)
        clearInterval(pollingTimerRef.current)
    }
  }, [])

  useUpdateEffect(() => {
    search.submit()
  }, [creator, selectLabels, sValue])
  const handleCreate = async () => {
    const isValid = await validate()
    if (isValid)
      router.push('/modelAdjust/create')
  }

  const handleJumpDetail = (record) => {
    router.push(`/modelAdjust/${record.id}`)
  }

  const handleDelete = async (record) => {
    const res = await deleteModel({ url: `/finetune/delete/${record?.id}` })
    if (res) {
      Toast.notify({ type: 'success', message: '删除成功' })
      search.submit()
    }
  }
  const cancelTrain = async (record) => {
    const res = await cancelModel({ url: `/finetune/cancel/${record?.id}` })
    if (res) {
      Toast.notify({ type: 'success', message: '取消成功' })
      search.submit()
    }
  }
  const onChange = (e) => {
    setSName(e.target.value)
  }
  const onSearch = (e) => {
    setSValue(e)
  }
  const startTrain = async (record) => {
    const res = await startModel({ url: `/finetune/resume/${record?.id}` })
    if (res) {
      Toast.notify({ type: 'success', message: '开始训练' })
      search.submit()
    }
  }
  const stopTrain = async (record) => {
    const res = await stopModel({ url: `/finetune/pause/${record?.id}` })
    if (res) {
      Toast.notify({ type: 'success', message: '停止训练' })
      search.submit()
    }
  }

  const columns: TableProps<DataType>['columns'] = [
    {
      title: '序号',
      width: 65,
      render: (text, record, index) => <div>{(tableProps?.pagination?.current - 1) * tableProps?.pagination?.pageSize + index + 1}</div>,
      fixed: 'left',
    },
    {
      title: '任务名称',
      dataIndex: 'name',
      width: 150,
      ellipsis: true,
      fixed: 'left',
    },
    {
      title: '基础模型名称',
      dataIndex: 'base_model_key',
      width: 150,
      ellipsis: true,
    },
    {
      title: '微调模型名称',
      dataIndex: 'target_model_name',
      width: 150,
      ellipsis: true,
    },
    {
      title: '来源',
      dataIndex: 'created_from_info',
      width: 100,
      ellipsis: true,
    },
    {
      title: '任务状态',
      dataIndex: 'status',
      width: 100,
      render: text => <Tag color={_tags[text]?.color}>{_tags[text]?.text}</Tag>,
    },
    {
      title: '训练时长',
      dataIndex: 'train_runtime',
      width: 100,
      render: text => <span>{text}s</span>,

    },
    {
      title: '创建人',
      width: 100,
      render: record => <div>{record?.created_by_account?.name}</div>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
    },
    {
      title: '结束时间',
      dataIndex: 'train_end_time',
      width: 180,
    },
    {
      title: '操作',
      align: 'right',
      fixed: 'right',
      width: 200,
      render: (_, record: any) => (
        <>
          {
            // 新增停止和开始训练按钮
            (record?.status === 'Suspended') && canEdit(record?.created_by_account?.id) && <Button size='small' type='link' onClick={() => startTrain(record)}>开始训练</Button>
          }
          {
            record?.status === 'InProgress' && canEdit(record?.created_by_account?.id) && <Button size='small' type='link' onClick={() => stopTrain(record)}>停止训练</Button>
          }

          {(record?.status === 'InQueue' || record?.status === 'Running' || record?.status === 'Pending')
            && canEdit(record?.created_by_account?.id) && <Popconfirm
            title="提示"
            description="是否取消训练"
            onConfirm={() => cancelTrain(record)}
            okText="是"
            cancelText="否"
          >
            <Button size='small' type='link'>取消训练</Button>
          </Popconfirm>
          }
          <Button type='link' size='small' onClick={() => handleJumpDetail(record)}>详情</Button>
          {canAddDelete(record?.created_by_account?.id) && <Popconfirm
            title="提示"
            description="是否确认删除"
            onConfirm={() => handleDelete(record)}
            okText="是"
            cancelText="否"
          >
            <Button type='link' size='small' danger disabled={record?.status === 'InProgress'}>删除</Button>
          </Popconfirm>}
        </>
      ),
    },
  ]
  return <div className={styles.modelAdjustWrap}>
    <div className={styles.content}>
      <div className={styles.craBtn}>
        <ClassifyMode needSpace={false} label='运行状态' selectLabels={selectLabels} setSelectLabels={setSelectLabels} type='modelAdjust' />
        {authValue === 'mine' && <Button type='primary' onClick={handleCreate}>创建微调</Button>}
      </div>
      <div className={styles.tableHeader}>
        <Form.Item label="其他选项">
          <CreatorSelect value={creator} setCreator={setCreator} type='dataset' />
        </Form.Item>
        <Input.Search allowClear onChange={onChange} value={name} onSearch={onSearch} style={{ width: 270 }} placeholder='请输入任务名称' />
      </div>
      <Table rowKey="id" scroll={{ x: 'max-content' }} columns={columns} {...tableProps} />
    </div>
  </div>
}

export default ModelAdjust
