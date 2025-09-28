'use client'
import type { FC } from 'react'
import React, { useCallback, useMemo, useState } from 'react'
import { ArrowDownOutlined, ArrowUpOutlined, ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons'
import IconFont from '@/app/components/base/iconFont'
import type { PromptParameter } from '@/core/data/debug'
import PromptEditorItem from '@/app/components/taskStream/elements/_foundation/components/form/field-item/prompt-editor/modules/setup-query/query-composer-unit'

export type ExampleDialogItem = {
  role: 'user' | 'agent'
  content: string
  id?: string // 唯一标识符，用于拖拽排序等
}

// 对话组类型定义
type DialogGroup = {
  user: ExampleDialogItem
  agent: ExampleDialogItem | null
  index: number
}

type ExampleDialogEditorProps = {
  value?: ExampleDialogItem[]
  onChange?: (data: ExampleDialogItem[]) => void
  promptParams: PromptParameter[]
  readOnly?: boolean
  maxDialogs?: number // 最大允许的对话组数
  defaultHeight?: number // 编辑器默认高度
  noResize?: boolean // 是否禁用大小调整
  gradientBorder?: boolean // 是否使用渐变边框
  showMoveButtons?: boolean // 是否显示上移下移按钮
}

/**
 * 生成唯一ID
 */
const generateId = () => `dialog-${Date.now()}-${Math.floor(Math.random() * 1000)}`

/**
 * 示例对话编辑器组件
 * 专门为处理大模型示例对话设计，提供更好的用户体验
 */
const ExampleDialogEditor: FC<ExampleDialogEditorProps> = ({
  value = [],
  onChange,
  promptParams,
  readOnly = false,
  maxDialogs = 10,
  defaultHeight = 100,
  noResize = false,
  gradientBorder = false,
  showMoveButtons = false, // 默认不显示上移下移按钮
}) => {
  // 确保每个对话项都有ID
  const normalizedValue = (value || []).map(item => ({
    ...item,
    id: item.id || generateId(),
  }))

  // 本地状态管理
  const [dialogs, setDialogs] = useState<ExampleDialogItem[]>(normalizedValue)
  const [expandedDialog, setExpandedDialog] = useState<string | null>(null)

  // 验证示例对话内容
  const validationResult = useMemo(() => {
    if (dialogs.length === 0)
      return { isValid: true, errorMessage: '' }

    // 检查是否有空内容的对话
    for (let i = 0; i < dialogs.length; i += 2) {
      const userDialog = dialogs[i]
      const assistantDialog = dialogs[i + 1]

      // 检查是否为完整的用户-助手对
      if (!userDialog || userDialog.role !== 'user' || !assistantDialog || assistantDialog.role !== 'agent') {
        return {
          isValid: false,
          errorMessage: '示例对话必须成对出现（用户问题+助手回答）',
        }
      }

      // 检查内容是否为空
      if (!userDialog.content || userDialog.content.trim() === '') {
        return {
          isValid: false,
          errorMessage: `示例对话 #${Math.floor(i / 2) + 1} 的用户提问不能为空`,
        }
      }

      if (!assistantDialog.content || assistantDialog.content.trim() === '') {
        return {
          isValid: false,
          errorMessage: `示例对话 #${Math.floor(i / 2) + 1} 的助手回答不能为空`,
        }
      }
    }

    return { isValid: true, errorMessage: '' }
  }, [dialogs])

  // 同步本地状态到父组件
  const updateDialogs = useCallback((newDialogs: ExampleDialogItem[]) => {
    setDialogs(newDialogs)
    onChange?.(newDialogs)
  }, [onChange])

  // 添加一组新的对话（用户和助手）
  const handleAddDialog = useCallback(() => {
    const newDialog: ExampleDialogItem[] = [
      {
        role: 'user',
        content: '',
        id: generateId(),
      },
      {
        role: 'agent',
        content: '',
        id: generateId(),
      },
    ]

    updateDialogs([...dialogs, ...newDialog])
  }, [dialogs, updateDialogs])

  // 更新对话内容
  const handleUpdateContent = useCallback((id: string, content: string) => {
    const newDialogs = dialogs.map(item =>
      item.id === id ? { ...item, content } : item,
    )
    updateDialogs(newDialogs)
  }, [dialogs, updateDialogs])

  // 删除对话对（用户和助手一组）
  const handleDeleteDialog = useCallback((index: number) => {
    // 确保删除整组对话（用户和助手）
    const newDialogs = [...dialogs]
    // 如果是用户，删除当前和下一个
    if (index % 2 === 0 && index + 1 < newDialogs.length)
      newDialogs.splice(index, 2)

    // 如果是助手，删除当前和上一个
    else if (index % 2 === 1 && index > 0)
      newDialogs.splice(index - 1, 2)

    updateDialogs(newDialogs)
  }, [dialogs, updateDialogs])

  // 移动对话组（上移或下移）
  const handleMoveDialog = useCallback((index: number, direction: 'up' | 'down') => {
    // 确保按对话组移动（用户和助手一组）
    // 根据索引确定是哪个组
    const groupIndex = Math.floor(index / 2)
    const newDialogs = [...dialogs]

    if (direction === 'up' && groupIndex > 0) {
      // 上移：交换当前组和上一组
      const currentGroupStart = groupIndex * 2
      const prevGroupStart = (groupIndex - 1) * 2

      // 交换两组对话
      const temp1 = newDialogs[prevGroupStart]
      const temp2 = newDialogs[prevGroupStart + 1]
      newDialogs[prevGroupStart] = newDialogs[currentGroupStart]
      newDialogs[prevGroupStart + 1] = newDialogs[currentGroupStart + 1]
      newDialogs[currentGroupStart] = temp1
      newDialogs[currentGroupStart + 1] = temp2
    }
    else if (direction === 'down' && groupIndex < Math.floor(newDialogs.length / 2) - 1) {
      // 下移：交换当前组和下一组
      const currentGroupStart = groupIndex * 2
      const nextGroupStart = (groupIndex + 1) * 2

      // 交换两组对话
      const temp1 = newDialogs[nextGroupStart]
      const temp2 = newDialogs[nextGroupStart + 1]
      newDialogs[nextGroupStart] = newDialogs[currentGroupStart]
      newDialogs[nextGroupStart + 1] = newDialogs[currentGroupStart + 1]
      newDialogs[currentGroupStart] = temp1
      newDialogs[currentGroupStart + 1] = temp2
    }

    updateDialogs(newDialogs)
  }, [dialogs, updateDialogs])

  // 切换对话展开/折叠状态
  const toggleExpand = useCallback((id: string) => {
    setExpandedDialog(expandedDialog === id ? null : id)
  }, [expandedDialog])

  // 获取编辑器样式
  const getEditorStyle = (id: string | undefined) => {
    // 固定高度并添加滚动条
    return {
      height: `${defaultHeight}px`,
      overflow: 'auto',
    }
  }

  // 渲染对话组
  const renderDialogGroups = () => {
    // 按对话组分组，每组包含一个用户对话和一个助手对话
    const groups: DialogGroup[] = []
    for (let i = 0; i < dialogs.length; i += 2) {
      if (i + 1 < dialogs.length) {
        // 完整的对话组（用户+助手）
        groups.push({
          user: dialogs[i],
          agent: dialogs[i + 1],
          index: i / 2,
        })
      }
      else {
        // 不完整的对话组（只有用户）- 理论上不应该出现
        groups.push({
          user: dialogs[i],
          agent: null,
          index: i / 2,
        })
      }
    }

    return groups.map((group, groupIndex) => {
      // 检查当前对话组是否有空内容
      const hasEmptyUserContent = !group.user.content || group.user.content.trim() === ''
      const hasEmptyAssistantContent = !group.agent?.content || group.agent.content.trim() === ''
      const hasError = hasEmptyUserContent || hasEmptyAssistantContent

      return (
        <div
          key={`group-${group.user.id}-${group.agent?.id || 'noassistant'}`}
          className={`mb-6 last:mb-0 border rounded-lg bg-white shadow-sm ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
        >
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="font-medium text-sm text-gray-700">示例对话 #{groupIndex + 1}</div>
              {hasError && (
                <div className="flex items-center text-xs text-red-600">
                  <ExclamationCircleOutlined className="w-3 h-3 mr-1" />
                  内容不能为空
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {!readOnly && (
                <>
                  {/* 仅当showMoveButtons为true时显示上移下移按钮 */}
                  {showMoveButtons && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleMoveDialog(groupIndex * 2, 'up')}
                        disabled={groupIndex === 0}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-transparent"
                      >
                        <ArrowUpOutlined className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDialog(groupIndex * 2, 'down')}
                        disabled={groupIndex === groups.length - 1}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-transparent"
                      >
                        <ArrowDownOutlined className="w-4 h-4 text-gray-500" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteDialog(groupIndex * 2)}
                    className="p-1 rounded hover:bg-gray-200 hover:text-red-500"
                  >
                    <IconFont type='icon-shanchu1' className="w-4 h-4 text-gray-500" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* User Message */}
          <div className={`px-4 py-3 border-b border-gray-200 ${hasEmptyUserContent ? 'bg-red-25' : ''}`}>
            <div className="flex items-center mb-2">
              <IconFont type='icon-yonghuming' className="w-4 h-4 text-blue-600 mr-2" />
              <div className="text-sm font-medium text-gray-700">用户提问</div>
              {hasEmptyUserContent && (
                <div className="ml-2 text-xs text-red-600">必填</div>
              )}
            </div>
            <div className="editor-container overflow-auto" style={{ height: `${defaultHeight}px` }}>
              <PromptEditorItem
                dense
                className={`w-full min-h-[60px] ${hasEmptyUserContent ? 'border-red-300' : ''}`}
                value={group.user.content}
                onChange={content => handleUpdateContent(group.user.id || '', content)}
                placeholder="输入用户的示例提问..."
                editable={!readOnly}
                style={{ height: 'auto' }}
                LazyLLMvariableBlock={{
                  show: true,
                  variables: (promptParams || []).map(v => ({
                    name: v.name || v.key,
                    value: v.key,
                  })),
                }}
              />
            </div>
          </div>

          {/* admin Message */}
          {group.agent && (
            <div className={`px-4 py-3 ${hasEmptyAssistantContent ? 'bg-red-25' : ''}`}>
              <div className="flex items-center mb-2">
                <IconFont type='icon-robot' className="w-4 h-4 text-green-600 mr-2" />
                <div className="text-sm font-medium text-gray-700">助手回答</div>
                {hasEmptyAssistantContent && (
                  <div className="ml-2 text-xs text-red-600">必填</div>
                )}
              </div>
              <div className="editor-container overflow-auto" style={{ height: `${defaultHeight}px` }}>
                <PromptEditorItem
                  dense
                  className={`w-full min-h-[60px] ${hasEmptyAssistantContent ? 'border-red-300' : ''}`}
                  value={group.agent.content}
                  onChange={content => handleUpdateContent(group.agent?.id || '', content)}
                  placeholder="输入AI助手的示例回答..."
                  editable={!readOnly}
                  style={{ height: 'auto' }}
                  LazyLLMvariableBlock={{
                    show: true,
                    variables: (promptParams || []).map(v => ({
                      name: v.name || v.key,
                      value: v.key,
                    })),
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )
    })
  }

  // 是否可以添加更多对话
  const canAddMore = !readOnly && (!maxDialogs || dialogs.length / 2 < maxDialogs)

  return (
    <div className="example-dialog-editor py-2">
      {/* 示例对话标题 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">
          示例对话（{Math.floor(dialogs.length / 2)} 组）
        </div>
        <div className="text-xs text-gray-500">
          帮助模型理解期望的输出格式和回答风格
        </div>
      </div>

      {/* 验证错误提示 */}
      {!validationResult.isValid && dialogs.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <ExclamationCircleOutlined className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700">{validationResult.errorMessage}</div>
        </div>
      )}

      {/* 对话组列表 */}
      <div className="space-y-4">
        {dialogs.length > 0
          ? renderDialogGroups()
          : (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              暂无示例对话，点击下方按钮添加
            </div>
          )}
      </div>

      {/* 添加按钮 */}
      {canAddMore && (
        <button
          type="button"
          onClick={handleAddDialog}
          className="mt-4 w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusOutlined className="mr-2 h-4 w-4" />
          添加示例对话
        </button>
      )}
    </div>
  )
}

export default ExampleDialogEditor
