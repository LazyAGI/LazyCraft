import type {
  MouseEvent,
} from 'react'
import { useCallback } from 'react'
import produceFun from 'immer'
import type { OnSelectionChangeFunc } from 'reactflow'
import { useStoreApi as useReactFlowStoreApi } from 'reactflow'
import { useWorkflowStore } from '../store'
import type { ExecutionNode } from '../types'

// 捆绑状态管理工具
const BundleStateManager = {
  // 清除所有元素的捆绑状态
  clearBundledState: (elements: any[]) => {
    return produceFun(elements, (draft) => {
      draft.forEach((item) => {
        if (item.data._isPacked)
          item.data._isPacked = false
      })
    })
  },

  // 根据选择状态更新捆绑标记
  updateBundledState: (elements: any[], selectedElements: any[]) => {
    return produceFun(elements, (draft) => {
      draft.forEach((item) => {
        const isSelected = selectedElements.some(selected => selected.id === item.id)
        item.data._isPacked = isSelected
      })
    })
  },

  // 同步拖拽位置
  syncDragPositions: (allNodes: ExecutionNode[], draggedNodes: ExecutionNode[]) => {
    return produceFun(allNodes, (draft) => {
      draft.forEach((node) => {
        const draggedNode = draggedNodes.find(dragged => dragged.id === node.id)
        if (draggedNode)
          node.position = draggedNode.position
      })
    })
  },
}

// 选择区域状态检查器
const SelectionAreaValidator = {
  hasValidArea: (selectionRect: any) => {
    return Boolean(selectionRect?.width && selectionRect?.height)
  },
}

// 工作流状态操作器
const WorkflowStateOperator = {
  resetSelectionArea: (storeInstance: any) => {
    storeInstance.setState({
      userSelectionRect: null,
      userSelectionActive: true,
    })
  },

  disableNodeAnimation: (workflowStoreInstance: any) => {
    workflowStoreInstance.setState({
      nodeAnimation: false,
    })
  },
}

export const useSelectionInteractions = () => {
  const reactFlowStore = useReactFlowStoreApi()
  const workflowStateStore = useWorkflowStore()

  // 选择开始事件处理器
  const onSelectionInitiate = useCallback(() => {
    const storeState = reactFlowStore.getState()
    const { getNodes, setNodes, edges, setEdges, userSelectionRect } = storeState

    if (!SelectionAreaValidator.hasValidArea(userSelectionRect)) {
      const currentNodes = getNodes()
      const updatedNodes = BundleStateManager.clearBundledState(currentNodes)
      setNodes(updatedNodes)

      const updatedEdges = BundleStateManager.clearBundledState(edges)
      setEdges(updatedEdges)
    }
  }, [reactFlowStore])

  // 选择变化事件处理器
  const handleSelectionChange = useCallback<OnSelectionChangeFunc>(({ nodes: selectedNodes, edges: selectedEdges }) => {
    const storeState = reactFlowStore.getState()
    const { getNodes, setNodes, edges, setEdges, userSelectionRect } = storeState

    if (!SelectionAreaValidator.hasValidArea(userSelectionRect))
      return

    const currentNodes = getNodes()
    const nodesWithBundleState = BundleStateManager.updateBundledState(currentNodes, selectedNodes)
    setNodes(nodesWithBundleState)

    const edgesWithBundleState = BundleStateManager.updateBundledState(edges, selectedEdges)
    setEdges(edgesWithBundleState)
  }, [reactFlowStore])

  // 选择拖拽事件处理器
  const onSelectionMove = useCallback((_: MouseEvent, movedNodes: ExecutionNode[]) => {
    const storeState = reactFlowStore.getState()
    const { getNodes, setNodes } = storeState

    WorkflowStateOperator.disableNodeAnimation(workflowStateStore)

    const currentNodes = getNodes()
    const synchronizedNodes = BundleStateManager.syncDragPositions(currentNodes, movedNodes)
    setNodes(synchronizedNodes)
  }, [reactFlowStore, workflowStateStore])

  // 选择取消事件处理器
  const onSelectionTerminate = useCallback(() => {
    const storeState = reactFlowStore.getState()
    const { getNodes, setNodes, edges, setEdges } = storeState

    WorkflowStateOperator.resetSelectionArea(reactFlowStore)

    const currentNodes = getNodes()
    const clearedNodes = BundleStateManager.clearBundledState(currentNodes)
    setNodes(clearedNodes)

    const clearedEdges = BundleStateManager.clearBundledState(edges)
    setEdges(clearedEdges)
  }, [reactFlowStore])

  return {
    handleSelectionChange,
    handleSelectionDrag: onSelectionMove,
    handleSelectionStart: onSelectionInitiate,
    handleSelectionCancel: onSelectionTerminate,
  }
}
