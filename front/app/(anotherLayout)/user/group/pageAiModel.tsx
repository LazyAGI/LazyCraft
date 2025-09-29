'use client'

import React, { useEffect, useState } from 'react'
import { Modal, Select, Table, message } from 'antd'
import PageAiCascader from './pageAiCascader'
import { getModelInfo, getModelListNew } from '@/infrastructure/api/modelWarehouse'
import { getAdjustList } from '@/infrastructure/api/prompt'
type ModelItemType = {
  id: string
  model_type: string
  model_name: string
  model_kind: string
  api_key: string
}

type ModelListItem = {
  id: string
  model_id: string
  model_key: string
  model_name: string
  can_finetune: boolean
  created_at: string
  updated_at: string
  finetune_task_id: number
  parent_id: string
  source_info: string
}

type ModelInfoResponse = {
  model_list: ModelListItem[]
}

const dataSource = [
  {
    key: '1',
    index: 1,
    capability: 'Prompt智能生成',
    content: '基于用户场景自动生成高质量Prompt，支持画布内调用。',
    service: '',
    modelName: '',
  },
  {
    key: '2',
    index: 2,
    capability: '代码智能生成',
    content: '智能生成功能代码，支持自动提取输入输出参数。',
    service: '',
    modelName: '',
  },
]

type AiModelProps = {
  open: boolean
  onCancel: () => void
  onOk: (data: any) => void
  currentRecord: any
}

type CascaderOptionType = {
  value: string
  label: string
  id?: string
  isLeaf?: boolean
  children?: CascaderOptionType[]
}

