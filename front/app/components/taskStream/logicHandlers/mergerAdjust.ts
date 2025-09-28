import { useStoreApi } from 'reactflow'
import produce from 'immer'
import { v4 as uuid4 } from 'uuid'
import { generateCheckPorts } from './checkList'
import { updateNodeInternalsAsync } from './itemDataUpdate'

// 聚合器同步函数
export const syncDownstreamAggregators = (nodeId: string, store: any) => {
  const { getNodes, setNodes, edges, updateNodeDimensions } = store.getState()
  const nodes = getNodes()

  // 找到连接到当前节点的聚合器节点（包含普通边与 dash-edge）
  const downstreamEdges = edges.filter((edge: any) => edge.source === nodeId)

  downstreamEdges.forEach((edge: any) => {
    const targetNode = nodes.find((node: any) => node.id === edge.target)
    if (!targetNode || targetNode.data?.payload__kind !== 'aggregator')
      return

    const sourceNode = nodes.find((node: any) => node.id === nodeId)
    if (!sourceNode)
      return

    // 当前聚合器已有端口
    const aggregatorInputPorts: any[] = targetNode.data?.config__input_ports || []
    const existPortIds: string[] = aggregatorInputPorts
      .map((p: any) => p.id)
      .filter((id: any): id is string => typeof id === 'string')

    // A) 以聚合器的所有“真实入边”为准，确保每条入边的 targetHandle 都存在对应端口（只增不减）
    const incomingEdges = edges.filter((e: any) => e.target === targetNode.id && e.type !== 'dash-edge')
    const incomingTargetHandles = incomingEdges
      .map((e: any) => e.targetHandle)
      .filter((h: any): h is string => typeof h === 'string')
    const requiredPortIdsFromEdges: string[] = Array.from(new Set(incomingTargetHandles)) as string[]
    const portsToAddFromEdges = requiredPortIdsFromEdges
      .filter((id: string) => !existPortIds.includes(id))
      .map((id: string) => ({ id }))

    let newInputPorts: any[] = aggregatorInputPorts.concat(portsToAddFromEdges)

    // B) 基于当前遍历到的上游节点（sourceNode）的输出端口数量进行“只扩容不收缩”
    const expectedCountFromSource = Array.isArray(sourceNode?.data?.config__output_ports)
      ? sourceNode.data.config__output_ports.length
      : 0
    if (newInputPorts.length < expectedCountFromSource) {
      const missing = expectedCountFromSource - newInputPorts.length
      const extra = Array.from({ length: missing }, () => ({ id: uuid4() }))
      newInputPorts = newInputPorts.concat(extra)
    }

    // 若无变化则跳过后续逻辑
    const portsChanged = newInputPorts.length !== aggregatorInputPorts.length
    const updatedAggregatorData = portsChanged
      ? { ...targetNode.data, config__input_ports: newInputPorts }
      : targetNode.data

    // 重新计算聚合器的参数验证（使用最新端口列表）
    const newSourceIdList = (updatedAggregatorData.config__input_ports || []).map((portItem: any) => {
      const connectedEdge = edges.find((e: any) => `${portItem?.id},${targetNode.id}` === `${e.targetHandle},${e.target}`)
      return connectedEdge
        ? { label: connectedEdge.label, source: connectedEdge.source, portId: portItem?.id }
        : { label: undefined, source: undefined, portId: portItem?.id }
    })

    if (newSourceIdList.length > 0) {
      const checkResultPorts = generateCheckPorts({
        targetInfo: { id: targetNode.id, data: updatedAggregatorData },
        sourceIdList: newSourceIdList,
        nodes,
      })
      updatedAggregatorData.config__input_ports = checkResultPorts
    }

    // 更新节点
    const newNodes = produce(nodes, (draft: any) => {
      const nodeToUpdate = draft.find((node: any) => node.id === targetNode.id)
      if (nodeToUpdate) {
        nodeToUpdate.data = {
          ...nodeToUpdate.data,
          ...updatedAggregatorData,
        }
      }
    })

    setNodes(newNodes)

    // 强制刷新该节点的端口/尺寸，促使边即时重算
    try {
      updateNodeInternalsAsync(targetNode.id, document.body, updateNodeDimensions)
    }
    catch {}

    // 不删除任何边，避免因端口被收缩导致其它连线消失
  })
}

// 使用聚合器同步的hook
export const useAggregatorSync = () => {
  const store = useStoreApi()

  const syncAggregators = (nodeId: string) => {
    // 延迟执行，确保节点数据已经更新
    setTimeout(() => {
      syncDownstreamAggregators(nodeId, store)
    }, 100)
  }

  return {
    syncAggregators,
  }
}
