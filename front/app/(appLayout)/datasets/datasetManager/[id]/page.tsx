'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Breadcrumb, Button, Card, Modal, Popconfirm, Radio, Space, Table, Typography } from 'antd'
import type { RadioChangeEvent, TableProps } from 'antd'
import { ExclamationCircleFilled } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { useAntdTable } from 'ahooks'
import Link from 'next/link'
import styles from './index.module.scss'
import AddModal from './AddModal'
import DataModal from './DataModal'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { formatDatasetTag } from '@/shared/utils/format'
import ModalCooperation from '@/app/components/app/picker-user/ModalCooperation'
import { getJoins } from '@/infrastructure/api/apps'
import { deleteDataset, deleteDatasetVersion, getDatasetInfo, getDatasetVersionList, publish } from '@/infrastructure/api/data'
import { usePermitCheck } from '@/app/components/app/permit-check'
import { useApplicationContext } from '@/shared/hooks/app-context'
import useValidateSpace from '@/shared/hooks/use-validate-space'
import { tagList } from '@/app/components/tagSelect/ClassifyMode'

type TableRowSelection<T extends object = object> = TableProps<T>['rowSelection']

type DataType = {
  key: string
  name: string
  age: number
  address: string
  tags: string[]
  version_doing?: number
  status?: string | number
}
type Result = {
  total: number
  list: DataType[]
}
const { confirm } = Modal
const options = [
  {
    label: 'branch',
    value: 'branch',
  },
  {
    label: 'tag',
    value: 'tag',
  },
]
const originMap = {
  return: '数据回流',
  upload: '数据上传',
}
const moduleMap = {
  node: '应用节点',
  app: '应用',
  null: '-',
}
const statusMap = {
  1: '正在处理',
  2: '已完成',
  3: '处理失败',
}

const StatusComponent = ({ status }) => {
  const classArr = ['doing', 'done', 'failed']
  return <div className={`${styles.statusWrap} ${styles[classArr[status - 1]]}`}>
    {statusMap[status]}
  </div>
}

// 检查记录是否正在处理中的辅助函数
const isRecordProcessing = (record: any): boolean => {
  return record.status === '1'
}

// 获取处理中记录的禁用样式
const getProcessingDisabledStyle = (isProcessing: boolean) => {
  return {
    color: isProcessing ? '#d9d9d9' : undefined,
    cursor: isProcessing ? 'not-allowed' : 'pointer',
  }
}

