'use client'
import React, { type FC } from 'react'
import VarReferenceVars from './work-var-ref-vars'
import type { ExecutionNodeOutPutVar, ValueRetriever, Variable } from '@/app/components/taskStream/types'

/**
 * 工作流节点变量引用弹窗组件的属性接口
 */
type WorkflowNodeVariableReferencePopupProps = {
  /** 弹窗的宽度 */
  itemWidth?: number
  /** 变量选择变化时的回调函数 */
  onChange: (value: ValueRetriever, varDetail: Variable) => void
  /** 可用的变量列表 */
  vars: ExecutionNodeOutPutVar[]
}

/**
 * 工作流节点变量引用弹窗组件
 *
 * 该组件用于显示变量引用的选择弹窗，支持：
 * - 自定义弹窗宽度
 * - 变量选择回调
 * - 变量列表展示
 * - 响应式布局
 *
 * @param props 组件属性
 * @returns 渲染的变量引用弹窗组件
 */
const WorkflowNodeVariableReferencePopup: FC<WorkflowNodeVariableReferencePopupProps> = ({
  itemWidth,
  onChange,
  vars,
}) => {
  return (
    <div className='p-1 bg-white rounded-lg border border-gray-200 shadow-lg space-y-1' style={{
      width: itemWidth || 228,
    }}>
      <VarReferenceVars
        itemWidth={itemWidth}
        onChange={onChange}
        searchBoxCls='mt-1'
        vars={vars}
      />
    </div>
  )
}

// 使用React.memo优化组件性能，避免不必要的重渲染
export default React.memo(WorkflowNodeVariableReferencePopup)
