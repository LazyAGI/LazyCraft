'use client'

import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import styles from './index.module.scss'
import IconFont from '@/app/components/base/iconFont'

import classNames from '@/shared/utils/classnames'

type DemoNavProps = {
  className?: string
}

/**
 * 模型仓库导航组件
 * 提供模型仓库页面的导航链接
 */
const DemoNav = ({
  className,
}: DemoNavProps) => {
  const selectedSegment = useSelectedLayoutSegment()
  const isActive = selectedSegment === 'modelWarehouse'

  return (
    <Link href="/modelWarehouse/modelManage" className={classNames(
      className, 'group',
      isActive && 'bg-white',
      isActive ? 'text-primary-600' : 'text-gray-500',
      styles.wrapNav,
    )}>
      <div className={isActive ? styles.activeIcon : styles.normal}>
        <IconFont type='icon-moxingcangku' className={'w-4 h-4'} />
      </div>
      模型仓库
    </Link>
  )
}

export default DemoNav
