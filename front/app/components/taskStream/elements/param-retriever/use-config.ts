import { useCallback, useRef } from 'react'
import produce from 'immer'
import { merge } from 'lodash-es'
import type { ValueRetriever, Variable } from '../../types'
import { VariableType } from '../../types'
import {
  useIsChatMode,
  useReadonlyNodes,
} from '../../logicHandlers'
import useOneStepRun from '../_foundation/hooks/exec-solo-act'
import type { ModelConfiguration, ParameterDefinition, ParameterParserNodeType } from './types'
import useNodeDataOperations from '@/app/components/taskStream/elements/_foundation/hooks/fetch-item-feed-data'
import { generateShape } from '@/infrastructure/api//universeNodes/universe_default_config'

const useParameterExtractorConfig = (nodeId: string, nodePayload: ParameterParserNodeType) => {
  const { nodesReadOnly: isReadOnly } = useReadonlyNodes()
  const isChatMode = useIsChatMode()

  const { inputs: nodeInputs, setInputs: updateNodeInputs } = useNodeDataOperations<ParameterParserNodeType>(nodeId, nodePayload)
  const inputsRef = useRef(nodeInputs)

  const updateInputs = useCallback((newInputs: ParameterParserNodeType) => {
    updateNodeInputs(newInputs)
    inputsRef.current = newInputs
  }, [updateNodeInputs])

  const filterVariableByType = useCallback((varPayload: Variable) => {
    return [VariableType.string].includes(varPayload.type)
  }, [])

  const updateInputVariable = useCallback((newInputVar: ValueRetriever | string) => {
    const updatedInputs = produce(nodeInputs, (draft) => {
      draft.config__input_shape = (newInputVar.slice(-1) as ValueRetriever || []).map(name => ({
        ...generateShape(name, 'str'),
      }))
    })
    updateInputs(updatedInputs)
  }, [nodeInputs, updateInputs])

  const updateExtractionParameters = useCallback((newParams: ParameterDefinition[]) => {
    const updatedInputs = produce(nodeInputs, (draft) => {
      draft.payload__params = newParams
      draft.config__output_shape = newParams.map(i => generateShape(i.name, i.type))
    })
    updateInputs(updatedInputs)
  }, [nodeInputs, updateInputs])

  const appendExtractionParameter = useCallback((param: ParameterDefinition) => {
    const updatedInputs = produce(nodeInputs, (draft) => {
      if (!draft.payload__params)
        draft.payload__params = []
      draft.payload__params.push(param)
      draft.config__output_shape = draft.payload__params.map(i => generateShape(i.name, i.type))
    })
    updateInputs(updatedInputs)
  }, [nodeInputs, updateInputs])

  const importFromTool = useCallback((params: ParameterDefinition[]) => {
    const updatedInputs = produce(nodeInputs, (draft) => {
      draft.payload__params = params
    })
    updateInputs(updatedInputs)
  }, [nodeInputs, updateInputs])

  const updateModel = useCallback((model: ModelConfiguration) => {
    const updatedInputs = produce(inputsRef.current, (draft) => {
      merge(draft, model)
    })
    updateInputs(updatedInputs)
  }, [updateInputs])

  const {
    showSingleRun,
    hideSingleExecution,
    toShapeInputs,
    executionStatus,
    handleRun,
    handleStop,
    executionInputData,
    setexecutionInputData,
    runResult,
  } = useOneStepRun<ParameterParserNodeType>({
    id: nodeId,
    data: nodeInputs,
    defaultexecutionInputData: {
      'query': '',
      '#files#': [],
    },
  })

  const variableInputs = toShapeInputs(nodeInputs.config__input_shape, nodeInputs.config__input_shape_transform)
  const inputVariableValues = (() => {
    const variables: Record<string, any> = {}
    Object.keys(executionInputData)
      .forEach((key) => {
        variables[key] = executionInputData[key]
      })
    return variables
  })()

  const setInputVariableValues = useCallback((newPayload: Record<string, any>) => {
    setexecutionInputData(newPayload)
  }, [setexecutionInputData])

  return {
    readOnly: isReadOnly,
    handleInputVarChange: updateInputVariable,
    filterVar: filterVariableByType,
    isChatMode,
    inputs: nodeInputs,
    handleImportFromTool: importFromTool,
    handleExactParamsChange: updateExtractionParameters,
    addExtractParameter: appendExtractionParameter,
    varInputs: variableInputs,
    inputVarValues: inputVariableValues,
    showSingleRun,
    hideSingleExecution,
    executionStatus,
    handleRun,
    handleStop,
    runResult,
    setInputVarValues: setInputVariableValues,
    handleModelChanged: updateModel,
  }
}

export default useParameterExtractorConfig
