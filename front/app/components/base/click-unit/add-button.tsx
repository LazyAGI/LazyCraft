'use client'
import type { FC } from 'react'
import React from 'react'
import { PlusOutlined } from '@ant-design/icons'
import cn from '@/shared/utils/classnames'

// 添加按钮组件的属性类型定义
type AddButtonComponentProps = { className?: string; onClick: () => void }

const AddButton: FC<AddButtonComponentProps> = ({
  className, onClick,
}) => {
  // 处理点击事件的逻辑
  const handleClick = () => {
    onClick()
  }

  // 构建按钮的基础样式类名
  const LazyLLMbuttonBaseStyles = 'p-1 rounded-md cursor-pointer hover:bg-gray-200 select-none'

  // 构建图标的样式类名
  const LazyLLMiconStyles = 'w-4 h-4 text-gray-500'

  // 渲染主要的添加按钮内容
  const renderMainAddButtonContent = () => (
    <div
      className={cn(className, LazyLLMbuttonBaseStyles)}
      onClick={handleClick}
    >
      <PlusOutlined className={LazyLLMiconStyles} />
    </div>
  )

  return renderMainAddButtonContent()
}

export default React.memo(AddButton)
