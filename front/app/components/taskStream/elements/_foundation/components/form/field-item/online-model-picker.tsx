'use client'
import type { FC } from 'react'
import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Button } from 'antd'
import classNames from 'classnames'
import type { FieldItemProps } from '../types'
import Field from '../field-unit'
import { ValueType, flattenTree, formatValueByType, traveTree } from './utils'
import ModelSettingsModal, { type ModelSettings } from './components/model-settings-modal'
import TTSSettingsModal from './components/tts-settings-modal'
import { Cascader, Input, Select } from '@/app/components/taskStream/elements/_foundation/components/form/base'
import { get } from '@/infrastructure/api/base'
import Icon from '@/app/components/base/iconFont'

// 定义modal状态类型
type ModalState = {
  isModalVisible: boolean
  isTTSSettingsModalVisible: boolean
}

// 定义modal action类型
type ModalAction =
  | { type: 'SHOW_MODAL' }
  | { type: 'HIDE_MODAL' }
  | { type: 'SHOW_TTS_MODAL' }
  | { type: 'HIDE_TTS_MODAL' }

// 定义modal reducer函数
const modalReducer = (state: ModalState, action: ModalAction): ModalState => {
  switch (action.type) {
    case 'SHOW_MODAL':
      return { ...state, isModalVisible: true }
    case 'HIDE_MODAL':
      return { ...state, isModalVisible: false }
    case 'SHOW_TTS_MODAL':
      return { ...state, isTTSSettingsModalVisible: true }
    case 'HIDE_TTS_MODAL':
      return { ...state, isTTSSettingsModalVisible: false }
    default:
      return state
  }
}

