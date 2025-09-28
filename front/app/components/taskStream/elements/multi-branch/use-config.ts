import { useCallback } from 'react'
import produce from 'immer'
import { v4 } from 'uuid'
import type { Variable } from '../../types'
import { VariableType } from '../../types'
import type {
  IfElseNodeType,
  SwitchCaseItem,
} from './types'
import { branchNameValid } from './utils'
import useNodeDataOperations from '@/app/components/taskStream/elements/_foundation/hooks/fetch-item-feed-data'
import {
  useLazyLLMEdgesInteractions,
  useReadonlyNodes,
} from '@/app/components/taskStream/logicHandlers'
import useAvailableVarList from '@/app/components/taskStream/elements/_foundation/hooks/retrieve-stream-usable'
import type { currentLanguage } from '@/app/components/taskStream/elements/script/types'
import { useAggregatorSync } from '@/app/components/taskStream/logicHandlers/mergerAdjust'

const useSwitchCaseConfig = (nodeId: string, nodePayload: IfElseNodeType) => {
  const { nodesReadOnly: isReadOnly } = useReadonlyNodes()
  const { handleEdgeDeleteByDeleteBranch } = useLazyLLMEdgesInteractions()
  const { inputs: nodeInputs, setInputs: updateNodeInputs, handleFieldChange } = useNodeDataOperations<IfElseNodeType>(nodeId, nodePayload)
  const { syncAggregators } = useAggregatorSync()

  const filterVariableByType = useCallback((varPayload: Variable) => {
    return varPayload.type !== VariableType.arrayFile
  }, [])

  const filterNumberVariable = useCallback((varPayload: Variable) => {
    return varPayload.type === VariableType.number
  }, [])

  const {
    availableVars: availableVariables,
    enabledNodesWithParent: enabledNodesWithParentNode,
  } = useAvailableVarList(nodeId, {
    restrictLeafNodeVar: false,
    filterVar: filterVariableByType,
  })

  const {
    availableVars: availableNumberVariables,
    enabledNodesWithParent: availableNumberNodesWithParentNode,
  } = useAvailableVarList(nodeId, {
    restrictLeafNodeVar: false,
    filterVar: filterNumberVariable,
  })

  const addSwitchCase = useCallback(() => {
    const updatedInputs = produce(nodeInputs, (draft) => {
      if (draft.config__output_ports) {
        const defaultCaseIndex = draft.config__output_ports.findIndex(branch => branch.id === 'false')
        if (defaultCaseIndex > -1) {
          draft.config__output_ports = branchNameValid([
            ...draft.config__output_ports.slice(0, defaultCaseIndex),
            {
              id: v4(),
              label: `CASE ${defaultCaseIndex + 1}`,
              cond: '',
            },
            ...draft.config__output_ports.slice(defaultCaseIndex),
          ])
        }
      }
    })
    updateNodeInputs(updatedInputs)
    syncAggregators(nodeId)
  }, [nodeInputs, updateNodeInputs, nodeId, syncAggregators])

  const removeSwitchCase = useCallback((caseId: string) => {
    const updatedInputs = produce(nodeInputs, (draft) => {
      if (draft.config__output_ports)
        draft.config__output_ports = branchNameValid(draft.config__output_ports.filter(branch => branch.id !== caseId))

      handleEdgeDeleteByDeleteBranch(nodeId, caseId)
    })
    updateNodeInputs(updatedInputs)
    syncAggregators(nodeId)
  }, [nodeInputs, updateNodeInputs, nodeId, handleEdgeDeleteByDeleteBranch, syncAggregators])

  const sortSwitchCases = useCallback((newCases: (SwitchCaseItem & { id: string })[]) => {
    const updatedInputs = produce(nodeInputs, (draft) => {
      draft.config__output_ports = branchNameValid([
        ...newCases.filter(Boolean),
        { id: 'false', label: 'DEFAULT' },
      ])
    })
    updateNodeInputs(updatedInputs)
    syncAggregators(nodeId)
  }, [nodeInputs, updateNodeInputs, nodeId, syncAggregators])

  const updatecurrentLanguage = useCallback((code_language: currentLanguage) => {
    const updatedInputs = produce(nodeInputs, (draft: any) => {
      draft.code_language = code_language
    })
    updateNodeInputs(updatedInputs)
  }, [nodeInputs, updateNodeInputs])

  const updateCaseCode = useCallback((code: string, caseItem: any) => {
    const updatedInputs = produce(nodeInputs, (draft: any) => {
      const targetCase = draft.config__output_ports?.find((item: any) => item.id === caseItem.id)
      if (targetCase)
        targetCase.cond = code
    })
    updateNodeInputs(updatedInputs)
  }, [nodeInputs, updateNodeInputs])

  return {
    readOnly: isReadOnly,
    inputs: nodeInputs,
    filterVar: filterVariableByType,
    filterNumberVar: filterNumberVariable,
    handleCreateCase: addSwitchCase,
    handleCodeChange: updateCaseCode,
    handlecurrentLanguageChange: updatecurrentLanguage,
    handleDeleteCase: removeSwitchCase,
    handleSortingCase: sortSwitchCases,
    handleFieldChange,
    nodesOutputVars: availableVariables,
    enabledNodes: enabledNodesWithParentNode,
    nodesOutputNumberVars: availableNumberVariables,
    availableNumberNodes: availableNumberNodesWithParentNode,
  }
}

export default useSwitchCaseConfig
