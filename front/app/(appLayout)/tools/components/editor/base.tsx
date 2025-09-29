'use client'

import React, { useCallback, useRef, useState } from 'react'
import type { FC } from 'react'
import copy from 'copy-to-clipboard'
import HeightResizeWrap from '../editor/code-editor/prompt-editor-height-resize-wrap'
import BaseModelAI from './baseModelAI'
import Overlay from './overlay'
import Icon from '@/app/components/base/iconFont'
import cn from '@/shared/utils/classnames'

import { usePermitContext } from '@/shared/hooks/permit-context'
import useToggleExpend from '@/app/components/taskStream/elements/_foundation/hooks/switch-stream-fold'
import type { ParamData } from '@/core/data/common'

/**
 * 基础组件属性类型定义
 * 定义了编辑器基础组件的所有配置选项
 */
type BaseComponentProps = {
  className?: string // 自定义CSS类名
  title: JSX.Element | string // 组件标题
  headerRight?: JSX.Element // 头部右侧内容
  children: JSX.Element // 子组件内容
  minHeight?: number // 最小高度
  height?: number // 固定高度
  value: string // 编辑器值
  isFocus: boolean // 是否处于焦点状态
  isNodeEnv?: boolean // 是否在节点内部
  onGenerated?: (code: string, params?: ParamData) => void // 生成完成回调
}

/**
 * 基础编辑器组件
 * 提供统一的编辑器容器、头部、内容区域和AI生成功能
 */
const Base: FC<BaseComponentProps> = ({
  children,
  className,
  headerRight,
  height = 570,
  isFocus,
  isNodeEnv,
  minHeight = 120,
  onGenerated,
  title,
  value,
}) => {
  // 容器引用，用于控制展开/收起状态
  const wrapperRef = useRef<HTMLDivElement>(null)
  // 获取AI权限状态
  const { statusAi } = usePermitContext()

  // 使用展开/收起钩子管理组件状态
  const {
    wrapperClassName, wrapStyle, isOpened,
  } = useToggleExpend({ ref: wrapperRef, hasFooter: false, isNodeEnv })

  // 计算编辑器内容区域的最小高度
  const editorContentMinHeight = minHeight - 30
  // 编辑器内容高度状态管理
  const setEditorContentHeight = useState(editorContentMinHeight)[1]

  // 复制状态管理
  const [isCopy, setIsCopy] = React.useState(false)
  // AI模态框显示状态
  const [isModalOpen, setIsModalOpen] = useState(false)

  /**
   * 构建容器CSS类名
   * 根据焦点状态和展开状态动态生成样式类
   */
  const buildContainerClassName = () => {
    return cn(
      className,
      isOpened && 'h-full',
      'rounded-lg border',
      isFocus ? 'bg-white border-gray-200' : 'bg-white border-gray-200 overflow-hidden',
    )
  }

  /**
   * 处理复制操作
   * 复制内容到剪贴板并显示成功状态
   */
  const handleCopyAction = useCallback(() => {
    copy(value)
    setIsCopy(true)
    // 2秒后重置复制状态
    setTimeout(() => {
      setIsCopy(false)
    }, 2000)
  }, [value])

  /**
   * 渲染头部区域
   * 包含标题、AI生成按钮、右侧内容和复制按钮
   */
  const renderHeaderSection = () => {
    return (
      <div className='flex justify-end items-center h-7 pt-1 pl-3 pr-2'>
        {/* 标题显示 */}
        <div className='text-xs font-semibold text-gray-700'>{title}</div>

        {/* AI生成按钮 */}
        {statusAi && (
          <Icon
            type='icon-AIshengcheng1'
            className='flex items-center cursor-pointer'
            onClick={() => setIsModalOpen(true)}
          />
        )}

        {/* 右侧内容和复制按钮容器 */}
        <div
          className='flex items-center'
          onClick={(e) => {
            e.nativeEvent.stopImmediatePropagation()
            e.stopPropagation()
          }}
        >
          {headerRight}

          {/* 复制按钮状态切换 */}
          {!isCopy
            ? (
              <Icon type='icon-jianqieban'
                className='mx-1 w-3.5 h-3.5 text-gray-500 cursor-pointer'
                onClick={handleCopyAction}
              />
            )
            : (
              <Icon type='icon-wenjuanshezhi_tijiaocishu' className='mx-1 w-3.5 h-3.5 text-gray-500' />
            )}
        </div>
      </div>
    )
  }

  /**
   * 渲染内容区域
   * 包含可调整高度的编辑器容器
   */
  const renderContentSection = () => {
    return (
      <HeightResizeWrap
        height={height}
        minHeight={editorContentMinHeight}
        onHeightChange={setEditorContentHeight}
        disableResize={true}
      >
        <div className='h-full pb-2'>
          {children}
        </div>
      </HeightResizeWrap>
    )
  }

  return (
    <Overlay className={cn(wrapperClassName)} style={wrapStyle} isNodeEnv={isNodeEnv} isOpened={isOpened}>
      {/* 主容器 */}
      <div ref={wrapperRef} className={buildContainerClassName()}>
        {renderHeaderSection()}
        {renderContentSection()}
      </div>

      {/* AI生成模态框 */}
      <BaseModelAI
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        value={value}
        onGenerated={(code, params) => {
          onGenerated?.(code, params)
        }}
      />
    </Overlay>
  )
}

export default React.memo(Base)
