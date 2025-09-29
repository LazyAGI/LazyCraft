'use client'

import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import styles from './index.module.scss'
import IconFont from '@/app/components/base/iconFont'
import classNames from '@/shared/utils/classnames'

type InferenceServiceNavigationProps = {
  className?: string
}

/**
 * 推理服务导航组件
 * 提供推理服务页面的导航链接
 */
const ServiceNav = ({
  className,
}: InferenceServiceNavigationProps) => {
  const currentSegment = useSelectedLayoutSegment()
  const isActive = currentSegment === 'inferenceService'

  // 构建链接样式类名
  const buildLinkClassName = () => classNames(
    className, 'group',
    isActive && 'bg-white',
    isActive ? 'text-primary-600' : 'text-gray-500',
    styles.inferenceServiceNavigationContainer,
  )

  // 渲染图标
  const renderIcon = () => (
    <div className={isActive ? styles.activeIcon : styles.normal}>
      <IconFont type='icon-tuilifuwu' className={'w-4 h-4'} />
    </div>
  )

  return (
    <Link href="/inferenceService/platform" className={buildLinkClassName()}>
      {renderIcon()}
      推理服务
    </Link>
  )
}

export default ServiceNav
