'use client'

import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import styles from './index.module.scss'
import IconFont from '@/app/components/base/iconFont'
import classNames from '@/shared/utils/classnames'

type ToolNavigationProps = {
  className?: string
}

const DemoNav = ({
  className,
}: ToolNavigationProps) => {
  const currentSegment = useSelectedLayoutSegment()
  const isActive = currentSegment === 'modelWarehouse'

  const buildLinkClassName = () => classNames(
    className, 'group',
    isActive && 'bg-white',
    isActive ? 'text-primary-600' : 'text-gray-500 hover:bg-gray-200',
  )

  const renderIcon = () => (
    <div className={isActive ? styles.activeIcon : ''}>
      <IconFont type='icon-gongju' className={'w-4 h-4'} />
    </div>
  )

  return (
    <Link href="/modelWarehouse" className={buildLinkClassName()}>
      {renderIcon()}
      模型仓库
    </Link>
  )
}

export default DemoNav
