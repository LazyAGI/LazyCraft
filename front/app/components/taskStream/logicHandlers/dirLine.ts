import {
  useCallback,
} from 'react'
import { useStoreApi } from 'reactflow'
import type { ExecutionNode } from '../types'
import {
  useWorkflowStore,
} from '../store'

/**
 * LazyLLM 工作流辅助线管理 Hook
 * 提供节点拖拽时的对齐辅助线功能，包括水平和垂直对齐
 */
export const useLazyLLMHelpline = () => {
  const flowStore = useStoreApi()
  const workflowStore = useWorkflowStore()

  /**
   * 设置辅助线
   * @param node 当前拖拽的节点
   * @returns 返回水平和垂直辅助线节点信息
   */
  const processHelplineSetup = useCallback((nodeItem: ExecutionNode) => {
    const { getNodes } = flowStore.getState()
    const nodeList = getNodes()
    const { setHorizontalHelpline, setVerticalHelpline } = workflowStore.getState()

    // 如果节点在迭代中，不显示辅助线
    if (nodeItem.data.isInIteration)
      return { showHorizontalHelpLineNodes: [], showVerticalGuideLineNodes: [] }

    // 计算水平辅助线
    const horizontalAlignmentNodes = nodeList
      .filter((currentNode) => {
        if (currentNode.id === nodeItem.id)
          return false

        if (currentNode.data.isInIteration)
          return false

        const currentNodeY = Math.ceil(currentNode.position.y)
        const draggedNodeY = Math.ceil(nodeItem.position.y)
        return Math.abs(currentNodeY - draggedNodeY) < 5
      })
      .sort((a, b) => a.position.x - b.position.x)

    // 设置水平辅助线
    if (horizontalAlignmentNodes.length > 0) {
      const firstNode = horizontalAlignmentNodes[0]
      const lastNode = horizontalAlignmentNodes[horizontalAlignmentNodes.length - 1]

      const horizontalGuideLine = {
        top: firstNode.position.y,
        left: firstNode.position.x,
        width: lastNode.position.x + lastNode.width! - firstNode.position.x,
      }

      // 调整辅助线位置和宽度
      if (nodeItem.position.x < firstNode.position.x) {
        horizontalGuideLine.left = nodeItem.position.x
        horizontalGuideLine.width = firstNode.position.x + firstNode.width! - nodeItem.position.x
      }

      if (nodeItem.position.x > lastNode.position.x)
        horizontalGuideLine.width = nodeItem.position.x + nodeItem.width! - firstNode.position.x

      setHorizontalHelpline(horizontalGuideLine)
    }
    else { setHorizontalHelpline() }

    // 计算垂直辅助线
    const verticalAlignmentNodes = nodeList
      .filter((currentNode) => {
        if (currentNode.id === nodeItem.id)
          return false

        if (currentNode.data.isInIteration)
          return false

        const currentNodeX = Math.ceil(currentNode.position.x)
        const draggedNodeX = Math.ceil(nodeItem.position.x)
        return Math.abs(currentNodeX - draggedNodeX) < 5
      })
      .sort((a, b) => a.position.x - b.position.x)

    // 设置垂直辅助线
    if (verticalAlignmentNodes.length > 0) {
      const firstNode = verticalAlignmentNodes[0]
      const lastNode = verticalAlignmentNodes[verticalAlignmentNodes.length - 1]

      const verticalGuideLine = {
        top: firstNode.position.y,
        left: firstNode.position.x,
        height: lastNode.position.y + lastNode.height! - firstNode.position.y,
      }

      // 调整辅助线位置和高度
      if (nodeItem.position.y < firstNode.position.y) {
        verticalGuideLine.top = nodeItem.position.y
        verticalGuideLine.height = firstNode.position.y + firstNode.height! - nodeItem.position.y
      }

      if (nodeItem.position.y > lastNode.position.y)
        verticalGuideLine.height = nodeItem.position.y + nodeItem.height! - firstNode.position.y

      setVerticalHelpline(verticalGuideLine)
    }
    else { setVerticalHelpline() }

    return { showHorizontalHelpLineNodes: horizontalAlignmentNodes, showVerticalGuideLineNodes: verticalAlignmentNodes }
  }, [flowStore, workflowStore])

  return { handleSetGuideLine: processHelplineSetup }
}
