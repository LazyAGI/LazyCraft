'use client'

import { useRequest } from 'ahooks'
import { createContext, useContext } from 'use-context-selector'
import type { FC, ReactNode } from 'react'
import { getAgentInit, getAgentSessions } from '@/infrastructure/api//agent'

type AgentContextValue = {
  agentToken: undefined | string
  agentHistoryList: undefined | any[]
  getAgentToken: (payload: any) => void
  getAgentHistorys: (payload: any) => void
}

const AgentContext = createContext<AgentContextValue>({
  agentToken: undefined,
  agentHistoryList: undefined,
  getAgentToken: (payload: any) => { },
  getAgentHistorys: (payload: any) => { },
})

type AgentContextProviderProps = {
  children: ReactNode
}

export const AgentContextProvider: FC<AgentContextProviderProps> = ({ children }) => {
  const { data: resData, run: getAgentHistorys } = useRequest<any, any>(getAgentSessions, { manual: true })
  const { data: tokenData, run: getAgentToken } = useRequest<any, any>(getAgentInit, { manual: true })

  return (
    <AgentContext.Provider value={{
      agentToken: tokenData?.token,
      agentHistoryList: resData?.data,
      getAgentHistorys,
      getAgentToken,
    }}>
      {children}
    </AgentContext.Provider>
  )
}

export const useAgentContext = () => useContext(AgentContext)
