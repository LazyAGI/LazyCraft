'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import { useHover } from 'ahooks'
import style from './index.module.scss'
import Iconfont from '@/app/components/base/iconFont'
import classNames from '@/shared/utils/classnames'
import { useStore as useAppStore } from '@/app/components/app/store'

type NavigationProps = {
  text: string
  activeSegment: string | string[]
  link: string
  curNav: boolean
}

const Nav = ({
  text,
  activeSegment,
  link,
  curNav,
}: NavigationProps) => {
  const setAppDetail = useAppStore(state => state.setAppDetail)
  const elementRef = useRef(null)
  const isHovered = useHover(elementRef)

  const currentSegment = useSelectedLayoutSegment()
  const isActive = Array.isArray(activeSegment) ? activeSegment.includes(currentSegment!) : currentSegment === activeSegment

  const handleClick = () => {
    setAppDetail()
    if (isHovered)
      window.location.href = '/apps'
  }

  const buildContainerClassName = () => `
    flex items-center h-8 mr-0 px-0.5 rounded-[4px] text-sm shrink-0 font-medium
  `

  const buildLinkClassName = () => classNames(`
    flex items-center h-7 px-2.5 cursor-pointer rounded-[4px]
    ${style.wrapNav}
    ${isActive ? 'text-components-main-nav-nav-button-text-active' : 'text-gray-500'}
    ${curNav && isActive && 'hover:bg-components-main-nav-nav-button-bg-active-hover'}
  `)

  const renderIcon = () => {
    if (isHovered && curNav)
      return <Iconfont type='icon-zuojiantou' className='w-4 h-4 mr-2' />

    return (
      <span className={isActive ? style.activeIcon : style.normal}>
        <Iconfont type='icon-yingyongshangdian' className='w-4 h-4' />
      </span>
    )
  }

  return (
    <div className={buildContainerClassName()}>
      <Link href={link}>
        <div
          onClick={handleClick}
          className={buildLinkClassName()}
          ref={elementRef}
        >
          <div>
            {renderIcon()}
          </div>
          {text}
        </div>
      </Link>
    </div>
  )
}

export default Nav
