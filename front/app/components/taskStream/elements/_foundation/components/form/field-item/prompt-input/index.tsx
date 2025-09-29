import type { FC } from 'react'
import type { FieldItemProps } from '../../types'
import EnhancedPromptInput from '../prompt-editor/modules/setup-query/pro-query-entry'
import { getPromptParametersFromInputShapes } from '../prompt-editor'
import type { PromptParameter } from '@/core/data/debug'
import { InstructionRole } from '@/core/data/debug'

const PromptInput: FC<Partial<FieldItemProps>> = ({ value, readOnly, onChange, name, inputs, nodeData }) => {
  // 优先使用 nodeData，如果没有则使用 inputs
  const dataSource = nodeData || inputs || {}
  const rawVariables = getPromptParametersFromInputShapes(dataSource?.config__input_shape)

  // 转换变量格式以匹配 PromptParameter 类型
  const promptParams: PromptParameter[] = rawVariables.map(variable => ({
    key: variable.key,
    name: variable.name || variable.key, // 如果没有 name，使用 key 作为 name
    type: variable.type,
    required: false,
    enabled: true,
  }))

  return (
    <EnhancedPromptInput
      key="system"
      placeholder="（选填）在这里写你的系统提示词，输入'{' 插入变量"
      type={InstructionRole.user}
      value={value ?? ''}
      onTypeUpdate={() => { }} // 不允许修改类型
      canDelete={false}
      onDelete={() => { }}
      onChange={value => onChange?.({ [name]: value ?? '' })}
      promptParams={promptParams}
      readOnly={readOnly}
    />
  )
}

export default PromptInput
