'use client'

import React from 'react'
import type { FC } from 'react'
import { useStore } from '@/app/components/taskStream/store'

/**
 * 包装器组件属性类型
 * 定义了编辑器包装器组件的所有配置选项
 */
type WrapComponentProps = {
  isNodeEnv?: boolean // 是否在节点内部
  isOpened: boolean // 是否处于展开状态
  className: string // CSS类名
  style: React.CSSProperties // 内联样式
  children: React.ReactNode // 子组件内容
}

/**
 * Web应用包装器组件
 * 为Web应用环境提供基础的容器包装，不包含特殊逻辑
 */
const WebAppWrapper = ({
  className,
  style,
  children,
}: WrapComponentProps) => {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}

/**
 * 节点包装器组件
 * 为工作流节点环境提供智能宽度调整功能
 * 根据展开状态动态计算面板宽度
 */
const NodeWrapper = ({
  children,
  className,
  isOpened,
  style,
}: WrapComponentProps) => {
  // 从全局状态获取节点面板宽度
  const nodePanelWidth = useStore(state => state.nodePanelWidth)

  // 计算最终样式，展开时使用节点面板宽度
  const computedStyle = (() => {
    if (isOpened) {
      return {
        ...style,
        width: nodePanelWidth - 1, // 减去1像素避免边框重叠
      }
    }
    return style
  })()

  return <div className={className} style={computedStyle}>{children}</div>
}

/**
 * 主包装器组件
 * 根据使用环境智能选择包装器类型
 * 在节点内部使用NodeWrapper，否则使用WebAppWrapper
 */
const Main: FC<WrapComponentProps> = ({
  isNodeEnv,
  ...otherProps
}: WrapComponentProps) => {
  return isNodeEnv ? <NodeWrapper {...otherProps} /> : <WebAppWrapper {...otherProps} />
}

export default React.memo(Main)
