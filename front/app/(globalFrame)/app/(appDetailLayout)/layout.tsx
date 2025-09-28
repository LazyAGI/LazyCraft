'use client'

import React from 'react'
import type { FC } from 'react'

// 应用详情布局组件的属性类型定义
export type CommonAppDetailLayoutParams = {
  children: React.ReactNode
}

const AppDetailLayout: FC<CommonAppDetailLayoutParams> = ({ children }) => {
  // 渲染子组件内容的核心逻辑
  const renderChildren = () => {
    return <>{children}</>
  }

  // 渲染主要的应用详情布局内容
  const renderMainLayout = () => {
    return renderChildren()
  }

  return renderMainLayout()
}

export default React.memo(AppDetailLayout)
