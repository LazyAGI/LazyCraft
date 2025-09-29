'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { Tooltip } from 'antd'
import { GithubOutlined } from '@ant-design/icons'
import { useRouter, useSelectedLayoutSegment } from 'next/navigation'
import { useBoolean } from 'ahooks'
import { Bars3Icon } from '@heroicons/react/20/solid'
import AccountDropdown from './user-panel'
import AppNav from './app-gateway'
import DatasetNav from './data-route'
import ToolsNav from './tools-route'
import ResourceBaseNav from './res-source'
import PromptNav from './prompt-route'
import MessageList from './message-list/page'
import ModelNav from './model-route'
import ModelAdjustNav from './model-tune'
import InferenceServiceNav from './ai-path'
import style from './index.module.scss'

import BrandMark from '@/app/components/base/brand-mark/logo-site'
import useResponsiveBreakpoints from '@/shared/hooks/use-breakpoints'
import { useModalContext } from '@/shared/hooks/modal-context'
import SelectUserGroup from '@/app/components/app/select-user-group'
import Iconfont from '@/app/components/base/iconFont'

const navigationItemClasses = `
  flex items-center relative mr-0 px-3 h-8 rounded-[4px]
  font-medium text-sm
  cursor-pointer
  whitespace-nowrap
`

const Header = () => {
  const navigationRouter = useRouter()
  const currentSegment = useSelectedLayoutSegment()
  const deviceType = useResponsiveBreakpoints()
  const isMobileView = deviceType === 'mobile'

  const [isNavigationMenuVisible, { toggle: toggleNavigationMenu, setFalse: hideNavigationMenu }] = useBoolean(false)
  const { oepnProgressMonitor } = useModalContext()

  useEffect(() => {
    hideNavigationMenu()
  }, [currentSegment])

  const renderMobileMenuButton = () => (
    <div
      className='flex items-center justify-center h-8 w-8 cursor-pointer'
      onClick={toggleNavigationMenu}
    >
      <Bars3Icon className="h-4 w-4 text-gray-500" />
    </div>
  )

  const renderLogoSection = () => (
    <Link href="/apps" className='flex items-center mr-4 w-[8.9583vw]'>
      <BrandMark className='object-contain' />
    </Link>
  )

  const renderGithubLink = () => (
    <a href="https://github.com/LazyAGI/LazyLLM" target="_blank" className='flex mt-[-5px] text-[22px] items-center w-[1.3021vw]'>
      <GithubOutlined />
    </a>
  )

  const renderDesktopNavigation = () => (
    <div className='flex items-center'>
      <AppNav />
      <ResourceBaseNav className={navigationItemClasses} />
      <PromptNav className={navigationItemClasses} />
      <ModelNav className={navigationItemClasses} />
      <InferenceServiceNav className={navigationItemClasses} />
      <ModelAdjustNav className={navigationItemClasses} />
      <ToolsNav className={navigationItemClasses} />
      <DatasetNav className={navigationItemClasses} />
    </div>
  )

  const renderMobileLogo = () => (
    <div className='flex'>
      <Link href="/apps" className='flex items-center mr-4'>
        <BrandMark />
      </Link>
    </div>
  )

  const renderRightSection = () => (
    <div className='flex items-center flex-shrink-0'>
      <div>
        <SelectUserGroup />
      </div>
      <div
        className={`${style.iconWrap}`}
        onClick={() => { navigationRouter.push('/docCenter') }}
      >
        <Tooltip title="帮助文档">
          <Iconfont type='icon-bangzhuwendang' />
        </Tooltip>
      </div>
      <div
        className={`${style.iconWrap}`}
        onClick={() => { oepnProgressMonitor({ title: '上传/下载进度' }) }}
      >
        <Tooltip title="上传/下载进度">
          <Iconfont type='icon-jindujiankong' />
        </Tooltip>
      </div>
      <AccountDropdown isMobileView={isMobileView} />
      <MessageList />
    </div>
  )

  const renderMobileNavigationMenu = () => (
    <div className='w-full flex flex-col p-2 gap-y-1'>
      <AppNav />
      <DatasetNav />
      <ToolsNav className={navigationItemClasses} />
    </div>
  )

  return (
    <div className='flex flex-1 items-center justify-between px-4'>
      <div className='flex items-center'>
        {isMobileView && renderMobileMenuButton()}
        {!isMobileView && renderLogoSection()}
        {renderGithubLink()}
      </div>
      {isMobileView && renderMobileLogo()}
      {!isMobileView && renderDesktopNavigation()}
      {renderRightSection()}
      {(isMobileView && isNavigationMenuVisible) && renderMobileNavigationMenu()}
    </div>
  )
}

export default Header
