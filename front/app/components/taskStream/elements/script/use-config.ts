import type { CodeBlockNodeType } from './types'
import useNodeDataOperations from '@/app/components/taskStream/elements/_foundation/hooks/fetch-item-feed-data'
import useOneStepRun from '@/app/components/taskStream/elements/_foundation/hooks/exec-solo-act'
import {
  useReadonlyNodes,
} from '@/app/components/taskStream/logicHandlers'

const useCodeConfig = (nodeId: string, nodePayload: CodeBlockNodeType) => {
  const { nodesReadOnly: readOnly } = useReadonlyNodes()
  const { inputs, handleFieldChange } = useNodeDataOperations<CodeBlockNodeType>(nodeId, nodePayload)

  const {
    showSingleRun,
    concealSingleRun,
    toShapeInputs,
    toShapeOutputs,
    executionStatus,
    handleRun,
    handleStop,
    executionInputData,
    setexecutionInputData,
    runResult,
  } = useOneStepRun<CodeBlockNodeType>({
    id: nodeId,
    data: inputs,
    defaultexecutionInputData: {},
  })

  const varInputs = toShapeInputs(inputs.config__input_shape, inputs.config__input_shape_transform)
  const varOutputs = toShapeOutputs(inputs.config__output_shape)

  const handlehideSingleExecution = () => {
    setexecutionInputData({})
    sessionStorage.removeItem('executionInputData')
    concealSingleRun()
  }

  return {
    readOnly,
    inputs,
    handleFieldChange,
    showSingleRun,
    hideSingleExecution: handlehideSingleExecution,
    executionStatus,
    handleRun,
    handleStop,
    varInputs,
    varOutputs,
    executionInputData,
    setexecutionInputData,
    runResult,
  }
}

export default useCodeConfig
