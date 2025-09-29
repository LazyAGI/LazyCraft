import { memo } from 'react'
import produce from 'immer'
import { useReactFlow, useStoreApi, useViewport } from 'reactflow'
import { useEventListener } from 'ahooks'
import {
  useStore,
  useWorkflowStore,
} from './store'
import { IWorkflowHistoryEvent, useNodesHandlers, useWorkflowLog } from './logicHandlers'
import { CUSTOM_NODE_TYPE } from './fixed-values'
import CustomNode from './elements'
import CustomNoteNode from './text-element'
import { NOTE_NODE_CUSTOM } from './text-element/constants'
import { syncDownstreamAggregators } from './logicHandlers/mergerAdjust'

// 定义分支节点类型常量
const BRANCH_NODE_TYPES = ['if-else', 'question-classifier', 'switch-case']
const AGGREGATOR_PAYLOAD_KIND = 'aggregator'
const CANDIDATE_PROPERTY = '_isCandidate'
const SYNC_DELAY_MS = 200

const OptionNode = () => {
  const storeApi = useStoreApi()
  const reactFlowInstance = useReactFlow()
  const workflowState = useWorkflowStore()
  const pendingNode = useStore(s => s.optionNode)
  const cursorPosition = useStore(s => s.mousePosition)
  const { zoom } = useViewport()
  const { handleNodePick } = useNodesHandlers()
  const { recordStateToHistory } = useWorkflowLog()

  // 保存工作流历史记录
  const saveWorkflowHistory = (node: any) => {
    const eventType = node.type === NOTE_NODE_CUSTOM
      ? IWorkflowHistoryEvent.NoteAdd
      : IWorkflowHistoryEvent.NodeCreate

    recordStateToHistory(eventType)
  }

  // 处理聚合器节点同步
  const handleAggregatorNodeSync = (aggregatorNode: any, nodes: any[], edges: any[], store: any) => {
    const incomingEdges = edges.filter((edge: any) => edge.target === aggregatorNode.id)

    incomingEdges.forEach((edge: any) => {
      const sourceNode = nodes.find((node: any) => node.id === edge.source)
      if (sourceNode && BRANCH_NODE_TYPES.includes(sourceNode.data.type))
        syncDownstreamAggregators(sourceNode.id, store)
    })
  }

  // 执行聚合器同步逻辑
  const executeAggregatorSyncLogic = (node: any, store: any) => {
    const { getNodes, edges } = store.getState()
    const allNodes = getNodes()

    // 检查分支节点同步
    if (BRANCH_NODE_TYPES.includes(node.data.type))
      syncDownstreamAggregators(node.id, store)

    // 检查聚合器节点同步
    if (node.data.payload__kind === AGGREGATOR_PAYLOAD_KIND)
      handleAggregatorNodeSync(node, allNodes, edges, store)
  }

  // 处理节点放置逻辑
  const handleNodePlacement = (event: MouseEvent) => {
    const { optionNode, mousePosition } = workflowState.getState()

    if (!optionNode)
      return

    event.preventDefault()

    const { getNodes, setNodes } = storeApi.getState()
    const { screenToFlowPosition } = reactFlowInstance
    const existingNodes = getNodes()
    const { x, y } = screenToFlowPosition({
      x: mousePosition.pageX,
      y: mousePosition.pageY,
    })

    // 创建新节点
    const updatedNodes = produce(existingNodes, (draft) => {
      draft.push({
        ...optionNode,
        data: {
          ...optionNode.data,
          [CANDIDATE_PROPERTY]: false,
        },
        position: { x, y },
      })
    })

    setNodes(updatedNodes)

    // 延迟执行聚合器同步逻辑
    setTimeout(() => {
      executeAggregatorSyncLogic(optionNode, storeApi)
    }, SYNC_DELAY_MS)

    // 保存历史记录
    saveWorkflowHistory(optionNode)

    // 清理候选节点状态
    workflowState.setState({ optionNode: undefined })

    // 处理笔记节点选择
    if (optionNode.type === NOTE_NODE_CUSTOM)
      handleNodePick(optionNode.id)
  }

  // 处理右键取消
  const handleRightClickCancel = (event: MouseEvent) => {
    const { optionNode } = workflowState.getState()
    if (optionNode) {
      event.preventDefault()
      workflowState.setState({ optionNode: undefined })
    }
  }

  // 注册事件监听器
  useEventListener('click', handleNodePlacement)
  useEventListener('contextmenu', handleRightClickCancel)

  // 如果没有候选节点则不渲染
  if (!pendingNode)
    return null

  // 渲染候选节点预览
  return (
    <div
      className='absolute z-10'
      style={{
        left: cursorPosition.elementX,
        top: cursorPosition.elementY,
        transform: `scale(${zoom})`,
        transformOrigin: '0 0',
      }}
    >
      {pendingNode.type === CUSTOM_NODE_TYPE && (
        <CustomNode {...pendingNode as any} />
      )}
      {pendingNode.type === NOTE_NODE_CUSTOM && (
        <CustomNoteNode {...pendingNode as any} />
      )}
    </div>
  )
}

export default memo(OptionNode)
