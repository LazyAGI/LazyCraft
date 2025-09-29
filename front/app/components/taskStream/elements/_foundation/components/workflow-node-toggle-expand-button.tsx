'use client'
import React, { useCallback } from 'react'
import type { FC } from 'react'
import { Button } from 'antd'
import IconFont from '@/app/components/base/iconFont'
/**
 * 工作流节点切换展开按钮组件的属性接口
 */
type WorkflowNodeToggleExpandButtonProps = {
  /** 当前是否为展开状态 */
  isOpened: boolean
  /** 展开状态变化时的回调函数 */
  onOpenChange: (isOpened: boolean) => void
}

/**
 * 工作流节点切换展开按钮组件
 *
 * 该组件用于工作流节点面板中的展开/收起功能，支持：
 * - 动态图标切换（展开/收起）
 * - 状态管理
 * - 点击事件处理
 * - 性能优化
 *
 * @param props 组件属性
 * @returns 渲染的切换展开按钮组件
 */
const WorkflowNodeToggleExpandButton: FC<WorkflowNodeToggleExpandButtonProps> = ({
  isOpened,
  onOpenChange,
}) => {
  /**
   * 处理切换按钮点击事件
   * 切换当前的展开状态
   */
  const handleToggle = useCallback(() => {
    onOpenChange(!isOpened)
  }, [isOpened, onOpenChange])

  // 根据当前状态动态选择图标组件
  const IconComponent = isOpened ? <IconFont type='icon-shouqi2' className='w-4 h-4' /> : <IconFont type='icon-zhankai1' className='w-4 h-4' />

  return (
    <Button
      type="text"
      size="small"
      icon={IconComponent}
      onClick={handleToggle}
      style={{
        width: '24px',
        height: '24px',
        padding: '2px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '6px',
      }}
    />
  )
}

// 使用React.memo优化组件性能，避免不必要的重渲染
export default React.memo(WorkflowNodeToggleExpandButton)
