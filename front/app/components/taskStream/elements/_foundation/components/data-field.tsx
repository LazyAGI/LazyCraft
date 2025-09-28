'use client'

import type { FC } from 'react'
import React from 'react'
import { ArrowDownOutlined, QuestionOutlined } from '@ant-design/icons'
import { useBoolean } from 'ahooks'
import cn from '@/shared/utils/classnames'
import HoverGuide from '@/app/components/base/hover-tip-pro'

/**
 * 字段组件属性接口
 * 定义了字段组件的所有配置参数和可选功能
 */
type FieldComponentProps = {
  /** 自定义CSS类名，用于样式定制 */
  className?: string
  /** 字段标题，支持JSX元素或字符串 */
  title: JSX.Element | string
  /** 提示信息，显示在标题右侧的问号图标中 */
  tooltip?: string
  /** 是否支持折叠/展开功能 */
  enableFold?: boolean
  /** 字段内容，可以是JSX元素、字符串或null */
  children?: JSX.Element | string | null
  /** 标题栏右侧的操作按钮区域 */
  activities?: JSX.Element
  /** 是否使用内联布局，影响标题和内容的排列方式 */
  inline?: boolean
  /** 是否为必填字段，会显示红色星号标识 */
  required?: boolean
  /** 默认折叠状态，仅在enableFold为true时生效 */
  defaultFolded?: boolean
}

/**
 * 字段组件
 *
 * 这是一个通用的字段展示组件，主要用于工作流节点的配置界面，提供以下功能：
 * - 字段标题展示，支持必填标识
 * - 可选的提示信息（tooltip）
 * - 可折叠/展开的内容区域
 * - 灵活的操作按钮区域
 * - 支持内联和块级两种布局模式
 *
 * 组件使用React.memo进行性能优化，避免不必要的重渲染
 */
const FieldComponent: FC<FieldComponentProps> = ({
  className,
  title,
  tooltip,
  children,
  activities,
  inline,
  enableFold,
  required,
  defaultFolded = true,
}) => {
  // 使用ahooks的useBoolean管理折叠状态
  // isFolded: 当前是否处于折叠状态
  // toggleFold: 切换折叠/展开状态
  const [isFolded, { toggle: toggleFold }] = useBoolean(defaultFolded)

  /**
   * 处理标题栏点击事件
   * 当支持折叠功能时，点击标题栏可以切换折叠状态
   */
  const handleHeaderClick = () => {
    if (enableFold)
      toggleFold()
  }

  /**
   * 渲染字段标题区域
   * 包含必填标识、标题文本和提示图标
   *
   * @returns 标题区域的JSX元素
   */
  const renderTitle = () => (
    <div className='flex items-center h-6 min-w-0 flex-1'>
      <div className='system-sm-semibold-uppercase text-text-secondary truncate pr-1 min-w-0 flex-1'>
        {/* 必填字段显示红色星号标识 */}
        {required && <span className='ml-0.5 text-xs font-semibold text-[#D92D20]'>*</span>}
        {title}
      </div>
      {/* 提示信息图标，使用TooltipPlus组件显示详细信息 */}
      {tooltip && (
        <HoverGuide popupContent={
          <div className='w-[120px]'>
            {tooltip}
          </div>
        }>
          <QuestionOutlined className='w-3.5 h-3.5 ml-0.5 text-text-quaternary shrink-0' />
        </HoverGuide>
      )}
    </div>
  )

  /**
   * 渲染操作区域
   * 包含用户自定义的操作按钮和折叠/展开箭头
   *
   * @returns 操作区域的JSX元素
   */
  const renderOperations = () => (
    <div className='flex shrink-0'>
      {/* 用户自定义的操作按钮 */}
      {activities && <div>{activities}</div>}
      {/* 折叠/展开箭头，根据状态旋转显示 */}
      {enableFold && (
        <ArrowDownOutlined
          className='w-4 h-4 text-text-tertiary cursor-pointer transform transition-transform'
          style={{ transform: isFolded ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        />
      )}
    </div>
  )

  // 判断是否应该显示子内容
  // 当没有子内容时不显示
  // 当支持折叠且处于折叠状态时不显示
  const shouldShowChildren = children && (!enableFold || (enableFold && !isFolded))

  return (
    <div className={cn(className, inline && 'flex justify-between items-center w-full')}>
      {/*
        标题栏区域
        当支持折叠功能时，整个标题栏可点击
        使用flexbox布局实现标题和操作的左右对齐
      */}
      <div
        onClick={handleHeaderClick}
        className={cn('flex justify-between items-center w-full', enableFold && 'cursor-pointer')}
      >
        {renderTitle()}
        {renderOperations()}
      </div>
      {/*
        内容区域
        根据折叠状态和布局模式决定是否显示
        非内联模式下添加顶部边距
      */}
      {shouldShowChildren && (
        <div className={cn(!inline && 'mt-1')}>
          {children}
        </div>
      )}
    </div>
  )
}

// 使用React.memo包装组件，避免父组件重渲染时的不必要更新
// 只有当props发生变化时才会重新渲染
export default React.memo(FieldComponent)
