import { useCallback } from 'react'
import useResourceCrud from '../_base/hooks/use-resource-crud'

const useMcpResourceConfig = (resourceId: string, resourceData: any) => {
  const {
    inputs,
    readOnly,
    handleFieldChange,
  } = useResourceCrud(resourceId, resourceData)

  const handleMcpFieldUpdate = useCallback((fieldName: string, fieldValue: any) => {
    handleFieldChange(fieldName, fieldValue)
  }, [handleFieldChange])

  return {
    inputs,
    readOnly,
    handleFieldChange: handleMcpFieldUpdate,
  }
}

export default useMcpResourceConfig
