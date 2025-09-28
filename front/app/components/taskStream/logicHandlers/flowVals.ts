import {
  useCallback,
} from 'react'
import {
  useStore,
} from '../store'
import {
  getVarType,
  toNodeVars,
} from '@/app/components/taskStream/elements/_foundation/components/variable/utils'
import type {
  ExecutionNode,
  ExecutionNodeOutPutVar,
  ValueRetriever,
  Variable,
} from '@/app/components/taskStream/types'

export const useWorkflowVariableManager = () => {
  const envVars = useStore(i => i.environmentVariables)

  const getNodeAvailableVariables = useCallback(({
    parentNode,
    beforeNodes,
    isChatMode,
    filterVar,
    hideEnv,
  }: {
    beforeNodes: ExecutionNode[]
    isChatMode: boolean
    filterVar: (payload: Variable, selector: ValueRetriever) => boolean
    hideEnv?: boolean
    parentNode?: ExecutionNode | null
  }): ExecutionNodeOutPutVar[] => {
    return toNodeVars({
      beforeNodes,
      isChatMode,
      environmentVariables: hideEnv ? [] : envVars,
      filterVar,
      parentNode,
    })
  }, [envVars])

  const determineVariableType = useCallback(({
    ValueRetriever,
    enabledNodes,
    isChatMode,
    isConstant,
  }: {
    ValueRetriever: ValueRetriever
    enabledNodes: any[]
    isChatMode: boolean
    isConstant?: boolean
  }) => {
    return getVarType({
      ValueRetriever,
      enabledNodes,
      isChatMode,
      isConstant,
      environmentVariables: envVars,
    })
  }, [envVars])

  return {
    getNodeAvailableVars: getNodeAvailableVariables,
    getCurrentVariableType: determineVariableType,
  }
}

export const useWorkflowVariables = useWorkflowVariableManager
