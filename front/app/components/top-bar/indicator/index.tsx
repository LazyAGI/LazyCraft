'use client'

import classNames from '@/shared/utils/classnames'

type StatusIndicatorProps = {
  color?: 'green' | 'orange' | 'red' | 'blue' | 'yellow' | 'gray'
  className?: string
}

// 颜色样式配置
const COLOR_STYLES = {
  green: {
    bg: 'bg-[#31C48D]',
    border: 'border-[#0E9F6E]',
    shadow: 'shadow-[0_0_5px_-3px_rgba(14,159,110,0.1),0.5px_0.5px_3px_rgba(14,159,110,0.3),inset_1.5px_1.5px_0px_rgba(255,255,255,0.2)]',
  },
  orange: {
    bg: 'bg-[#FF5A1F]',
    border: 'border-[#D03801]',
    shadow: 'shadow-[0_0_5px_-3px_rgba(255,90,31,0.2),0.5px_0.5px_3px_rgba(255, 90, 31, 0.3), inset_1.5px_1.5px_0_rgba(255, 255, 255, 0.2)]',
  },
  red: {
    bg: 'bg-[#F04438]',
    border: 'border-[#D92D20]',
    shadow: 'shadow-[0_0_5px_-3px_rgba(249,112,102,0.1),0.5px_0.5px_3px_rgba(249, 112, 102, 0.2), inset_1.5px_1.5px_0_rgba(255, 255, 255, 0.4)]',
  },
  blue: {
    bg: 'bg-[#36BFFA]',
    border: 'border-[#0BA5EC]',
    shadow: 'shadow-[0_0_5px_-3px_rgba(208, 213, 221, 0.1),0.5px_0.5px_3px_rgba(208, 213, 221, 0.3), inset_1.5px_1.5px_0_rgba(255, 255, 255, 0.2)]',
  },
  yellow: {
    bg: 'bg-[#FDB022]',
    border: 'border-[#F79009]',
    shadow: 'shadow-[0_0_5px_-3px_rgba(253, 176, 34, 0.1),0.5px_0.5px_3px_rgba(253, 176, 34, 0.3), inset_1.5px_1.5px_0_rgba(255, 255, 255, 0.2)]',
  },
  gray: {
    bg: 'bg-[#D0D5DD]',
    border: 'border-[#98A2B3]',
    shadow: 'shadow-[0_0_5px_-3px_rgba(208, 213, 221, 0.1),0.5px_0.5px_3px_rgba(208, 213, 221, 0.3), inset_1.5px_1.5px_0_rgba(255, 255, 255, 0.2)]',
  },
} as const

/**
 * 状态指示器组件
 * 用于显示不同颜色的状态指示点
 */
export default function StatusIndicator({
  color = 'green',
  className = '',
}: StatusIndicatorProps) {
  const styles = COLOR_STYLES[color]

  return (
    <div
      className={classNames(
        'w-2 h-2 border border-solid rounded-[3px]',
        styles.bg,
        styles.border,
        styles.shadow,
        className,
      )}
    />
  )
}
