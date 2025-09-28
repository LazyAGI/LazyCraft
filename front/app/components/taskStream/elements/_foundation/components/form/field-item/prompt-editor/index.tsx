'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import type { FieldItemProps } from '../../types'
import Field from '../../field-unit'
import type { InstructionItem } from './modules/setup-query'
import ConfigPrompt from './modules/setup-query'
import { Select } from '@/app/components/taskStream/elements/_foundation/components/form/base'
import { fetchAllPromptList } from '@/infrastructure/api//workflow'
import { InstructionRole, type PromptOptions } from '@/core/data/debug'
import './index.scss'

const DEFAULT_PROMPT_VALUE = [
  { role: InstructionRole.system, content: '' },
  { role: InstructionRole.user, content: '' },
]

enum PromptTargetFormatEnum {
  dict = 'dict',
  list = 'list',
}

// 从输入参数中提取出变量列表，支持dict和str类型
export function getPromptParametersFromInputShapes(inputShapes: Array<{
  variable_name: string
  id?: string
  variable_type: 'dict' | 'str'
  variable_mode?: string
  variable_type_detail: Array<{
    id?: string
    variable_name: string
    variable_type: string
  }>
  [index: string]: any
}>, parentVariableName = ''): Array<{ key: string; name: string; type: 'dict' | 'str' }> {
  return (inputShapes || [])?.reduce((result: any[], item: any) => {
    // 创建一个新对象，而不是直接修改传入的对象
    const itemCopy = item ? { ...item } : {}

    return result.concat(itemCopy?.variable_type === 'dict'
      ? [...getPromptParametersFromInputShapes(itemCopy?.variable_type_detail || [], itemCopy?.variable_name || '')]
      : {
        id: `${parentVariableName ? `${parentVariableName}.` : ''}${itemCopy?.variable_name}`,
        name: itemCopy?.variable_name, // 修复：确保返回 name 字段
        key: itemCopy?.variable_name,
        type: itemCopy?.variable_type,
      })
  }, [])?.filter(item => !!item?.key && !!item?.type)
}

