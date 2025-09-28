import type { HTMLProps, PropsWithChildren } from 'react'
import classNames from '@/shared/utils/classnames'
import Iconfont from '@/app/components/base/iconFont'

// 建议操作组件的属性类型定义
type SuggestedActionPropsLayout = PropsWithChildren<HTMLProps<HTMLAnchorElement> & {
  disabled?: boolean
  icon?: React.ReactNode
  link?: string
}>

const SuggestedActionLayout = ({ children, className, disabled, icon, link, ...props }: SuggestedActionPropsLayout) => {
  // 构建建议操作组件的样式类名
  const buildActionClassName = () => {
    return classNames(
      'flex justify-start items-center gap-2 h-[34px] px-2.5 bg-gray-100 rounded-lg transition-colors [&:not(:first-child)]:mt-1',
      disabled ? 'shadow-xs opacity-30 cursor-not-allowed' : 'hover:bg-primary-50 hover:text-primary-600 cursor-pointer',
      className,
    )
  }

  // 渲染建议操作组件的主要内容
  const renderActionContent = () => (
    <a href={disabled ? undefined : link} target='_blank' rel='noreferrer'
      className={buildActionClassName()}
      {...props}
    >
      <div className='relative w-4 h-4 mb-1.5'>{icon}</div>
      <div className='grow shrink basis-0 text-[13px] font-medium leading-[18px]'>{children}</div>
      <Iconfont type='icon-a-youshangjiantou1' />
    </a>
  )

  return renderActionContent()
}

export default SuggestedActionLayout
