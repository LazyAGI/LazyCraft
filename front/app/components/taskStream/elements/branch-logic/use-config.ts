import { useCallback } from 'react'
import produce from 'immer'
import { v4 as uuid4 } from 'uuid'
import { LogicalConnector } from './types'
import type {
  IfElseNodeType,
} from './types'
import {
  branchNameValid,
} from './utils'
import useNodeDataOperations from '@/app/components/taskStream/elements/_foundation/hooks/fetch-item-feed-data'
import {
  useReadonlyNodes,
} from '@/app/components/taskStream/logicHandlers'
import type { currentLanguage } from '@/app/components/taskStream/elements/script/types'
import { useAggregatorSync } from '@/app/components/taskStream/logicHandlers/mergerAdjust'

const useIfElseConfig = (nodeId: string, nodePayload: IfElseNodeType) => {
  const { nodesReadOnly: readOnly } = useReadonlyNodes()
  const { inputs, setInputs, handleFieldChange } = useNodeDataOperations<IfElseNodeType>(nodeId, nodePayload)
  const { syncAggregators } = useAggregatorSync()

  const handlecurrentLanguageChange = useCallback((code_language: currentLanguage) => {
    const newInputs = produce(inputs, (draft: any) => {
      draft.code_language = code_language
    })
    setInputs(newInputs)
  }, [inputs, setInputs])

  const handleCodeChange = useCallback((code: string, item: any) => {
    const newInputs = produce(inputs, (draft: any) => {
      const targetCase = draft.config__output_ports?.find((caseItem: any) => caseItem.id === item.id)
      if (targetCase)
        targetCase.cond = code
    })
    setInputs(newInputs)
  }, [inputs, setInputs])

  const handleCreateCase = useCallback(() => {
    const newInputs = produce(inputs, () => {
      if (inputs.config__output_ports) {
        const elseCaseIndex = inputs.config__output_ports.findIndex(branch => branch.id === 'false')
        if (elseCaseIndex > -1) {
          inputs.config__output_ports = branchNameValid([
            ...inputs.config__output_ports.slice(0, elseCaseIndex),
            {
              id: uuid4(),
              label: 'ELIF',
              logical_operator: LogicalConnector.and,
              cond: '',
            },
            ...inputs.config__output_ports.slice(elseCaseIndex),
          ])
        }
      }
    })
    setInputs(newInputs)
    syncAggregators(nodeId)
  }, [inputs, setInputs, nodeId, syncAggregators])

  const handleSortingCase = useCallback((newCases: (any & { id: string })[]) => {
    const newInputs = produce(inputs, (draft) => {
      draft.config__output_ports = branchNameValid([
        ...newCases.filter(Boolean),
        { id: 'false', label: 'ELSE' },
      ])
    })
    setInputs(newInputs)
    syncAggregators(nodeId)
  }, [inputs, setInputs, nodeId, syncAggregators])

  return {
    readOnly,
    inputs,
    handleCreateCase,
    handleCodeChange,
    handlecurrentLanguageChange,
    handleSortingCase,
    handleFieldChange,
  }
}

export default useIfElseConfig
