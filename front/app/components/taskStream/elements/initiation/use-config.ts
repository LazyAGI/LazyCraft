import type { EntryNodeCategory } from './types'
import useNodeDataOperations from '@/app/components/taskStream/elements/_foundation/hooks/fetch-item-feed-data'
import { useReadonlyNodes } from '@/app/components/taskStream/logicHandlers'

type EntryNodeConfiguration = {
  readOnly: boolean
  inputs: EntryNodeCategory
  handleFieldChange: (field: string, value: any) => void
}

const useEntryNodeConfiguration = (nodeId: string, nodePayload: EntryNodeCategory): EntryNodeConfiguration => {
  const { nodesReadOnly: isReadOnly } = useReadonlyNodes()
  const { inputs: nodeInputs, handleFieldChange } = useNodeDataOperations<EntryNodeCategory>(nodeId, nodePayload)

  return {
    readOnly: isReadOnly,
    inputs: nodeInputs,
    handleFieldChange,
  }
}

export default useEntryNodeConfiguration
