import type {
  MouseEvent,
} from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { message } from 'antd'
import produce from 'immer'
import type {
  Edge,
  Node,
  NodeDragHandler,
  NodeMouseHandler,
  OnConnect,
  OnConnectEnd,
  OnConnectStart,
  ResizeParamsWithDirection as ResizeParamsWithDirectionType,
} from 'reactflow'
import { getConnectedEdges, useReactFlow, useStoreApi } from 'reactflow'
import { v4 as uuid4 } from 'uuid'

import { ExecutionBlockEnum } from '../types'
import { useStore, useWorkflowStore } from '../store'
import {
  BranchNodeTypes,
  ITERATION_NODE_PADDING,
  NODES_INITIAL_DATA,
} from '../fixed-values'
import {
  getNodesConnectedSourceOrTargetHandleIdsMap as getNodesMap,
  getTopLeftNodePosition,
  newNodeGenerate as getnewNodeGenerate,
} from '../utils'
import { NOTE_NODE_CUSTOM } from '../text-element/constants'
import type { RepetitionNodeType } from '../elements/loop-sequence/types'
import { useNodeIterationInteractions as useNodeIterationInteractionsHook } from '../elements/loop-sequence/useInteract'
import { useWorkflowExecutionStore } from '../workflow-execution-manager'
import { useSyncDraft as useSyncDraftHook } from './use-nodes-sync-draft'
import { useLazyLLMHelpline } from './guide-line'
import { useReadonlyNodes } from './process-core'
import { IWorkflowHistoryEvent as WorkflowHistoryBind, useWorkflowLog } from './process-past'
import { cascadeCheckDownstreamNodes, generateCheckPorts, useCheckNodeShape } from './verification-list'
import { syncDownstreamAggregators } from './combiner-align'
import { generateUniqueTitle } from '@/app/components/taskStream/module-panel/components/utils'

