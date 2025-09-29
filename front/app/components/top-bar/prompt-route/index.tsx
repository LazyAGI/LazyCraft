'use client'

import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import style from './index.module.scss'
import Iconfont from '@/app/components/base/iconFont'
import classNames from '@/shared/utils/classnames'

type PromptNavigationProps = {
  className?: string
}

const PromptNav = ({
  className,
}: PromptNavigationProps) => {
  const currentSegment = useSelectedLayoutSegment()
  const isActive = currentSegment === 'prompt'

  const buildLinkClassName = () => classNames(
    className, 'group',
    isActive && 'bg-white',
    isActive ? 'text-primary-600' : 'text-gray-500',
    style.wrapNav,
  )

  const renderIcon = () => (
    <span className={isActive ? style.activeIcon : style.normal}>
      <Iconfont type='icon-Prompt' className='w-4 h-4' />
    </span>
  )

  return (
    <Link href="/prompt" className={buildLinkClassName()}>
      {renderIcon()}
      Prompt
    </Link>
  )
}

export default PromptNav
