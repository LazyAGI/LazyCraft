import {
  useMemo,
} from 'react'
import produce from 'immer'
import { ExecutionBlockEnum } from '../types'
import {
  NODES_EXTRA_DATA as NODES_EXTRA,
  NODES_INITIAL_DATA as NODES_INITIAL,
} from '../fixed-values'
import {
  useIsChatMode,
} from './flowCore'

// 块类型对应的中文名称
const BLOCK_TITLES: Record<ExecutionBlockEnum, string> = {
  [ExecutionBlockEnum.EntryNode]: '开始',
  [ExecutionBlockEnum.FinalNode]: '结束',
  [ExecutionBlockEnum.Conditional]: '条件分支',
  [ExecutionBlockEnum.Code]: '代码',
  [ExecutionBlockEnum.Tool]: '工具',
  [ExecutionBlockEnum.SubModule]: '子模块',
  [ExecutionBlockEnum.Universe]: '万能节点',
  [ExecutionBlockEnum.SwitchCase]: '多路选择',
  [ExecutionBlockEnum.ParameterExtractor]: '参数提取',
  [ExecutionBlockEnum.QuestionClassifier]: '问题分类',
}

/**
 * 获取节点初始数据，包含中文标题
 */
export const useWorkflowNodeInitialData = () => {
  return useMemo(() => produce(NODES_INITIAL, (draft) => {
    Object.keys(draft).forEach((blockKey) => {
      draft[blockKey as ExecutionBlockEnum].title = BLOCK_TITLES[blockKey as ExecutionBlockEnum] || blockKey
    })
  }), [])
}

/**
 * 获取节点扩展数据，包含可用的前后节点信息
 */
export const useWorkflowNodeConnections = () => {
  const chatMode = useIsChatMode()

  return useMemo(() => produce(NODES_EXTRA, (draft) => {
    Object.keys(draft).forEach((blockKey) => {
      const blockData = draft[blockKey as ExecutionBlockEnum]
      blockData.availablePrevNodes = blockData.getAccessiblePrevNodes(chatMode)
      blockData.availableNextNodes = blockData.getAccessibleNextNodes(chatMode)
    })
  }), [chatMode])
}

/**
 * 获取指定节点类型的可用前后节点
 * @param nodeType 节点类型
 * @param isInIteration 是否在迭代中
 */
export const useWorkflowNodeConnectionsForType = (nodeType?: ExecutionBlockEnum, isInIteration?: boolean) => {
  const nodeConnections = useWorkflowNodeConnections()

  const availableNextBlockList = useMemo(() => {
    if (!nodeType || !nodeConnections[nodeType])
      return []
    return nodeConnections[nodeType].availableNextNodes || []
  }, [nodeType, nodeConnections])

  const availablePrevBlocks = useMemo(() => {
    if (!nodeType || !nodeConnections[nodeType])
      return []
    return nodeConnections[nodeType].availablePrevNodes || []
  }, [nodeType, nodeConnections])

  return useMemo(() => {
    const filterIterationBlocks = (blockType: ExecutionBlockEnum) => {
      if (isInIteration && blockType === ExecutionBlockEnum.FinalNode)
        return false

      return true
    }

    return {
      availablePrevBlocks: availablePrevBlocks.filter(filterIterationBlocks),
      availableNextBlocks: availableNextBlockList.filter(filterIterationBlocks),
    }
  }, [isInIteration, availablePrevBlocks, availableNextBlockList])
}

// 为了保持向后兼容，保留旧的导出名称
export const useNodesInitialData = useWorkflowNodeInitialData
export const useNodesExtraData = useWorkflowNodeConnections
export const useAvailableBlocks = useWorkflowNodeConnectionsForType
