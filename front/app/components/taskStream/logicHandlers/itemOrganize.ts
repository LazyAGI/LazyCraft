import {
  useCallback,
} from 'react'
import ELK from 'elkjs/lib/elk.bundled.js'
import { useReactFlow, useStoreApi } from 'reactflow'
import { cloneDeep } from 'lodash-es'
import type { ExecutionEdge, ExecutionNode } from '../types'
import { useWorkflowStore } from '../store'
import { AUTO_LAYOUT_OFFSET_POINT } from '../fixed-values'
import { useSyncDraft as useSyncDraftFun } from './itemAlignPlan'

// 布局配置参数
const elkLayoutConfig = {
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
  'elk.spacing.nodeNode': '60',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.algorithm': 'layered',
}

// 创建ELK实例
const elkEngine = new ELK()

// 计算节点布局的核心函数
const calculateNodePositions = async (nodeList: ExecutionNode[], edgeList: ExecutionEdge[]) => {
  const computedGraph = await elkEngine.layout({
    id: 'root',
    layoutOptions: elkLayoutConfig,
    children: nodeList.map(nodeItem => ({
      ...nodeItem,
      width: nodeItem.width ?? 150,
      sourcePosition: 'right',
      height: nodeItem.height ?? 50,
      targetPosition: 'left',
    })),
    edges: cloneDeep(edgeList),
  } as any)

  return {
    positionedNodes: nodeList.map((originalNode) => {
      const computedNode = computedGraph.children?.find(
        layoutNode => layoutNode.id === originalNode.id,
      )

      return {
        ...originalNode,
        position: {
          x: (computedNode?.x ?? 0) + AUTO_LAYOUT_OFFSET_POINT.x,
          y: (computedNode?.y ?? 0) + AUTO_LAYOUT_OFFSET_POINT.y,
        },
      }
    }),
  }
}

export const useNodesLayout = () => {
  const flowStore = useStoreApi()
  const flowInstance = useReactFlow()
  const workflowState = useWorkflowStore()
  const { handleDraftWorkflowSync: syncWorkflowDraft } = useSyncDraftFun()

  const executeAutoLayout = useCallback(async () => {
    workflowState.setState({ nodeAnimation: true })

    const { getNodes, edges, setNodes } = flowStore.getState()
    const { setViewport } = flowInstance

    const { positionedNodes } = await calculateNodePositions(getNodes(), edges)

    setNodes(positionedNodes)
    setViewport({ x: 0, y: 0, zoom: 0.7 })

    setTimeout(syncWorkflowDraft)
  }, [flowStore, flowInstance, syncWorkflowDraft, workflowState])

  return {
    handleNodesLayout: executeAutoLayout,
  }
}
