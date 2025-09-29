import { useCallback } from 'react'
import type { UniverseNodeType } from './types'
import useNodeDataOperations from '@/app/components/taskStream/elements/_foundation/hooks/fetch-item-feed-data'
import useOneStepRun from '@/app/components/taskStream/elements/_foundation/hooks/exec-solo-act'
import {
  useReadonlyNodes,
} from '@/app/components/taskStream/logicHandlers'

const useUniverseConfig = (nodeId: string, nodePayload: UniverseNodeType) => {
  const { nodesReadOnly: isReadOnly } = useReadonlyNodes()
  const { inputs: nodeInputs, handleFieldChange, setInputs: updateNodeInputs } = useNodeDataOperations<UniverseNodeType>(nodeId, nodePayload)

  const {
    showSingleRun,
    concealSingleRun,
    toShapeInputs,
    toShapeOutputs,
    executionStatus,
    isCompleted,
    handleRun,
    handleStop,
    executionInputData,
    setexecutionInputData,
    runResult,
  } = useOneStepRun<UniverseNodeType>({
    id: nodeId,
    data: nodeInputs,
    defaultexecutionInputData: {},
  })

  const variableInputs = toShapeInputs(nodeInputs.config__input_shape, nodeInputs.config__input_shape_transform)
  const variableOutputs = toShapeOutputs(nodeInputs.config__output_shape)

  const inputVariableValues = (() => {
    const variables: Record<string, any> = {}
    Object.keys(executionInputData).forEach((key) => {
      variables[key] = executionInputData[key]
    })
    return variables
  })()

  const setInputVariableValues = useCallback((newPayload: Record<string, any>) => {
    setexecutionInputData(newPayload)
  }, [setexecutionInputData])

  const hideSingleExecutionAndReset = useCallback(() => {
    setInputVariableValues({})
    sessionStorage.removeItem('executionInputData')
    concealSingleRun()
  }, [setInputVariableValues, concealSingleRun])

  return {
    readOnly: isReadOnly,
    inputs: nodeInputs,
    handleFieldChange,
    setInputs: updateNodeInputs,
    showSingleRun,
    hideSingleExecution: hideSingleExecutionAndReset,
    executionStatus,
    isCompleted,
    handleRun,
    handleStop,
    varInputs: variableInputs,
    varOutputs: variableOutputs,
    inputVarValues: inputVariableValues,
    setInputVarValues: setInputVariableValues,
    runResult,
  }
}

export default useUniverseConfig
