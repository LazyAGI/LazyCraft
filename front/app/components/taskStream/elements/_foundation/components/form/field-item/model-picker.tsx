'use client'
import type { FC } from 'react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Input, Modal, Slider, Switch } from 'antd'
import classNames from 'classnames'
import type { FieldItemProps } from '../types'
import Field from '../field-unit'
import { Select } from '@/app/components/taskStream/elements/_foundation/components/form/base'
import { post } from '@/infrastructure/api//base'
import Icon from '@/app/components/base/iconFont'

// 定义TTS模型数据结构
type TtsModel = {
  id: string
  model_name: string
  model_type: string
  model_kind: string
  download_message: string
  model_path: string
  model_from: string
  model_status: string
}

// 定义TTS模型配置参数
type TtsModelConfig = {
  // 情感控制
  speed: number
  temperature: number

  // 文本控制
  oral: number
  laugh: number
  pause: number

  // 音色控制
  voice_seed: number
  // random_voice: boolean
}

const FieldItem: FC<Partial<FieldItemProps>> = ({
  disabled,
  readOnly,
  onChange,
  nodeId,
  nodeData,
  resourceData,
  allowClear,
  placeholder = '请选择TTS模型',
  label = '模型',
  name = 'payload__base_model',
  required = true,
  tooltip = '选择用于语音合成的TTS模型',
}) => {
  const inputs = nodeData || resourceData || {}
  const [ttsModelList, setTtsModelList] = useState<TtsModel[]>([])
  const [loadingModels, setLoadingModels] = useState<boolean>(false)
  const [isConfigModalVisible, setIsConfigModalVisible] = useState<boolean>(false)
  const fetchApiCalled = useRef<boolean>(false)

  // TTS模型配置参数状态
  const [ttsModelConfig, setTtsModelConfig] = useState<TtsModelConfig>({
    // 情感控制
    speed: inputs?.payload__model_generate_control?.payload__speed || 1.0,
    temperature: inputs?.payload__model_generate_control?.payload__temperature || 0.3,

    // 文本控制
    oral: inputs?.payload__model_generate_control?.payload__oral || 2,
    laugh: inputs?.payload__model_generate_control?.payload__laugh || 0,
    pause: inputs?.payload__model_generate_control?.payload__pause || 4,

    // 音色控制
    voice_seed: inputs?.payload__model_generate_control?.payload__voice_seed || 666,
    // random_voice: inputs?.payload__model_generate_control?.payload__random_voice || false,
  })

  useEffect(() => {
    if (!fetchApiCalled.current) {
      fetchApiCalled.current = true

      setLoadingModels(true)

      // 使用POST请求获取TTS模型列表
      post('/mh/list', {
        body: {
          page: '1',
          page_size: '9999',
          model_type: 'local',
          model_kind: 'TTS',
        },
      }).then((result: any) => {
        if (result?.data) {
          // 过滤出符合条件的TTS模型
          const filteredModels = result.data.filter((model: TtsModel) =>
            model.model_kind === 'TTS'
            && model.download_message === 'Download successful',
          )
          setTtsModelList(filteredModels)
        }
      })
        .catch((error) => {
          console.error('获取TTS模型列表失败:', error)
          setTtsModelList([])
        })
        .finally(() => {
          setLoadingModels(false)
        })
    }
  }, [])

  const handleConfigClick = useCallback(() => {
    setIsConfigModalVisible(true)
  }, [])

  const handleConfigSave = useCallback(() => {
    // 保存TTS配置参数
    onChange && onChange({
      payload__model_generate_control: {
        payload__speed: ttsModelConfig.speed,
        payload__temperature: ttsModelConfig.temperature,
        payload__oral: ttsModelConfig.oral,
        payload__laugh: ttsModelConfig.laugh,
        payload__pause: ttsModelConfig.pause,
        payload__voice_seed: ttsModelConfig.voice_seed,
        // payload__random_voice: ttsModelConfig.random_voice,
      },
    })
    setIsConfigModalVisible(false)
  }, [ttsModelConfig, onChange])

  const handleConfigCancel = useCallback(() => {
    // 重置为原始值
    setTtsModelConfig({
      speed: inputs?.payload__model_generate_control?.payload__speed || 1.0,
      temperature: inputs?.payload__model_generate_control?.payload__temperature || 0.3,
      oral: inputs?.payload__model_generate_control?.payload__oral || 2,
      laugh: inputs?.payload__model_generate_control?.payload__laugh || 0,
      pause: inputs?.payload__model_generate_control?.payload__pause || 4,
      voice_seed: inputs?.payload__model_generate_control?.payload__voice_seed || 666,
      // random_voice: inputs?.payload__model_generate_control?.payload__random_voice || false,
    })
    setIsConfigModalVisible(false)
  }, [inputs])

  // 渲染滑块控制组件
  const renderSliderControl = useCallback((
    label: string,
    value: number,
    onChange: (value: number) => void,
    min = 0,
    max = 10,
    step = 0.1,
  ) => (
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm text-gray-700 w-20">{label}</span>
      <div className="flex-1 mx-4">
        <Slider
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          className="w-full"
          trackStyle={{ backgroundColor: '#000' }}
          handleStyle={{ borderColor: '#000', backgroundColor: '#000' }}
        />
      </div>
    </div>
  ), [])

  // 处理音色种子输入变化
  const handleVoiceSeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    // 只允许数字输入或空值
    if (inputValue === '' || /^-?\d+$/.test(inputValue)) {
      const numValue = inputValue === '' ? 666 : parseInt(inputValue, 10)
      setTtsModelConfig(prev => ({ ...prev, voice_seed: numValue }))
    }
  }, [])

  // 处理音色种子失焦
  const handleVoiceSeedBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '')
      setTtsModelConfig(prev => ({ ...prev, voice_seed: 666 }))
  }, [])

  // 处理随机音色开关
  const handleRandomVoiceChange = useCallback((checked: boolean) => {
    setTtsModelConfig(prev => ({
      ...prev,
      voice_seed: checked ? -1 : 666,
    }))
  }, [])

  // 处理模型选择变化
  const handleModelChange = useCallback((_value: string) => {
    const selectedModel = ttsModelList?.find((model: TtsModel) => model.id === _value)
    onChange && onChange({
      [name]: _value,
      [`${name}_name`]: selectedModel?.model_name,
      [`${name}_info`]: selectedModel,
      [`${name}_config`]: ttsModelConfig,
    })
  }, [ttsModelList, name, ttsModelConfig, onChange])

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
            onChange={handleModelChange}
            placeholder={placeholder}
            showSearch
            filterOption={(input, option) => {
              const label = option?.label || ''
              return typeof label === 'string' && label.toLowerCase().includes(input.toLowerCase())
            }}
            notFoundContent={loadingModels ? '加载中...' : '暂无可用的TTS模型'}
            options={ttsModelList?.map((model: TtsModel) => {
              const option = {
                label: model.model_name,
                value: model.id,
                data: model,
              }
              return option
            }) || []}
            optionRender={(option: any) => {
              return (
                <div className="tts-model-option">
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
            <Icon type="icon-shezhi" style={{ fontSize: '22px', color: '#262626', cursor: 'pointer' }} />
          </Button>
        </div>
      </Field>

      {/* TTS模型配置模态框 */}
      <Modal
        title="模型设置"
        open={isConfigModalVisible}
        onOk={handleConfigSave}
        onCancel={handleConfigCancel}
        okText="确定"
        cancelText="取消"
        width={600}
        className="tts-model-config-modal"
      >
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="grid grid-cols-2 gap-8">
            {/* 左侧：情感控制 */}
            <div className="space-y-4">
              <h3 className="text-base font-medium text-gray-900 mb-4">情感控制</h3>

              {renderSliderControl(
                'speed',
                ttsModelConfig.speed,
                value => setTtsModelConfig(prev => ({ ...prev, speed: value })),
                0.5,
                2.0,
                0.1,
              )}

              {renderSliderControl(
                'temperature',
                ttsModelConfig.temperature,
                value => setTtsModelConfig(prev => ({ ...prev, temperature: value })),
                0,
                1,
                0.1,
              )}
            </div>

            {/* 右侧：文本控制 */}
            <div className="space-y-4">
              <h3 className="text-base font-medium text-gray-900 mb-4">文本控制</h3>

              {renderSliderControl(
                '口语化 oral',
                ttsModelConfig.oral,
                value => setTtsModelConfig(prev => ({ ...prev, oral: value })),
                0,
                9,
                1,
              )}

              {renderSliderControl(
                '笑声 laugh',
                ttsModelConfig.laugh,
                value => setTtsModelConfig(prev => ({ ...prev, laugh: value })),
                0,
                2,
                1,
              )}

              {renderSliderControl(
                '停顿 pause',
                ttsModelConfig.pause,
                value => setTtsModelConfig(prev => ({ ...prev, pause: value })),
                0,
                7,
                1,
              )}
            </div>
          </div>

          {/* 音色控制 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-base font-medium text-gray-900 mb-4">音色控制</h3>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">音色种子</span>
                <Input
                  value={ttsModelConfig.voice_seed === -1 ? '' : ttsModelConfig.voice_seed.toString()}
                  onChange={handleVoiceSeedChange}
                  onBlur={handleVoiceSeedBlur}
                  placeholder="输入音色种子"
                  className="w-32"
                  size="small"
                  disabled={ttsModelConfig.voice_seed === -1}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={ttsModelConfig.voice_seed === -1}
                  onChange={handleRandomVoiceChange}
                  size="small"
                />
                <span className="text-sm text-gray-700">随机音色</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default React.memo(FieldItem)
