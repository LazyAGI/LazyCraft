'use client'

import { useRequest } from 'ahooks'
import { createContext, useContext } from 'use-context-selector'
import type { FC, ReactNode } from 'react'
import { useState } from 'react'
import { getCurrentGroupList } from '@/infrastructure/api//user'

type PermitContextValue = {
  userGroups: undefined | any[]
  getUserGroups: VoidFunction
  statusAi: boolean
  setStatusAi: (status: boolean) => void
}

const PermitContext = createContext<PermitContextValue>({
  userGroups: undefined,
  getUserGroups: () => { },
  statusAi: false,
  setStatusAi: () => { },
})

type PermitContextProviderProps = {
  children: ReactNode
}

export const EntryCheckContextProvider: FC<PermitContextProviderProps> = ({ children }) => {
  const { data: resData, run: getUserGroups } = useRequest<any, any>(getCurrentGroupList, { manual: true })
  const [statusAi, setStatusAi] = useState(false)

  return (
    <PermitContext.Provider value={{
      userGroups: resData?.tenants,
      getUserGroups,
      statusAi,
      setStatusAi,
    }}>
      {children}
    </PermitContext.Provider>
  )
}

export const usePermitContext = () => useContext(PermitContext)
