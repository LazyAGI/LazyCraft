import type { FinalNodeType } from './types'
import useNodeDataOperations from '@/app/components/taskStream/elements/_foundation/hooks/fetch-item-feed-data'
import { useReadonlyNodes } from '@/app/components/taskStream/logicHandlers'

type FinalNodeConfigReturn = {
  readOnly: boolean
  inputs: FinalNodeType
  handleFieldChange: (field: string, value: any) => void
}

const useFinalNodeConfig = (nodeId: string, nodePayload: FinalNodeType): FinalNodeConfigReturn => {
  const { nodesReadOnly: readOnly } = useReadonlyNodes()
  const { inputs, handleFieldChange } = useNodeDataOperations<FinalNodeType>(nodeId, nodePayload)

  return {
    readOnly,
    inputs,
    handleFieldChange,
  }
}

export default useFinalNodeConfig
