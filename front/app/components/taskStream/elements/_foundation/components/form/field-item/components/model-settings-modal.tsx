'use client'
import type { FC, ReactNode } from 'react'
import React, { useEffect, useState, useMemo } from 'react'
import { InputNumber, Modal, Slider } from 'antd'

type ModelSettings = {
  temperature: number
  top_p: number
  max_tokens: number
}

type ModelSettingsModalProps = {
  visible: boolean
  onOk: (settings: any) => void
  onCancel: () => void
  initialSettings?: any
  readOnly?: boolean
  title?: string
  width?: number
  children?: ReactNode // 完全自定义的内容
  type?: 'default' | 'custom' // 类型：默认模式或完全自定义模式
}

const ModelSettingsModal: FC<ModelSettingsModalProps> = ({
  visible,
  onOk,
  onCancel,
  initialSettings = {},
  readOnly = false,
  title = '模型设置',
  width = 600,
  children,
  type = 'default',
}) => {
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    temperature: 0.8,
    top_p: 0.7,
    max_tokens: 4096,
  })

  // 使用 useMemo 缓存 initialSettings 对象，避免无限循环
  const memoizedInitialSettings = useMemo(() => ({
    temperature: initialSettings?.temperature || 0.8,
    top_p: initialSettings?.top_p || 0.7,
    max_tokens: initialSettings?.max_tokens || 4096,
  }), [
    initialSettings?.temperature,
    initialSettings?.top_p,
    initialSettings?.max_tokens
  ])

  // 初始化设置值 - 只在组件挂载时执行一次，避免无限循环
  useEffect(() => {
    if (type === 'default' && initialSettings) {
      setModelSettings({
        temperature: initialSettings.temperature || 0.8,
        top_p: initialSettings.top_p || 0.7,
        max_tokens: initialSettings.max_tokens || 4096,
      })
    }
  }, []) // 空依赖数组，只在组件挂载时执行一次

  const handleOk = () => {
    if (type === 'custom') {
      // 自定义模式下，由子组件处理数据
      onOk(initialSettings)
    }
    else {
      // 默认模式返回标准设置
      onOk(modelSettings)
    }
  }

  const handleCancel = () => {
    onCancel()
  }

  return (
    <Modal
      title={title}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="确定"
      cancelText="取消"
      width={width}
      className="model-settings-modal"
    >
      <div className="space-y-6 py-4">
        {type === 'custom'
          ? (
            // 完全自定义模式
            children
          )
          : (
            // 默认模式 - 标准的Temperature、Top P、Max Tokens
            <>
              {/* Temperature 设置 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-900">生成创造性</label>
                  <InputNumber
                    min={0}
                    max={1}
                    step={0.1}
                    value={modelSettings.temperature}
                    onChange={value => setModelSettings({ ...modelSettings, temperature: value as number })}
                    className="w-20"
                    size="small"
                    disabled={readOnly}
                  />
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={modelSettings.temperature}
                  onChange={value => setModelSettings({ ...modelSettings, temperature: value })}
                  className="w-full"
                  disabled={readOnly}
                />
                <p className="text-xs text-gray-500">temperature：控制输出的随机性，值越高输出越随机</p>
              </div>

              {/* Top P 设置 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-900">采样范围</label>
                  <InputNumber
                    min={0}
                    max={1}
                    step={0.1}
                    value={modelSettings.top_p}
                    onChange={value => setModelSettings({ ...modelSettings, top_p: value as number })}
                    className="w-20"
                    size="small"
                    disabled={readOnly}
                  />
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={modelSettings.top_p}
                  onChange={value => setModelSettings({ ...modelSettings, top_p: value })}
                  className="w-full"
                  disabled={readOnly}
                />
                <p className="text-xs text-gray-500">TopP：控制词汇选择的多样性，值越高选择越多样</p>
              </div>

              {/* Max Output Token 设置 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-900">最大输出长度</label>
                  <InputNumber
                    min={1}
                    max={10000}
                    step={1}
                    value={modelSettings.max_tokens}
                    onChange={value => setModelSettings({ ...modelSettings, max_tokens: value as number })}
                    className="w-24"
                    size="small"
                    disabled={readOnly}
                  />
                </div>
                <Slider
                  min={1}
                  max={10000}
                  step={1}
                  value={modelSettings.max_tokens}
                  onChange={value => setModelSettings({ ...modelSettings, max_tokens: value })}
                  className="w-full"
                  disabled={readOnly}
                />
                <p className="text-xs text-gray-500">Max Output Token：控制输出文本的最大长度</p>
              </div>
            </>
          )
        }
      </div>
    </Modal>
  )
}

export default ModelSettingsModal
export type { ModelSettings }