const AiModel: React.FC<AiModelProps> = ({ open, onCancel, onOk, currentRecord }) => {
  const [selectedServices, setSelectedServices] = useState<Record<string, string>>({})
  const [selectedModels, setSelectedModels] = useState<Record<string, string[]>>({})
  const [cascaderOptions, setCascaderOptions] = useState<CascaderOptionType[]>([])
  const [cloudServiceOptions, setCloudServiceOptions] = useState<CascaderOptionType[]>([])
  const [platformServiceOptions, setPlatformServiceOptions] = useState<CascaderOptionType[]>([])
  const [modelData, setModelData] = useState<ModelItemType[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false)
  const workspaceId = currentRecord?.id
  // 云服务
  const fetchData = async () => {
    if (isLoadingModels)
      return // 防止重复请求

    setIsLoadingModels(true)
    try {
      const res: any = await getModelListNew({
        url: '/mh/list',
        body: {
          page: '1',
          page_size: '9999',
          model_type: 'online',
          model_kind: 'OnlineLLM',
          status: '',
          search_tags: [],
          search_name: '',
          tenant: workspaceId,
        },
      })

      if (res.data) {
        const modelData = res.data as ModelItemType[]
        setModelData(modelData)
        const filteredModelData = modelData.filter(model =>
          model.model_type === 'online'
          && model.model_kind === 'OnlineLLM'
          && model.api_key
          && model.api_key.trim() !== '',
        )
        const options = filteredModelData.map(model => ({
          value: model.model_name,
          label: model.model_name,
          children: [],
          isLeaf: false,
        }))
        setCloudServiceOptions(options)
      }
    }
    catch (error) {
      console.error('获取模型列表失败:', error)
    }
    finally {
      setIsLoadingModels(false)
    }
  }
  // 平台服务
  const fetchPlatformData = async () => {
    const url = '/infer-service/list'
    const param: any = {
      page: 1,
      per_page: 9999,
      user_id: [],
      tenant: workspaceId,
    }
    try {
      const res: any = await getAdjustList({
        url,
        body: param,
      })

      // 处理平台服务数据 - 数据在 res.result.result 中
      if (res?.result?.result && Array.isArray(res.result.result)) {
        const filteredResult = res.result.result.filter((item: any) => item.online_count > 0)
        const options = filteredResult.map((item: any, index: number) => {
          const option = {
            value: item.id ? `${item.id}` : `service_${index}`,
            label: item.name || item.model_name || `服务${item.id || index}`,
            children: (item.services && Array.isArray(item.services))
              ? item.services.map((service: any, serviceIndex: number) => ({
                label: service.name || service.model_name || service.id || `Unknown Service ${serviceIndex}`,
                value: service.id ? `${service.id}` : `${item.id || index}_service_${serviceIndex}`,
              }))
              : [],
            isLeaf: false,
          }
          return option
        })

        setPlatformServiceOptions(options)
      }
    }
    catch (error) {
      console.error('获取平台服务列表失败:', error)
    }
  }
  // 处理级联选择加载数据
  const loadData = async (selectedOptions: any[]) => {
    const targetOption = selectedOptions[selectedOptions.length - 1]

    targetOption.loading = true

    try {
      const selectedModel = modelData.find(model => model.model_name === targetOption.value)
      if (selectedModel?.id) {
        const modelInfoRes = await getModelInfo({
          url: `mh/model_info/${selectedModel.id}`,
          options: {
            params: {
              qtype: 'already',
            },
          },
        })

        if ((modelInfoRes as unknown as ModelInfoResponse)?.model_list) {
          targetOption.children = (modelInfoRes as unknown as ModelInfoResponse).model_list.map((item: ModelListItem) => ({
            label: item.model_key,
            value: item.model_key,
          }))
        }
      }
    }
    catch (error) {
      console.error('获取二级列表失败:', error)
    }
    finally {
      targetOption.loading = false
      setCloudServiceOptions([...cloudServiceOptions])
    }
  }

  // 清空所有选择的数据
  const resetData = () => {
    setSelectedServices({})
    setSelectedModels({})
    setCascaderOptions([])
    setCloudServiceOptions([])
    setPlatformServiceOptions([])
    setModelData([])
  }

  // 处理取消
  const handleCancel = () => {
    resetData()
    onCancel()
  }

  useEffect(() => {
    if (!open)
      resetData()
  }, [open])

  // 处理服务类型选择
  const handleServiceSelect = (value: string, record: any) => {
    setSelectedServices(prev => ({
      ...prev,
      [record.key]: value,
    }))
    // 清除对应的模型选择
    setSelectedModels(prev => ({
      ...prev,
      [record.key]: [],
    }))

    // 根据服务类型获取对应的数据
    if (value === '云服务' && cloudServiceOptions.length === 0)
      fetchData()
    if (value === '平台服务' && platformServiceOptions.length === 0)
      fetchPlatformData()
  }

  // 处理模型选择
  const handleModelSelect = (value: string[], record: any) => {
    setSelectedModels(prev => ({
      ...prev,
      [record.key]: value,
    }))
  }

  const handleOk = () => {
    // 检查是否所有必填项都已选择
    const data = dataSource.map((item) => {
      const serviceType = selectedServices[item.key]
      const selectedValues = selectedModels[item.key]
      let modelName = ''

      if (selectedValues?.[0] && selectedValues?.[1]) {
        if (serviceType === '云服务') {
          modelName = selectedModels[item.key]?.[1] || ''
        }
        else if (serviceType === '平台服务') {
          // 平台服务需要从 options 中找到对应的 label 值
          const firstLevelOption = platformServiceOptions.find(opt => opt.value === selectedValues[0])
          const secondLevelOption = firstLevelOption?.children?.find(child => child.value === selectedValues[1])

          if (firstLevelOption && secondLevelOption)
            modelName = `${firstLevelOption.label}:${secondLevelOption.label}`
        }
      }

      return {
        id: item.index,
        name: item.capability,
        content: item.content,
        inferservice: serviceType === '云服务' ? 'online' : 'local',
        model_name: modelName,
      }
    })

    // 验证数据
    const isValid = data.every(item =>
      item.inferservice
      && item.model_name,
    )
    if (!isValid) {
      message.warning('请为每个AI能力选择推理服务和具体模型')
      return
    }

    onOk(data)
  }

  const columns = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: 80,
    },
    {
      title: 'AI能力',
      dataIndex: 'capability',
      key: 'capability',
      width: 180,
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      width: 300,
    },
    {
      title: '推理服务',
      dataIndex: 'service',
      key: 'service',
      width: 150,
      render: (_, record) => (
        <Select
          value={selectedServices[record.key] || undefined}
          onChange={value => handleServiceSelect(value, record)}
          options={[
            { value: '云服务', label: '云服务' },
            { value: '平台服务', label: '平台服务' },
          ]}
          style={{ width: '100%' }}
          placeholder="选择服务"
          size="small"
        />
      ),
    },
    {
      title: '模型名称',
      dataIndex: 'modelName',
      key: 'modelName',
      width: 250,
      render: (_, record) => {
        const serviceType = selectedServices[record.key]
        let options: CascaderOptionType[] = []
        if (serviceType === '云服务')
          options = cloudServiceOptions
        else if (serviceType === '平台服务')
          options = platformServiceOptions

        return (
          <PageAiCascader
            cascaderOptions={options}
            selectedModels={selectedModels}
            handleModelSelect={handleModelSelect}
            loadData={loadData}
            record={{ ...record, serviceType }}
          />
        )
      },
    },
  ]

  return (
    <Modal
      title="AI能力管理"
      open={open}
      onCancel={handleCancel}
      width={1000}
      onOk={handleOk}
      okText="确定"
      cancelText="取消"
    >
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        bordered
      />
    </Modal>
  )
}

export default AiModel