const FieldItem: FC<Partial<FieldItemProps>> = ({
  disabled,
  readOnly,
  onChange,
  name,
  value,
  nodeData,
  resourceData,
  itemProps,
}) => {
  const { format = PromptTargetFormatEnum.list } = itemProps || {} // 默认格式为list，以支持示例对话功能
  const inputs = nodeData || resourceData || {}
  const fetchApiCalled = useRef<boolean>(false)
  const [promptTemplateList, setPromptTemplateList] = useState<any[]>([])
  // 变量
  const promptParams: PromptOptions['prompt_variables'] = getPromptParametersFromInputShapes(inputs?.config__input_shape)

  useEffect(() => {
    if (!fetchApiCalled.current) {
      fetchApiCalled.current = true

      fetchAllPromptList({ page: 1, per_page: 9999, qtype: 'already' }).then((res: any) => {
        const data = Array.isArray(res?.result?.prompts) ? res?.result?.prompts : []

        setPromptTemplateList(data.map((item: any) => {
          try {
            if (typeof JSON.parse(item.content) === 'object') {
              return {
                ...item,
                content: [{ role: 'system', content: JSON.parse(item.content)[0]?.content || '' }, { role: 'user', content: JSON.parse(item.content)[1]?.content || '我需要你帮我解答关于{query}的问题。请提供详细且准确的信息，如果有需要，可以列出步骤或者相关例子来说明。' }],
              }
            }
            return {
              ...item,
              content: item.category === 'dict'
                ? JSON.parse(item.content || '[]')
                : [{ role: 'system', content: item.content }, { role: 'user', content: '我需要你帮我解答关于{query}的问题。请提供详细且准确的信息，如果有需要，可以列出步骤或者相关例子来说明。' }],
            }
          }
          catch (error) {
            return {
              ...item,
              content: [{ role: 'system', content: item.content }, { role: 'user', content: '我需要你帮我解答关于{query}的问题。请提供详细且准确的信息，如果有需要，可以列出步骤或者相关例子来说明。' }],
            }
          }
        }))
        // 若已选提示词模板已被删除，则清空所选择的提示词模板
        if (inputs?.payload__prompt_template && !data?.find(_item => _item?.id === inputs?.payload__prompt_template)) {
          setTimeout(() => {
            onChange && onChange({
              payload__prompt_template: undefined,
            })
          }, 300)
        }
      })
    }

    // 初始化提示词value，兼容可能出现的其他数据格式并进行转换
    initializePromptValue()
  }, [])

  /** 将value都转换成Array<{ role: InstructionRole, content: string }> 或 { system: string, user: string } */
  function initializePromptValue() {
    if (value) {
      try {
        // 如果设置了使用字典格式
        if (format === PromptTargetFormatEnum.dict) {
          // 如果已经是字典格式 {system, user}，直接使用
          if (typeof value === 'object' && !Array.isArray(value)
            && Object.hasOwnProperty.call(value, 'system')
            && Object.hasOwnProperty.call(value, 'user')) {
            onChange && onChange(name, value)
            return
          }

          // 如果是数组格式，提取system和user角色转为字典
          if (Array.isArray(value)) {
            const systemPrompt = value.find(item => item.role === InstructionRole.system)
            const userPrompt = value.find(item => item.role === InstructionRole.user)

            const dictValue = {
              system: systemPrompt?.content || '',
              user: userPrompt?.content || '',
            }

            onChange && onChange(name, dictValue)
            return
          }

          // 其他格式，初始化为默认字典
          onChange && onChange(name, {
            system: '你是一个专业、智能、有用的AI助手。请根据用户的问题提供准确、有帮助的回答。如果你不知道某个问题的答案，请诚实地说出来，而不要编造信息。你的回答应该是清晰、简洁且结构良好的。',
            user: '请回答我的问题: {query}',
          })
          return
        }

        // 以下是列表格式（format = 'list'）的处理逻辑
        if (typeof value === 'object' && !Array.isArray(value)) {
          if (Object.keys(value).every((key: string) => !isNaN(+key))) {
            // 兼容可能出现的格式1：{ 0: { role: 'system', content: '' }, 1: { role: 'user', content: '' } }
            const list: any[] = []
            for (const key in value)
              list[key] = value[key]

            onChange && onChange(name, formatResultValue([...list.map((item: any) => (
              {
                role: item.role,
                content: item.content || '',
              }
            ))]))
          }
          else if (Object.hasOwnProperty.call(value, 'system') && Object.hasOwnProperty.call(value, 'user')) {
            // 将简单的字典格式转换为数组格式，添加system和user角色
            onChange && onChange(name, formatResultValue([
              { role: InstructionRole.system, content: value?.system || '' },
              { role: InstructionRole.user, content: value?.user || '' },
            ]))
          }
          else {
            // 其他错误object格式，则初始化为默认值
            onChange && onChange(name, formatResultValue(DEFAULT_PROMPT_VALUE))
          }
        }
        else if (!Array.isArray(value)) {
          onChange && onChange(name, formatResultValue(DEFAULT_PROMPT_VALUE))
        }
        else if (Array.isArray(value)) {
          // 已经是数组格式，直接使用，确保第一个是system，最后一个是user
          let updatedValue = [...value]

          // 确保数组至少有两个元素
          if (updatedValue.length < 2)
            updatedValue = DEFAULT_PROMPT_VALUE

          // 确保第一个是system
          if (updatedValue[0]?.role !== InstructionRole.system)
            updatedValue[0] = { ...updatedValue[0], role: InstructionRole.system }

          // 确保最后一个是user
          if (updatedValue[updatedValue.length - 1]?.role !== InstructionRole.user) {
            updatedValue[updatedValue.length - 1] = {
              ...updatedValue[updatedValue.length - 1],
              role: InstructionRole.user,
            }
          }

          onChange && onChange(name, formatResultValue(updatedValue))
        }
      }
      catch (err) {
        // 出现错误时返回默认字典
        if (format === PromptTargetFormatEnum.dict) {
          onChange && onChange(name, {
            system: '你是一个专业、智能、有用的AI助手。请根据用户的问题提供准确、有帮助的回答。如果你不知道某个问题的答案，请诚实地说出来，而不要编造信息。你的回答应该是清晰、简洁且结构良好的。',
            user: '请回答我的问题: {query}',
          })
        }
        else {
          onChange && onChange(name, formatResultValue(DEFAULT_PROMPT_VALUE))
        }
      }
    }
    else {
      // value为空，则初始化默认值
      if (format === PromptTargetFormatEnum.dict) {
        onChange && onChange(name, {
          system: '你是一个专业、智能、有用的AI助手。请根据用户的问题提供准确、有帮助的回答。如果你不知道某个问题的答案，请诚实地说出来，而不要编造信息。你的回答应该是清晰、简洁且结构良好的。',
          user: '请回答我的问题: {query}',
        })
      }
      else {
        onChange && onChange(name, formatResultValue(DEFAULT_PROMPT_VALUE))
      }
    }
  }

  // 格式化表单输出结果值
  function formatResultValue(value: any[]) {
    // 如果指定使用dict格式，则转换为字典
    if (format === PromptTargetFormatEnum.dict) {
      // 确保存在system和user角色
      const systemPrompt = value.find(item => item.role === InstructionRole.system)
      const userPrompt = value.find(item => item.role === InstructionRole.user)

      return {
        system: systemPrompt?.content || '',
        user: userPrompt?.content || '',
      }
    }

    // 否则，返回完整的对话数组
    return value
  }

  // 格式化输入给ConfigPrompt组件的value
  function formatInputValue(value: any) {
    // 处理空值情况
    if (!value) {
      // 根据格式返回默认值
      if (format === PromptTargetFormatEnum.dict) {
        return {
          system: '',
          user: '',
        }
      }
      return DEFAULT_PROMPT_VALUE
    }

    // 如果是dict模式
    if (format === PromptTargetFormatEnum.dict) {
      try {
        // 如果已经是字典格式，直接返回确保有system和user字段
        if (typeof value === 'object' && !Array.isArray(value)
          && ('system' in value || 'user' in value)) {
          return {
            system: value.system || '',
            user: value.user || '',
          }
        }

        // 如果是数组格式，转换为字典格式
        if (Array.isArray(value)) {
          const systemPrompt = value.find(item => item.role === InstructionRole.system)
          const userPrompt = value.find(item => item.role === InstructionRole.user)

          return {
            system: systemPrompt?.content || '',
            user: userPrompt?.content || '',
          }
        }

        // 字符串或其他格式，返回默认字典
        return {
          system: '你是一个专业、智能、有用的AI助手。请根据用户的问题提供准确、有帮助的回答。如果你不知道某个问题的答案，请诚实地说出来，而不要编造信息。你的回答应该是清晰、简洁且结构良好的。',
          user: '请回答我的问题: {query}',
        }
      }
      catch (err) {
        // 出现错误时返回默认字典
        return {
          system: '你是一个专业、智能、有用的AI助手。请根据用户的问题提供准确、有帮助的回答。如果你不知道某个问题的答案，请诚实地说出来，而不要编造信息。你的回答应该是清晰、简洁且结构良好的。',
          user: '请回答我的问题: {query}',
        }
      }
    }

    // 列表模式处理
    try {
      // 如果是字典格式，转换为数组
      if (typeof value === 'object' && !Array.isArray(value)
        && ('system' in value || 'user' in value)) {
        return [
          { role: InstructionRole.system, content: value.system || '' },
          { role: InstructionRole.user, content: value.user || '' },
        ]
      }

      // 如果已经是数组格式，确保格式正确
      if (Array.isArray(value)) {
        // 确保数组至少有两个元素
        if (value.length < 2)
          return DEFAULT_PROMPT_VALUE

        // 确保包含system和user角色
        if (!value.some(item => item.role === InstructionRole.system)
          || !value.some(item => item.role === InstructionRole.user))
          return DEFAULT_PROMPT_VALUE

        return value
      }
    }
    catch (err) {
      // 忽略错误，使用默认值
    }

    // 其他情况返回默认值
    return DEFAULT_PROMPT_VALUE
  }

  const handleSelectPromptTemplate = (_value) => {
    const templateItem: any = promptTemplateList?.find(_item => _item?.id === _value) || {}
    const promptTemplateData: any[] = templateItem?.content || []

    if (_value) {
      // 选中模板后，保持模板数组格式
      onChange && onChange({
        payload__prompt_template: _value,
        [name]: formatResultValue(promptTemplateData),
      })
    }
    else {
      // 不清空提示词内容，只清空提示词模板选项值
      onChange && onChange({
        payload__prompt_template: _value,
      })
    }
  }

  const handlePromptChange = (data: InstructionItem[] | { system: string; user: string }) => {
    // 当format为dict时，确保返回的始终是字典格式
    if (format === PromptTargetFormatEnum.dict) {
      let dictData: { system: string; user: string }

      // 如果收到的是数组格式，提取system和user转换为字典
      if (Array.isArray(data)) {
        const systemPrompt = data.find(item => item.role === InstructionRole.system)
        const userPrompt = data.find(item => item.role === InstructionRole.user)

        dictData = {
          system: systemPrompt?.content || '',
          user: userPrompt?.content || '',
        }
      }
      // 如果已经是字典格式，直接使用
      else if (typeof data === 'object' && !Array.isArray(data) && (
        'system' in data || 'user' in data
      )) {
        dictData = {
          system: data.system || '',
          user: data.user || '',
        }
      }
      // 其他情况使用默认值
      else {
        dictData = {
          system: '你是一个专业、智能、有用的AI助手。请根据用户的问题提供准确、有帮助的回答。如果你不知道某个问题的答案，请诚实地说出来，而不要编造信息。你的回答应该是清晰、简洁且结构良好的。',
          user: '请回答我的问题: {query}',
        }
      }

      // 使用字典格式更新
      onChange && onChange({
        [name]: dictData,
      })
    }
    else {
      // 直接使用原始数据
      onChange && onChange({
        [name]: data,
      })
    }
  }

  return (
    <>
      <div className='space-y-3'>
        <Field
          label="提示词模板"
          name="payload__prompt_template"
          value={inputs?.payload__prompt_template}
          className={classNames(
            'text-text-secondary', // system-sm-semibold-uppercase
          )}
          type="select"
          tooltip="从Prompt模板处选择合适的提示词进行生成"
        >
          <Select
            className={classNames('w-full')}
            allowClear
            disabled={disabled}
            readOnly={readOnly}
            value={inputs?.payload__prompt_template}
            onChange={handleSelectPromptTemplate}
            placeholder="请选择提示词模板"
            options={promptTemplateList?.map((_item: any) => ({ label: _item?.name, value: _item?.id }))}
          />
        </Field>
      </div>

      <Field
        label="提示词"
        name={name}
        value={value}
        className={classNames(
          'text-text-secondary', // system-sm-semibold-uppercase
        )}
      >
        <ConfigPrompt
          promptParams={promptParams}
          defaultEditorHeight={102}
          value={formatInputValue(value || [])}
          onChange={handlePromptChange}
          readOnly={readOnly || disabled}
          noResize // 自适应高度
          showAddBtn={format === PromptTargetFormatEnum.list} // 仅在format为list格式下显示添加按钮
        />
      </Field>
    </>
  )
}
export default React.memo(FieldItem)
