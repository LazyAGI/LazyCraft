'use client'
import React, { useEffect, useState } from 'react'
import { Breadcrumb, Button, Card, Popconfirm, Radio, Table } from 'antd'
import Link from 'next/link'
import { useAntdTable } from 'ahooks'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './index.module.scss'
import DrawInfo from './DrawInfo'
import AddModal from './AddModal'
import AddModelList from './AddModelList'
import Toast from '@/app/components/base/flash-notice'
import { getModelInfo, reDown } from '@/infrastructure/api/modelWarehouse'
import { deleteModel } from '@/infrastructure/api/modelAdjust'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { usePermitCheck } from '@/app/components/app/permit-check'

const ModelDetail = (req) => {
  const { id } = req.params
  const router = useRouter()
  const [type, setType] = useState('')
  const [baseInfo, setBaseInfo] = useState<any>({})
  const [drawVisible, setDrawVisible] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModel, setShowAddModel] = useState(false)
  const { userSpecified, permitData } = useApplicationContext()
  const searchParams = useSearchParams()
  const qtype: any = searchParams.get('qtype')

  const isMine = userSpecified?.tenant?.status === 'private' ? 'private' : 'public'
  const { hasPermit } = usePermitCheck()
  const handleAddModalClose = () => {
    setDrawVisible(false)
    setShowAddModal(false)
    setShowAddModel(false)
  }

  const handleJumpDetail = (record) => {
    router.push(`/modelAdjust/${record.finetune_task_id}`)
  }

  const getTableData = ({ current, pageSize }): Promise<any> => {
    return getModelList({ url: '/mh/finetune_model_page', options: { params: { page: current, page_size: pageSize, model_id: id, online_model_id: type, qtype, namespace: isMine } } }).then((res) => {
      return {
        total: res.total,
        list: res.data,
      }
    })
  }
  const fixData = (data: any) => {
    return data?.map((item: any) => {
      return ({ ...item, label: item?.model_key, value: item?.id })
    })
  }
  const { tableProps, search } = useAntdTable(getTableData, {
    defaultPageSize: 10,
    debounceWait: 300,
    refreshDeps: [type],
    manual: true,
  })
  const getInfo = () => {
    getModelInfo({ url: `mh/model_info/${id}`, options: { params: { qtype, namespace: isMine } } }).then((res) => {
      setBaseInfo(res)
      if (res?.models?.length > 0) {
        setType(res?.models[0]?.id)
        search.submit()
      }
    })
  }
  useEffect(() => {
    getInfo()
  }, [id])
  const handleDelete = async (record) => {
    const res = await deleteModel({ url: `/mh/delete_finetune_model/${id}/${record?.id}` })
    if (res) {
      Toast.notify({ type: 'success', message: '删除成功' })
      search.submit()
    }
  }
  const reDownload = () => {
    reDown({ url: `/mh/retry_download/${id}` }).then((res) => {
      if (res) {
        Toast.notify({ type: 'success', message: '操作成功' })
        getInfo()
      }
    })
  }
  const handleAddSuccess = () => {
    search.submit()
    setShowAddModal(false)
  }
  const onChange = ({ target: { value } }: any) => {
    setType(value)
    search.reset()
  }

  const columns: any = [
    {
      title: '序号',
      render: (text, record, index) => <div>{(tableProps?.pagination?.current - 1) * tableProps?.pagination?.pageSize + index + 1}</div>,
    },
    {
      title: '模型名称',
      render: (text, record) => <div>{record?.model_name || record?.model_key}</div>,
    },
    {
      title: '来源',
      dataIndex: 'source_info',
    },
    {
      title: '完成时间',
      dataIndex: 'created_at',
      key: 'created_at',
    },
    {
      title: '操作',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <>
          {!!record?.finetune_task_id && <Button type='link' size='small' onClick={() => handleJumpDetail(record)}>查看训练详情</Button>}
          {(userSpecified.id === baseInfo.user_id || hasPermit('AUTH_5008')) && <Popconfirm
            title="提示"
            description="是否确认删除"
            onConfirm={() => handleDelete(record)}
            okText="是"
            cancelText="否"
          >
            <Button type='link' size='small' danger>删除</Button>
          </Popconfirm>}
        </>
      ),
    },
  ]
  return (
    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <Breadcrumb
          items={[
            {
              title: <Link href='/inferenceService/cloud'>云服务</Link>,
            },
            {
              title: '详情',
            },
          ]}
        />
      </div>
      <Card className={styles.cardSty} style={{ marginBottom: 20 }} type='inner' title={<div className={styles.title} >
        基础模型
      </div>}>
        <div className={styles.baseWrap}>
          <div className={styles.imgWrap}>
            <img src={baseInfo?.model_icon?.replace('app', 'static')} alt="icon" />
          </div>
          <div className={styles.infoMiddle}>
            <div className={styles.first}>
              <div className={styles.name}>{baseInfo?.model_name}</div>
            </div>
            {baseInfo?.description && <div>{baseInfo?.description}</div>}
            <div className={styles.detailWrap}>
              {baseInfo?.model_from && <div>模型来源：{baseInfo?.model_from}</div>}
              {baseInfo?.model_kind && <div>模型类别：{baseInfo?.model_kind}</div>}
            </div>
          </div>
          <div className='flex'>
            {baseInfo?.model_type === 'online' && hasPermit('AUTH_5008') && qtype !== 'builtin' && <Button className='mr-[10px]' type='primary' ghost onClick={() => setShowAddModel(true)}>添加模型清单</Button>}
            {baseInfo?.model_type === 'online' && hasPermit('AUTH_5007') && <Button className='mr-[10px]' type='primary' ghost onClick={() => setShowAddModel(true)}>添加模型清单</Button>}
            {baseInfo?.model_type === 'local' && baseInfo?.model_from !== 'existModel' && baseInfo?.model_status === '4' && <Button className='mr-[10px]' type='primary' ghost onClick={reDownload}>重新下载</Button>}
            {baseInfo?.model_type === 'local' && baseInfo?.model_from !== 'existModel' && baseInfo?.model_status === '1' && <Button className='mr-[10px]' type='primary' ghost onClick={reDownload}>下载模型</Button>}
            <Button type='primary' ghost onClick={() => setDrawVisible(true)}>查看更多详情</Button>
          </div>
        </div>
      </Card>
      <Card type='inner' title={<div className={styles.title} >
        微调模型
      </div>}>
        <div className={styles.adjustWrap}>
          <div className={styles.headWrap}>
            {baseInfo?.model_kind === 'localLLM' && (userSpecified.id === baseInfo.user_id || hasPermit('AUTH_5008')) && <div style={{ width: '100%', textAlign: 'right' }}><Button type='primary' ghost onClick={() => setShowAddModal(true)}>导入微调模型</Button></div>}
            {baseInfo?.model_type === 'online' && <Radio.Group options={fixData(baseInfo?.models)} value={type} onChange={onChange} optionType="button" />}
          </div>
          <Table rowKey="id" className='mt-[20px]' columns={columns} {...tableProps} />
        </div>
      </Card>
      <DrawInfo visible={drawVisible} baseInfo={baseInfo} onClose={handleAddModalClose}></DrawInfo>
      <AddModal visible={showAddModal} baseInfo={baseInfo} id={id} onSuccess={handleAddSuccess} onClose={handleAddModalClose}></AddModal>
      <AddModelList qtype={qtype} isMine={isMine} getInfo={getInfo} visible={showAddModel} baseInfo={baseInfo} id={id} onClose={handleAddModalClose}></AddModelList>
    </div >
  )
}

export default ModelDetail
