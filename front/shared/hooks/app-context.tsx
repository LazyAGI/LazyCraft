'use client'

import { useRequest } from 'ahooks'
import { useEffect, useState } from 'react'
import { createContext, useContext } from 'use-context-selector'
import type { FC, ReactNode } from 'react'
import Loading from '@/app/components/base/loading'
import { getUserInfo } from '@/infrastructure/api//common'
import { getPermissionList } from '@/infrastructure/api//permit'
import { getCoopJoins } from '@/infrastructure/api//user'
import type { UserProfileResult } from '@/core/data/common'
import { isAgentPage } from '@/shared/utils'

type AppContextValue = {
  convertuserSpecified: VoidFunction
  permitData: any
  teamData: any
  tempFile: any
  updateTempConfigured: any
  userSpecified: UserProfileResult
}

const RootStateContext = createContext<AppContextValue>({
  convertuserSpecified: () => { },
  permitData: {},
  teamData: {},
  tempFile: null,
  updateTempConfigured: () => { },
  userSpecified: {
    id: '',
    name: '',
  },
})

type AppContextProviderProps = {
  children: ReactNode
}

export const RootStateHubProvider: FC<AppContextProviderProps> = ({ children }) => {
  const { data: userSpecified, mutate: convertuserSpecified } = useRequest<any, any>(getUserInfo, { manual: isAgentPage() })
  const [tempFile, setTempFile] = useState<any>()
  const [permitData, setPermitData] = useState<any>({})
  const [teamData, setTeamData] = useState<any>({})

  useEffect(() => {
    if (userSpecified?.id) {
      getPermissionList().then((res) => {
        if (res)
          setPermitData(userSpecified.tenant?.role ? (res[userSpecified.tenant.role] || {}) : {})
      })
      getCoopJoins({ url: '/workspaces/coop/joins', options: { params: { target_type: 'app' } } }).then((res: any) => {
        const coopAppIds = res?.data || []
        setTeamData({ coopAppIds })
      })
    }
  }, [userSpecified?.id])

  const updateTempConfigured = (_file: any) => {
    setTempFile(_file)
  }

  if (!userSpecified && !isAgentPage())
    return <Loading type='app' />

  return (
    <RootStateContext.Provider value={{
      convertuserSpecified,
      permitData,
      teamData,
      tempFile,
      updateTempConfigured,
      userSpecified,
    }}>
      <div className='flex flex-col h-full overflow-y-auto'>
        <div className='grow relative flex flex-col overflow-y-auto overflow-x-hidden'>
          {children}
        </div>
      </div>
    </RootStateContext.Provider>
  )
}

export const useApplicationContext = () => useContext(RootStateContext)
