'use client'
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Form, Modal, Radio, Table, Tag, message } from 'antd'
import type { RadioChangeEvent } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import CreateModal from './CreateModule'
import EditModel from './EditModel'
import { getModelInfo, getModelListNew } from '@/infrastructure/api/modelWarehouse'
import { deleteModelList } from '@/infrastructure/api/user'

// 定义模型数据类型
type ModelItemType = {
  id: string
  model_name: string
  model_type: string
  model_brand: string
  model_kind: string
  user_name: string
  created_at: string
  model_icon: string
  description: string
  model_status: string
  user_id: string
  model_list?: { model_key: string }[]
}

// 定义API响应类型
type ModelListResponse = {
  data: ModelItemType[]
  result?: string
}

const CloudService = () => {
  const [list, setList] = useState<ModelItemType[]>([])
  const [brandList, setBrandList] = useState<string[]>([])
  const [kind, setKind] = useState('SenseNova')
  const [filteredList, setFilteredList] = useState<ModelItemType[]>([])
  const [editModelVisible, setEditModelVisible] = useState(false)
  const [item, setItem] = useState<ModelItemType | undefined>()
  const [expandedRowDetails, setExpandedRowDetails] = useState<Record<string, any>>({})
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [modelType, setModelType] = useState('online')
  const [currentModelId, setCurrentModelId] = useState<string>()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modelKey, setModelKey] = useState<string>()

  const onKindChange = (e: RadioChangeEvent) => {
    setKind(e.target.value)
  }

  // 根据选中的类型过滤数据
  useEffect(() => {
    const filtered = list.filter(item => item.model_brand === kind)
    setFilteredList(filtered)
  }, [kind, list])

  const fetchData = useCallback(async () => {
    try {
      const res = await getModelListNew({
        url: '/mh/list',
        body: {
          page: '1',
          page_size: '9999',
          model_type: 'online',
          model_kind: '',
          status: '',
          search_tags: [],
          search_name: '',
        },
      }) as ModelListResponse

      if (res.data) {
        // 根据res.data中的model_brand字段，将数据进行分类
        const brandList = res.data.map(item => item.model_brand)
        const uniqueBrandList = [...new Set(brandList)]
        setBrandList(uniqueBrandList)
        setList(res.data)
      }
    }
    catch (error) {
      console.error('获取模型列表失败:', error)
    }
  }, [])

  // 组件挂载时加载数据
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 获取模型详情
  const fetchModelDetail = async (id: string) => {
    try {
      const res = await getModelInfo({
        url: `mh/model_info/${id}`,
        options: {
          params: {
            qtype: 'already',
            // namespace: 'public',
          },
        },
      })
      if (res) {
        setExpandedRowDetails(prev => ({
          ...prev,
          [id]: res,
        }))
      }
    }
    catch (error) {
      console.error('获取模型详情失败:', error)
    }
  }
  // 删除
  const preventDefault = (e: React.MouseEvent<HTMLElement>, model_id: string, model_key: string) => {
    e.preventDefault()
    setCurrentModelId(model_id)
    setModelKey(model_key)
    setIsModalOpen(true)
  }

  const handleOk = async () => {
    if (currentModelId) {
      const res = await deleteModelList({
        model_id: currentModelId,
        model_keys: [modelKey],
      })
      if (res.success) {
        // 成功提醒
        message.success(res.message)
        // 刷新列表数据
        await fetchData()
        if (expandedRowDetails[currentModelId])
          await fetchModelDetail(currentModelId)
      }
      else { message.error(res.message) }
    }
    setIsModalOpen(false)
  }

  const handleCancel = () => {
    setIsModalOpen(false)
  }
  // 表格列定义
  const columns: ColumnsType<ModelItemType> = [
    {
      title: '模型类型',
      dataIndex: 'model_kind_display',
      key: 'model_kind',
      render: (text: string) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'model_status',
      key: 'model_status',
      render: (status: string) => {
        const statusMap: Record<string, string> = {
          1: 'key未验证',
          2: 'key验证中',
          3: 'key验证通过',
          4: 'key验证失败',
        }
        return statusMap[status] || '未知'
      },
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
    },
  ]
  // 新增按钮
  const startModel = (modelId?: string) => {
    setCreateModalVisible(true)
    setCurrentModelId(modelId)
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card title="云服务模型管理" style={{ marginBottom: '24px', position: 'relative' }}>
        {/* <Button type='primary' style={{ marginRight: '10px', position: 'absolute', right: '10px', top: '10px' }} >新增</Button> */}
        <Form.Item label="厂商名字">
          <Radio.Group
            style={{ marginLeft: 30 }}
            value={kind}
            onChange={onKindChange}
          >
            {brandList.map(item => (
              <Radio.Button
                key={item}
                value={item}
                style={{ marginRight: 10, borderRadius: 4 }}
              >
                {item}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>

      </Card>

      <Card title={`${kind} 模型列表`} extra={<Button type="link" onClick={() => {
        setEditModelVisible(true)
      }}>key</Button>}>
        <Table
          showHeader={false}
          columns={columns}
          dataSource={filteredList}
          rowKey="id"
          locale={{ emptyText: '暂无数据' }}
          expandable={{
            expandedRowRender: (record: ModelItemType) => {
              const detail = expandedRowDetails[record.id]
              if (!detail) {
                // 如果还没有详情数据，触发获取
                fetchModelDetail(record.id)
                return <div className="py-4 text-center">加载中...</div>
              }
              return (
                <div className="px-4 py-2">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="flex items-center">
                      <span className="text-gray-600 w-24">模型类别：</span>
                      <span>{detail.model_kind_display || '-'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-600 w-24">厂商名字：</span>
                      <span>{detail.model_brand || '-'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-600 w-24">创建人：</span>
                      <span>{detail.user_name || '-'}</span>
                      <Button
                        type="primary"
                        size="small"
                        style={{ position: 'absolute', right: 50 }}
                        onClick={() => startModel(record.id)}
                      >
                        新增
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-start mt-4">
                    <span className="text-gray-600 w-24">模型清单：</span>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {detail.model_list?.length
                        ? (
                          detail.model_list.map(item => (
                            <Tag
                              key={item.model_key}
                              color="blue"
                              closeIcon
                              onClose={e => preventDefault(e, record.id, item.model_key)}
                            >
                              {item.model_key}
                            </Tag>
                          ))
                        )
                        : (
                          <span className="text-gray-400">暂无数据</span>
                        )}
                    </div>
                  </div>
                </div>
              )
            },
            onExpand: (expanded, record) => {
              if (expanded && !expandedRowDetails[record.id])
                fetchModelDetail(record.id)
            },
            expandedRowClassName: () => 'bg-gray-50',
          }}
          scroll={{ x: 800 }}
        />
      </Card>
      <EditModel
        visible={editModelVisible}
        onClose={() => setEditModelVisible(false)}
        data={item}
        kind={kind}
        onSuccess={() => {
          setEditModelVisible(false)
          fetchData()
        }}
        onCancel={() => setEditModelVisible(false)}
      />
      <CreateModal
        visible={createModalVisible}
        onClose={() => {
          setCreateModalVisible(false)
          setCurrentModelId(undefined)
        }}
        modelType={modelType}
        modelId={currentModelId}
        onSuccess={async () => {
          setCreateModalVisible(false)
          setCurrentModelId(undefined)
          await fetchData()
          if (currentModelId)
            await fetchModelDetail(currentModelId)
        }} />
      <Modal
        title="模型清单"
        closable={{ 'aria-label': 'Custom Close Button' }}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <p>删除不可逆，请确认</p>

      </Modal>

    </div>
  )
}
export default CloudService
