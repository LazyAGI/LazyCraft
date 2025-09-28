'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import { Checkbox } from 'antd'
import { v4 as uuid4 } from 'uuid'
import type { FieldItemProps } from '../../types'
import OnlineModelSelect from '../online-model-picker'
import InferenceServiceSelect from '../inference-service-select'
import { useParseStore } from './dataParser'
import { Select } from '@/app/components/taskStream/elements/_foundation/components/form/base'

const DocumentNodeActiveGroup: FC<Partial<FieldItemProps>> = ({
  name,
  value = [],
  readOnly,
  onChange,
  resourceData,
  nodeId,
  resourceId,
}) => {
  // 使用 zustand store 管理解析状态
  const { getNodeState } = useParseStore()

  // 根据使用场景确定使用哪个id（优先使用resourceId，因为大多数情况下是在资源配置中使用）
  const targetId = resourceId || nodeId

  // 从 zustand store 获取当前节点的解析状态
  const parseState = getNodeState(targetId || '')
  const { isLoading } = parseState

  // 添加选中状态管理
  const [checkedItems, setCheckedItems] = useState({
    CoarseChunk: false,
    MediumChunk: false,
    FineChunk: false,
  })

  // 用于跟踪是否正在进行初始化，避免干扰
  const isInitializingRef = useRef(false)

  // 从已有数据初始化状态
  useEffect(() => {
    isInitializingRef.current = true

    const newCheckedItems = {
      CoarseChunk: false,
      MediumChunk: false,
      FineChunk: false,
    }

    // 从 resourceData 中恢复已激活的组
    resourceData?.payload__activated_groups?.forEach((item: any) => {
      if (item.name && ['CoarseChunk', 'MediumChunk', 'FineChunk'].includes(item.name))
        newCheckedItems[item.name as keyof typeof newCheckedItems] = true
    })

    setCheckedItems(newCheckedItems)

    // 重置初始化标志
    setTimeout(() => {
      isInitializingRef.current = false
    }, 0)
  }, [resourceData])

  // 处理复选框变化 - 只在这里调用onChange
  const handleCheckboxChange = (key: string, checked: boolean) => {
    // 如果正在初始化或正在解析，忽略此次操作
    if (isInitializingRef.current || isLoading)
      return

    setCheckedItems(prev => ({
      ...prev,
      [key]: checked,
    }))

    // 计算新的激活组列表
    let newActivatedGroups = [...(resourceData?.payload__activated_groups || [])]

    if (checked) {
      // 当选中时，添加新的激活组
      const newActivatedGroup = {
        key: uuid4(),
        name: key,
        embed: {
          payload__model_source: 'online_model', // 默认选择在线模型
        },
      }

      // 检查是否已存在，避免重复
      const existingIndex = newActivatedGroups.findIndex((item: any) => item.name === key)
      if (existingIndex === -1)
        newActivatedGroups.push(newActivatedGroup)
    }
    else {
      // 当取消选中时，移除对应的激活组
      newActivatedGroups = newActivatedGroups.filter((item: any) => item.name !== key)
    }

    // 只在用户操作时调用onChange
    onChange?.({
      [name]: newActivatedGroups,
      payload__activated_groups: newActivatedGroups,
    })
  }

  // 处理模型来源变化
  const handleModelSourceChange = (chunkKey: string, modelSource: string) => {
    // 如果正在解析，忽略此次操作
    if (isLoading)
      return

    const newActivatedGroups = [...(resourceData?.payload__activated_groups || [])]
    const targetIndex = newActivatedGroups.findIndex((item: any) => item.name === chunkKey)

    if (targetIndex !== -1) {
      newActivatedGroups[targetIndex] = {
        ...newActivatedGroups[targetIndex],
        embed: {
          payload__model_source: modelSource,
        },
      }

      onChange?.({
        [name]: newActivatedGroups,
        payload__activated_groups: newActivatedGroups,
      })
    }
  }

  // 处理模型选择变化
  const handleModelChange = (chunkKey: string, modelData: any) => {
    // 如果正在解析，忽略此次操作
    if (isLoading)
      return

    const newActivatedGroups = [...(resourceData?.payload__activated_groups || [])]
    const targetIndex = newActivatedGroups.findIndex((item: any) => item.name === chunkKey)

    if (targetIndex !== -1) {
      newActivatedGroups[targetIndex] = {
        ...newActivatedGroups[targetIndex],
        embed: {
          ...newActivatedGroups[targetIndex].embed,
          ...modelData,
        },
      }

      onChange?.({
        [name]: newActivatedGroups,
        payload__activated_groups: newActivatedGroups,
      })
    }
  }

  // 获取当前切片组的模型配置
  const getChunkModelConfig = (chunkKey: string) => {
    const activatedGroup = resourceData?.payload__activated_groups?.find((item: any) => item.name === chunkKey)
    return activatedGroup?.embed || { payload__model_source: 'online_model' }
  }

  return (
    <div className="space-y-4">
      {[{ key: 'CoarseChunk', name: '长段分块' }, { key: 'MediumChunk', name: '段落分块' }, { key: 'FineChunk', name: '短句分块' }].map((item, index) => {
        const isChecked = checkedItems[item.key]
        const modelConfig = getChunkModelConfig(item.key)
        return (
          <div key={item.key} className="space-y-2">
            <div className="flex items-center">
              <div className="w-[120px]">
                <Checkbox
                  value={item.key}
                  checked={isChecked}
                  onChange={e => handleCheckboxChange(item.key, e.target.checked)}
                  disabled={readOnly || isLoading}
                >
                  <span className="text-sm">{item.name}</span>
                </Checkbox>
              </div>
            </div>
            <div>
              {/* 当切片组被选中时，显示模型选择 */}
              {isChecked && (
                <div className="ml-6 p-4 bg-gray-50 rounded-md space-y-3">
                  <div className="text-sm font-medium text-gray-700">嵌入模型配置</div>

                  {/* 模型来源选择 */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      模型来源 <span className="text-red-500">*</span>
                    </label>
                    <Select
                      placeholder="请选择模型来源"
                      allowClear={false}
                      value={modelConfig.payload__model_source}
                      options={[
                        { value: 'online_model', label: '在线模型' },
                        { value: 'inference_service', label: '平台推理服务' },
                        { value: 'none', label: '无' },
                      ]}
                      onChange={value => handleModelSourceChange(item.key, value)}
                      disabled={readOnly || isLoading}
                      className="w-full"
                    />
                  </div>

                  {/* 在线模型选择 */}
                  {modelConfig.payload__model_source === 'online_model' && (
                    <div>
                      <OnlineModelSelect
                        nodeData={modelConfig}
                        onChange={changes => handleModelChange(item.key, changes)}
                        disabled={readOnly || isLoading}
                        readOnly={readOnly || isLoading}
                        embedding={true}
                        is_hidden={true}
                      />
                    </div>
                  )}

                  {/* 推理服务选择 */}
                  {modelConfig.payload__model_source === 'inference_service' && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">请选择推理服务</label>
                      <InferenceServiceSelect
                        nodeData={modelConfig}
                        onChange={changes => handleModelChange(item.key, changes)}
                        disabled={readOnly || isLoading}
                        readOnly={readOnly || isLoading}
                        itemProps={{
                          model_kind: 'Embedding',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default DocumentNodeActiveGroup
