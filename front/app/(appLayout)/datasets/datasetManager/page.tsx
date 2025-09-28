'use client'

import React, { useRef, useState } from 'react'
import { Button, Form, Input, Popconfirm, Table, Tag } from 'antd'
import type { TableProps } from 'antd'
import { useAntdTable, useUpdateEffect } from 'ahooks'
import { useRouter } from 'next/navigation'
import CreateModule from './CreateModal'
import styles from './index.module.scss'
import TagMode from '@/app/components/tagSelect/TagMode'
import ClassifyMode from '@/app/components/tagSelect/ClassifyMode'
import CreatorSelect from '@/app/components/tagSelect/creatorSelect'
import useRadioAuth from '@/shared/hooks/use-radio-auth'
import Toast from '@/app/components/base/flash-notice'
import { deleteDataset, getDatasetListNew } from '@/infrastructure/api/data'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { pageCache } from '@/shared/utils'
import useValidateSpace from '@/shared/hooks/use-validate-space'

type DataType = {
  key: string
  name: string
  age: number
  address: string
  tags: string[]
  user_name: string
  user_id: string
}
type Result = {
  total: number
  list: DataType[]
}

const DataSetManager = () => {
  const router = useRouter()
  const [form] = Form.useForm()
  const authRadio = useRadioAuth()
  const { validate } = useValidateSpace()
  const [type, setType] = useState(pageCache.getTab({ name: pageCache.category.datasetKind }) || 'doc')
  const [showModal, setShowModal] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [sName, setSName] = useState('')
  const [selectLabels, setSelectLabels] = useState([]) as any
  const [creator, setCreator] = useState([]) as any
  const [selectTags, setSelectTags] = useState([]) as any
  const { userSpecified, permitData } = useApplicationContext()
  const [refreshFlag, setRefreshFlag] = useState(false)
  const tagModeRef: any = useRef()

  const getTableData = ({ current, pageSize }): Promise<Result> => {
    return getDatasetListNew({ url: '/data/list', body: { page: current, page_size: pageSize, data_type: selectLabels.map(item => item?.id), search_tags: selectTags.map(item => item?.name), user_id: creator, search_name: sName } }).then((res) => {
      return {
        total: res.total,
        list: res.data,
      }
    })
  }
  const { tableProps, search } = useAntdTable(getTableData, {
    defaultPageSize: 10,
    form,
  })

  useUpdateEffect(() => {
    search.submit()
  }, [type, sName, selectLabels, selectTags, creator, refreshFlag])
  const handleCreate = async () => {
    const isValid: any = await validate()
    if (isValid)
      setShowModal(true)
  }

  const handleJumpDetail = (record) => {
    router.push(`/datasets/datasetManager/${record.id}`)
  }

  const handleDelete = (record) => {
    deleteDataset({ url: '/data/delete', body: { data_set_id: record.id } }).then(() => {
      Toast.notify({ type: 'success', message: '删除成功' })
      search.submit()
    })
  }
  const canAddDelete = (val) => {
    if (val === '00000000-0000-0000-0000-000000000000')
      return authRadio.isAdministrator
    else if (val === userSpecified?.id)
      return true
    else
      return authRadio.isAdministrator || authRadio.addDeletePermit
  }
  const columns: TableProps<DataType>['columns'] = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '标签',
      width: 300,
      render(value, record, index) {
        return (
          <>
            {record.tags.map((item, index) => {
              return <Tag style={{ color: '#8F949E', background: '#F6F7F8', marginBottom: '5px' }} key={item}>{item}</Tag>
            })}
          </>
        )
      },
    },
    {
      title: '来源',
      dataIndex: 'from_type',
      key: 'from_type',
      render(_, record) {
        const map = {
          return: '数据回流',
          upload: '数据上传',
        }
        return <div>{map[_]}</div>
      },
    },
    {
      title: 'Tags数量',
      dataIndex: 'tags_num',
      key: 'tags_num',
    },
    {
      title: 'Branches数量',
      dataIndex: 'branches_num',
      key: 'branches_num',
    },
    {
      title: '创建人',
      dataIndex: 'user_name',
      key: 'user_name',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
    },
    {
      title: '操作',
      align: 'right',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <>
          <Button type='link' size='small' onClick={() => handleJumpDetail(record)}>详情</Button>
          {canAddDelete(record?.user_id) && <Popconfirm
            title="提示"
            description={<div className='w-[200px]'>删除后，引用了本资源的智能体或工作流将自动取消引用，此操作不可撤回。</div>}
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
  const onSuccess = () => {
    tagModeRef.current.getList()
    setShowModal(false)
    setRefreshFlag(!refreshFlag)
  }
  const onSearchApp = (e) => {
    setSName(e)
  }
  return <div className='page'>
    <div className={styles.pageTop}>
      <ClassifyMode selectLabels={selectLabels} setSelectLabels={setSelectLabels} type='dataset' />
      <Button type='primary' onClick={handleCreate}>添加数据集</Button>
    </div>
    <div className={styles.content}>
      <div className={styles.tableHeader}>
        <TagMode ref={tagModeRef} selectLabels={selectTags} setSelectLabels={setSelectTags} type='dataset' />
      </div>
      <div className={styles.tableHeader}>
        <Form.Item label="其他选项">
          <CreatorSelect value={creator} setCreator={setCreator} type='dataset' />
        </Form.Item>
        <div>
          <Input.Search
            placeholder='请输入搜索内容'
            value={searchVal}
            allowClear
            onChange={e => setSearchVal(e.target.value)}
            onSearch={onSearchApp}
            style={{ width: 270, marginLeft: 10 }}
          />
        </div>
      </div>

      <Table rowKey="id" columns={columns} {...tableProps} scroll={{ x: 'max-content' }} />
    </div>

    <CreateModule key={showModal ? Date.now() : 'closed'} gettaglist={tagModeRef.current?.getList} visible={showModal} onSuccess={onSuccess} onClose={() => setShowModal(false)} />
  </div>
}

export default DataSetManager
