import produce from 'immer'
import { useCallback } from 'react'
import { useStoreApi } from 'reactflow'
import { Modal } from 'antd'
import { useResources } from '@/app/components/taskStream/logicHandlers/resStore'
import {
  IWorkflowHistoryEvent,
  useResourceDataUpdate,
  useSyncDraft,
  useWorkflowLog,
} from '@/app/components/taskStream/logicHandlers'
import { useCheckNodeShape } from '@/app/components/taskStream/logicHandlers/checkList'

const useResourceCrud = (id: string, data: any) => {
  const { handleResourceDataUpdateWithSyncDraft } = useResourceDataUpdate()
  const store = useStoreApi()
  const { handleDraftWorkflowSync } = useSyncDraft()
  const {
    getResources,
    setResources,
    getReferenceNodesByResourceId,
    getReferenceResourcesByResourceId,
  } = useResources()
  const { getNodes, setNodes } = store.getState()
  const { recordStateToHistory } = useWorkflowLog()
  const { generateCheckParameters } = useCheckNodeShape()

  const setInputs = (newInputs: any) => {
    handleResourceDataUpdateWithSyncDraft({
      id,
      data: newInputs,
    })
  }

  const handleFieldChange = useCallback((key: string | any, value?: any) => {
    let newInputs
    if (typeof key === 'object' && typeof value === 'undefined') {
      newInputs = produce(data, (draft: any) => ({
        ...draft,
        ...key,
      }))
    }
    else {
      newInputs = produce(data, (draft: any) => {
        draft[key as string] = value
      })
    }
    setInputs(newInputs)
  }, [id, data, setInputs])

  /** 画布资源删除 */
  const handleDeleteResource = useCallback((params: { hasConfirm?: boolean }) => {
    const { hasConfirm = false } = params || {}
    const resourceList = getResources()
    const allNodes = getNodes() as any[]
    const currentResource = resourceList.find((item) => {
      return item.id === id
    })

    // 引用到该资源的节点控件
    const referencedNodes = getReferenceNodesByResourceId(allNodes, id)
    // 引用到该资源的资源控件
    const referencedResources = getReferenceResourcesByResourceId(id)

    if (referencedNodes?.length || referencedResources?.length) {
      Modal.confirm({
        title: '资源已被引用，确认删除?',
        className: 'controller-modal-confirm',
        content: `${[
          ...(referencedNodes?.map((item: any) => item?.data?.title) || []),
          ...(referencedResources?.map((item: any) => `${item?.data?.title}资源`) || []),
        ]?.join('、')}控件正在使用该资源，确认删除？`,
        onOk() {
          const nodes = getNodes() as any[]
          // 清空画布中引用该资源的控件节点的资源选择器所选值
          const newNodes = produce(nodes, (nodeDraft: any[]) => {
            nodeDraft.forEach((nodeItem: any) => {
              if (referencedNodes?.find((item: any) => nodeItem?.id === item?.id)) {
                const referencedFields = nodeItem?.data?.config__parameters?.filter((child) => {
                  return child?.type?.indexOf('resource_selector') > -1 && (
                    Array.isArray(nodeItem?.data?.[child?.name])
                      ? nodeItem?.data?.[child?.name].includes(id)
                      : nodeItem?.data?.[child?.name] === id
                  )
                })
                referencedFields.forEach((fieldItem) => {
                  if (Array.isArray(nodeItem?.data?.[fieldItem?.name])) {
                    nodeItem.data[fieldItem?.name] = nodeItem?.data?.[fieldItem?.name].filter((resourceId) => {
                      return resourceId !== id
                    })
                  }
                  else {
                    delete nodeItem?.data?.[fieldItem?.name]
                  }
                })
                const { configParameters, _valid_form_success } = generateCheckParameters({ targetInfo: nodeItem })
                nodeItem.data = {
                  ...nodeItem.data,
                  config__parameters: configParameters,
                  _valid_form_success,
                }
              }
            })
          })
          setNodes(newNodes)
          const newResources = produce(resourceList, (draft) => {
            const targetIndex = draft.findIndex((item: any) => item.id === id)
            if (targetIndex > -1)
              draft.splice(targetIndex, 1)

            // 清空画布中引用该资源的资源控件的资源选择器所选值
            referencedResources.forEach((item: any) => {
              const targetItem = draft.find((child: any) => child.id === item.id)
              if (targetItem) {
                if (item?.data?.payload__node_group) {
                  item.data.payload__node_group = item.data.payload__node_group?.map((groupItem: any) => {
                    delete groupItem.llm
                    delete groupItem.llm_name
                    return groupItem
                  })
                }
                else {
                  const targetKey = item?.data?.config__parameters?.find(child => child?.type?.indexOf('resource_selector') > -1)?.name
                  if (targetKey) {
                    if (Array.isArray(item.data[targetKey]))
                      item.data[targetKey] = item.data[targetKey].filter(resourceId => resourceId !== id)
                    else
                      delete item.data[targetKey]
                  }
                }
              }
            })
          })
          setResources(newResources)
          recordStateToHistory(IWorkflowHistoryEvent.ResourceDelete, currentResource?.title)
          // sync workflow draft
          handleDraftWorkflowSync()
        },
      })
    }
    else if (hasConfirm) {
      Modal.confirm({
        title: '确认删除?',
        className: 'controller-modal-confirm',
        content: `确认删除资源${data?.title}？`,
        onOk() {
          const newResources = produce(resourceList, (draft) => {
            const targetIndex = draft.findIndex((item: any) => item.id === id)
            if (targetIndex > -1)
              draft.splice(targetIndex, 1)
          })

          setResources(newResources)
          recordStateToHistory(IWorkflowHistoryEvent.ResourceDelete, currentResource?.title)

          // sync workflow draft
          handleDraftWorkflowSync()
        },
      })
    }
    else {
      const newResources = produce(resourceList, (draft) => {
        const targetIndex = draft.findIndex((item: any) => item.id === id)
        if (targetIndex > -1)
          draft.splice(targetIndex, 1)
      })
      setResources(newResources)
      recordStateToHistory(IWorkflowHistoryEvent.ResourceDelete, currentResource?.title)

      // sync workflow draft
      handleDraftWorkflowSync()
    }
  }, [
    id,
    data,
    getResources,
    setResources,
    recordStateToHistory,
    getNodes,
    setNodes,
    handleDraftWorkflowSync,
    getReferenceNodesByResourceId,
    getReferenceResourcesByResourceId,
  ])

  return {
    inputs: data,
    setInputs,
    handleFieldChange,
    handleDeleteResource,
  }
}

export default useResourceCrud
