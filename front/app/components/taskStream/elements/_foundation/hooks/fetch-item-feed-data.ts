import { useCallback } from 'react'
import produce from 'immer'
import { useLazyLLMNodeDataUpdate } from '@/app/components/taskStream/logicHandlers'
import type { CommonExecutionNodeType as CommonNodeType } from '@/app/components/taskStream/types'

const useNodeDataOperations = <T>(id: string, data: CommonNodeType<T>) => {
  const { handleNodeDataUpdateWithSyncDraft } = useLazyLLMNodeDataUpdate()

  const updateNodeData = (newData: CommonNodeType<T>) => {
    handleNodeDataUpdateWithSyncDraft({
      data: newData,
      id,
    })
  }

  const processFieldUpdate = useCallback((key: string | any, value?: any) => {
    let updatedData: CommonNodeType<T>
    if (typeof key === 'object' && typeof value === 'undefined') {
      updatedData = produce(data, (draft: any) => ({
        ...draft,
        ...key,
      }))
    }
    else {
      updatedData = produce(data, (draft: any) => {
        draft[key as string] = value
      })
    }
    updateNodeData(updatedData)
  }, [data, updateNodeData])

  return {
    handleFieldChange: processFieldUpdate,
    inputs: data,
    setInputs: updateNodeData,
  }
}

export default useNodeDataOperations
