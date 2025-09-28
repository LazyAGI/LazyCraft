import { useCallback } from 'react'
import type { EdgeMouseHandler, OnEdgesChange } from 'reactflow'
import { useStoreApi } from 'reactflow'
import produce from 'immer'
import type { ExecutionNode } from '../types'
import { getNodesConnectedSourceOrTargetHandleIdsMap as getNodesMaps } from '../utils'
import { useSyncDraft as useSyncDraftHook } from './itemAlignPlan'
import { useReadonlyNodes as useNodesReadOnlyHook } from './flowCore'
import { IWorkflowHistoryEvent, useWorkflowLog } from './flowHist'
import { useCheckNodeShape } from './checkList'

/**
 * LazyLLM 工作流边交互管理 Hook
 * 提供边的各种交互操作，包括悬停、删除、状态管理等
 */
export const useLazyLLMEdgesInteractions = () => {
  const flowStore = useStoreApi()
  const { handleDraftWorkflowSync } = useSyncDraftHook()
  const { getNodesReadOnly: getOnlyReadNode } = useNodesReadOnlyHook()
  const { recordStateToHistory } = useWorkflowLog()
  const { handleCheckNodeShape } = useCheckNodeShape()

  /**
   * 处理边悬停进入事件
   */
  const processEdgeHoverEnter = useCallback<EdgeMouseHandler>((_, edge) => {
    if (getOnlyReadNode())
      return

    const { edges, setEdges } = flowStore.getState()
    const updatedEdges = produce(edges, (drafts) => {
      const targetEdge = drafts.find(e => e.id === edge.id)!
      targetEdge.data._mouseOver = true
    })
    setEdges(updatedEdges)
  }, [flowStore, getOnlyReadNode])

  /**
   * 处理边悬停离开事件
   */
  const processEdgeHoverLeave = useCallback<EdgeMouseHandler>((_, edge) => {
    if (getOnlyReadNode())
      return

    const { edges, setEdges } = flowStore.getState()
    const updatedEdges = produce(edges, (drafts) => {
      const targetEdge = drafts.find(e => e.id === edge.id)!
      targetEdge.data._mouseOver = false
    })
    setEdges(updatedEdges)
  }, [flowStore, getOnlyReadNode])

  /**
   * 通过删除分支来删除边
   * @param nodeIdentifier 节点标识符
   * @param branchIdentifier 分支标识符
   */
  const removeEdgeByBranchDeletion = useCallback((nodeIdentifier: string, branchIdentifier: string) => {
    if (getOnlyReadNode())
      return

    const { getNodes, setNodes, edges, setEdges } = flowStore.getState()

    // 查找与指定分支相关的边
    const edgeIndex = edges.findIndex(edge =>
      (edge.source === nodeIdentifier && edge.sourceHandle === branchIdentifier)
      || (edge.target === nodeIdentifier && edge.targetHandle === branchIdentifier),
    )

    if (edgeIndex < 0)
      return

    const targetEdge = edges[edgeIndex]

    // 更新节点的连接句柄信息
    const updatedNodes = produce(getNodes(), (drafts: ExecutionNode[]) => {
      const sourceNode = drafts.find(node => node.id === targetEdge.source)
      const targetNode = drafts.find(node => node.id === targetEdge.target)

      if (sourceNode) {
        sourceNode.data._connectedSourceHandleIds = sourceNode.data._connectedSourceHandleIds?.filter(
          handleId => handleId !== targetEdge.sourceHandle,
        )
      }

      if (targetNode) {
        targetNode.data._connectedTargetHandleIds = targetNode.data._connectedTargetHandleIds?.filter(
          handleId => handleId !== targetEdge.targetHandle,
        )
      }
    })

    setNodes(updatedNodes)

    // 删除边
    const updatedEdges = produce(edges, (drafts) => {
      drafts.splice(edgeIndex, 1)
    })

    setEdges(updatedEdges)
    handleDraftWorkflowSync()
    recordStateToHistory(IWorkflowHistoryEvent.EdgeDeleteByDeleteBranch)
  }, [getOnlyReadNode, flowStore, handleDraftWorkflowSync, recordStateToHistory])

  /**
   * 删除选中的边
   */
  const removeSelectedEdge = useCallback(() => {
    if (getOnlyReadNode())
      return

    const { getNodes, setNodes, edges, setEdges } = flowStore.getState()
    const selectedEdgeIndex = edges.findIndex(edge => edge.selected)

    if (selectedEdgeIndex < 0)
      return

    const selectedEdge = edges[selectedEdgeIndex]
    const nodeList = getNodes()

    // 获取节点连接句柄映射
    const edgeHandleMapping = getNodesMaps(
      [{ type: 'disconnect', edge: selectedEdge }],
      nodeList,
    )

    const remainingEdges = edges.filter(item => item.id !== selectedEdge.id)
    const destinationNode = nodeList.find(item => item.id === selectedEdge.target)

    // 更新节点数据
    const updatedNodes = produce(nodeList, (drafts: ExecutionNode[]) => {
      drafts.forEach((item) => {
        if (edgeHandleMapping[item.id]) {
          item.data = {
            ...item.data,
            ...edgeHandleMapping[item.id],
          }
        }
      })
    })

    setNodes(updatedNodes)

    // 执行目标节点的参数校验
    if (destinationNode) {
      const inputPortSourceList = destinationNode.data?.config__input_ports?.map((port) => {
        const { label, source } = remainingEdges.find(conn =>
          `${port?.id},${destinationNode.id}` === `${conn.targetHandle},${conn.target}`,
        ) || {}
        return { label, source, portId: port?.id }
      })

      handleCheckNodeShape({
        targetInfo: updatedNodes.find(node => node.id === destinationNode.id),
        sourceIdList: inputPortSourceList,
        nodes: updatedNodes,
      })
    }

    // 删除边
    const updatedEdges = produce(edges, (drafts) => {
      drafts.splice(selectedEdgeIndex, 1)
    })

    setEdges(updatedEdges)
    handleDraftWorkflowSync()
    recordStateToHistory(IWorkflowHistoryEvent.EdgeDelete)
  }, [getOnlyReadNode, flowStore, handleDraftWorkflowSync, recordStateToHistory, handleCheckNodeShape])

  /**
   * 处理边的变化事件
   */
  const processEdgeStateChanges = useCallback<OnEdgesChange>((stateChanges) => {
    if (getOnlyReadNode())
      return

    const { edges, setEdges } = flowStore.getState()

    const updatedEdges = produce(edges, (drafts) => {
      stateChanges.forEach((change) => {
        if (change.type === 'select') {
          const edge = drafts.find(edge => edge.id === change.id)!
          edge.selected = change.selected
        }
      })
    })

    setEdges(updatedEdges)
  }, [flowStore, getOnlyReadNode])

  /**
   * 取消所有边的运行状态
   */
  const resetAllEdgeExecutionStatus = useCallback(() => {
    const { edges, setEdges } = flowStore.getState()

    const updatedEdges = produce(edges, (drafts) => {
      drafts.forEach((edge) => {
        edge.data._runned = false
      })
    })

    setEdges(updatedEdges)
  }, [flowStore])

  return {
    handleEdgeEnter: processEdgeHoverEnter,
    handleEdgeLeave: processEdgeHoverLeave,
    handleEdgeDeleteByDeleteBranch: removeEdgeByBranchDeletion,
    handleEdgeDelete: removeSelectedEdge,
    handleEdgesChange: processEdgeStateChanges,
    handleEdgeCancelexecutionStatus: resetAllEdgeExecutionStatus,
  }
}
