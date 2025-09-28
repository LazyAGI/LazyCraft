import { useCallback, useEffect, useRef } from 'react'
import produce from 'immer'
import { cloneDeep } from 'lodash-es'
import { useSyncDraft } from './itemAlignPlan'
import { useResources } from '@/app/components/taskStream/logicHandlers/resStore'

type ResourceDataUpdatePayload = {
  id: string
  data: Record<string, any>
}

export const useResourceDataUpdate = () => {
  const { resources, setResources } = useResources()
  const { handleDraftWorkflowSync } = useSyncDraft()
  const cachedResources = useRef<any[]>(cloneDeep(resources))

  useEffect(() => {
    // 缓存资源列表，避免多处同时调用handleResourceDataUpdate时部分字段更新失效问题
    cachedResources.current = cloneDeep(resources)
  }, [resources])

  const handleResourceDataUpdate = useCallback(({ id, data }: ResourceDataUpdatePayload) => {
    const newResources = produce(cachedResources.current, (draft) => {
      const currentResource = draft.find(item => item.id === id)
      if (currentResource)
        currentResource.data = { ...currentResource.data, ...data }
    })
    cachedResources.current = cloneDeep(newResources)
    // 所有资源
    setResources(newResources)
  }, [setResources])

  const handleResourceDataUpdateWithSyncDraft = useCallback((payload: ResourceDataUpdatePayload) => {
    handleResourceDataUpdate(payload)
    handleDraftWorkflowSync()
  }, [handleDraftWorkflowSync, handleResourceDataUpdate])

  return {
    handleResourceDataUpdate,
    handleResourceDataUpdateWithSyncDraft,
  }
}
