import useResourceCrud from '@/app/components/taskStream/resources/_base/hooks/use-resource-crud'
import {
  useReadonlyNodes,
} from '@/app/components/taskStream/logicHandlers'

const useDocumentResourceConfig = (resourceId: string, resourceData: any) => {
  const { inputs, handleFieldChange } = useResourceCrud<any>(resourceId, resourceData)
  const { nodesReadOnly: isReadOnly } = useReadonlyNodes()

  return {
    inputs,
    readOnly: isReadOnly,
    handleFieldChange,
  }
}

export default useDocumentResourceConfig
