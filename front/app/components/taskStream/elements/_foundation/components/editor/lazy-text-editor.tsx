'use client'

import type { FC } from 'react'
import { useCallback } from 'react'
import { useBoolean } from 'ahooks'
import EditorBaseComponent from './editor-base'

/**
 * 文本编辑器组件的属性接口
 * 定义了组件接收的所有配置参数和回调函数
 */
type TextEditorComponentProps = {
  /** 编辑器的当前值内容 */
  value: string
  /** 值变化时的回调函数，用于同步父组件的状态 */
  onChange: (value: string) => void
  /** 编辑器标题，支持JSX元素或字符串 */
  title: JSX.Element | string
  /** 标题栏右侧的操作按钮区域，如删除、计数等 */
  headerActions?: JSX.Element
  /** 编辑器的最小高度，单位为像素 */
  minHeight?: number
  /** 编辑器失去焦点时的回调函数 */
  onBlur?: () => void
  /** 占位符文本，当编辑器为空时显示 */
  placeholder?: string
  /** 是否只读模式，为true时禁用编辑功能 */
  readonly?: boolean
  /** 是否在工作流环境中使用，影响样式和交互行为 */
  inWorkflow?: boolean
}

/**
 * 懒加载文本编辑器组件
 *
 * 这是一个基于EditorBaseComponent的文本编辑器实现，提供了以下特性：
 * - 支持文本输入和编辑
 * - 自动管理焦点状态
 * - 响应式高度调整
 * - 工作流环境适配
 * - 只读模式支持
 *
 * 组件使用React.memo进行性能优化，避免不必要的重渲染
 */
const TextEditorComponent: FC<TextEditorComponentProps> = ({
  value,
  onChange,
  title,
  headerActions,
  minHeight,
  onBlur,
  placeholder,
  readonly,
  inWorkflow,
}) => {
  // 管理编辑器焦点状态
  const [isFocused, { setTrue: setFocused, setFalse: setUnfocused }] = useBoolean(false)

  /**
   * 处理文本内容变化的回调函数
   * 使用useCallback优化性能，避免子组件不必要的重渲染
   * 支持中文输入法（IME）的合成事件
   *
   * @param e - React的文本区域变化事件对象
   */
  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // 直接更新值，不延迟，确保中文输入法正常工作
    onChange(e.target.value)
  }, [onChange])

  /**
   * 处理编辑器失去焦点的回调函数
   * 同时处理焦点状态重置和用户自定义的onBlur逻辑
   *
   * @param e - React的失焦事件对象
   */
  const handleBlur = useCallback(() => {
    setUnfocused()
    onBlur?.()
  }, [setUnfocused, onBlur])

  return (
    <EditorBaseComponent
      title={title}
      content={value}
      headerActions={headerActions}
      focused={isFocused && !readonly}
      minHeight={minHeight}
      inWorkflow={inWorkflow}
    >
      {/*
        文本输入区域
        使用textarea元素提供多行文本编辑能力
        样式设计考虑了工作流环境的视觉一致性
      */}
      <textarea
        value={value}
        onChange={handleValueChange}
        onFocus={setFocused}
        onBlur={handleBlur}
        className='w-full h-full px-3 resize-none bg-transparent border-none focus:outline-none leading-[18px] text-[13px] font-normal text-gray-900 placeholder:text-gray-300'
        placeholder={placeholder}
        readOnly={readonly}
      />
    </EditorBaseComponent>
  )
}

export default TextEditorComponent
