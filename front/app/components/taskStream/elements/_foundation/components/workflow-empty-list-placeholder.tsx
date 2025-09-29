'use client'

import React from 'react'
import type { FC } from 'react'

/**
 * 工作流空列表占位符组件的属性接口
 * 定义了组件接收的配置参数
 */
type WorkflowEmptyListPlaceholderProps = {
  /** 占位符中显示的内容，支持React节点 */
  children: React.ReactNode
}

/**
 * 工作流空列表占位符组件
 * 
 * 这是一个通用的占位符组件，主要用于工作流节点中显示列表为空时的提示信息，
 * 提供以下特性：
 * - 统一的视觉样式，与工作流环境保持一致
 * - 支持自定义内容显示
 * - 响应式布局，适应不同内容长度
 * - 清晰的视觉层次，突出提示信息
 * 
 * 组件使用React.memo进行性能优化，避免不必要的重渲染
 */
const WorkflowEmptyListPlaceholder: FC<WorkflowEmptyListPlaceholderProps> = ({
  children,
}) => {
  // 定义占位符容器的样式类
  // 使用灰色背景和圆角设计，提供良好的视觉层次
  // 最小高度确保即使内容较少时也有合适的显示效果
  const containerClasses = 'flex rounded-md bg-gray-50 items-center min-h-[42px] justify-center leading-[18px] text-xs font-normal text-gray-500'

  return (
    <div className={containerClasses}>
      {/* 
        占位符内容区域
        支持任何React节点，提供灵活的内容展示能力
        居中显示，确保视觉平衡
      */}
      {children}
    </div>
  )
}

// 使用React.memo包装组件，避免父组件重渲染时的不必要更新
// 只有当props发生变化时才会重新渲染
export default React.memo(WorkflowEmptyListPlaceholder) 