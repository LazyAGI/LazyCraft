import { useCallback } from 'react'
import { useStoreApi } from 'reactflow'
import { BranchNodeTypes } from '../fixed-values'

export const useWorkflowConnection = () => {
  const flowStore = useStoreApi()

  const retrieveConnectedNodePairs = useCallback(() => {
    const { getNodes } = flowStore.getState()
    const allNodes = getNodes()

    // 识别所有分支节点及其对应的聚合器节点
    const connectedNodePairs = allNodes.reduce((accumulatedPairs: any[], currentNode) => {
      const isBranchNode = BranchNodeTypes.includes(currentNode.data?.payload__kind)
      const hasLinkedNode = currentNode.data?.linkNodeId

      if (isBranchNode && hasLinkedNode) {
        const correspondingAggregator = allNodes.find(n => n.id === currentNode.data.linkNodeId)

        if (correspondingAggregator) {
          accumulatedPairs.push({
            branchNode: currentNode,
            aggregator: correspondingAggregator,
          })
        }
      }
      return accumulatedPairs
    }, [])

    return connectedNodePairs
  }, [flowStore])

  const checkDashEdgeVisibility = useCallback((targetNodeId: string) => {
    const nodePairs = retrieveConnectedNodePairs()
    const { edges } = flowStore.getState()

    // 验证是否存在虚线边连接
    const hasDashEdgeConnection = edges.some((edge) => {
      const isDashEdgeType = edge.type === 'dash-edge'
      const isConnectedToNode = edge.source === targetNodeId || edge.target === targetNodeId
      return isDashEdgeType && isConnectedToNode
    })

    // 验证节点是否属于连接对
    const belongsToConnectedPair = nodePairs.some(({ branchNode, aggregator }) => {
      const isBranchNode = branchNode.id === targetNodeId
      const isAggregatorNode = aggregator.id === targetNodeId
      return isBranchNode || isAggregatorNode
    })

    return hasDashEdgeConnection && belongsToConnectedPair
  }, [retrieveConnectedNodePairs, flowStore])

  return {
    getLinkedNodes: retrieveConnectedNodePairs,
    shouldShowDashEdge: checkDashEdgeVisibility,
  }
}
