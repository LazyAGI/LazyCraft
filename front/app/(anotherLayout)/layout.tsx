import React from 'react'
import type { ReactNode } from 'react'
import SwrInitializer from '@/app/components/data-fetch'
import { RootStateHubProvider } from '@/shared/hooks/app-context'
import TopFrameEnclosure from '@/app/components/top-bar/head-wrap'
import Header from '@/app/components/top-bar/another-header'
import { EmitterProvider } from '@/shared/hooks/event-emitter'
import { LayerStackContextProvider } from '@/shared/hooks/modal-context'
import { AgentContextProvider } from '@/shared/hooks/agent-context'

type AnotherLayoutProps = {
  children: ReactNode
}

const AnotherLayout = ({ children }: AnotherLayoutProps) => {
  const renderContextProviders = () => {
    return (
      <RootStateHubProvider>
        <EmitterProvider>
          <LayerStackContextProvider>
            <AgentContextProvider>
              <TopFrameEnclosure>
                <Header />
              </TopFrameEnclosure>
              {children}
            </AgentContextProvider>
          </LayerStackContextProvider>
        </EmitterProvider>
      </RootStateHubProvider>
    )
  }

  return (
    <>
      <SwrInitializer>
        {renderContextProviders()}
      </SwrInitializer>
    </>
  )
}

export const metadata = {
  title: 'LazyLLM',
}

export default AnotherLayout
