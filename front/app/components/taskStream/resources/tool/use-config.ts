import type { ToolResourceType } from './types'
import useResourceCrud from '@/app/components/taskStream/resources/_base/hooks/use-resource-crud'
import {
  useReadonlyNodes,
} from '@/app/components/taskStream/logicHandlers'

const useToolResourceConfig = (resourceId: string, resourcePayload: ToolResourceType) => {
  const { inputs, handleFieldChange } = useResourceCrud(resourceId, resourcePayload)
  const { nodesReadOnly: isReadOnly } = useReadonlyNodes()

  return {
    inputs,
    readOnly: isReadOnly,
    handleFieldChange,
  }
}

export default useToolResourceConfig
