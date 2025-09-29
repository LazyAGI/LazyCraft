'use client'
import type { FC } from 'react'
import React from 'react'

type FieldComponentProps = {
  title: string
  children: JSX.Element
}

const Field: FC<FieldComponentProps> = ({
  title, children,
}) => {
  // 构建标题样式类名
  const titleStyles = 'leading-8 text-[13px] font-medium text-gray-700'

  // 渲染标题区域
  const renderTitleSection = () => (
    <div className={titleStyles}>{title}</div>
  )

  // 渲染内容区域
  const renderContentSection = () => (
    <div>{children}</div>
  )

  return (
    <div>
      {renderTitleSection()}
      {renderContentSection()}
    </div>
  )
}

export default React.memo(Field)
