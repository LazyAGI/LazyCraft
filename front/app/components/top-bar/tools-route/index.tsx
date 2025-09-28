'use client'

import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import style from './index.module.scss'
import classNames from '@/shared/utils/classnames'
import Iconfont from '@/app/components/base/iconFont'

type ToolsNavigationProps = {
  className?: string
}

/**
 * 工具导航组件
 * 提供工具页面的导航链接
 */
const ToolsNav = ({
  className,
}: ToolsNavigationProps) => {
  const currentSegment = useSelectedLayoutSegment()
  const isActive = currentSegment === 'tools'

  // 构建链接样式类名
  const buildLinkClassName = () => classNames(
    className, 'group',
    isActive && 'bg-white',
    isActive ? 'text-primary-600' : 'text-gray-500',
    style.wrapNav,
  )

  // 渲染图标
  const renderIcon = () => (
    <span className={isActive ? style.activeIcon : style.normal}>
      <Iconfont type='icon-gongju' className='w-4 h-4' />
    </span>
  )

  return (
    <Link href="/tools" className={buildLinkClassName()}>
      {renderIcon()}
      {'工具'}
    </Link>
  )
}

export default ToolsNav
