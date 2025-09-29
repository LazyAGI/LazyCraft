import {
  useStoreApi,
} from 'reactflow'
import produceFun from 'immer'
import { useCallback } from 'react'
import {
  useSyncDraft as nodesSyncDraft,
} from './itemAlignPlan'
import { useReadonlyNodes } from './flowCore'
import { IWorkflowHistoryEvent, useWorkflowLog } from './flowHist'
import { cascadeCheckDownstreamNodes, generateCheckPorts, useCheckNodeShape } from './checkList'
import { syncDownstreamAggregators } from './mergerAdjust'

/**
 * 节点数据更新载荷类型
 */
type NodeDataUpdatePayloadType = {
  id: string
  data: Record<string, any>
}

/**
 * 异步更新节点内部状态（单次）
 * @param id 节点ID或ID数组
 * @param domNode DOM节点容器
 * @param updateNodeDimensions 更新节点尺寸的回调函数
 * @returns Promise<void>
 */
function updateNodeInternalsAsyncOnce(
  id: string | string[],
  domNode: HTMLElement,
  updateNodeDimensions: (updates: any[]) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const observer = new ResizeObserver(() => {
      const updates = Array.isArray(id)
        ? id.map(nodeId => ({
          id: nodeId,
          nodeElement: domNode.querySelector(`[data-id="${nodeId}"]`),
          forceUpdate: true,
        }))
        : [{
          id,
          nodeElement: domNode.querySelector(`[data-id="${id}"]`),
          forceUpdate: true,
        }]

      updateNodeDimensions(updates)
      observer.disconnect()
      resolve()
    })

    const nodeElement = Array.isArray(id)
      ? domNode.querySelector(`[data-id="${id[0]}"]`)
      : domNode.querySelector(`[data-id="${id}"]`)

    if (nodeElement)
      observer.observe(nodeElement)
    else
      resolve()
  })
}

/**
 * 异步更新节点内部状态（多次重试）
 * @param id 节点ID或ID数组
 * @param domNode DOM节点容器
 * @param updateNodeDimensions 更新节点尺寸的回调函数
 * @param count 重试次数，默认6次
 * @returns Promise<void>
 */
export async function updateNodeInternalsAsync(
  id: string | string[],
  domNode: HTMLElement,
  updateNodeDimensions: (updates: any[]) => void,
  count = 6,
): Promise<void> {
  for (let i = 0; i < count; i++)
    await updateNodeInternalsAsyncOnce(id, domNode, updateNodeDimensions)
}

/**
 * LazyLLM 节点数据更新管理 Hook
 * 提供节点数据更新、级联检查、聚合器同步等功能
 */
export const useLazyLLMNodeDataUpdate = () => {
  const storeState = useStoreApi()
  const { handleDraftWorkflowSync: handleDraftWorkflowSyncHook } = nodesSyncDraft()
  const { getNodesReadOnly } = useReadonlyNodes()
  const { generateCheckParameters } = useCheckNodeShape()
  const { recordStateToHistory: recordStateToHistoryHook } = useWorkflowLog()

  /**
   * 处理节点数据更新
   * @param payload 节点数据更新载荷
   */
  const handleNodeDataUpdate = useCallback(({ id, data }: NodeDataUpdatePayloadType) => {
    const { getNodes, setNodes, edges } = storeState.getState()
    const nodes = getNodes()

    // 查找并更新目标节点
    const payloadNode: any = nodes.find((item) => {
      if (item.id === id) {
        item.data = {
          ...item.data,
          ...data,
        }
        return true
      }
      return false
    }) || {}

    // 同步下游聚合器状态
    syncDownstreamAggregators(id, storeState)

    // 级联检查所有下游节点
    const cascadeCheckResult = cascadeCheckDownstreamNodes(id, nodes, edges)

    // 生成目标节点的输入端口检查结果
    const sourceIdList = (payloadNode.data?.config__input_ports)?.map((item) => {
      const { label, source } = edges.find(val =>
        `${item?.id},${id}` === `${val.targetHandle},${val.target}`,
      ) || {}
      return { source, label, portId: item?.id }
    })

    const checkResultTargetPorts = generateCheckPorts({
      targetInfo: { id, data: payloadNode.data },
      sourceIdList,
      nodes,
    })

    const { configParameters, _valid_form_success } = generateCheckParameters({
      targetInfo: { ...payloadNode },
    })

    // 应用所有更新到节点
    const newNodes: any = produceFun(nodes, (drafts: any) => {
      drafts.forEach((item) => {
        if (item.id === id) {
          item.data = {
            ...item.data,
            ...payloadNode.data,
            config__input_ports: checkResultTargetPorts,
            config__parameters: configParameters,
            _valid_form_success,
          }
        }

        // 应用级联检查结果
        if (cascadeCheckResult[item.id])
          item.data.config__input_ports = cascadeCheckResult[item.id]
      })
    })

    setNodes(newNodes)
    recordStateToHistoryHook(IWorkflowHistoryEvent.NodeUpdate)
  }, [storeState, generateCheckParameters, recordStateToHistoryHook])

  /**
   * 处理节点数据更新并同步草稿
   * @param payload 节点数据更新载荷
   */
  const handleNodeDataUpdateWithSyncDraftFun = useCallback((payload: NodeDataUpdatePayloadType) => {
    if (getNodesReadOnly())
      return

    handleNodeDataUpdate(payload)
    handleDraftWorkflowSyncHook()
  }, [handleDraftWorkflowSyncHook, handleNodeDataUpdate, getNodesReadOnly])

  return {
    handleNodeDataUpdateWithSyncDraft: handleNodeDataUpdateWithSyncDraftFun,
    handleNodeDataUpdate,
  }
}