const FieldItem: FC<Partial<FieldItemProps>> = ({
  disabled,
  readOnly,
  onChange,
  nodeId,
  nodeData,
  resourceData,
  allowClear,
  embedding,
  model_kind,
  is_hidden = false,
}) => {
  const inputs = nodeData || resourceData || {}
  const [originTreeData, setOriginTreeData] = useState<any[]>([])
  const [loadingTreeData, setLoadingTreeData] = useState<boolean>(false)
  const [onlineModelList, setOnlineModelList] = useState<any[]>([])
  const [modelTreeData, setModelTreeData] = useState<any[]>([])
  const fetchApiCalled = useRef<boolean>(false)
  // 定义一个usereducer，用于管理modal的显示状态
  const [modalState, dispatchModalState] = useReducer(modalReducer, {
    isModalVisible: false,
    isTTSSettingsModalVisible: false,
  })

  // 从modalState中解构出状态
  const { isModalVisible, isTTSSettingsModalVisible } = modalState

  // 定义设置modal显示状态的函数
  const setIsModalVisible = (visible: boolean) => {
    dispatchModalState({ type: visible ? 'SHOW_MODAL' : 'HIDE_MODAL' })
  }

  const setIsTTSSettingsModalVisible = (visible: boolean) => {
    dispatchModalState({ type: visible ? 'SHOW_TTS_MODAL' : 'HIDE_TTS_MODAL' })
  }

  useEffect(() => {
    if (!fetchApiCalled.current) {
      fetchApiCalled.current = true

      setLoadingTreeData(true)
      Promise.all([
        get(`/mh/models_tree?model_type=online&model_kind=${embedding ? 'Embedding' : (model_kind || 'OnlineLLM')}&qtype=already`),
        // get('/mh/list?page=1&page_size=999&model_type=online&model_kind=OnlineLLM&qtype=already'),
        Promise.resolve([]),
      ]).then(([res1, res2]: any[]) => {
        const mergedList = mergeList(res2?.data?.filter((item: any) => item?.model_kind === 'OnlineLLM') || [], res1 || [])

        const currentTreeData = traveTree(mergedList || [], (item: any, parent) => {
          item.children = item?.child?.length ? item.child : undefined
          const isRoot = !parent && item.children?.length // 根节点
          item.value = item.children?.length
            ? `parent__${item?.model_brand}_${item?.id}`
            : item?.model_key
          item.keys = isRoot ? [] : (parent?.keys || []).concat(item?.value)
          item.model_brand = item.model_brand || parent?.model_brand
          item.model_url = item.model_url || parent?.model_url
          item.model_key = item.model_key || parent?.model_key

          return {
            label: (item?.can_finetune && !item?.children?.length)
              ? `${item?.model_key || item?.model_name}（支持微调）`
              : (item?.model_key || item?.model_name),
            value: item?.value,
            children: item.children,
            keys: item.keys,
            model_brand: item.model_brand,
            model_name: item.model_name,
            model_key: item.model_key,
            model_url: item.model_url,
            id: item.id,
            can_finetune: item.can_finetune,
          }
        })
        setOriginTreeData(currentTreeData || [])

        const currentModelList = flattenTree(currentTreeData || [])
        setOnlineModelList(currentModelList || [])

        const currentValue = formatValueByType(inputs.payload__base_model, ValueType.String)
        if (currentValue) {
          const matchedKeys = currentModelList?.find(child => child.value === currentValue)?.keys || []
          if (!inputs?.payload__base_model_selected_keys?.length
            || !inputs?.payload__base_model_id
            || typeof inputs?.payload__can_finetune === 'undefined'
            || JSON.stringify(inputs?.payload__base_model_selected_keys) !== JSON.stringify(matchedKeys)
          ) {
            onChange && onChange({
              payload__base_model_selected_keys: matchedKeys,
              payload__base_model_id: currentModelList?.find(child => child.value === currentValue)?.id,
              payload__can_finetune: currentModelList?.find(child => child.value === currentValue)?.can_finetune,
            })
          }
        }
      }).finally(() => {
        setLoadingTreeData(false)
      })
    }
  }, [])

  useEffect(() => {
    try {
      const currentModelTree = originTreeData?.find((item: any) => item?.id === inputs?.payload__source_id || item?.id === inputs?.embed?.payload__source_id || item?.id === inputs?.llm?.payload__source_id)?.children || []

      setModelTreeData(
        currentModelTree || [],
      )
    }
    catch (error) {
      setModelTreeData([])
    }
  }, [inputs?.payload__source_id, originTreeData])

  // 处理设置保存
  const handleSettingsSave = (settings: ModelSettings) => {
    onChange && onChange({
      payload__model_generate_control: {
        payload__temperature: settings.temperature,
        payload__top_p: settings.top_p,
        payload__max_tokens: settings.max_tokens,
      },
    })
    setIsModalVisible(false)
  }

  // 处理设置取消
  const handleSettingsCancel = () => {
    setIsModalVisible(false)
  }

  // 处理TTS设置保存
  const handleTTSSettingsSave = (settings: any) => {
    onChange && onChange({
      payload__tts_settings: settings,
    })
    setIsTTSSettingsModalVisible(false)
  }

  // 处理TTS设置取消
  const handleTTSSettingsCancel = () => {
    setIsTTSSettingsModalVisible(false)
  }

  function mergeList(list1: any[], list2: any[]): any[] {
    const result = [...list2]
    list1.forEach((item: any) => {
      if (!list2.find(child => child.id === item?.id)) {
        result.push({
          id: item?.id,
          model_name: item?.model_name,
          model_key: item?.model_key,
          model_brand: item?.model_brand,
          model_url: item?.model_url,
          can_finetune: true,
          can_select: false,
          child: item?.model_list?.map((_child: any) => ({
            id: item?.id,
            model_name: _child?.model_name,
            model_key: _child?.model_key,
            can_finetune: _child?.is_finetune_model,
            can_select: true,
          })),
        })
      }
    })
    return result
  }

  // 使用 useMemo 缓存 initialSettings 对象，避免无限循环
  const modelSettingsInitialSettings = useMemo(() => ({
    temperature: inputs?.payload__model_generate_control?.payload__temperature,
    top_p: inputs?.payload__model_generate_control?.payload__top_p,
    max_tokens: inputs?.payload__model_generate_control?.payload__max_tokens,
  }), [
    inputs?.payload__model_generate_control?.payload__temperature,
    inputs?.payload__model_generate_control?.payload__top_p,
    inputs?.payload__model_generate_control?.payload__max_tokens,
  ])

  const ttsSettingsInitialSettings = useMemo(() => ({
    speed: inputs?.payload__tts_settings?.speed || 50,
    temperature: inputs?.payload__tts_settings?.temperature || 50,
    oral: inputs?.payload__tts_settings?.oral || false,
    laugh: inputs?.payload__tts_settings?.laugh || false,
    pause: inputs?.payload__tts_settings?.pause || 50,
    tone: inputs?.payload__tts_settings?.tone || '666',
    randomTone: inputs?.payload__tts_settings?.randomTone || false,
  }), [
    inputs?.payload__tts_settings?.speed,
    inputs?.payload__tts_settings?.temperature,
    inputs?.payload__tts_settings?.oral,
    inputs?.payload__tts_settings?.laugh,
    inputs?.payload__tts_settings?.pause,
    inputs?.payload__tts_settings?.tone,
    inputs?.payload__tts_settings?.randomTone,
  ])

  return (
    <>
      <div className='space-y-3'>
        <Field
          label="服务提供商"
          name="payload__source"
          value={inputs?.payload__source}
          className={classNames(
            'text-text-secondary', // system-sm-semibold-uppercase
          )}
          required
          type="select"
          nodeId={nodeId}
          nodeData={nodeData}
          tooltip="主流在线大模型提供商"
        >
          <Select
            className={classNames('w-full')}
            allowClear
            disabled={disabled}
            readOnly={readOnly}
            value={inputs?.payload__source}
            onChange={(_value) => {
              const targetItem = onlineModelList?.find((item: any) => `${item?.id}___${item?.model_brand}` === _value)
              const targetModelUrl = targetItem?.model_url
              const targetId = targetItem?.id
              onChange && onChange({
                ...inputs,
                payload__source: targetItem?.model_brand,
                payload__base_url: formatValueByType(targetModelUrl, ValueType.String),
                payload__source_id: formatValueByType(targetId, ValueType.String),
                payload__base_model_selected_keys: undefined,
                payload__base_model: undefined,
                payload__can_finetune: undefined,
              })
            }}
            placeholder="请选择服务提供商"
            options={originTreeData?.map((item: any) => ({
              label: item?.model_brand,
              value: `${item?.id}___${item?.model_brand}`,
            })) || []}
          />
        </Field>
      </div>

      <div className='m-b-[24px] relative'>
        {/* 模型名 */}
        <div className='relative'>
          <Field
            label="模型名"
            name="payload__base_model_selected_keys"
            value={inputs?.payload__base_model_selected_keys}
            className={classNames(
              'text-text-secondary', // system-sm-semibold-uppercase
            )}
            required
            nodeId={nodeId}
            nodeData={nodeData}
            tooltip="选择大语言模型"
          >
            <div className="flex items-center">
              <Cascader
                placeholder={(!inputs?.payload__source || !inputs?.llm?.payload__source || !inputs?.embed)
                  ? '请先选择服务提供商'
                  : '请选择模型（API-KEY已配置模型可正常使用）'}
                allowClear={allowClear}
                loading={loadingTreeData}
                showSearch
                disabled={disabled}
                readOnly={readOnly}
                options={modelTreeData || []}
                placement='bottomLeft'
                expandTrigger="click"
                value={inputs?.payload__base_model_selected_keys}
                onChange={(val) => {
                  onChange && onChange({
                    ...inputs,
                    payload__base_model: val?.[val?.length - 1],
                    payload__model_id: onlineModelList?.find((item: any) => item?.model_key === val?.[val?.length - 1])?.id,
                    payload__base_model_selected_keys: val,
                    payload__url: onlineModelList?.find(child => child.value === val?.[val?.length - 1])?.model_url,
                    payload__can_finetune: onlineModelList?.find(child => child.value === val?.[val?.length - 1])?.can_finetune,
                    payload__model_generate_control: {
                      payload__temperature: 0.8,
                      payload__top_p: 0.7,
                      payload__max_tokens: 4096,
                    },
                  })
                }}
                className="flex-1"
              />
              {
                // (model_kind === 'OnlineLLM' || model_kind === 'TTS')
                (model_kind === 'OnlineLLM')
                && <Button
                  type='link'
                  size='small'
                  onClick={() => {
                    if (model_kind === 'OnlineLLM')
                      setIsModalVisible(true)
                    else if (model_kind === 'TTS')
                      setIsTTSSettingsModalVisible(true)
                  }}
                  className={classNames('ml-2', is_hidden ? 'hidden' : 'block')}
                  style={{ display: is_hidden ? 'none' : 'block' }}
                >
                  {/* 使用图标 */}
                  <Icon type="icon-shezhi" style={{ fontSize: '22px', color: '#262626', cursor: 'pointer', display: is_hidden ? 'none' : 'block' }} />
                </Button>
              }
            </div>
          </Field>
        </div>
      </div>

      {
        inputs?.payload__source === 'openai' && model_kind === 'OnlineLLM' && (
          <div className='space-y-3'>
            <Field
              label="URL"
              name="payload__base_url"
              value={inputs?.payload__base_url}
              className={classNames(
                'text-text-secondary', // system-sm-semibold-uppercase
              )}
            >
              <Input
                className={classNames('w-full')}
                readOnly
                disabled={disabled || !inputs?.payload__base_url}
                value={inputs?.payload__base_url}
                onChange={(val) => {
                  onChange && onChange({
                    payload__base_url: val,
                  })
                }}
                placeholder=""
              />
            </Field>
          </div>
        )
      }

      {/* 模型设置弹层 */}
      <ModelSettingsModal
        visible={isModalVisible}
        onOk={handleSettingsSave}
        onCancel={handleSettingsCancel}
        initialSettings={modelSettingsInitialSettings}
        readOnly={readOnly}
        title="模型设置"
      />
      <ModelSettingsModal
        visible={isTTSSettingsModalVisible}
        onOk={handleTTSSettingsSave}
        onCancel={handleTTSSettingsCancel}
        type="custom"
        readOnly={readOnly}
        title="TTS模型设置"
        initialSettings={ttsSettingsInitialSettings}
      >
        <TTSSettingsModal
          initialSettings={ttsSettingsInitialSettings}
          onChange={(settings) => {
            // 这里可以处理TTS设置的实时更新
            onChange && onChange({
              payload__tts_settings: settings,
            })
          }}
          readOnly={readOnly}
        />
      </ModelSettingsModal>
    </>
  )
}

export default React.memo(FieldItem)
