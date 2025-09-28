'use client'

import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import styles from './index.module.scss'
import IconFont from '@/app/components/base/iconFont'
import classNames from '@/shared/utils/classnames'

type DatasetNavigationProps = {
  className?: string
}

const DemoNav = ({
  className,
}: DatasetNavigationProps) => {
  const currentSegment = useSelectedLayoutSegment()
  const isActive = currentSegment === 'datasets'

  const buildLinkClassName = () => classNames(
    className, 'group',
    isActive && 'bg-white',
    isActive ? 'text-primary-600' : 'text-gray-500',
    styles.wrapNav,
  )

  const renderIcon = () => (
    <span className={isActive ? styles.activeIcon : styles.normal}>
      <IconFont type='icon-shuju' className={'w-4 h-4'} />
    </span>
  )

  return (
    <Link href="/datasets/datasetManager" className={buildLinkClassName()}>
      {renderIcon()}
      数据集
    </Link>
  )
}

export default DemoNav