// 数据集详情
const DatasetDetail = (req) => {
  const router = useRouter()
  const { id } = req.params
  const { validate } = useValidateSpace()

  const [selectedBranchRowKeys, setSelectedBranchRowKeys] = useState<React.Key[]>([])
  const [selectedTagRowKeys, setSelectedTagRowKeys] = useState<React.Key[]>([])
  const [type, setType] = useState('branch')
  const [datasetInfo, setDatasetInfo] = useState<any>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDataModal, setShowDataModal] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [handleType, setHandleType] = useState<string>('')
  const [record, setRecord] = useState<any>({})
  const [joins, setJoins] = useState<any>([])
  const { userSpecified, permitData } = useApplicationContext()

  // 添加轮询相关的ref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const { hasPermit } = usePermitCheck()

  const getInfo = useCallback(() => {
    getDatasetInfo({ url: '/data', options: { params: { data_set_id: id } } }).then((res) => {
      setDatasetInfo(res)
    })
  }, [id])

  useEffect(() => {
    getInfo()
  }, [getInfo])

  useEffect(() => {
    // 获取协作者
    getJoins({ url: '/workspaces/coop/joins', options: { params: { target_type: 'dataset' } } }).then((res) => {
      setJoins(res.data)
    })
  }, [])

  const getTableData = ({ current, pageSize }): Promise<Result> => {
    return getDatasetVersionList({ url: '/data/version/list', options: { params: { page: current, page_size: pageSize, data_set_id: id, version_type: type } } }).then((res) => {
      return {
        total: res.total,
        list: res.data,
      }
    })
  }

  const { tableProps, search } = useAntdTable(getTableData, {
    defaultPageSize: 20,
  })

  // 添加轮询逻辑
  useEffect(() => {
    // 先清理之前的轮询（如果存在）
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    // 检查当前页面是否有正在处理的记录
    const hasProcessingRecords = tableProps.dataSource?.some((record: any) => record.status === '1')
    if (hasProcessingRecords) {
      // 如果当前页有正在处理的记录，启动轮询
      pollingIntervalRef.current = setInterval(() => {
        search.submit()
      }, 20000) // 20秒轮询一次
    }

    // 组件卸载时清理定时器
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [tableProps.dataSource, tableProps.current])

  useEffect(() => {
    search.submit()
  }, [type])

  const onChange = ({ target: { value } }: RadioChangeEvent) => {
    setType(value)
  }
  const handlePublish = (record) => {
    if (record.status != 2)
      return
    if (datasetInfo.from_type === 'return') {
      publish({ url: '/data/version/publish', body: { data_set_version_id: record.id } }).then(() => {
        Toast.notify({ type: ToastTypeEnum.Success, message: '发布成功' })
      })
    }
    else {
      publish({ url: '/data/version/publish', body: { data_set_version_id: record.id } }).then(() => {
        Toast.notify({
          type: ToastTypeEnum.Success, message: '发布成功',
        })
        search.submit()
      })
    }
  }
  const handleDelete = (record) => {
    // 检查记录是否正在处理中
    if (isRecordProcessing(record)) {
      Toast.notify({ type: ToastTypeEnum.Warning, message: '该记录正在处理中，请稍后再进行删除操作' })
      return
    }

    // 先检查是否是最后一个版本
    const isLastVersion = tableProps.dataSource?.length === 1

    if (isLastVersion) {
      // 如果是最后一个版本，先确认是否删除整个数据集
      confirm({
        className: 'controller-modal-confirm',
        title: '该数据集将被彻底删除，请确认。',
        icon: <ExclamationCircleFilled />,
        content: '删除此版本后，该数据集将不再有任何版本，整个数据集将被删除。',
        onOk() {
          // 用户确认后，先删除版本，再删除数据集
          deleteDatasetVersion({ url: '/data/version/delete', body: { data_set_version_id: record?.id } }).then(() => {
            deleteDataset({ url: '/data/delete', body: { data_set_id: id } }).then(() => {
              Toast.notify({ type: ToastTypeEnum.Success, message: '删除成功' })
              router.push('/datasets/datasetManager')
            })
          })
        },
      })
    }
    else {
      // 不是最后一个版本，直接删除版本
      deleteDatasetVersion({ url: '/data/version/delete', body: { data_set_version_id: record?.id } }).then(() => {
        Toast.notify({
          type: ToastTypeEnum.Success, message: '删除成功',
        })
        search.submit()
      })
    }
  }
  const jumpDetail = (record) => {
    // 检查记录是否正在处理中
    if (isRecordProcessing(record)) {
      Toast.notify({ type: ToastTypeEnum.Warning, message: '该记录正在处理中，请稍后再查看详情' })
      return
    }
    router.push(`/datasets/datasetManager/${id}/${record.id}`)
  }
  const onHandleData = (type, record) => {
    // 检查记录是否正在处理中
    if (isRecordProcessing(record)) {
      Toast.notify({ type: ToastTypeEnum.Warning, message: '该记录正在处理中，请稍后再进行数据处理' })
      return
    }
    setHandleType(type)
    setRecord(record)
    setShowDataModal(true)
  }
  const canEdit = () => {
    // 创建者，协作者，拥有角色权限的人可以编辑
    return userSpecified.id === datasetInfo.user_id || joins?.includes(datasetInfo.id) || hasPermit('AUTH_6007')
  }
  const columns: TableProps<DataType>['columns'] = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: _ => <StatusComponent status={_} />,
    },
    {
      title: '更新时间',
      key: 'updated_at',
      dataIndex: 'updated_at',
    },
    {
      title: '创建版本',
      key: 'create',
      dataIndex: 'create',
      render: (_, record) => {
        return record.version_doing == 1
          ? '--'
          : <Popconfirm
            title="提示"
            description="发布后，生成tag版本数据不可修改，是否发布？"
            onConfirm={(e) => { handlePublish(record) }}
            okText="是"
            cancelText="否"
          >
            <Button type='link' disabled={!canEdit() || record.status != 2}>发布</Button>
          </Popconfirm>
      },

    },
    {
      title: '操作',
      key: 'action',
      align: 'right',
      width: 280,
      render: (_, record) => {
        const isProcessing = isRecordProcessing(record)
        return (
          <>
            <Typography.Link
              className='mr-[10px]'
              onClick={() => {
                if (isProcessing) {
                  Toast.notify({ type: ToastTypeEnum.Warning, message: '该记录正在处理中，请稍后再查看详情' })
                  return
                }
                jumpDetail(record)
              }}
              style={getProcessingDisabledStyle(isProcessing)}
            >
              详情
            </Typography.Link>
            {datasetInfo.data_type !== 'pic'
              && <>
                {
                  (() => {
                    const maxVisibleTags = 0
                    const visibleTags = tagList.script.slice(0, maxVisibleTags)
                    const hiddenTags = tagList.script.slice(maxVisibleTags)
                    const hasMoreTags = tagList.script.length > maxVisibleTags

                    const dropdownItems = hiddenTags.map(item => ({
                      key: item.id,
                      label: (
                        <Typography.Link
                          disabled={!canEdit() || isProcessing}
                          onClick={() => onHandleData(item.id, record)}
                          style={getProcessingDisabledStyle(isProcessing)}
                        >
                          {item.name}
                        </Typography.Link>
                      ),
                    }))

                    return (
                      <Space wrap>
                        {visibleTags.map(item => (
                          <Typography.Link
                            key={item.id}
                            disabled={!canEdit() || isProcessing}
                            onClick={() => onHandleData(item.id, record)}
                            style={getProcessingDisabledStyle(isProcessing)}
                          >
                            {item.name}
                          </Typography.Link>
                        ))}
                        {hasMoreTags && (
                          <Button
                            type="link"
                            onClick={() => {
                              if (isProcessing) {
                                Toast.notify({ type: ToastTypeEnum.Warning, message: '该记录正在处理中，请稍后再进行数据处理' })
                                return
                              }
                              onHandleData('data_process', record)
                            }}
                            style={getProcessingDisabledStyle(isProcessing)}
                          >
                            数据处理
                          </Button>
                        )}
                      </Space>
                    )
                  })()
                }
              </>

            }
            {isProcessing
              ? (
                <Button
                  size='small'
                  type='link'
                  danger
                  style={{
                    color: '#d9d9d9',
                    cursor: 'not-allowed',
                  }}
                  onClick={() => {
                    Toast.notify({ type: ToastTypeEnum.Warning, message: '该记录正在处理中，请稍后再进行删除操作' })
                  }}
                >
                  删除
                </Button>
              )
              : (
                <Popconfirm
                  title="提示"
                  description="点击之后文件不可恢复，确认删除？"
                  onConfirm={() => handleDelete(record)}
                  okText="是"
                  cancelText="否"
                >
                  <Button
                    size='small'
                    type='link'
                    disabled={!canEdit()}
                    danger
                  >
                    删除
                  </Button>
                </Popconfirm>
              )}
          </>
        )
      },
    },
  ]

  const tagColumns: TableProps<DataType>['columns'] = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '版本号',
      dataIndex: 'version',
      key: 'version',
    },

    {
      title: '发布时间',
      key: 'updated_at',
      dataIndex: 'updated_at',
    },
    {
      title: '操作',
      key: 'action',
      align: 'right',
      render: (_, record) => {
        const isProcessing = isRecordProcessing(record)
        return (
          <>
            <Typography.Link
              onClick={() => {
                if (isProcessing) {
                  Toast.notify({ type: ToastTypeEnum.Warning, message: '该记录正在处理中，请稍后再查看详情' })
                  return
                }
                jumpDetail(record)
              }}
              style={getProcessingDisabledStyle(isProcessing)}
            >
              详情
            </Typography.Link>
            {isProcessing
              ? (
                <Button
                  size='small'
                  type='link'
                  danger
                  style={{
                    color: '#d9d9d9',
                    cursor: 'not-allowed',
                  }}
                  onClick={() => {
                    Toast.notify({ type: ToastTypeEnum.Warning, message: '该记录正在处理中，请稍后再进行删除操作' })
                  }}
                >
                  删除
                </Button>
              )
              : (
                <Popconfirm
                  title="提示"
                  description="点击之后文件不可恢复，确认删除？"
                  onConfirm={e => handleDelete(record)}
                  okText="是"
                  cancelText="否"
                >
                  <Button
                    size='small'
                    type='link'
                    disabled={!canEdit()}
                    danger
                  >
                    删除
                  </Button>
                </Popconfirm>
              )}
          </>
        )
      },
    },
  ]

  const rowSelection: TableRowSelection<DataType> = useMemo(() => {
    return ({
      branch: {
        selectedRowKeys: selectedBranchRowKeys,
        onChange: (newSelectedRowKeys: React.Key[]) => {
          setSelectedBranchRowKeys(newSelectedRowKeys)
        },
      },
      tag: {
        selectedRowKeys: selectedTagRowKeys,
        onChange: (newSelectedRowKeys: React.Key[]) => {
          setSelectedTagRowKeys(newSelectedRowKeys)
        },
      },
    })[type]
  }, [selectedBranchRowKeys, selectedTagRowKeys, type])

  const handleExport = () => {
    if (!rowSelection?.selectedRowKeys)
      return

    const token = localStorage.getItem('console_token')
    let filename = 'default.zip'
    const selectedRowKeys = rowSelection?.selectedRowKeys

    fetch(datasetInfo?.from_type === 'upload' ? '/console/api/data/version/export' : '/console/api/data/reflux/version/export',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ data_set_version_ids: selectedRowKeys }),
      })
      .then((response) => {
        const contentDisposition = response.headers.get('Content-Disposition')
        if (contentDisposition) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
          const matches = filenameRegex.exec(contentDisposition)
          if (matches != null && matches[1])
            filename = decodeURIComponent(matches[1].replace(/['"]/g, ''))
        }
        if (!response.ok)
          throw new Error('网络错误')
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
        console.error('There was a problem with the fetch operation:', error)
      })
  }

  const handleAddModalClose = () => {
    setShowAddModal(false)
  }

  const handleAddSuccess = () => {
    setShowAddModal(false)
    search.submit()
  }

  const handleAdd = async () => {
    const isValid = await validate()
    if (isValid)
      setShowAddModal(true)
  }

  const handleFileSuccess = () => {
    setShowDataModal(false)
    search.submit()
  }

  return (
    <div className='page'>
      <div className={styles.container}>
        <div className={styles.breadcrumb}>
          <Breadcrumb
            items={[
              {
                title: '数据集',
              },
              {
                title: <Link href='/datasets/datasetManager'>数据集管理</Link>,
              },
              {
                title: '版本管理',
              },
            ]}
          />
        </div>
        <Card type='inner' title={<div className={styles.title} >
          基础信息
        </div>}>

          <div className={styles.name}>
            <div>{datasetInfo?.name}</div>
            {userSpecified.id === datasetInfo.user_id && <div>
              <ModalCooperation
                btnProps={{ type: 'primary', ghost: true, block: true }}
                groupData={{ targetType: 'dataset', targetId: datasetInfo?.id }}
              />
            </div>}
          </div>
          <div className={styles.tags}>
            {
              datasetInfo?.label?.map((item, index) => {
                return <div className={styles.tagItem} key={index}>
                  {formatDatasetTag(item)}
                </div>
              })
            }

          </div>
          <div className={styles.desc}>
            {datasetInfo?.description}
          </div>
          <Space size='large' className={styles.fontSty}>
            <div>
              来源：{originMap[datasetInfo?.from_type]}
            </div>
            <div >
              模块类型：{moduleMap[datasetInfo?.reflux_type]}
            </div>
            <div>
              创造者账号：{datasetInfo?.user_name}
            </div>
          </Space>
        </Card>
        <Card type='inner' style={{ marginTop: '20px' }} title={<div className={styles.title}>
          版本列表
        </div>}>
          <div className={styles.carBody}>
            <div className={styles.tableHeader}>
              <Radio.Group options={options} value={type} onChange={onChange} optionType="button" />
              <div>
                <Button type='primary' className='mr-4' disabled={rowSelection?.selectedRowKeys?.length === 0} onClick={handleExport}>导出数据</Button>
                {type === 'branch' && datasetInfo.from_type === 'upload' && <Button type='primary' disabled={!canEdit()} onClick={handleAdd}>添加Branches</Button>}
              </div>
            </div>
            <Table rowSelection={rowSelection} rowKey='id' columns={type === 'branch' ? columns : tagColumns} {...tableProps} />
          </div>
        </Card>
      </div >
      <AddModal visible={showAddModal} id={id} datasetInfo={datasetInfo} onSuccess={handleAddSuccess} onClose={handleAddModalClose}></AddModal>
      {/* <PublishModal visible={showPublishModal} id={dataId} onSuccess={handlePublishSuccess} onClose={handlePublishModalClose}></PublishModal> */}
      <DataModal type={handleType} onClose={() => setShowDataModal(false)} onSuccess={handleFileSuccess} data={record} visible={showDataModal}></DataModal>
    </div >
  )
}

export default DatasetDetail