export const useNodesHandlers = () => {
  const flowStore = useStoreApi()
  const instanceState = useStore(s => s.instanceState)
  const setInstanceState = useStore(s => s.setInstanceState)
  const workflowStore = useWorkflowStore()
  const reactflow = useReactFlow()
  const { store: workflowHistoryStore } = useWorkflowExecutionStore()
  const { handleDraftWorkflowSync: handleDraftWorkflowSyncHook } = useSyncDraftHook()
  const { getNodesReadOnly: getOnlyReadNodes, getNodesCheckDetails } = useReadonlyNodes()
  const { handleSetGuideLine } = useLazyLLMHelpline()
  const {
    processNodeIterationChildDrag,
  } = useNodeIterationInteractionsHook()
  const { handleCheckNodeShape } = useCheckNodeShape()
  const draggedNodeStartPosition = useRef({ x: 0, y: 0 } as { x: number; y: number })

  const { recordStateToHistory, undo, redo } = useWorkflowLog()

  const processNodeDragStart = useCallback<NodeDragHandler>((_, node) => {
    workflowStore.setState({ nodeAnimation: false })

    if (getOnlyReadNodes())
      return

    if (node.data.isIterationStart || node.type === NOTE_NODE_CUSTOM)
      return

    draggedNodeStartPosition.current = { x: node.position.x, y: node.position.y }
  }, [workflowStore, getOnlyReadNodes])

  const rafId = useRef<number | null>(null)
  const rafSetNodes = useCallback((setNodes: any, newNodes: any) => {
    if (rafId.current)
      cancelAnimationFrame(rafId.current)

    rafId.current = requestAnimationFrame(() => {
      setNodes(newNodes)
      rafId.current = null
    })
  }, [])
  useEffect(() => {
    return () => {
      if (rafId.current)
        cancelAnimationFrame(rafId.current)
    }
  }, [])

  const processNodeDrag = useCallback<NodeDragHandler>((e, node: Node) => {
    if (getOnlyReadNodes())
      return

    if (node.data.isIterationStart)
      return

    const { getNodes, setNodes } = flowStore.getState()
    e.stopPropagation()

    const nodeList = getNodes()

    const { restrictLocation } = processNodeIterationChildDrag(node)

    const {
      showHorizontalHelpLineNodes: showHorizontalHelpLineNodesList,
      showVerticalGuideLineNodes,
    } = handleSetGuideLine(node)
    const showHorizontalHelpLineNodesLength = showHorizontalHelpLineNodesList.length
    const showVerticalGuideLineNodesLength = showVerticalGuideLineNodes.length

    const updatedNodes = produce(nodeList, (drafts) => {
      const currentNode = drafts.find(n => n.id === node.id)!

      if (showVerticalGuideLineNodesLength > 0)
        currentNode.position.x = showVerticalGuideLineNodes[0].position.x
      else if (restrictLocation.x !== undefined)
        currentNode.position.x = restrictLocation.x
      else
        currentNode.position.x = node.position.x

      if (showHorizontalHelpLineNodesLength > 0)
        currentNode.position.y = showHorizontalHelpLineNodesList[0].position.y
      else if (restrictLocation.y !== undefined)
        currentNode.position.y = restrictLocation.y
      else
        currentNode.position.y = node.position.y
    })

    // 使用 requestAnimationFrame 版本 (推荐)
    rafSetNodes(setNodes, updatedNodes)
  }, [flowStore, getOnlyReadNodes, handleSetGuideLine, processNodeIterationChildDrag, rafSetNodes])

  const processNodeDragStop = useCallback<NodeDragHandler>((_, node) => {
    const { setHorizontalHelpline, setVerticalHelpline } = workflowStore.getState()
    if (getOnlyReadNodes())
      return

    const { x, y } = draggedNodeStartPosition.current
    if (!(x === node.position.x && y === node.position.y)) {
      setHorizontalHelpline()
      setVerticalHelpline()
      handleDraftWorkflowSyncHook()

      if (x !== 0 && y !== 0)
        recordStateToHistory(WorkflowHistoryBind.NodeDragSkip)
    }
  }, [workflowStore, getOnlyReadNodes, recordStateToHistory, handleDraftWorkflowSyncHook])

  const processNodeEnter = useCallback<NodeMouseHandler>((_, node) => {
    if (node.data.type === 'sub-module')
      setInstanceState({ ...instanceState, isLoosen: true })

    if (getOnlyReadNodes())
      return

    if (node.type === NOTE_NODE_CUSTOM)
      return

    const {
      getNodes,
      setNodes: _setNodes,
      edges,
      setEdges,
    } = flowStore.getState()
    const nodeList = getNodes()
    const {
      nodeConnectingPayload,
      updateEnteringNodePayload,
    } = workflowStore.getState()

    if (nodeConnectingPayload) {
      if (nodeConnectingPayload.nodeId === node.id)
        return
      const connectingNode: Node = nodeList.find(n => n.id === nodeConnectingPayload.nodeId)!
      const isSameLevel = connectingNode.parentId === node.parentId

      if (isSameLevel) {
        updateEnteringNodePayload({
          nodeId: node.id,
          nodeData: node.data as any,
        })
      }
    }
    const updatedEdges = produce(edges, (drafts) => {
      const connectedEdgeList = getConnectedEdges([node], edges)

      connectedEdgeList.forEach((edge) => {
        const currentEdge = drafts.find(e => e.id === edge.id)
        if (currentEdge)
          currentEdge.data._relatedNodeIsHovering = true
      })
    })
    setEdges(updatedEdges)
  }, [flowStore, workflowStore, getOnlyReadNodes, instanceState, setInstanceState])

  const processNodeLeave = useCallback<NodeMouseHandler>((_, node) => {
    if (node.data.type === 'sub-module')
      setInstanceState({ ...instanceState, isLoosen: false })

    if (getOnlyReadNodes())
      return

    if (node.type === NOTE_NODE_CUSTOM)
      return

    const {
      updateEnteringNodePayload,
    } = workflowStore.getState()
    updateEnteringNodePayload(undefined)
    const { getNodes, setNodes, edges, setEdges } = flowStore.getState()
    const updatedNodes = produce(getNodes(), (drafts) => {
      drafts.forEach((node) => {
        node.data._isEntering = false
      })
    })
    setNodes(updatedNodes)
    const updatedEdges = produce(edges, (drafts) => {
      drafts.forEach((edge) => {
        edge.data._relatedNodeIsHovering = false
      })
    })
    setEdges(updatedEdges)
  }, [flowStore, workflowStore, getOnlyReadNodes, instanceState, setInstanceState])

  const processNodeSelect = useCallback((nodeId: string, clearSelection?: boolean) => {
    const { getNodes, setNodes, edges, setEdges } = flowStore.getState()

    const nodeList = getNodes()
    const selectedNode = nodeList.find(node => node.data.selected)

    if (!clearSelection && selectedNode?.id === nodeId)
      return

    const updatedNodes = produce(nodeList, (drafts) => {
      drafts.forEach((node) => {
        if (node.id === nodeId)
          node.data.selected = !clearSelection
        else
          node.data.selected = false
      })
    })
    setNodes(updatedNodes)

    const connectedEdgeList = getConnectedEdges([{ id: nodeId } as Node], edges).map(edge => edge.id)
    const updatedEdges = produce(edges, (drafts) => {
      drafts.forEach((edge) => {
        if (connectedEdgeList.includes(edge.id)) {
          edge.data = {
            ...edge.data,
            _isLinkedNodeSelected: !clearSelection,
          }
        }
        else {
          edge.data = {
            ...edge.data,
            _isLinkedNodeSelected: false,
          }
        }
      })
    })
    setEdges(updatedEdges)

    handleDraftWorkflowSyncHook()
  }, [flowStore, handleDraftWorkflowSyncHook])

  const processNodeClick = useCallback<NodeMouseHandler>((_, node) => {
    _.stopPropagation()
    processNodeSelect(node.id)
  }, [processNodeSelect])

  const processCancelNode = useCallback(() => {
    processNodeSelect('')
  }, [processNodeSelect])

  const processNodeConnect = useCallback<OnConnect>(({ source, sourceHandle, target, targetHandle }) => {
    if (source === target)
      return
    if (getOnlyReadNodes())
      return

    const { getNodes, setNodes, edges, setEdges } = flowStore.getState()
    const nodeList = getNodes()
    const targetNode = nodeList.find(node => node.id === target)
    const sourceNode = nodeList.find(node => node.id === source)

    if (!targetNode || !sourceNode)
      return

    if (targetNode.parentId !== sourceNode.parentId)
      return

    if (targetNode.data.isIterationStart)
      return

    if (sourceNode.type === NOTE_NODE_CUSTOM || targetNode.type === NOTE_NODE_CUSTOM)
      return

    // 每个输入端点只能接入一根线
    const isExistTarget = edges.find(item => `${targetNode.id}${targetHandle}` === `${item.target}${item.targetHandle}`)

    // 保留输入端口的单一连接限制
    if (isExistTarget)
      return
    // const existEdgeIndex = edges.findIndex(item => `${sourceNode.id}_${targetNode.id}` === `${item.source}_${item.target}`)

    const needDeleteEdges = edges.filter((edge) => {
      // 修改：只删除目标端点的已有连接，不再删除源端点的已有连接
      if (edge.target === target && edge.targetHandle === targetHandle)
        return true

      return false
    })
    const needDeleteEdgesIds = needDeleteEdges.map(edge => edge.id)

    const edgesConnectedSourceOrTargetNodesChanges = [] as any[] // ConnectedSourceOrTargetNodesChange

    needDeleteEdges.forEach((edge) => {
      edgesConnectedSourceOrTargetNodesChanges.push({
        type: 'disconnect' as const,
        edge,
      })
    })

    // 新增的线
    const newEdgeId = uuid4()
    const newEdgeData = {
      id: newEdgeId,
      source,
      target,
      sourceHandle: sourceHandle || 'source',
      targetHandle: targetHandle || 'target',
      type: 'custom',
      data: {
        sourceType: sourceNode.data.type,
        targetType: targetNode.data.type,
        isInIteration: targetNode.data.isInIteration || sourceNode.data.isInIteration,
        iteration_id: targetNode.data.iteration_id || sourceNode.data.iteration_id,
      },
    } as Edge

    edgesConnectedSourceOrTargetNodesChanges.push({
      type: 'connect' as const,
      edge: newEdgeData,
    })

    const nodesConnectedSourceOrTargetHandleIdsMap = getNodesMap(edgesConnectedSourceOrTargetNodesChanges, nodeList)

    const updatedNodes = produce(nodeList, (drafts) => {
      Object.keys(nodesConnectedSourceOrTargetHandleIdsMap).forEach((nodeId) => {
        const node = drafts.find(node => node.id === nodeId)!
        const { _connectedSourceHandleIds, _connectedTargetHandleIds } = nodesConnectedSourceOrTargetHandleIdsMap[nodeId]
        node.data._connectedSourceHandleIds = _connectedSourceHandleIds
        node.data._connectedTargetHandleIds = _connectedTargetHandleIds
      })
      const targetInfo = drafts.find(node => node.id === target)
      if (targetInfo) {
        const sourceIdList = targetInfo.data.config__input_ports?.map((portItem) => {
          // 比对${端口id},${节点id}，包含即将添加的连接
          const isNewConnection = portItem.id === targetHandle && targetInfo.id === target
          if (isNewConnection)
            return { label: undefined, source, portId: portItem.id }

          // 对于已有连接，从现有边中查找
          const existingEdge = edges.find(val =>
            !needDeleteEdgesIds.includes(val.id)
            && `${portItem.id},${targetInfo.id}` === `${val.targetHandle},${val.target}`,
          )
          return existingEdge
            ? { label: existingEdge.label, source: existingEdge.source, portId: portItem.id }
            : null
        }).filter(Boolean)
        if (sourceIdList && sourceIdList.length > 0) {
          const sourceInfo = drafts.find(node => node.id === source)
          const validationPayload = {
            targetInfo,
            sourceInfo,
            sourceIdList,
            nodes: drafts,
          }

          try {
            // 使用generateCheckPorts验证参数
            const checkResultPorts = generateCheckPorts(validationPayload)
            if (targetInfo && checkResultPorts) {
              targetInfo.data.config__input_ports = checkResultPorts.concat(targetInfo.data.config__input_ports.slice(checkResultPorts.length))
              const hasValidationError = checkResultPorts.some(port => port.param_check_success === false)
              targetInfo.data._valid_check_success = !hasValidationError
              if (target) {
                const cascadeCheckResult = cascadeCheckDownstreamNodes(target, drafts, edges.concat([newEdgeData]))
                Object.keys(cascadeCheckResult).forEach((nodeId) => {
                  const nodeToUpdate = drafts.find(n => n.id === nodeId)
                  if (nodeToUpdate && cascadeCheckResult[nodeId])
                    nodeToUpdate.data.config__input_ports = cascadeCheckResult[nodeId]
                })
              }
            }
          }
          catch (error) {
            console.error('Error validating connection parameters:', error)
          }
        }
      }
    })

    setNodes(updatedNodes)

    // 检查是否需要同步聚合器 - 在连接建立时触发
    setTimeout(() => {
      const { getNodes: getCurrentNodes, edges: currentEdges } = flowStore.getState()
      const currentNodes = getCurrentNodes()
      const currentSourceNode = currentNodes.find(node => node.id === source)
      if (currentSourceNode) {
        const isBranchNode = (currentSourceNode.type && ['if-else', 'switch-case'].includes(currentSourceNode.type))
          || ['Ifs', 'Switch'].includes(currentSourceNode.data?.payload__kind)

        if (isBranchNode && source) {
          // 直接调用同步函数
          syncDownstreamAggregators(source, flowStore)
        }
      }
      const currentTargetNode = currentNodes.find(node => node.id === target)
      if (currentTargetNode?.data?.payload__kind === 'aggregator') {
        const allIncomingEdges = currentEdges.concat([newEdgeData]).filter(edge => edge.target === target)

        for (const edge of allIncomingEdges) {
          const sourceNodeData = currentNodes.find(node => node.id === edge.source)
          if (sourceNodeData) {
            const isBranchNode = (sourceNodeData.type && ['if-else', 'switch-case'].includes(sourceNodeData.type))
              || ['Ifs', 'Switch'].includes(sourceNodeData.data?.payload__kind)

            if (isBranchNode && edge.source) {
              // 直接调用同步函数
              syncDownstreamAggregators(edge.source, flowStore)
              break
            }
          }
        }
      }
    }, 200)

    const updatedEdges = produce(edges, (drafts) => {
      needDeleteEdgesIds.forEach((edgeId) => {
        const index = drafts.findIndex(edge => edge.id === edgeId)
        drafts.splice(index, 1)
      })
      drafts.push(newEdgeData)
    })

    setEdges(updatedEdges)

    handleDraftWorkflowSyncHook()
    recordStateToHistory(WorkflowHistoryBind.NodeLink, `${sourceNode.data.title} -> ${targetNode.data.title}`)
  }, [flowStore, getOnlyReadNodes, handleDraftWorkflowSyncHook, recordStateToHistory])

  const processNodeConnectStart = useCallback<OnConnectStart>((_, { nodeId, handleType, handleId }) => {
    if (getOnlyReadNodes())
      return

    if (nodeId && handleType) {
      const { setNodeLinkingPayload } = workflowStore.getState()
      const { getNodes } = flowStore.getState()
      const nodeData = getNodes().find(n => n.id === nodeId)!

      if (nodeData.type === NOTE_NODE_CUSTOM)
        return

      if (!nodeData.data.isIterationStart)
        setNodeLinkingPayload({ nodeId, nodeType: nodeData.data.type, handleType, handleId })
    }
  }, [flowStore, workflowStore, getOnlyReadNodes])

  const processNodeConnectEnd = useCallback<OnConnectEnd>((_e: any) => {
    if (getOnlyReadNodes())
      return

    const {
      nodeConnectingPayload,
      setNodeLinkingPayload,
      inProgressNodePayload,
      updateEnteringNodePayload,
    } = workflowStore.getState()
    if (nodeConnectingPayload && inProgressNodePayload) {
      const {
        getNodes,
        edges,
      } = flowStore.getState()
      const nodeList = getNodes()
      const fromNode = nodeList.find(n => n.id === nodeConnectingPayload.nodeId)!
      const toNode = nodeList.find(n => n.id === inProgressNodePayload.nodeId)!

      const sourceIdList = toNode.data?.config__input_ports?.map((portItem) => {
        // 比对${端口id},${节点id}
        const { label, source } = edges.find(val => `${portItem?.id},${toNode.id}` === `${val.targetHandle},${val.target}`) || {}
        return { label, source, portId: portItem?.id }
      })

      handleCheckNodeShape({ targetInfo: toNode, sourceIdList, nodes: nodeList, isCheckBranch: true })

      if (fromNode.parentId !== toNode.parentId)
        return
    }
    setNodeLinkingPayload(undefined)
    updateEnteringNodePayload(undefined)
  }, [flowStore, getOnlyReadNodes, workflowStore, handleCheckNodeShape])

  const processNodeDelete = useCallback((nodeId: string): any => {
    if (getOnlyReadNodes())
      return

    const {
      getNodes,
      setNodes,
      edges,
      setEdges,
    } = flowStore.getState()

    const nodeList = getNodes()
    const currentNodeIndex = nodeList.findIndex(node => node.id === nodeId)
    const currentNode = nodeList[currentNodeIndex]

    if (!currentNode)
      return
    // TO_CHANGE_FOR [DELETE ExecutionBlockEnum.EntryNode]
    if (currentNode.data.type === ExecutionBlockEnum.EntryNode || currentNode.data.type === ExecutionBlockEnum.FinalNode)
      return
    let linkedNodeToDelete: Node | undefined
    if (BranchNodeTypes.includes(currentNode.data?.payload__kind)) {
      linkedNodeToDelete = nodeList.find(node =>
        node.data?.payload__kind === 'aggregator'
        && node.id === currentNode.data?.linkNodeId,
      )
    }
    else if (currentNode.data?.payload__kind === 'aggregator' && currentNode.data?.createWithIntention) {
      linkedNodeToDelete = nodeList.find(node =>
        BranchNodeTypes.includes(node.data?.payload__kind)
        && node.data?.linkNodeId === currentNode.id,
      )
    }

    // 获取所有相关的边，包括普通边和虚线边
    const connectedEdgeList = [
      ...getConnectedEdges([{ id: nodeId } as Node], edges),
      ...edges.filter(edge =>
        (edge.type === 'dash-edge' && (edge.source === nodeId || edge.target === nodeId)),
      ),
    ]

    // 如果有关联节点，也获取其连接的边和虚线边
    if (linkedNodeToDelete) {
      const linkedNodeEdges = [
        ...getConnectedEdges([linkedNodeToDelete], edges),
        ...edges.filter(edge =>
          (edge.type === 'dash-edge' && (edge.source === linkedNodeToDelete?.id || edge.target === linkedNodeToDelete?.id)),
        ),
      ]
      connectedEdgeList.push(...linkedNodeEdges)
    }

    const nodesConnectedSourceOrTargetHandleIdsMap = getNodesMap(
      connectedEdgeList.map(edge => ({ type: 'disconnect' as const, edge })),
      nodeList,
    )

    const updatedNodes = produce(nodeList, (drafts: Node[]) => {
      drafts.forEach((node) => {
        if (nodesConnectedSourceOrTargetHandleIdsMap[node.id]) {
          node.data = {
            ...node.data,
            ...nodesConnectedSourceOrTargetHandleIdsMap[node.id],
          }
        }

        if (node.id === currentNode.parentId) {
          node.data._children = node.data._children?.filter(child => child !== nodeId)

          if (currentNode.id === (node as Node<RepetitionNodeType>).data.start_node_id) {
            (node as Node<RepetitionNodeType>).data.start_node_id = '';
            (node as Node<RepetitionNodeType>).data.EntryNodeCategory = undefined
          }
        }
      })
      // 删除当前节点
      drafts.splice(currentNodeIndex, 1)
      // 如果有关联节点，也删除它
      if (linkedNodeToDelete) {
        const linkedNodeIndex = drafts.findIndex(n => n.id === linkedNodeToDelete!.id)
        if (linkedNodeIndex !== -1)
          drafts.splice(linkedNodeIndex, 1)
      }
    })

    setNodes(updatedNodes)
    const updatedEdges = produce(edges, (drafts) => {
      return drafts.filter(edge => !connectedEdgeList.find(connectedEdge => connectedEdge.id === edge.id))
    })
    setEdges(updatedEdges)
    handleDraftWorkflowSyncHook()

    if (currentNode.type === 'custom-note')
      recordStateToHistory(WorkflowHistoryBind.NoteDelete)
    else
      recordStateToHistory(WorkflowHistoryBind.NodeRemove, currentNode?.data?.title)
  }, [getOnlyReadNodes, flowStore, handleDraftWorkflowSyncHook, recordStateToHistory])

  const processNodeCancelexecutionStatus = useCallback(() => {
    const {
      getNodes,
      setNodes,
    } = flowStore.getState()

    const nodeList = getNodes()
    const updatedNodes = produce(nodeList, (drafts) => {
      drafts.forEach((node) => {
        node.data._executionStatus = undefined
      })
    })
    setNodes(updatedNodes)
  }, [flowStore])

  const processNodesCancelSelected = useCallback(() => {
    const {
      getNodes,
      setNodes,
    } = flowStore.getState()

    const nodeList = getNodes()
    const updatedNodes = produce(nodeList, (drafts) => {
      drafts.forEach((node) => {
        node.data.selected = false
      })
    })
    setNodes(updatedNodes)
  }, [flowStore])

  const processNodeContextMenu = useCallback((e: MouseEvent, node: Node) => {
    e.stopPropagation()
    if (node.type === NOTE_NODE_CUSTOM)
      return

    e.preventDefault()
    const box = document.querySelector('#graph-canvas')
    const { x, y } = box!.getBoundingClientRect()
    workflowStore.setState({
      nodeMenu: {
        top: e.clientY - y,
        left: e.clientX - x,
        nodeId: node.id,
      },
    })
    // processNodeSelect(node.id)
  }, [workflowStore])

  const processNodesCopy = useCallback((nodeIdToCopy?: string) => {
    if (getOnlyReadNodes())
      return

    const {
      setClipboardElements,
      shortcutsDisabled,
      showFeaturesPanel,
    } = workflowStore.getState()

    const {
      getNodes,
    } = flowStore.getState()

    const nodeList = getNodes()
    if (nodeIdToCopy) {
      const targetNode = nodeList.find(node => node.id === nodeIdToCopy && node.data.type !== ExecutionBlockEnum.EntryNode && node.data.type !== ExecutionBlockEnum.FinalNode)
      if (targetNode) {
        const clipboardNodes: Node[] = [targetNode]
        if (BranchNodeTypes.includes(targetNode.data?.payload__kind) && targetNode.data?.linkNodeId) {
          const linkedAgg = nodeList.find(n => n.id === targetNode.data.linkNodeId)
          if (linkedAgg)
            clipboardNodes.push(linkedAgg)
        }
        else if (targetNode.data?.payload__kind === 'aggregator' && targetNode.data?.createWithIntention) {
          const linkedBranch = nodeList.find(n => BranchNodeTypes.includes(n.data?.payload__kind) && n.data?.linkNodeId === targetNode.id)
          if (linkedBranch)
            clipboardNodes.push(linkedBranch)
        }

        // 去重（防止重复加入）
        const uniqueClipboardNodes = Array.from(new Map(clipboardNodes.map(n => [n.id, n])).values())

        setClipboardElements(uniqueClipboardNodes)
        workflowStore.setState({ patentState: { ...(workflowStore.getState().patentState || {}), __allowPasteOnce: true } })
        // 确保快捷键可用（部分场景可能被禁用）
        const { setShortcutsDisabled } = workflowStore.getState()
        setShortcutsDisabled(false)
        return
      }
    }
    if (shortcutsDisabled || showFeaturesPanel)
      return

    const bundledNodes = nodeList.filter(node => node.data._isPacked && node.data.type !== ExecutionBlockEnum.EntryNode && node.data.type !== ExecutionBlockEnum.FinalNode && !node.data.isInIteration)

    if (bundledNodes.length) {
      setClipboardElements(bundledNodes)
      return
    }

    const selectedNode = nodeList.find(node => node.data.selected && node.data.type !== ExecutionBlockEnum.EntryNode && node.data.type !== ExecutionBlockEnum.FinalNode)

    if (selectedNode) {
      const clipboardNodes: Node[] = [selectedNode]
      if (BranchNodeTypes.includes(selectedNode.data?.payload__kind) && selectedNode.data?.linkNodeId) {
        const linkedAgg = nodeList.find(n => n.id === selectedNode.data.linkNodeId)
        if (linkedAgg)
          clipboardNodes.push(linkedAgg)
      }
      else if (selectedNode.data?.payload__kind === 'aggregator' && selectedNode.data?.createWithIntention) {
        const linkedBranch = nodeList.find(n => BranchNodeTypes.includes(n.data?.payload__kind) && n.data?.linkNodeId === selectedNode.id)
        if (linkedBranch)
          clipboardNodes.push(linkedBranch)
      }
      const uniqueClipboardNodes = Array.from(new Map(clipboardNodes.map(n => [n.id, n])).values())
      setClipboardElements(uniqueClipboardNodes)
    }
  }, [flowStore, getOnlyReadNodes, workflowStore])

  const processNodesPaste = useCallback(() => {
    if (getOnlyReadNodes())
      return

    const {
      clipboardElements,
      shortcutsDisabled,
      showFeaturesPanel,
      mousePosition,
      patentState,
    } = workflowStore.getState()

    // 放宽限制：若存在从面板复制的单次粘贴许可，则允许粘贴并消费该许可
    const allowPasteOnce = patentState?.__allowPasteOnce && clipboardElements.length > 0
    if (!allowPasteOnce && (shortcutsDisabled || showFeaturesPanel))
      return

    const {
      getNodes,
      setNodes,
      edges,
      setEdges,
    } = flowStore.getState()

    const nodesToPaste: Node[] = []
    const nodeList = getNodes()

    if (clipboardElements.length) {
      // 消费单次许可
      if (allowPasteOnce)
        workflowStore.setState({ patentState: { ...(patentState || {}), __allowPasteOnce: false } })
      const topLeft = getTopLeftNodePosition(clipboardElements as any)
      const originalTopLeftX = Number.isFinite(topLeft.x) ? topLeft.x : 0
      const originalTopLeftY = Number.isFinite(topLeft.y) ? topLeft.y : 0

      const { screenToFlowPosition } = reactflow

      // 计算目标位置：若鼠标位置无效，则使用默认偏移
      const hasValidMouse = Number.isFinite(mousePosition?.pageX) && Number.isFinite(mousePosition?.pageY) && (mousePosition?.pageX !== 0 || mousePosition?.pageY !== 0)
      const currentPosition = hasValidMouse
        ? screenToFlowPosition({ x: mousePosition.pageX, y: mousePosition.pageY })
        : { x: originalTopLeftX + 24, y: originalTopLeftY + 24 }

      const offsetX = currentPosition.x - originalTopLeftX
      const offsetY = currentPosition.y - originalTopLeftY
      const idMap = new Map<string, string>()

      clipboardElements.forEach((nodeToPaste, index) => {
        const nodeType = nodeToPaste.data.type

        const newNode = getnewNodeGenerate({
          type: nodeToPaste.type,
          data: {
            ...JSON.parse(JSON.stringify(NODES_INITIAL_DATA[nodeType] || {})),
            ...nodeToPaste.data,
            selected: false,
            _isPacked: false,
            _connectedSourceHandleIds: [],
            _connectedTargetHandleIds: [],
            title: generateUniqueTitle(nodeToPaste.data, nodeList),
          },
          position: {
            x: (nodeToPaste.position?.x || 0) + (Number.isFinite(offsetX) ? offsetX : 24),
            y: (nodeToPaste.position?.y || 0) + (Number.isFinite(offsetY) ? offsetY : 24),
          },
          extent: nodeToPaste.extent,
          zIndex: nodeToPaste.zIndex,
        })
        newNode.id = newNode.id + index

        // 建立旧新ID映射
        idMap.set(nodeToPaste.id, newNode.id)

        const newChildren: Node[] = []
        nodesToPaste.push(newNode)

        if (newChildren.length)
          nodesToPaste.push(...newChildren)
      })
      nodesToPaste.forEach((n) => {
        if (BranchNodeTypes.includes(n.data?.payload__kind) && n.data?.linkNodeId && idMap.has(n.data.linkNodeId)) {
          const newAggId = idMap.get(n.data.linkNodeId)!
          n.data.linkNodeId = newAggId
        }
      })

      // 创建 dash-edge（仅当成对节点均被复制）
      const dashEdgesToAdd: any[] = []
      nodesToPaste.forEach((n) => {
        if (BranchNodeTypes.includes(n.data?.payload__kind) && n.data?.linkNodeId) {
          const aggExists = nodesToPaste.find(x => x.id === n.data.linkNodeId)
          if (aggExists) {
            dashEdgesToAdd.push({
              id: `${n.id}-${n.data.linkNodeId}-dash`,
              source: n.id,
              sourceHandle: 'false',
              targetHandle: '',
              target: n.data.linkNodeId,
              type: 'dash-edge',
              data: {
                sourceType: n.data.type,
                targetType: aggExists.data.type,
              },
            })
          }
        }
      })

      setNodes([...nodeList, ...nodesToPaste])
      if (dashEdgesToAdd.length) {
        const updatedEdges = produce(edges, (drafts) => {
          dashEdgesToAdd.forEach(e => drafts.push(e))
        })
        setEdges(updatedEdges)
      }
      recordStateToHistory(WorkflowHistoryBind.NodeStick)
      handleDraftWorkflowSyncHook()
    }
  }, [flowStore, getOnlyReadNodes, workflowStore, reactflow, recordStateToHistory, handleDraftWorkflowSyncHook])

  const processNodesDuplicate = useCallback(() => {
    if (getOnlyReadNodes())
      return

    processNodesCopy()
    processNodesPaste()
  }, [getOnlyReadNodes, processNodesCopy, processNodesPaste])

  const processNodesDelete = useCallback(() => {
    if (getOnlyReadNodes()) {
      const { warnText } = getNodesCheckDetails()
      if (warnText)
        message.warning(warnText)

      return
    }

    const {
      getNodes,
      edges,
    } = flowStore.getState()

    const nodeList = getNodes()
    const bundledNodes = nodeList.filter(node => node.data._isPacked && node.data.type !== ExecutionBlockEnum.EntryNode)

    if (bundledNodes.length) {
      bundledNodes.forEach(node => processNodeDelete(node.id))

      return
    }

    const edgeSelected = edges.some(edge => edge.selected)
    if (edgeSelected)
      return

    const selectedNode = nodeList.find(node => node.data.selected && node.data.type !== ExecutionBlockEnum.EntryNode)

    if (selectedNode)
      processNodeDelete(selectedNode.id)
  }, [flowStore, getOnlyReadNodes, getNodesCheckDetails, processNodeDelete])

  const processNodeResize = useCallback((nodeId: string, params: ResizeParamsWithDirectionType) => {
    if (getOnlyReadNodes())
      return

    const {
      getNodes,
      setNodes,
    } = flowStore.getState()
    const { x, y, width, height } = params

    const nodeList = getNodes()
    const currentNode = nodeList.find(n => n.id === nodeId)!
    const childrenNodes = nodeList.filter(n => currentNode.data._children?.includes(n.id))
    let rightNode: Node
    let bottomNode: Node

    childrenNodes.forEach((n) => {
      if (rightNode) {
        if (n.position.x + n.width! > rightNode.position.x + rightNode.width!)
          rightNode = n
      }
      else {
        rightNode = n
      }
      if (bottomNode) {
        if (n.position.y + n.height! > bottomNode.position.y + bottomNode.height!)
          bottomNode = n
      }
      else {
        bottomNode = n
      }
    })

    if (rightNode! && bottomNode!) {
      if (width < rightNode!.position.x + rightNode.width! + ITERATION_NODE_PADDING.right)
        return
      if (height < bottomNode.position.y + bottomNode.height! + ITERATION_NODE_PADDING.bottom)
        return
    }
    const updatedNodes = produce(nodeList, (drafts) => {
      drafts.forEach((n) => {
        if (n.id === nodeId) {
          n.data.width = width
          n.data.height = height
          n.width = width
          n.height = height
          n.position.x = x
          n.position.y = y
        }
      })
    })
    setNodes(updatedNodes)
    handleDraftWorkflowSyncHook()
    recordStateToHistory(WorkflowHistoryBind.Resize)
  }, [flowStore, getOnlyReadNodes, handleDraftWorkflowSyncHook, recordStateToHistory])

  const processHistoryBack = useCallback(() => {
    if (getOnlyReadNodes())
      return

    const { setEdges, setNodes } = flowStore.getState()
    undo()

    const { edges, nodes } = workflowHistoryStore.getState()
    if (edges.length === 0 && nodes.length === 0)
      return

    setEdges(edges)
    setNodes(nodes)
  }, [flowStore, undo, workflowHistoryStore, getOnlyReadNodes])

  const processHistoryForward = useCallback(() => {
    if (getOnlyReadNodes())
      return

    const { setEdges, setNodes } = flowStore.getState()
    redo()

    const { edges, nodes } = workflowHistoryStore.getState()
    if (edges.length === 0 && nodes.length === 0)
      return

    setEdges(edges)
    setNodes(nodes)
  }, [redo, flowStore, workflowHistoryStore, getOnlyReadNodes])

  return {
    handleNodeMoveBegin: processNodeDragStart,
    handleNodeMove: processNodeDrag,
    handleNodeDragEnd: processNodeDragStop,
    handleNodeMouseEnter: processNodeEnter,
    handleNodeMouseLeave: processNodeLeave,
    handleNodePick: processNodeSelect,
    handleNodeActivate: processNodeClick,
    handleNodeCancel: processCancelNode,
    handleNodeLink: processNodeConnect,
    handleNodeLinkStart: processNodeConnectStart,
    handleNodeLinkEnd: processNodeConnectEnd,
    handleNodeDelete: processNodeDelete,
    handleNodeCancelexecutionStatus: processNodeCancelexecutionStatus,
    handleNodesCancelSelected: processNodesCancelSelected,
    handleNodeOptions: processNodeContextMenu,
    handleCopyNodes: processNodesCopy,
    handleNodesInsert: processNodesPaste,
    handleDuplicateNodes: processNodesDuplicate,
    handleRemoveNodes: processNodesDelete,
    handleNodeResize: processNodeResize,
    handleHistoryUndo: processHistoryBack,
    handleHistoryRedo: processHistoryForward,
  }
}
