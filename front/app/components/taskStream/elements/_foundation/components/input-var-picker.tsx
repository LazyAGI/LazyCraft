'use client'

import type { FC } from 'react'
import React from 'react'
import { useBoolean } from 'ahooks'
import PromptEditor from '@/app/components/base/signal-editor'
import type {
  ExecutionNode,
  ExecutionNodeOutPutVar,
  Variable,
} from '@/app/components/taskStream/types'
import cn from '@/shared/utils/classnames'

/**
 * HTTP输入组件属性接口
 * 基于HTTP组件的实际使用需求定义
 */
type HttpInputProps = {
  /** 组件实例ID，用于区分不同的输入框 */
  instanceKey?: string
  /** 自定义CSS类名 */
  className?: string
  /** 占位符文本 */
  placeholder?: string
  /** 占位符的CSS类名 */
  placeholderCls?: string
  /** 提示编辑器的最小高度CSS类名 */
  promptMinHeightCls?: string
  /** 输入框的当前值 */
  value: string
  /** 值变化时的回调函数 */
  onChange: (value: string) => void
  /** 焦点状态变化的回调函数 */
  onFocusChange?: (value: boolean) => void
  /** 是否只读模式 */
  readOnly?: boolean
  /** 当前节点可用的变量列表，支持两种类型 */
  nodesOutputVars?: Variable[] | ExecutionNodeOutPutVar[]
  /** 工作流中可用的节点列表 */
  enabledNodes?: ExecutionNode[]
}

/**
 * HTTP输入组件
 *
 * 这是一个专门为HTTP节点设计的输入组件，基于PromptEditor构建，
 * 提供以下功能：
 * - 文本输入和编辑
 * - 工作流变量引用支持
 * - 焦点状态管理
 * - 只读模式支持
 *
 * 组件使用React.memo进行性能优化
 */
const HttpInputComponent: FC<HttpInputProps> = ({
  enabledNodes = [],
  className,
  instanceKey,
  nodesOutputVars,
  onChange,
  onFocusChange,
  placeholder,
  placeholderCls,
  promptMinHeightCls = 'min-h-[20px]',
  readOnly,
  value,
}) => {
  // 使用ahooks的useBoolean管理编辑器焦点状态
  const [isFocused, {
    setFalse: setUnfocused,
    setTrue: setFocused,
  }] = useBoolean(false)

  // 当焦点状态变化时，通知父组件
  React.useEffect(() => {
    onFocusChange?.(isFocused)
  }, [isFocused, onFocusChange])

  /**
   * 构建工作流节点映射关系
   * 为变量选择器提供节点信息
   */
  const buildWorkflowNodesMap = () => {
    return enabledNodes.reduce((acc, node) => {
      acc[node.id] = {
        title: node.data.title,
        type: node.data.type,
      }
      return acc
    }, {} as Record<string, Pick<ExecutionNode['data'], 'title' | 'type'>>)
  }

  /**
   * 将变量转换为variableBlock期望的格式
   * 支持两种输入类型：Variable[] 和 ExecutionNodeOutPutVar[]
   */
  const convertVarsToVariableBlockFormat = (): { name: string; value: string }[] => {
    if (!nodesOutputVars || !Array.isArray(nodesOutputVars))
      return []

    // 如果是Var[]格式，直接转换为variableBlock格式
    if (nodesOutputVars.length > 0 && 'variable' in nodesOutputVars[0]) {
      return (nodesOutputVars as Variable[]).map(v => ({
        name: v.variable,
        value: v.variable,
      }))
    }

    // 如果是ExecutionNodeOutPutVar[]格式，提取变量名
    if (nodesOutputVars.length > 0 && 'nodeId' in nodesOutputVars[0]) {
      const result: { name: string; value: string }[] = []
      const executionNodes = nodesOutputVars as ExecutionNodeOutPutVar[]
      executionNodes.forEach((node) => {
        if (node.vars && Array.isArray(node.vars)) {
          node.vars.forEach((v) => {
            result.push({
              name: v.variable,
              value: v.variable,
            })
          })
        }
      })
      return result
    }

    return []
  }

  return (
    <div className={className}>
      <PromptEditor
        className={cn(promptMinHeightCls, '!leading-[18px]')}
        editable={!readOnly}
        instanceId={instanceKey}
        onChange={onChange}
        onBlur={setUnfocused}
        onFocus={setFocused}
        placeholder={placeholder}
        value={value}
        variableBlock={{
          show: true,
          variables: convertVarsToVariableBlockFormat(),
        }}
      />
    </div>
  )
}

// 使用React.memo包装组件，避免父组件重渲染时的不必要更新
export default React.memo(HttpInputComponent)
