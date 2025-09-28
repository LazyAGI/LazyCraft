/**
 * 代码节点组件
 *
 * 工作流中的代码执行节点，用于在工作流中执行自定义代码逻辑
 * 支持代码输入、执行和结果输出
 *
 * @fileoverview 代码节点组件定义
 * @author 工作流系统
 * @version 1.0.0
 */

import type { FC } from 'react'
import React from 'react'
import type { CodeBlockNodeType } from './types'
import type { ExecutionNodeProps } from '@/app/components/taskStream/types'

const CodeNodeComponent: FC<ExecutionNodeProps<CodeBlockNodeType>> = () => {
  return (
    <div></div>
  )
}

export default React.memo(CodeNodeComponent)
