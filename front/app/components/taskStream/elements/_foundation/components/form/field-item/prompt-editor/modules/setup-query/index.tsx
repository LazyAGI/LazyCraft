'use client'
import type { FC } from 'react'
import React, { useEffect } from 'react'
import produce from 'immer'
import { PlusOutlined } from '@ant-design/icons'
import EnhancedPromptInput from './pro-query-entry'
import { InstructionRole } from '@/core/data/debug'
import type { PromptParameter } from '@/core/data/debug'
type IConfigPromptProps = {
  value?: Array<{ role: InstructionRole; content: string }> | { system: string; user: string }
  onChange?: (data: InstructionItem[] | { system: string; user: string }) => void
  promptParams: PromptParameter[]
  readOnly?: boolean
  gradientBorder?: boolean
  defaultEditorHeight?: number
  noResize?: boolean
  maxPromptMessageLength?: number
  showAddBtn?: boolean
  format?: 'list' | 'dict' // 添加format参数，指定是使用列表格式还是字典格式
  // onChange?: (prompt: string, promptParams: PromptParameter[]) => void
}

export type InstructionItem = {
  role?: InstructionRole
  content: string
}

const ConfigPrompt: FC<IConfigPromptProps> = ({
  value: _value,
  onChange,
  promptParams,
  gradientBorder = false,
  readOnly = false,
  defaultEditorHeight,
  noResize,
  maxPromptMessageLength,
  showAddBtn = true,
  format = 'dict', // 默认使用字典格式
  // onChange,
}) => {
  // // 处理列表格式的提示词数据
  const advancedPrompts = (Array.isArray(_value) && _value.length > 0)
    ? _value
    : [
      { role: InstructionRole.system, content: '' },
      { role: InstructionRole.user, content: '' },
    ]

  // 处理字典格式的提示词数据
  const dictValue = (() => {
    // 如果原始值不存在，返回空字典
    if (!_value)
      return { system: '', user: '' }

    // 如果已经是字典格式，直接使用
    if (typeof _value === 'object' && !Array.isArray(_value) && _value !== null) {
      return {
        system: (_value as any).system || '',
        user: (_value as any).user || '',
      }
    }

    // 如果是数组格式，尝试从中提取system和user
    if (Array.isArray(_value) && _value.length > 0) {
      const systemPrompt = _value.find(item => item?.role === InstructionRole.system)
      const userPrompt = _value.find(item => item?.role === InstructionRole.user)

      return {
        system: systemPrompt?.content || '',
        user: userPrompt?.content || '',
      }
    }

    // 默认返回空字典
    return { system: '', user: '' }
  })()

  // 确保在字典模式下直接使用字典格式
  const handleDictValueChange = (key: 'system' | 'user', content: string) => {
    if (format === 'dict' && onChange) {
      // 创建一个保持字典结构的新对象
      const newDictValue = {
        system: dictValue.system || '',
        user: dictValue.user || '',
      }

      // 更新指定字段的内容
      newDictValue[key] = content

      // 直接返回字典格式，确保始终保持字典结构
      onChange(newDictValue)
    }
  }

  // Hook必须在组件的顶层调用，确保它们在每次渲染时以相同的顺序执行
  useEffect(() => {
    // 只有在列表格式下才需要处理对话顺序逻辑
    if (format === 'list' && Array.isArray(advancedPrompts) && advancedPrompts.length > 0) {
      let needsUpdate = false
      const updatedPrompts = [...advancedPrompts]

      // 确保第一个是system
      if (updatedPrompts[0]?.role !== InstructionRole.system) {
        updatedPrompts[0] = { ...updatedPrompts[0], role: InstructionRole.system }
        needsUpdate = true
      }

      // 确保对话交替出现 system/user/agent/user/agent/user...
      for (let i = 1; i < updatedPrompts.length; i++) {
        const expectedRole = i % 2 === 1 ? InstructionRole.user : InstructionRole.agent
        if (updatedPrompts[i]?.role !== expectedRole) {
          updatedPrompts[i] = { ...updatedPrompts[i], role: expectedRole }
          needsUpdate = true
        }
      }

      if (needsUpdate && onChange)
        onChange(updatedPrompts)
    }
  }, [advancedPrompts, onChange, format])

  const handleMessageTypeChange = (index: number, role: InstructionRole) => {
    // 不允许修改第一个system的角色
    // 不允许修改角色，我们希望保持严格的交替顺序：user/agent/user/agent...
    // 现在此函数什么都不做，因为我们不允许改变对话角色

    // 下面代码已不需要
    // const newPrompt = produce(advancedPrompts as InstructionItem[], (draft) => {
    //   draft[index].role = role
    // })
    // onChange && onChange(newPrompt)
  }

  const handleValueChange = (value: string, index?: number) => {
    // 只有在 list 格式下才执行这个函数
    if (format === 'list') {
      // 列表格式，更新指定索引的内容
      const newPrompt = produce(advancedPrompts as InstructionItem[], (draft) => {
        draft[index as number].content = value
      })
      onChange && onChange(newPrompt)
    }
  }

  const handleAddMessage = () => {
    const currentAdvancedPromptList = advancedPrompts as InstructionItem[]

    // 如果只有基础提示词（system和第一个user），则在后面添加一组新对话
    if (currentAdvancedPromptList.length <= 2) {
      // 添加一组新的对话（assistant和user）
      const appendMessages = [
        {
          role: InstructionRole.agent,
          content: '',
        },
        {
          role: InstructionRole.user,
          content: '',
        },
      ]

      // 直接在基础提示词后添加
      onChange && onChange([...currentAdvancedPromptList, ...appendMessages])
      return
    }

    // 添加一组新的对话（assistant和user）
    const appendMessages = [
      {
        role: InstructionRole.agent,
        content: '',
      },
      {
        role: InstructionRole.user,
        content: '',
      },
    ]

    // 直接添加到对话列表末尾
    const newList = [...currentAdvancedPromptList, ...appendMessages]

    onChange && onChange(newList)
  }

  const handlePromptDelete = (index: number) => {
    // 不允许删除基础提示词组（第一个system和第一个user）
    if (index === 0 || index === 1)
      return

    // 计算当前对话项所属的"组"
    const groupIndex = Math.floor((index - 2) / 2)

    // 检查是否是第一组示例对话，不允许删除
    const isFirstGroup = (groupIndex === 0)
    if (isFirstGroup)
      return

    const currentAdvancedPromptList = [...(advancedPrompts as InstructionItem[])]
    let newPrompt

    // 如果是assistant角色（偶数索引）
    if (currentAdvancedPromptList[index]?.role === InstructionRole.agent) {
      newPrompt = produce(currentAdvancedPromptList, (draft) => {
        // 删除当前assistant和下一个user
        draft.splice(index, 2)
      })
    }
    // 如果是user角色（奇数索引）
    else if (currentAdvancedPromptList[index]?.role === InstructionRole.user) {
      // 计算前一个assistant的索引
      const assistantIndex = index - 1

      // 确保前一个是assistant，防止索引错误
      if (assistantIndex >= 2 && currentAdvancedPromptList[assistantIndex]?.role === InstructionRole.agent) {
        newPrompt = produce(currentAdvancedPromptList, (draft) => {
          // 删除前一个assistant和当前user
          draft.splice(assistantIndex, 2)
        })
      }
      else {
        // 如果找不到配对的assistant，就只删除当前user
        // 这种情况不应该发生，但为了安全起见还是处理一下
        newPrompt = produce(currentAdvancedPromptList, (draft) => {
          draft.splice(index, 1)
        })
      }
    }

    if (newPrompt)
      onChange && onChange(newPrompt)
  }

  // 渲染基础提示词部分（system和第一个user）
  const renderBasePrompts = () => {
    return (
      <div className="mb-4">
        <div className="mb-2 text-sm font-medium text-gray-700">
          基础提示词
        </div>
        <div className="space-y-3">
          {/* System提示词 */}
          <EnhancedPromptInput
            key="system"
            placeholder="（选填）在这里写你的系统提示词，输入'{' 插入变量"
            type={InstructionRole.system}
            value={advancedPrompts[0]?.content || ''}
            onTypeUpdate={() => { }} // 不允许修改类型
            canDelete={false}
            onDelete={() => { }}
            onChange={value => handleValueChange(value, 0)}
            promptParams={promptParams}
            defaultEditorHeight={defaultEditorHeight}
            noResize={noResize}
            gradientBorder={gradientBorder}
            readOnly={readOnly}
          />

          {/* 第一个用户提示词 */}
          {advancedPrompts.length > 1 && (
            <EnhancedPromptInput
              key="first-user"
              placeholder="在这里写你的基础用户提示词，输入'{' 插入变量"
              type={InstructionRole.user}
              value={advancedPrompts[1]?.content || ''}
              onTypeUpdate={() => { }} // 不允许修改类型
              canDelete={false}
              onDelete={() => { }}
              onChange={value => handleValueChange(value, 1)}
              promptParams={promptParams}
              defaultEditorHeight={defaultEditorHeight}
              noResize={noResize}
              gradientBorder={gradientBorder}
              readOnly={readOnly}
            />
          )}
        </div>
      </div>
    )
  }

  // 渲染示例对话区域
  const renderExampleSection = () => {
    // 如果只有基础提示词（system + user），则不显示示例对话区域
    if (advancedPrompts.length <= 2)
      return null

    // 显示从第三个元素到最后的所有对话
    const examplePrompts = advancedPrompts.slice(2)

    if (examplePrompts.length === 0)
      return null

    return (
      <div className="mb-4 pt-3 border-t border-gray-200">
        <div className="mb-2 text-sm font-medium text-gray-700">
          示例对话
        </div>
        <div className="space-y-3">
          {examplePrompts.map((item, idx) => {
            // 实际索引 = idx + 2 (因为前面有system和第一个user)
            const actualIndex = idx + 2

            // 计算当前对话项所属的"组"
            // 例如：对于assistant/user对话对，它们属于同一组
            // (actualIndex - 2) 是示例对话中的索引，除以2向下取整得到组号
            const groupIndex = Math.floor((actualIndex - 2) / 2)

            // 只有第一组示例对话不允许删除
            const isFirstGroup = (groupIndex === 0)

            return (
              <EnhancedPromptInput
                key={`example-${idx}`}
                placeholder={item?.role === InstructionRole.agent ? '在这里输入AI助手的回复示例' : '在这里输入用户的提问示例'}
                type={item.role as InstructionRole}
                value={item.content}
                onTypeUpdate={type => handleMessageTypeChange(actualIndex, type)}
                // 只有第一组示例对话不允许删除
                canDelete={!isFirstGroup && actualIndex > 1}
                onDelete={() => handlePromptDelete(actualIndex)}
                onChange={value => handleValueChange(value, actualIndex)}
                promptParams={promptParams}
                defaultEditorHeight={defaultEditorHeight}
                noResize={noResize}
                gradientBorder={gradientBorder}
                readOnly={readOnly}
              />
            )
          })}
        </div>
      </div>
    )
  }

  // 如果是字典格式的提示词，渲染字典编辑界面
  if (format === 'dict') {
    return (
      <div>
        <div className="mb-4">
          <div className="mb-2 text-sm font-medium text-gray-700">
            系统角色指令
          </div>
          <div className="space-y-3">
            <EnhancedPromptInput
              key="system-instruction"
              placeholder="在这里写你的系统提示词，输入'{' 插入变量"
              type={InstructionRole.system}
              value={dictValue.system || ''}
              onTypeUpdate={() => { }} // 不允许修改类型
              canDelete={false}
              onDelete={() => { }}
              onChange={value => handleDictValueChange('system', value)}
              promptParams={promptParams}
              defaultEditorHeight={defaultEditorHeight}
              noResize={noResize}
              gradientBorder={gradientBorder}
              readOnly={readOnly}
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-sm font-medium text-gray-700">
            用户输入模板
          </div>
          <div className="space-y-3">
            <EnhancedPromptInput
              key="user-template"
              placeholder="在这里写你的用户提示词，输入'{' 插入变量，如 {query}"
              type={InstructionRole.user}
              value={dictValue.user || ''}
              onTypeUpdate={() => { }} // 不允许修改类型
              canDelete={false}
              onDelete={() => { }}
              onChange={value => handleDictValueChange('user', value)}
              promptParams={promptParams}
              defaultEditorHeight={defaultEditorHeight}
              noResize={noResize}
              gradientBorder={gradientBorder}
              readOnly={readOnly}
            />
          </div>
        </div>
      </div>
    )
  }

  // 列表格式的默认渲染逻辑
  return (
    <div>
      {/* 基础提示词（system和第一个user） */}
      {renderBasePrompts()}

      {/* 示例对话区域 */}
      {renderExampleSection()}

      {/* 添加按钮 */}
      {(showAddBtn && (!maxPromptMessageLength || (advancedPrompts as InstructionItem[]).length < maxPromptMessageLength)) && (
        <div
          onClick={handleAddMessage}
          className='mt-3 flex items-center h-8 justify-center bg-gray-50 rounded-lg cursor-pointer text-[13px] font-medium text-gray-700 space-x-2 hover:bg-gray-100'>
          <PlusOutlined className='w-4 h-4' />
          <div>添加示例对话</div>
        </div>
      )}
    </div>
  )
}

export default React.memo(ConfigPrompt)
