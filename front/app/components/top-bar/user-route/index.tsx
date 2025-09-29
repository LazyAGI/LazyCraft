'use client'

import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import style from './index.module.scss'
import Iconfont from '@/app/components/base/iconFont'
import classNames from '@/shared/utils/classnames'

type UserNavigationProps = {
  className?: string
}

const UserNav = ({
  className,
}: UserNavigationProps) => {
  const currentSegment = useSelectedLayoutSegment()
  const isActive = currentSegment === 'user'

  const buildLinkClassName = () => classNames(
    className, 'group',
    isActive && 'bg-white',
    isActive ? 'text-primary-600' : 'text-gray-500',
    style.wrapNav,
  )

  const renderIcon = () => (
    <span className={isActive ? style.activeIcon : style.normal}>
      <Iconfont type='icon-yonghuguanli' className='w-4 h-4' />
    </span>
  )

  return (
    <Link href="/user/list" prefetch className={buildLinkClassName()}>
      {renderIcon()}
      用户管理
    </Link>
  )
}

export default UserNav
