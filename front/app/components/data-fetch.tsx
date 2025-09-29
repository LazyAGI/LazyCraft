'use client'

import { SWRConfig } from 'swr'
import { Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { isAgentPage } from '@/shared/utils'

/**
 * SWR 初始化器内容组件
 * 负责处理身份验证和 SWR 配置
 */
const SwrInitializerContent = ({
  children,
}: { children: ReactNode }) => {
  const navigationRouter = useRouter()
  const searchParams = useSearchParams()
  const urlConsoleToken = searchParams.get('console_token')
  const storedConsoleToken = localStorage?.getItem('console_token')
  const [isInitialized, setIsInitialized] = useState(false)

  // 处理身份验证逻辑
  const handleAuthentication = () => {
    if (!isAgentPage()) {
      if (!(urlConsoleToken || storedConsoleToken))
        navigationRouter.replace('/signin')

      if (urlConsoleToken) {
        localStorage?.setItem('console_token', urlConsoleToken!)
        navigationRouter.replace('/apps', { forceOptimisticNavigation: false } as any)
      }
    }
    setIsInitialized(true)
  }

  useEffect(() => {
    handleAuthentication()
  }, [])

  if (!isInitialized)
    return null

  return (
    <SWRConfig>
      {children}
    </SWRConfig>
  )
}

/**
 * SWR 初始化器组件
 * 为子组件提供 SWR 配置和身份验证
 */
const SwrInitializer = ({ children }: { children: ReactNode }) => {
  return (
    <Suspense>
      <SwrInitializerContent>
        {children}
      </SwrInitializerContent>
    </Suspense>
  )
}

export default SwrInitializer
