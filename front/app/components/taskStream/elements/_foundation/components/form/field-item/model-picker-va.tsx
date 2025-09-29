'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import { Button, InputNumber, Modal, Slider } from 'antd'
import classNames from 'classnames'
import type { FieldItemProps } from '../types'
import Field from '../field-unit'
import { Select } from '@/app/components/taskStream/elements/_foundation/components/form/base'
import { post } from '@/infrastructure/api/base'
import Icon from '@/app/components/base/iconFont'

// 定义VQA模型数据结构
type VqaModel = {
  id: string
  model_name: string
  model_type: string
  model_kind: string
  download_message: string
  model_path: string
  model_from: string
  model_status: string
}

// 定义模型配置参数
type ModelConfigType = {
  temperature: number
  top_p: number
  max_tokens: number
}

const FieldItem: FC<Partial<FieldItemProps>> = ({
  disabled,
  readOnly,
  onChange,
  nodeId,
  nodeData,
  resourceData,
  allowClear,
  placeholder = '请选择VQA模型',
  label = '模型',
  name = 'payload__base_model',
  required = true,
  tooltip = '选择用于图文理解的VQA模型',
}) => {
  const inputs = nodeData || resourceData || {}
  const [vqaModelList, setVqaModelList] = useState<VqaModel[]>([])
  const [loadingModels, setLoadingModels] = useState<boolean>(false)
  const [isConfigModalVisible, setIsConfigModalVisible] = useState<boolean>(false)
  const fetchApiCalled = useRef<boolean>(false)

  // 模型配置参数状态
  const [modelConfig, setModelConfig] = useState<ModelConfigType>({
    temperature: inputs?.payload__model_generate_control?.payload__temperature || 0.8,
    top_p: inputs?.payload__model_generate_control?.payload__top_p || 0.7,
    max_tokens: inputs?.payload__model_generate_control?.payload__max_tokens || 4096,
  })

  useEffect(() => {
    if (!fetchApiCalled.current) {
      fetchApiCalled.current = true

      setLoadingModels(true)

      // 使用POST请求获取VQA模型列表
      post('/mh/list', {
        body: {
          page: '1',
          page_size: '9999',
          model_type: 'local',
          model_kind: 'VQA',
        },
      }).then((result: any) => {
        if (result?.data) {
          // 过滤出符合条件的VQA模型
          const filteredModels = result.data.filter((model: VqaModel) =>
            model.model_kind === 'VQA'
            && model.download_message === 'Download successful',
          )
          setVqaModelList(filteredModels)
        }
      })
        .catch((error) => {
          console.error('获取VQA模型列表失败:', error)
          setVqaModelList([])
        })
        .finally(() => {
          setLoadingModels(false)
        })
    }
  }, [])

  const handleConfigClick = () => {
    setIsConfigModalVisible(true)
  }

  const handleConfigSave = () => {
    // 保存配置参数
    onChange && onChange({
      payload__model_generate_control: {
        payload__temperature: modelConfig.temperature,
        payload__top_p: modelConfig.top_p,
        payload__max_tokens: modelConfig.max_tokens,
      },
    })
    setIsConfigModalVisible(false)
  }

  const handleConfigCancel = () => {
    // 重置为原始值
    setModelConfig({
      temperature: inputs?.payload__model_generate_control?.payload__temperature || 0.8,
      top_p: inputs?.payload__model_generate_control?.payload__top_p || 0.7,
      max_tokens: inputs?.payload__model_generate_control?.payload__max_tokens || 4096,
    })
    setIsConfigModalVisible(false)
  }

  return (
    <div className='space-y-3'>
      <Field
        label={null}
        name={name}
        value={inputs?.[name]}
        className={classNames(
          'text-text-secondary',
        )}
        required={required}
        type="select"
        nodeId={nodeId}
        nodeData={nodeData}
        tooltip={tooltip}
      >
        <div className="flex items-center">
          <Select
            className={classNames('flex-1')}
            allowClear={allowClear}
            disabled={disabled}
            readOnly={readOnly}
            loading={loadingModels}
            value={inputs?.[name]}
            onChange={(_value) => {
              const selectedModel = vqaModelList?.find((model: VqaModel) => model.id === _value)
              onChange && onChange({
                [name]: _value,
                [`${name}_name`]: selectedModel?.model_name,
                [`${name}_info`]: selectedModel,
              })
            }}
            placeholder={placeholder}
            showSearch
            filterOption={(input, option) => {
              const label = option?.label || ''
              return typeof label === 'string' && label.toLowerCase().includes(input.toLowerCase())
            }}
            notFoundContent={loadingModels ? '加载中...' : '暂无可用的VQA模型'}
            options={vqaModelList?.map((model: VqaModel) => {
              const option = {
                label: model.model_name,
                value: model.id,
                data: model,
              }
              return option
            }) || []}
            optionRender={(option: any) => {
              return (
                <div className="vqa-model-option">
                  <div className="model-name font-medium text-gray-900">
                    {option.data?.model_name || option.label || '未知模型'}
                  </div>
                  <div className="model-info text-xs text-gray-500 mt-1">
                    <span className="ml-2 text-green-600">● 已下载</span>
                  </div>
                </div>
              )
            }}
          />
          <Button
            type='link'
            size='small'
            onClick={handleConfigClick}
            className="ml-2"
            disabled={disabled || readOnly}
          >
            {/* 鼠标移入的时候颜色变钱一些 */}
            <Icon type="icon-shezhi" style={{ fontSize: '22px', color: '#262626', cursor: 'pointer' }} />
          </Button>
        </div>
      </Field>

      {/* 模型配置模态框 */}
      <Modal
        title="模型设置"
        open={isConfigModalVisible}
        onOk={handleConfigSave}
        onCancel={handleConfigCancel}
        okText="确定"
        cancelText="取消"
        width={500}
        className="vqa-model-config-modal"
      >
        <div className="space-y-6 py-4">
          {/* Temperature 配置 */}
          <div className="config-item">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Temperature</label>
              <InputNumber
                min={0}
                max={2}
                step={0.1}
                value={modelConfig.temperature}
                onChange={value => setModelConfig(prev => ({ ...prev, temperature: value || 0.7 }))}
                className="w-20"
                size="small"
              />
            </div>
            <Slider
              min={0}
              max={1}
              step={0.1}
              value={modelConfig.temperature}
              onChange={value => setModelConfig(prev => ({ ...prev, temperature: value }))}
              tooltip={{ formatter: value => `${value}` }}
            />
            <div className="text-xs text-gray-500 mt-1">
              控制输出的随机性，值越高输出越随机
            </div>
          </div>

          {/* Top P 配置 */}
          <div className="config-item">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Top P</label>
              <InputNumber
                min={0}
                max={1}
                step={0.1}
                value={modelConfig.top_p}
                onChange={value => setModelConfig(prev => ({ ...prev, top_p: value || 0.9 }))}
                className="w-20"
                size="small"
              />
            </div>
            <Slider
              min={0}
              max={1}
              step={0.1}
              value={modelConfig.top_p}
              onChange={value => setModelConfig(prev => ({ ...prev, top_p: value }))}
              tooltip={{ formatter: value => `${value}` }}
            />
            <div className="text-xs text-gray-500 mt-1">
              控制词汇选择的多样性，值越高选择越多样
            </div>
          </div>

          {/* Max Output Token 配置 */}
          <div className="config-item">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Max Output Token</label>
              <InputNumber
                min={1}
                max={8192}
                step={1}
                value={modelConfig.max_tokens}
                onChange={value => setModelConfig(prev => ({ ...prev, max_tokens: value || 2048 }))}
                className="w-24"
                size="small"
              />
            </div>
            <Slider
              min={1}
              max={8192}
              step={1}
              value={modelConfig.max_tokens}
              onChange={value => setModelConfig(prev => ({ ...prev, max_tokens: value }))}
              tooltip={{ formatter: value => `${value}` }}
            />
            <div className="text-xs text-gray-500 mt-1">
              控制输出文本的最大长度
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default React.memo(FieldItem)
