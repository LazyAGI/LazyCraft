'use client'
import type { FC } from 'react'
import React, { useCallback, useEffect, useState } from 'react'
import Field from '@/app/components/taskStream/elements/_foundation/components/form/field-unit'
import ExampleDialogEditor from '@/app/components/taskStream/elements/_foundation/components/form/field-item/example-dialog-editor'
import type { ExampleDialogItem } from '@/app/components/taskStream/elements/_foundation/components/form/field-item/example-dialog-editor'
import type { PromptParameter } from '@/core/data/debug'
import { getPromptParametersFromInputShapes } from '@/app/components/taskStream/elements/_foundation/components/form/field-item/prompt-editor'

type ExampleDialogAdapterProps = {
  nodeId: string
  nodeData: any
  name: string
  label?: string
  tooltip?: string
  required?: boolean
  className?: string
  readOnly?: boolean
  value?: any
  maxDialogs?: number
  onChange: (key: string, value: any) => void
}

/**
 * 示例对话编辑器适配器组件
 * 作为工作流字段系统与自定义示例对话编辑器之间的桥梁
 */
const ExampleDialogAdapter: FC<ExampleDialogAdapterProps> = ({
  nodeId,
  nodeData,
  name,
  label = '',
  tooltip = '添加用户提问和AI回答的示例对，帮助模型理解期望的输出格式和回答风格',
  required = false,
  className = '',
  readOnly = false,
  value,
  maxDialogs = 10,
  onChange,
}) => {
  // 规范化数据格式
  const normalizeValue = (rawValue: any): ExampleDialogItem[] => {
    if (!rawValue)
      return []

    // 确保是数组
    if (!Array.isArray(rawValue))
      return []

    // 确保每一项都有正确的格式
    return rawValue
      .filter(item => item && (item.role === 'user' || item.role === 'agent') && typeof item.content === 'string')
      .map(item => ({
        role: item.role,
        content: item.content,
        id: item.id || `dialog-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      }))
  }

  // 从父组件获取当前值并规范化
  const [dialogItems, setDialogItems] = useState<ExampleDialogItem[]>(() => normalizeValue(value))

  // 从工作流节点获取可用变量
  const [promptParams, setPromptParameters] = useState<PromptParameter[]>([])

  // 当外部值变化时更新内部状态
  useEffect(() => {
    setDialogItems(normalizeValue(value))
  }, [value])

  // 从节点数据中获取可用变量
  useEffect(() => {
    if (nodeData) {
      // 尝试从输入形状获取变量（复用统一的提取方法，确保包含 key）
      const inputShape = nodeData.config__input_shape || []
      const rawVars = getPromptParametersFromInputShapes(inputShape)
      const extractedVariables: PromptParameter[] = rawVars.map((v: any) => ({
        key: v.key,
        name: v.name || v.key,
        type: v.type || 'string',
        required: false,
        enabled: true,
      }))

      setPromptParameters(extractedVariables)
    }
  }, [nodeData])

  // 处理示例对话变更
  const handleDialogChange = useCallback((newDialogs: ExampleDialogItem[]) => {
    // 更新本地状态
    setDialogItems(newDialogs)

    // 将更新传递给父组件，转换为期望的格式
    // 注意：移除内部使用的id字段，保持与原始数据结构一致
    const formattedDialogs = newDialogs.map(({ role, content }) => ({
      role,
      content,
    }))

    onChange(name, formattedDialogs)
  }, [name, onChange])

  return (
    <Field
      label={null}
      name={name}
      required={required}
      tooltip={tooltip}
      className={className}
    >
      <ExampleDialogEditor
        value={dialogItems}
        onChange={handleDialogChange}
        promptParams={promptParams}
        readOnly={readOnly}
        maxDialogs={maxDialogs}
        defaultHeight={120}
      />
    </Field>
  )
}

export default ExampleDialogAdapter
