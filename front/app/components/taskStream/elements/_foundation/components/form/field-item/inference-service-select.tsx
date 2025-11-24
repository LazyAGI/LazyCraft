'use client'
import type { FC } from 'react'
import React, { useEffect, useState } from 'react'
import { Button } from 'antd'
import classNames from 'classnames'
import type { FieldItemProps } from '../types'
import { ValueType, flattenTree, formatValueByType, traveTree } from './utils'
import ModelSettingsModal, { type ModelSettings } from './components/model-settings-modal'
import { Cascader } from '@/app/components/taskStream/elements/_foundation/components/form/base'
import { get } from '@/infrastructure/api/base'
import Icon from '@/app/components/base/iconFont'

const FieldItem: FC<Partial<FieldItemProps>> = ({
  disabled,
  readOnly,
  onChange,
  nodeData,
  resourceData,
  itemProps,
}) => {
  // 兼容旧节点：支持 model_type 和 model_kind 两种字段名
  const model_kind = (itemProps as Record<string, string>)?.model_kind || (itemProps as Record<string, string>)?.model_type
  const model_show_type = (itemProps as Record<string, string>)?.model_show_type || (itemProps as Record<string, string>)?.model_type
  const inputs = nodeData.llm || nodeData || resourceData || {}
  const [originTreeData, setOriginTreeData] = useState<any[]>([])
  const [flattenedTreeData, setFlattenedTreeData] = useState<any[]>([])
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false)
  const [isFetching, setIsFetching] = useState<boolean>(false)
  const lastFetchedModelKind = React.useRef<string | undefined>(undefined)

  useEffect(() => {
    // 只有当 model_kind 存在且模型来源是 inference_service 时才发起请求
    if (!model_kind) {
      setOriginTreeData([])
      setFlattenedTreeData([])
      lastFetchedModelKind.current = undefined
      return
    }

    // 检查是否是平台推理服务
    const isInferenceService = inputs.payload__model_source === 'inference_service'
    if (!isInferenceService) {
      setOriginTreeData([])
      setFlattenedTreeData([])
      lastFetchedModelKind.current = undefined
      return
    }

    // 防止重复请求：如果正在请求中，或已经请求过相同的 model_kind，则跳过
    if (isFetching || lastFetchedModelKind.current === model_kind)
      return
    setIsFetching(true)
    lastFetchedModelKind.current = model_kind

    get(`/infer-service/list/draw?qtype=already&model_kind=${model_kind}&available=1`).then((res: any) => {
      setIsFetching(false)
      // post('/infer-service/list', { body: { page: 1, per_page: 9999 } }).then((res: any) => {
      const data = Array.isArray(res?.result?.result)
        // ? res?.result?.result?.filter((child: any) => !model_type || child?.model_type === model_type) // 过滤模型类别localLLM/Embedding
        ? res?.result?.result
        : []
      // data[0].online_count = 1
      // data[0].services = [{
      //   id: 21,
      //   name: '111',
      //   status: 'Ready',
      //   job_id: 'inf-250228025825250951-321e9',
      //   token: '00000000-0000-0000-0000-000000000000',
      //   logs: 'Pending',
      //   created_by: 'administrator',
      //   created_at: '2025-02-25 09:11:26',
      //   updated_at: '2025-02-25 09:11:26',
      // }]

      const currentActiveInferenceServices = [
        // ...data?.filter((item: any) => item?.online_count > 0 && item?.services?.length),
        ...data?.filter((item: any) => item?.services?.length),
      ]
      const currentTreeData = traveTree(currentActiveInferenceServices || [], (item: any, parent) => {
        // services后端已经过滤为status=Ready的服务列表
        item.children = item?.services?.length ? item.services : undefined
        item.value = item.services?.length
          ? `parent__${item?.id}`
          : `${item?.job_id}`
        item.keys = (parent?.keys || []).concat(item?.value)
        return {
          label: item?.name,
          value: item?.value,
          children: item.children,
          keys: item.keys,
          jobId: item.job_id,
          token: item.token,
          id: item.id,
          base_model: item.base_model || '暂无数据',
          deploy_method: item.deploy_method || '暂无数据',
          url: item.url || '暂无数据',
        }
      })
      setOriginTreeData([...currentTreeData])

      const currentFlattenedTreeData = flattenTree(currentTreeData)
      setFlattenedTreeData([...currentFlattenedTreeData])

      const currentValue = formatValueByType(inputs.payload__inference_service, ValueType.String)
      if (currentValue) {
        const matchedService = currentFlattenedTreeData?.find(child => child.value === currentValue)
        if (matchedService) {
          const matchedKeys = matchedService?.keys || []
          if (!inputs?.payload__inference_service_selected_keys?.length
            || !inputs?.payload__jobid
            || !inputs?.payload__token
            || JSON.stringify(inputs?.payload__inference_service_selected_keys) !== JSON.stringify(matchedKeys)
          ) {
            onChange && onChange({
              payload__inference_service: currentValue,
              payload__inference_service_selected_keys: matchedKeys,
              payload__jobid: matchedService?.jobId,
              payload__token: matchedService?.token,
              payload__base_model: matchedService?.base_model,
              payload__deploy_method: matchedService?.deploy_method,
              payload__url: matchedService?.url,
            })
          }
        }
        else {
          onChange && onChange({
            payload__inference_service: undefined,
            payload__inference_service_selected_keys: [],
            payload__jobid: undefined,
            payload__token: undefined,
            payload__base_model: undefined,
            payload__deploy_method: undefined,
            payload__url: undefined,
          })
        }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model_kind, inputs.payload__model_source])

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

  return (
    <>
      <div className="flex items-center">
        <Cascader
          className={classNames('w-full flex-1')}
          placeholder="请选择推理服务"
          allowClear
          showSearch
          disabled={disabled}
          readOnly={readOnly}
          options={originTreeData || []}
          placement='bottomLeft'
          expandTrigger="click"
          value={inputs?.payload__inference_service_selected_keys}
          onChange={(val) => {
            const currentValue = val?.[val?.length - 1]
            const matchedService = flattenedTreeData?.find(child => child.value === currentValue)
            onChange && onChange({
              ...inputs,
              payload__inference_service: currentValue,
              payload__inference_service_selected_keys: val || [],
              payload__jobid: matchedService?.jobId,
              payload__token: matchedService?.token,
              payload__base_model: matchedService?.base_model,
              payload__deploy_method: matchedService?.deploy_method,
              payload__url: matchedService?.url,
              payload__service_name: matchedService?.label,
            })
          }}
        />
        {model_show_type === 'localLLM'
          && <Button
            type='link'
            size='small'
            onClick={() => setIsModalVisible(true)}
            className="ml-2"
          >
            <Icon type="icon-shezhi" style={{ fontSize: '22px', color: '#262626', cursor: 'pointer' }} />
          </Button>
        }
      </div>

      {/* 模型设置弹层 */}
      {model_show_type === 'localLLM' && <ModelSettingsModal
        visible={isModalVisible}
        onOk={handleSettingsSave}
        onCancel={handleSettingsCancel}
        initialSettings={{
          temperature: inputs?.payload__model_generate_control?.payload__temperature,
          top_p: inputs?.payload__model_generate_control?.payload__top_p,
          max_tokens: inputs?.payload__model_generate_control?.payload__max_tokens,
        }}
        readOnly={readOnly}
        title="推理服务设置"
      />}
    </>
  )
}
export default React.memo(FieldItem)
