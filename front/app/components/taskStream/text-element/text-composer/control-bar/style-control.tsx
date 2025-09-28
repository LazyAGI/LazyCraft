import React, {
  memo,
  useCallback,
  useMemo,
} from 'react'
import { useStore } from '../store'
import { useWorkflowToolbarActions } from './hooks'
import IconFont from '@/app/components/base/iconFont'
import cn from '@/shared/utils/classnames'
import HoverGuide from '@/app/components/base/hover-tip-pro'

// 格式化操作类型
type FormatActionType = 'bold' | 'italic' | 'strikethrough' | 'link' | 'bullet'

// 格式化操作配置
const FORMAT_ACTION_CONFIG = {
  bold: {
    icon: <IconFont type='icon-ri-bold' />,
    tooltip: '加粗',
    storeKey: 'selectedIsBold' as const,
  },
  italic: {
    icon: <IconFont type='icon-ri-italic' />,
    tooltip: '斜体',
    storeKey: 'selectedIsItalic' as const,
  },
  strikethrough: {
    icon: <IconFont type='icon-strikethrough'/>,
    tooltip: '删除线',
    storeKey: 'selectedIsStrikeThrough' as const,
  },
  link: {
    icon: <IconFont type='icon-link'/>,
    tooltip: '链接',
    storeKey: 'selectedIsHyperlink' as const,
  },
  bullet: {
    icon: <IconFont type='icon-liebiaozhankai' />,
    tooltip: '列表',
    storeKey: 'selectedIsBullet' as const,
  },
} as const

// 格式化按钮属性
type FormatButtonProps = {
  readonly customTitle?: string
  readonly actionType: FormatActionType
}

// 格式化按钮组件
const FormatButton = ({
  customTitle,
  actionType,
}: FormatButtonProps) => {
  const { executeCommand } = useWorkflowToolbarActions()

  // 获取当前操作配置
  const actionConfig = FORMAT_ACTION_CONFIG[actionType]

  // 获取选中状态
  const isSelected = useStore(useCallback((state) => {
    switch (actionType) {
      case 'bold':
        return state.selectedIsBold
      case 'italic':
        return state.selectedIsItalic
      case 'strikethrough':
        return state.selectedIsStrikeThrough
      case 'link':
        return state.selectedIsHyperlink
      case 'bullet':
        return state.selectedIsBullet
      default:
        return false
    }
  }, [actionType]))

  // 生成工具提示文本
  const tooltipText = useMemo(() => {
    return customTitle || actionConfig.tooltip
  }, [customTitle, actionConfig.tooltip])

  // 生成图标组件
  const IconComponent = useMemo(() => {
    return React.cloneElement(actionConfig.icon, {
      className: cn(
        'w-4 h-4',
        isSelected && 'text-primary-600',
      ),
    })
  }, [actionConfig.icon, isSelected])

  // 处理点击事件
  const handleClick = useCallback(() => {
    executeCommand(actionType)
  }, [executeCommand, actionType])

  // 生成按钮样式类名
  const buttonClassName = useMemo(() => {
    return cn(
      'flex items-center justify-center w-8 h-8 cursor-pointer rounded-md text-gray-500 hover:text-gray-800 hover:bg-black/5 transition-colors',
      isSelected && 'bg-primary-50',
    )
  }, [isSelected])

  return (
    <HoverGuide popupContent={tooltipText}>
      <div
        className={buttonClassName}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        {IconComponent}
      </div>
    </HoverGuide>
  )
}

export default memo(FormatButton)
