import useNodeInfo from './handle-unit-ops'
import { useIsChatMode, useWorkflow, useWorkflowVariableManager } from '@/app/components/taskStream/logicHandlers'
import type { ValueRetriever, Variable } from '@/app/components/taskStream/types'

/**
 * Hook参数接口
 */
type UseWorkflowNodeAvailableVariableListParams = {
  /** 变量过滤函数，用于过滤可用的变量 */
  filterVar: (payload: Variable, selector: ValueRetriever) => boolean
  /** 是否只获取叶子节点的变量 */
  restrictLeafNodeVar?: boolean
}

/**
 * 工作流节点可用变量列表Hook
 *
 * 该Hook用于获取工作流节点中可用的变量列表，支持：
 * - 变量过滤功能
 * - 叶子节点变量限制
 * - 聊天模式支持
 * - 迭代节点支持
 * - 分支节点变量获取
 *
 * @param nodeId 节点ID
 * @param params Hook参数
 * @returns 可用的节点和变量信息
 */
const useWorkflowNodeAvailableVariableList = (nodeId: string, {
  filterVar,
  restrictLeafNodeVar,
}: UseWorkflowNodeAvailableVariableListParams = {
  filterVar: () => true,
  restrictLeafNodeVar: false,
}) => {
  // 获取聊天模式状态
  const isChatMode = useIsChatMode()

  // 获取工作流相关功能
  const { getPreviousNodesInSameBranch, getTreeLeafNodes } = useWorkflow()

  // 获取工作流变量管理器
  const { getNodeAvailableVars: getNodeVaildVars } = useWorkflowVariableManager()

  /**
   * 根据配置获取可用的节点列表
   * 支持叶子节点或同分支前置节点
   */
  const vaildNodes = restrictLeafNodeVar ? getTreeLeafNodes(nodeId) : getPreviousNodesInSameBranch(nodeId)

  // 获取当前节点的父节点信息（用于迭代节点）
  const { parentNode: iterationNode } = useNodeInfo(nodeId)

  /**
   * 获取可用的变量列表
   * 根据节点列表和过滤条件计算
   */
  const availableVars = getNodeVaildVars({
    beforeNodes: vaildNodes,
    filterVar,
    isChatMode,
    parentNode: iterationNode,
  })

  // 构建包含父节点的完整节点列表
  const enabledNodesWithParent = iterationNode ? [...vaildNodes, iterationNode] : vaildNodes

  return {
    /** 可用的节点列表 */
    enabledNodes: vaildNodes,
    /** 包含父节点的完整节点列表 */
    enabledNodesWithParent,
    /** 可用的变量列表 */
    availableVars,
  }
}

export default useWorkflowNodeAvailableVariableList
