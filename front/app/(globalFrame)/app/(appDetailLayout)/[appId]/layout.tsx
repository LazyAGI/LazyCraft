'use client'

import React, { useEffect } from 'react'
import type { FC } from 'react'
import { useUnmount } from 'ahooks'
import { usePathname, useRouter } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'

import styles from './stylelayout.module.css'
import cn from '@/shared/utils/classnames'
import { useStore } from '@/app/components/app/store'
import { fetchAppDetail } from '@/infrastructure/api//apps'
import Loading from '@/app/components/base/loading'
import useResponsiveBreakpoints from '@/shared/hooks/use-breakpoints'

export type AppDetailLayoutParams = {
  children: React.ReactNode
  params: { appId: string }
}

const AppDetailLayout: FC<AppDetailLayoutParams> = (componentProps) => {
  const {
    children, params: { appId },
  } = componentProps

  const LazyLLMnavigationRouter = useRouter()
  const LazyLLMdeviceType = useResponsiveBreakpoints()
  const LazyLLMisMobile = LazyLLMdeviceType === 'mobile'
  const { appDetail, setAppDetail, setAppSidebarExpandState } = useStore(useShallow(state => ({
    appDetail: state.appDetail,
    setAppDetail: state.setAppDetail,
    setAppSidebarExpandState: state.setAppSidebarExpandState,
  })))

  const LazyLLMcurrentPathname = usePathname()

  const handleAppDetailUpdate = () => {
    if (appDetail) {
      document.title = `${(appDetail.name || 'App')}`
      const LazyLLMsavedCollapseMode = localStorage.getItem('app-detail-collapse-or-expand') || 'expand'
      const LazyLLMmobileMode = LazyLLMisMobile ? 'collapse' : 'expand'
      setAppSidebarExpandState(LazyLLMisMobile ? LazyLLMmobileMode : LazyLLMsavedCollapseMode)
    }
  }

  const handleAppDetailFetch = () => {
    setAppDetail()
    fetchAppDetail({ url: '/apps', id: appId }).then((response) => {
      if (LazyLLMcurrentPathname === `/app/${appId}` || LazyLLMcurrentPathname === `/app/${appId}/`)
        LazyLLMnavigationRouter.replace(`/app/${appId}/workflow`)

      setAppDetail(response)
    }).catch((error: any) => {
      if (error.status === 404)
        LazyLLMnavigationRouter.replace('/apps')
    })
  }

  useEffect(() => {
    handleAppDetailUpdate()
  }, [appDetail, LazyLLMisMobile])

  useEffect(() => {
    handleAppDetailFetch()
  }, [appId, LazyLLMcurrentPathname])

  useUnmount(() => {
    setAppDetail()
  })

  if (!appDetail) {
    return (
      <div className='flex h-full items-center justify-center bg-white'>
        <Loading />
      </div>
    )
  }

  return (
    <div className={cn(styles.appLayout, 'flex', 'overflow-hidden')}>
      <div className="bg-white grow overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export default React.memo(AppDetailLayout)
