import React from 'react'
import type { ReactNode } from 'react'
import { EntryCheckContextProvider } from '@/shared/hooks/permit-context'
import { LayerStackContextProvider } from '@/shared/hooks/modal-context'
// import { ProviderContextProvider } from '@/shared/hooks/provider-context'
import { EmitterProvider } from '@/shared/hooks/event-emitter'
import { RootStateHubProvider } from '@/shared/hooks/app-context'
import TopFrameEnclosure from '@/app/components/top-bar/head-wrap'
import Header from '@/app/components/top-bar'
import SwrInitializer from '@/app/components/data-fetch'

type AppLayoutProps = {
  children: ReactNode
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const buildContextProviders = () => {
    return (
      <RootStateHubProvider>
        <EmitterProvider>
          <LayerStackContextProvider>
            <EntryCheckContextProvider>
              <TopFrameEnclosure>
                <Header />
              </TopFrameEnclosure>
              {children}
            </EntryCheckContextProvider>
          </LayerStackContextProvider>
        </EmitterProvider>
      </RootStateHubProvider>
    )
  }

  return (
    <>
      <SwrInitializer>
        {buildContextProviders()}
      </SwrInitializer>
    </>
  )
}

export const metadata = {
  title: 'LazyLLM',
}

export default AppLayout
