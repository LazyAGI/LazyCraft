import React, { memo, useEffect, useMemo, useRef } from 'react'
import { Select, message } from 'antd'
import type { SelectProps } from 'antd'
import { switchUserGroup } from '@/infrastructure/api//user'
import { usePermitContext } from '@/shared/hooks/permit-context'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { get } from '@/infrastructure/api//base'
import { sleep } from '@/shared/utils'

type ISelectProps = Omit<SelectProps, 'onChange'>

type ISelectUserGroup = {
  onChange?: (data?: any) => void
  onStatusChange?: (status: boolean) => void
} & ISelectProps

const SelectUserGroup = memo((props: ISelectUserGroup) => {
  const { onChange, ...others } = props
  const { userGroups, getUserGroups, setStatusAi } = usePermitContext()
  const { userSpecified } = useApplicationContext()

  useEffect(() => {
    getUserGroups()
  }, [getUserGroups])

  const userGroupList = useMemo(() => {
    return !userGroups ? [] : userGroups.map(item => ({ label: item.name, value: item.id }))
  }, [userGroups])

  const groupChange = (v) => {
    switchUserGroup({ tenant_id: v }).then((res) => {
      window.location.href = `${location.origin}/apps`
    })
  }

  const tenantId = userSpecified?.tenant?.id

  const timer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!tenantId)
      return

    const getCurrentWorkspace = () => {
      get('/workspaces/current/tenant').then((res: any) => {
        if (res.tenant_id) {
          if (res.tenant_id !== tenantId) {
            if (timer.current)
              clearInterval(timer.current)

            message.warning('当前工作空间已切换，将刷新界面')
            sleep(1000).then(() => {
              window.location.href = `${location.origin}/apps`
            })
          }
        }
      })
    }

    if (timer.current)
      clearInterval(timer.current)

    timer.current = setInterval(() => {
      getCurrentWorkspace()
    }, 3600000)
    return () => {
      if (timer.current)
        clearInterval(timer.current)
    }
  }, [tenantId])

  useEffect(() => {
    if (tenantId && userGroups) {
      const currentTenant = userGroups.find(item => item.id === tenantId)
      setStatusAi(currentTenant?.enable_ai || false)
    }
  }, [tenantId, userGroups, setStatusAi])

  if (!tenantId)
    return null

  const defaultOptions = [{ label: '加载中...', value: tenantId }]

  return (
    <Select
      value={tenantId}
      style={{ width: '11.4583vw', marginRight: '18px' }}
      onChange={groupChange}
      options={(userGroupList && userGroupList.length > 0) ? userGroupList : defaultOptions}
      {...others}
    />
  )
})

SelectUserGroup.displayName = 'SelectUserGroup'

export default SelectUserGroup
