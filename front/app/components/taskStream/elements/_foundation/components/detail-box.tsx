'use client'

import type { FC } from 'react'
import React from 'react'

/**
 * 信息面板组件的属性接口
 * 定义了信息面板接收的配置参数
 */
type Props = {
  /** 信息面板的标题文本，显示在内容上方 */
  title: string
  /** 信息面板的主要内容，支持字符串或JSX元素 */
  content: string | JSX.Element
}

/**
 * 信息面板组件
 * 
 * 这是一个轻量级的信息展示组件，主要用于工作流节点中显示配置信息、状态描述等，
 * 提供以下特性：
 * - 紧凑的布局设计，适合在有限空间内展示信息
 * - 标题和内容的清晰分层展示
 * - 支持纯文本和富文本内容
 * - 响应式文本换行处理
 * - 统一的视觉样式，与工作流环境保持一致
 * 
 * 组件使用React.memo进行性能优化，避免不必要的重渲染
 */
const InfoPanel: FC<Props> = ({
  title,
  content,
}) => {
  return (
    <div>
      {/* 
        信息面板容器
        使用灰色背景和圆角设计，提供良好的视觉层次
        最小高度确保即使内容为空时也有合适的显示效果
      */}
      <div className='px-[5px] py-[3px] bg-gray-100 rounded-md min-h-[22px]'>
        {/* 
          标题区域
          使用小号字体和灰色文本，通过uppercase样式增强可读性
          行高设置为4，确保文本垂直居中对齐
        */}
        <div className='leading-4 text-[10px] font-medium text-gray-500 uppercase'>
          {title}
        </div>
        {/* 
          内容区域
          使用稍大的字体和深色文本，提供良好的对比度
          break-words确保长文本能够正确换行，避免布局溢出
        */}
        <div className='leading-4 text-xs font-normal text-gray-700 break-words'>
          {content}
        </div>
      </div>
    </div>
  )
}

// 使用React.memo包装组件，避免父组件重渲染时的不必要更新
// 只有当props发生变化时才会重新渲染
export default React.memo(InfoPanel)
