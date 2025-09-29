'use client'

import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import styles from './index.module.scss'
import IconFont from '@/app/components/base/iconFont'
import classNames from '@/shared/utils/classnames'

type ModelAdjustNavigationProps = {
  className?: string
}

/**
 * 模型微调导航组件
 * 提供模型微调页面的导航链接
 */
const ModelAdjustNav = ({
  className,
}: ModelAdjustNavigationProps) => {
  const currentSegment = useSelectedLayoutSegment()
  const isActive = currentSegment === 'modelAdjust'

  // 构建链接样式类名
  const buildLinkClassName = () => classNames(
    className, 'group',
    isActive && 'bg-white',
    isActive ? 'text-primary-600' : 'text-gray-500',
    styles.wrapNav,
  )

  // 渲染图标
  const renderIcon = () => (
    <div className={isActive ? styles.activeIcon : styles.normal}>
      <IconFont type='icon-moxingweitiao' className={'w-4 h-4'} />
    </div>
  )

  return (
    <Link href="/modelAdjust" className={buildLinkClassName()}>
      {renderIcon()}
      模型微调
    </Link>
  )
}

export default ModelAdjustNav
