'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Breadcrumb, Button, Card, Checkbox, Col, Pagination, Popconfirm, Row, Space, Table, Typography } from 'antd'
import type { TableProps } from 'antd'
import { useRouter } from 'next/navigation'
import { useAntdTable } from 'ahooks'
import Link from 'next/link'
import { PhotoSlider } from 'react-photo-view'
import AddModal from './AddModal'
import styles from './index.module.scss'
import { getJoins } from '@/infrastructure/api/apps'
import { formatDatasetTag } from '@/shared/utils/format'
import { deleteFile, getDatasetFileList, getDatasetVersionInfo } from '@/infrastructure/api/data'
import { usePermitCheck } from '@/app/components/app/permit-check'
import { useApplicationContext } from '@/shared/hooks/app-context'

import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import 'react-photo-view/dist/react-photo-view.css'

type DataType = {
  key: string
  name: string
  age: number
  address: string
  tags: string[]
  status: string
  error_msg: string
  operation?: string
}
const originMap = {
  return: '数据回流',
  upload: '数据上传',
}
const moduleMap = {
  node: '应用节点',
  app: '应用',
  null: '-',
}
type Result = {
  total: number
  list: DataType[]
}
type TableRowSelection<T extends object = object> = TableProps<T>['rowSelection']

const StatusComponent = ({ status, error_msg }) => {
  const map = ['等待中', '解析中', '上传中', '过滤中', '增强中', '上传失败', '解析失败', '过滤失败', '增强失败', '已完成', '去噪中', '标注中', '去噪失败', '标注失败', '智能处理中', '智能处理失败']
  const classArr = ['doing', 'doing', 'doing', 'doing', 'doing', 'failed', 'failed', 'failed', 'failed', 'done', 'doing', 'doing', 'failed', 'failed', 'doing', 'failed']
  const errStatus = [6, 7, 8, 9, 13, 14]
  const isErr = errStatus.includes(+status)
  return <div className={`${styles.statusWrap} ${styles[classArr[status - 1]]} ${isErr && styles.errTag}`} title={isErr ? error_msg : ''}>
    {map[status - 1]}
  </div>
}
const DatasetVersionDetail = (req) => {
  const { params } = req
  const { id, versionId } = params
  const { hasPermit } = usePermitCheck()

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [info, setInfo] = useState<any>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalKey, setModalKey] = useState(0) // 添加modalKey状态
  const [picList, setPicList] = useState<any>([])
  const [showModalImage, setShowModalImage] = useState(false)
  const [joins, setJoins] = useState<any>([])
  const [index, setIndex] = useState() as any
  const { userSpecified } = useApplicationContext()
  const selectedKey = info.data_type === 'doc' ? selectedRowKeys : picList.filter(item => item.checked).map(item => item.id)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const previewImg = picList.map((item, index) => {
    return {
      key: index,
      src: item.path.replace('/app', '/static'),
    }
  })
  const router = useRouter()
  useEffect(() => {
    // 获取协作者
    getJoins({ url: '/workspaces/coop/joins', options: { params: { target_type: 'dataset' } } }).then((res) => {
      setJoins(res.data)
    })
  }, [])
  const getTableData = ({ current, pageSize }): Promise<Result> => {
    return getDatasetFileList({ url: info.from_type === 'upload' ? '/data/file/list' : 'data/reflux/list', options: { params: { page: current, page_size: pageSize, data_set_version_id: params.versionId } } }).then((res) => {
      return {
        total: res.total,
        list: info.data_type === 'doc'
          ? res.data
          : res.data.map((item) => {
            return {
              ...item,
              checked: false,
            }
          }),
      }
    })
  }
  const { tableProps, search } = useAntdTable(getTableData, {
    defaultPageSize: 20,
    manual: true,
    onSuccess(res) {
      info.data_type === 'pic' && setPicList(res.list)
    },
  })
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    const processingStatuses = [1, 2, 3, 4, 5, 11, 12, 15]
    const hasProcessingRecords = tableProps.dataSource?.some((record: any) =>
      processingStatuses.includes(record.status),
    )

    if (tableProps.dataSource && tableProps.dataSource.length > 0) {
      const statusCounts = {}
      tableProps.dataSource.forEach((record: any) => {
        const status = record.status
        statusCounts[status] = (statusCounts[status] || 0) + 1
      })
    }
    if (hasProcessingRecords) {
      pollingIntervalRef.current = setInterval(() => {
        search.submit()
      }, 20000)
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [tableProps.dataSource, tableProps.current, search])

  const getInfo = () => {
    getDatasetVersionInfo({ url: '/data/version', options: { params: { data_set_version_id: versionId } } }).then((res) => {
      setInfo(res)
    })
  }
  useEffect(() => {
    getInfo()
  }, [])

  useEffect(() => {
    search.submit()
  }, [info])
  const jumpDetail = (record) => {
    router.push(`/datasets/datasetManager/${id}/${versionId}/${record.id}?from_type=${info.from_type}`)
  }
  const handleDelete = (item) => {
    deleteFile({ url: info.from_type === 'upload' ? '/data/file/delete' : '/data/reflux/delete', body: { [info.from_type === 'upload' ? 'data_set_file_ids' : 'reflux_data_ids']: [item.id] } }).then((res) => {
      search.submit()
      Toast.notify({
        type: ToastTypeEnum.Success, message: '删除成功',
      })
    })
  }
  const canEdit = () => {
    return userSpecified.id === info.user_id || joins?.includes(id) || hasPermit('AUTH_6007')
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
      render: (_, record) => <StatusComponent {...record} />,
    },
    {
      title: '执行操作',
      key: 'operation',
      dataIndex: 'operation',
      render: (_, record) => {
        const map = { upload: '新增数据', clean: '数据过滤', enhance: '增强数据' }
        return map[record.operation!] || record.operation || '-'
      },
    },
    {
      title: '完成时间',
      key: 'terminated_at',
      dataIndex: 'terminated_at',
    },
    {
      title: '操作',
      key: 'action',
      align: 'right',
      width: 150,
      render: (_, record) => (
        <>
          <Typography.Link onClick={() => jumpDetail(record)} disabled={record.status != '10' || !canEdit()}>详情</Typography.Link>
          <Popconfirm
            title="提示"
            description="是否确认删除"
            onConfirm={() => handleDelete(record)}
            okText="是"
            cancelText="否"
          >
            <Button type='link' size='small' disabled={!canEdit()} danger>删除</Button>
          </Popconfirm>
        </>
      ),
    },
  ]

  const returnColumns: TableProps<DataType>['columns'] = [
    {
      title: '输入',
      dataIndex: 'module_input',
      key: 'module_input',
      ellipsis: true,
    },
    {
      title: '输出',
      ellipsis: true,
      dataIndex: 'module_output',
      key: 'module_output',
    },
    {
      title: '用户评价',
      dataIndex: 'is_satisfied',
      key: 'is_satisfied',
      render: _ => _ === 'True' ? '赞' : _ === 'False' ? '踩' : '-',

    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => <StatusComponent {...record} />,
    },
    {
      title: '执行操作',
      key: 'operation',
      dataIndex: 'operation',
      render: (_, record) => {
        const map = { upload: '新增数据', clean: '数据过滤', enhance: '增强数据' }
        return map[record.operation!] || record.operation || '-'
      },
    },
    {
      title: '创建时间',
      key: 'created_at',
      dataIndex: 'created_at',
    },
    {
      title: '操作',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <>
          <Typography.Link onClick={() => jumpDetail(record)} disabled={record.status != '10' || !canEdit()}>详情</Typography.Link>
          <Popconfirm
            title="提示"
            description="是否确认删除"
            onConfirm={() => handleDelete(record)}
            okText="是"
            cancelText="否"
          >
            <Button type='link' size='small' disabled={!canEdit()} danger>删除</Button>
          </Popconfirm>
        </>
      ),
    },
  ]

  const batchDelete = () => {
    deleteFile({ url: info.from_type === 'upload' ? '/data/file/delete' : '/data/reflux/delete', body: { [info.from_type === 'upload' ? 'data_set_file_ids' : 'reflux_data_ids']: selectedKey } }).then(() => {
      search.submit()
      Toast.notify({
        type: ToastTypeEnum.Success, message: '删除成功',
      })
    })
  }

  const handleAdd = () => {
    setModalKey(prev => prev + 1) // 增加key值
    setShowAddModal(true)
  }

  const handleAddModalClose = () => {
    setShowAddModal(false)
  }

  const handleAddSuccess = () => {
    setShowAddModal(false)
    search.submit()
  }

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys)
  }
  const rowSelection: TableRowSelection<DataType> = {
    selectedRowKeys,
    onChange: onSelectChange,
  }

  const handleChecked = (index) => {
    const arr = [...picList]
    arr[index].checked = !arr[index].checked
    setPicList(arr)
  }

  const handlePreview = (index: number) => {
    setIndex(index)
    setShowModalImage(true)
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
                title: <Link href={`/datasets/datasetManager/${params.id}`}>版本管理</Link>,
              },
              {
                title: '版本详情',
              },
            ]}
          />
        </div>
        <Card type='inner' title={<div className={styles.title} >
          基础信息
        </div>}>
          <div className={styles.name}>
            <div>{info.name}</div><div className={styles.versionTag}>
              {info.version}
            </div>
          </div>
          <div className={styles.tags}>
            {
              info?.label?.map((item, index) => {
                return <div className={styles.tagItem} key={index}>
                  {formatDatasetTag(item)}
                </div>
              })
            }
          </div>
          <div className={styles.desc}>
            {info?.description}
          </div>
          <Space style={{ color: '#5E6472', columnGap: 30 }}>
            <div>
              来源：{originMap[info?.from_type]}
            </div>
            <div>
              模块类型：{moduleMap[info?.reflux_type]}
            </div>
            <div>
              创作者账号： {info?.user_name}
            </div>
          </Space>
        </Card>

        {info.data_type !== 'pic'
          ? <Card type='inner' style={{ marginTop: '20px' }} title={<div className={styles.title}>
            文件列表
          </div>}>
            <div className={styles.tableHeader}>
              <Button className='mr-4' type='primary' disabled={selectedKey.length === 0 || !canEdit()} onClick={batchDelete} ghost>批量删除</Button>
              {info?.from_type === 'upload' && <Button type='primary' disabled={!canEdit()} onClick={handleAdd}>添加数据</Button>}
            </div>
            <Table rowSelection={canEdit() && rowSelection} rowKey='id' columns={info.from_type === 'upload' ? columns : returnColumns} {...tableProps} />
          </Card>
          : <Card type='inner' style={{ marginTop: '20px' }} title={<div className={styles.title}>
            图片列表
          </div>}>

            {info.version_type === 'branch' && <div className={styles.tableHeader}>
              <Button className='mr-4' type='primary' disabled={selectedKey.length === 0 || !canEdit()} onClick={batchDelete} ghost>批量删除</Button>
              <Button type='primary' disabled={!canEdit()} onClick={handleAdd}>添加数据</Button>
            </div>}
            <Row className={styles.picList} gutter={[16, 16]}>
              {picList.map((item, index) => {
                return <Col className={styles.item} key={item.id} span={3} >
                  <img src={item.path.replace('/app', '/static')} onClick={() => handlePreview(index)} />
                  {info.version_type === 'branch' && <div className={styles.bottom}>
                    <Checkbox checked={item.checked} disabled={!canEdit()} onChange={() => handleChecked(index)}></Checkbox><div className={styles.name} title={item.name}><span>{item.name}</span></div>
                  </div>}
                </Col>
              })}
            </Row>
            <div className={styles.footer}>
              <Pagination {...tableProps.pagination} onChange={(page, pageSize) => { tableProps.onChange({ current: page, pageSize, total: tableProps.pagination.total }) }} />
            </div>
          </Card>}
      </div>
      <AddModal
        key={modalKey}
        visible={showAddModal}
        versionId={versionId}
        info={info}
        onSuccess={handleAddSuccess}
        onClose={handleAddModalClose}
      />

      <PhotoSlider
        images={previewImg}
        visible={showModalImage}
        onClose={() => setShowModalImage(false)}
        index={index}
        loop={false}
        maskOpacity={0.8}
        onIndexChange={setIndex}
      />
    </div>
  )
}

export default DatasetVersionDetail
