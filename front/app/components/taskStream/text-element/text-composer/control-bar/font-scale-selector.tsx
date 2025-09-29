import { memo } from 'react'
import { useWorkflowFontSize } from './hooks'
import cn from '@/shared/utils/classnames'
import {
  AnchorPortal,
  AnchorPortalLauncher,
  BindPortalContent,
} from '@/app/components/base/promelement'
import IconFont from '@/app/components/base/iconFont'

// 字体大小选项配置
const FONT_SIZE_CONFIG = [
  {
    key: '10px',
    label: '小',
    className: 'text-xs',
  },
  {
    key: '12px',
    label: '中',
    className: 'text-sm',
  },
  {
    key: '14px',
    label: '大',
    className: 'text-base',
  },
] as const

// 字体大小选项类型
type FontSizeOption = typeof FONT_SIZE_CONFIG[number]

// 字体大小选择器组件
const TextSizeSelector = () => {
  const {
    fontSize,
    selectorVisible,
    toggleSelector,
    updateFontSize,
  } = useWorkflowFontSize()

  // 获取当前选中的字体大小选项
  const getCurrentFontSizeOption = (): FontSizeOption => {
    return FONT_SIZE_CONFIG.find(option => option.key === fontSize) || FONT_SIZE_CONFIG[0]
  }

  // 处理字体大小选择
  const handleFontSizeSelect = (selectedSize: string) => {
    updateFontSize(selectedSize)
    toggleSelector(false)
  }

  // 处理触发器点击
  const onTriggerClick = () => {
    toggleSelector(!selectorVisible)
  }

  const currentOption = getCurrentFontSizeOption()

  return (
    <AnchorPortal
      open={selectorVisible}
      onOpenChange={toggleSelector}
      placement='bottom-start'
      offset={2}
    >
      <AnchorPortalLauncher onClick={onTriggerClick}>
        <div
          className={cn(
            'flex items-center pl-2 pr-1.5 h-8 rounded-md text-[13px] font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors',
            selectorVisible && 'bg-gray-50',
          )}
        >
          <IconFont type='icon-font-size' className='mr-1 w-4 h-4' />
          {currentOption.label}
        </div>
      </AnchorPortalLauncher>

      <BindPortalContent>
        <div className='p-1 w-[120px] bg-white border-[0.5px] border-gray-200 rounded-md shadow-xl text-gray-700'>
          {FONT_SIZE_CONFIG.map(option => (
            <div
              key={option.key}
              className='flex items-center justify-between pl-3 pr-2 h-8 rounded-md cursor-pointer hover:bg-gray-50 transition-colors'
              onClick={(e) => {
                e.stopPropagation()
                handleFontSizeSelect(option.key)
              }}
            >
              <div
                style={{ fontSize: option.key }}
                className={option.className}
              >
                {option.label}
              </div>
              {fontSize === option.key && (
                <IconFont type='icon-fuzhi1' className='w-4 h-4 text-primary-500' />
              )}
            </div>
          ))}
        </div>
      </BindPortalContent>
    </AnchorPortal>
  )
}

export default memo(TextSizeSelector)
