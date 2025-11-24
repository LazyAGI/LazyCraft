import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import dayjs from 'dayjs'
import { uniqBy } from 'lodash-es'
import produce from 'immer'
import {
  getIncomers,
  getOutgoers,
  useReactFlow,
  useStoreApi,
} from 'reactflow'
import type {
  Connection,
} from 'reactflow'
import {
  getLayoutByDagre,
} from '../utils'
import type {
  ExecutionEdge,
  ExecutionNode,
  ValueRetriever,
} from '../types'
import {
  ExecutionBlockEnum,
  ExecutionexecutionStatus,
} from '../types'
import {
  useStore,
  useWorkflowStore,
} from '../store'
import {
  CUSTOM_NODE_TYPE,
  SUPPORT_OUTPUT_VARS_NODES,
} from '../fixed-values'
import { NOTE_NODE_CUSTOM } from '../text-element/constants'
import { findUsedVarNodes, getNodeOutputVars, updateNodeVars } from '../elements/_foundation/components/variable/utils'
import { CustomResourceEnum } from '../resource-type-selector/constants'
import { ResourceClassificationEnum } from '../resource-type-selector/types'
import { useWorkflowNodeConnections } from './itemStore'
import { useWorkflowTemplate } from './flowModel'
import { useSyncDraft } from './itemAlignPlan'
import { IWorkflowHistoryEvent, useWorkflowLog } from './flowHist'
import {
  fetchAllUniverseNodes,
} from '@/infrastructure/api//universe'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { useStore as useAppStore } from '@/app/components/app/store'
import {
  fetchPublishedWorkflow,
  fetchWebOrServerUrlInWorkflow,
  fetchWorkflowDraft,
  getAppDebuggingEnableStatus,
  syncWorkflowDraft,
} from '@/infrastructure/api//workflow'
import type { FetchWorkflowDraftResult } from '@/shared/types/workflow'
import { usePermitCheck } from '@/app/components/app/permit-check'
import { useResources } from '@/app/components/taskStream/logicHandlers/resStore'
import { fetchAllCustomResourceTypes } from '@/infrastructure/api//resource'
import { ContainerType } from '@/app/components/tools/types'
import { administratorId } from '@/shared/utils'

export const useIsChatMode = () => {
  const appDetail = useAppStore(s => s.appDetail)

  return appDetail?.mode === 'advanced-chat'
}

export const useWorkflow = () => {
  const flowStore = useStoreApi()
  const reactflow = useReactFlow()
  const workflowContext = useWorkflowStore()
  const nodesExtraData = useWorkflowNodeConnections()
  const { handleDraftWorkflowSync } = useSyncDraft()
  const { recordStateToHistory } = useWorkflowLog()

  const validateConnection = useCallback(({ source, target }: Connection) => {
    const {
      edges,
      getNodes,
    } = flowStore.getState()
    const nodeList = getNodes()
    const sourceNode = nodeList.find(node => node.id === source)
    const targetNode = nodeList.find(node => node.id === target)

    // 确保节点存在
    if (!sourceNode || !targetNode)
      return false

    if (targetNode.data?.isIterationStart)
      return false

    if (sourceNode.type === NOTE_NODE_CUSTOM || targetNode.type === NOTE_NODE_CUSTOM)
      return false

    // 检查节点类型兼容性
    const sourceNodeAvailableNextNodes = nodesExtraData[sourceNode.data.type]?.availableNextNodes
    const targetNodeAvailablePrevNodes = nodesExtraData[targetNode.data.type]?.availablePrevNodes

    if (!sourceNodeAvailableNextNodes || !targetNodeAvailablePrevNodes)
      return false

    if (!sourceNodeAvailableNextNodes.includes(targetNode.data.type))
      return false

    if (![...targetNodeAvailablePrevNodes, ExecutionBlockEnum.EntryNode].includes(sourceNode.data.type))
      return false

    // 如果是绑定创建的聚合器节点（id包含_link），需要回溯上游的节点, 上游的节点必须是与自己绑定创建的节点相连的节点
    if (targetNode.id.includes('_link') && targetNode.data?.payload__kind === 'aggregator') {
      // 获取聚合器节点的绑定源节点ID（去掉_link后缀）
      const linkedSourceNodeId = targetNode.id.replace('_link', '')

      // 检查当前连接的源节点是否是绑定的源节点
      if (sourceNode.id !== linkedSourceNodeId) {
        // 如果不是绑定的源节点，需要检查是否是绑定源节点的下游节点
        const linkedSourceNode = nodeList.find(node => node.id === linkedSourceNodeId)
        if (!linkedSourceNode)
          return false

        // 递归检查源节点是否在绑定源节点的下游路径中
        const isDownstreamOfLinkedSource = (currentNodeData: ExecutionNode, visited = new Set<string>()): boolean => {
          if (visited.has(currentNodeData.id))
            return false

          visited.add(currentNodeData.id)

          // 如果当前节点就是绑定的源节点，说明找到了路径
          if (currentNodeData.id === linkedSourceNodeId)
            return true

          // 检查当前节点的所有上游节点
          const incomers = getIncomers(currentNodeData, nodeList, edges)
          return incomers.some(incomer => isDownstreamOfLinkedSource(incomer, visited))
        }

        // 如果源节点不在绑定源节点的下游路径中，则不允许连接
        if (!isDownstreamOfLinkedSource(sourceNode))
          return false
      }
    }

    // 检查是否会形成循环
    const hasCycle = (node: ExecutionNode, visited = new Set()) => {
      if (visited.has(node.id))
        return false

      visited.add(node.id)

      for (const outgoer of getOutgoers(node, nodeList, edges)) {
        if (outgoer.id === source)
          return true
        if (hasCycle(outgoer, visited))
          return true
      }
    }

    return !hasCycle(targetNode)
  }, [flowStore, nodesExtraData])

  const fetchNode = useCallback((nodeId?: string) => {
    const { getNodes } = flowStore.getState()
    const nodeList = getNodes()

    return nodeList.find(node => node.id === nodeId) || nodeList.find(node => node.data.type === ExecutionBlockEnum.EntryNode)
  }, [flowStore])

  const fetchTreeLeafNodes = useCallback((nodeId: string) => {
    const {
      getNodes,
      edges,
    } = flowStore.getState()
    const nodeList = getNodes()
    let EntryNode = nodeList.find(node => node.data.type === ExecutionBlockEnum.EntryNode)
    const currentNodeData = nodeList.find(node => node.id === nodeId)

    if (currentNodeData?.parentId)
      EntryNode = nodeList.find(node => node.parentId === currentNodeData.parentId && node.data.isIterationStart)

    if (!EntryNode)
      return []

    const list: ExecutionNode[] = []
    const preOrder = (root: ExecutionNode, callback: (node: ExecutionNode) => void) => {
      if (root.id === nodeId)
        return
      const outgoers = getOutgoers(root, nodeList, edges)

      if (outgoers.length) {
        outgoers.forEach((outgoer) => {
          preOrder(outgoer, callback)
        })
      }
      else {
        if (root.id !== nodeId)
          callback(root)
      }
    }
    preOrder(EntryNode, (node) => {
      list.push(node)
    })

    const incomers = getIncomers({ id: nodeId } as ExecutionNode, nodeList, edges)

    list.push(...incomers)

    return uniqBy(list, 'id').filter((item) => {
      return SUPPORT_OUTPUT_VARS_NODES.includes(item.data.type)
    })
  }, [flowStore])

  const fetchAfterNodesInSameBranch = useCallback((nodeId: string) => {
    const {
      getNodes,
      edges,
    } = flowStore.getState()
    const nodeList = getNodes()
    const currentNodeData = nodeList.find(node => node.id === nodeId)!

    if (!currentNodeData)
      return []
    const list: ExecutionNode[] = [currentNodeData]

    const traverse = (root: ExecutionNode, callback: (node: ExecutionNode) => void) => {
      if (root) {
        const outgoers = getOutgoers(root, nodeList, edges)

        if (outgoers.length) {
          outgoers.forEach((node) => {
            callback(node)
            traverse(node, callback)
          })
        }
      }
    }
    traverse(currentNodeData, (node) => {
      list.push(node)
    })

    return uniqBy(list, 'id')
  }, [flowStore])

  const fetchBeforeNodesInSameBranch = useCallback((nodeId: string, newNodes?: ExecutionNode[], newEdges?: ExecutionEdge[]) => {
    const {
      getNodes,
      edges,
    } = flowStore.getState()
    const nodeList = newNodes || getNodes()
    const currentNodeData = nodeList.find(node => node.id === nodeId)

    const list: ExecutionNode[] = []

    if (!currentNodeData)
      return list

    if (currentNodeData.parentId) {
      const parentNode = nodeList.find(node => node.id === currentNodeData.parentId)
      if (parentNode) {
        const parentList = fetchBeforeNodesInSameBranch(parentNode.id)

        list.push(...parentList)
      }
    }

    const traverse = (root: ExecutionNode, callback: (node: ExecutionNode) => void) => {
      if (root) {
        const incomers = getIncomers(root, nodeList, newEdges || edges)

        if (incomers.length) {
          incomers.forEach((node) => {
            if (!list.find(n => node.id === n.id)) {
              callback(node)
              traverse(node, callback)
            }
          })
        }
      }
    }
    traverse(currentNodeData, (node) => {
      list.push(node)
    })

    const nodesLength = list.length
    if (nodesLength) {
      return uniqBy(list, 'id').reverse().filter((item) => {
        return SUPPORT_OUTPUT_VARS_NODES.includes(item.data.type)
      })
    }

    return []
  }, [flowStore])

  const fetchBeforeNodesInSameBranchIncludeParent = useCallback((nodeId: string, newNodes?: ExecutionNode[], newEdges?: ExecutionEdge[]) => {
    const nodeList = fetchBeforeNodesInSameBranch(nodeId, newNodes, newEdges)
    const {
      getNodes,
    } = flowStore.getState()
    const allNodeList = getNodes()
    const node = allNodeList.find(n => n.id === nodeId)
    const parentNode = allNodeList.find(n => n.id === node?.parentId)
    if (parentNode)
      nodeList.push(parentNode)

    return nodeList
  }, [fetchBeforeNodesInSameBranch, flowStore])

  const fetchBeforeNodeById = useCallback((nodeId: string) => {
    const { getNodes, edges } = flowStore.getState()
    const nodeList = getNodes()
    const node = nodeList.find(node => node.id === nodeId)!

    return getIncomers(node, nodeList, edges)
  }, [flowStore])

  const fetchIterationNodeChildren = useCallback((nodeId: string) => {
    const {
      getNodes,
    } = flowStore.getState()
    const nodeList = getNodes()

    return nodeList.filter(node => node.parentId === nodeId)
  }, [flowStore])

  const isVariableUsedInNodes = useCallback((varSelectors: ValueRetriever) => {
    const afterNodes = fetchAfterNodesInSameBranch(varSelectors[0])
    const effectNodes = findUsedVarNodes(varSelectors, afterNodes)
    return effectNodes.length > 0
  }, [fetchAfterNodesInSameBranch])

  const isNodeVariablesUsedInNodes = useCallback((nodeData: ExecutionNode, isChatMode: boolean) => {
    const outputVars = getNodeOutputVars(nodeData, isChatMode)
    const isUsed = outputVars.some((varSelector) => {
      return isVariableUsedInNodes(varSelector)
    })
    return isUsed
  }, [isVariableUsedInNodes])

  const handleOutputVariableRename = useCallback((nodeId: string, oldValeSelector: ValueRetriever, newVarSelector: ValueRetriever) => {
    const { getNodes, setNodes } = flowStore.getState()
    const afterNodes = fetchAfterNodesInSameBranch(nodeId)
    const effectNodes = findUsedVarNodes(oldValeSelector, afterNodes)
    if (effectNodes.length > 0) {
      const newNodes = getNodes().map((nodeData) => {
        if (effectNodes.find(n => n.id === nodeData.id))
          return updateNodeVars(nodeData, oldValeSelector, newVarSelector)

        return nodeData
      })
      setNodes(newNodes)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStore])

  const removeUsedVariableInNodes = useCallback((varSelectors: ValueRetriever) => {
    const { getNodes, setNodes } = flowStore.getState()
    const afterNodes = fetchAfterNodesInSameBranch(varSelectors[0])
    const effectNodes = findUsedVarNodes(varSelectors, afterNodes)
    if (effectNodes.length > 0) {
      const newNodes = getNodes().map((nodeData) => {
        if (effectNodes.find(n => n.id === nodeData.id))
          return updateNodeVars(nodeData, varSelectors, [])

        return nodeData
      })
      setNodes(newNodes)
    }
  }, [fetchAfterNodesInSameBranch, flowStore])

  const updateNodePanelWidth = useCallback((width: number) => {
    localStorage.setItem('workflow-node-panel-width', `${width}`)
    workflowContext.setState({ nodePanelWidth: width })
  }, [workflowContext])

  const updateResourcePanelWidth = useCallback((width: number) => {
    localStorage.setItem('workflow-resource-panel-width', `${width}`)
    workflowContext.setState({ resourcePanelWidth: width })
  }, [workflowContext])

  const updateRunPanelWidth = useCallback((width: number) => {
    localStorage.setItem('workflow-run-panel-width', `${width}`)
    workflowContext.setState({ runPanelWidth: width })
  }, [workflowContext])

  const organizeLayout = useCallback(async () => {
    workflowContext.setState({ nodeAnimation: true })
    const {
      getNodes,
      edges,
      setNodes,
    } = flowStore.getState()
    const { setViewport } = reactflow
    const nodeList = getNodes()
    const dagreLayout = getLayoutByDagre(nodeList, edges)
    const rankMaps = {} as Record<string, ExecutionNode>

    nodeList.forEach((node) => {
      if (!node.parentId && node.type === CUSTOM_NODE_TYPE) {
        const rank = dagreLayout.node(node.id).rank!

        if (!rankMaps[rank]) {
          rankMaps[rank] = node
        }
        else {
          if (rankMaps[rank].position.y > node.position.y)
            rankMaps[rank] = node
        }
      }
    })

    const newNodes = produce(nodeList, (draft) => {
      draft.forEach((node) => {
        if (!node.parentId && node.type === CUSTOM_NODE_TYPE) {
          const nodeWithPosition = dagreLayout.node(node.id)

          node.position = {
            x: nodeWithPosition.x - node.width! / 2,
            y: nodeWithPosition.y - node.height! / 2 + rankMaps[nodeWithPosition.rank!].height! / 2,
          }
        }
      })
    })
    setNodes(newNodes)
    const zoom = 0.7
    setViewport({
      y: 0,
      zoom,
      x: 0,
    })
    recordStateToHistory(IWorkflowHistoryEvent.LayoutOrganize)
    setTimeout(() => {
      handleDraftWorkflowSync()
    })
  }, [workflowContext, flowStore, reactflow, recordStateToHistory, handleDraftWorkflowSync])

  const formatTimeFromNow = useCallback((time: number) => {
    return dayjs(time).locale('zh-cn').fromNow()
  }, [])

  const enableShortcuts = useCallback(() => {
    const { setShortcutsDisabled } = workflowContext.getState()
    setShortcutsDisabled(false)
  }, [workflowContext])

  const disableShortcuts = useCallback(() => {
    const { setShortcutsDisabled } = workflowContext.getState()
    setShortcutsDisabled(true)
  }, [workflowContext])

  return {
    setNodePanelWidth: updateNodePanelWidth,
    setResourcePanelWidth: updateResourcePanelWidth,
    setRunPanelWidth: updateRunPanelWidth,
    handleLayout: organizeLayout,
    getTreeLeafNodes: fetchTreeLeafNodes,
    getPreviousNodesInSameBranch: fetchBeforeNodesInSameBranch,
    getPreviousNodesInSameBranchIncludeParent: fetchBeforeNodesInSameBranchIncludeParent,
    getAfterNodesInSameBranch: fetchAfterNodesInSameBranch,
    handleOutVarRenameChange: handleOutputVariableRename,
    isVarUsedInNodes: isVariableUsedInNodes,
    removeUsedVarInNodes: removeUsedVariableInNodes,
    isNodeVarsUsedInNodes: isNodeVariablesUsedInNodes,
    isValidConnection: validateConnection,
    formatTimeFromNow,
    getNode: fetchNode,
    getBeforeNodeById: fetchBeforeNodeById,
    getIterationNodeChildren: fetchIterationNodeChildren,
    enableShortcuts,
    disableShortcuts,
  }
}

const useFetchUniverseData = () => {
  const workflowContext = useWorkflowStore()

  const handleFetchAllUniverse = useCallback(async () => {
    const universeNodes = await fetchAllUniverseNodes()
    workflowContext.setState({
      universeNodes: universeNodes || [],
    })
  }, [workflowContext])

  return {
    handleFetchAllUniverse,
  }
}

const useFetchCustomResourceTypes = () => {
  const workflowContext = useWorkflowStore()

  const handleFetchCustomResourceTypes = useCallback(async () => {
    const customResourceTypes = await fetchAllCustomResourceTypes()

    workflowContext.setState({
      customResourceTypes: customResourceTypes || [],
    })
  }, [workflowContext])

  return {
    handleFetchCustomResourceTypes,
  }
}

export const useFetchWebOrServerUrl = () => {
  const workflowContext = useWorkflowStore()

  const handleFetchWebOrServerUrl = useCallback(async (maybeAppId?: string) => {
    const appId = maybeAppId || workflowContext?.getState?.().appId
    if (!appId)
      return
    const response = await fetchWebOrServerUrlInWorkflow({ appId })

    if (workflowContext?.setState) {
      workflowContext.setState({
        webUrl: response?.web_url || '',
        serverUrl: response?.api_url || '',
        workflowStatus: response?.status || '', // start or stop
      })
    }
  }, [workflowContext])

  return {
    handleFetchWebOrServerUrl,
  }
}

export const useWorkflowInit = () => {
  const flowReqRef = useRef({ subFlowCreating: false })
  const workflowContext = useWorkflowStore()
  const { setResources } = useResources()
  const {
    nodes: nodesTemplate,
    edges: edgesTemplate,
  } = useWorkflowTemplate()
  // const { handleFetchAllTools } = useFetchToolsData()
  const { handleFetchAllUniverse } = useFetchUniverseData()
  const { handleFetchCustomResourceTypes } = useFetchCustomResourceTypes()
  const { handleFetchWebOrServerUrl } = useFetchWebOrServerUrl()
  const appDetail = useAppStore(state => state.appDetail)!
  const { patentAppId, patentKind } = useStore(s => s.patentState) // , patentNodeData
  const instanceState = useStore(s => s.instanceState)
  const setInstanceState = useStore(s => s.setInstanceState)
  const setSyncWorkflowDraf = useStore(s => s.setSyncWorkflowHash)
  const [data, setData] = useState<FetchWorkflowDraftResult>()
  const [isLoading, setIsLoading] = useState(true)
  workflowContext.setState({ appId: patentAppId || appDetail.id })

  const handleGetInitialWorkflowData = useCallback(async () => {
    const repairWorkflow = (hash?) => {
      workflowContext.setState({ notInitialWorkflow: true })
      const params: any = {
        graph: {
          nodes: nodesTemplate,
          edges: edgesTemplate,
          edgeMode: 'bezier', // 默认使用曲线模式
        },
        features: {
          retriever_resource: { enabled: true },
        },
        environment_variables: [],
      }
      if (hash)
        params.hash = hash

      syncWorkflowDraft({
        url: `/apps/${patentAppId || appDetail.id}/workflows/draft`,
        params,
      }).then((response) => {
        workflowContext.getState().setDraftUpdatedAt(response.updated_at)
        // 设置 hash，确保后续同步请求使用正确的 hash
        setSyncWorkflowDraf(response.hash)
        handleGetInitialWorkflowData()
        if (flowReqRef.current.subFlowCreating)
          flowReqRef.current.subFlowCreating = false
      })
    }

    try {
      const response = await fetchWorkflowDraft(`/apps/${patentAppId || appDetail.id}/workflows/draft`) // patentNodeData || await
      if (!response.graph?.nodes && !response.graph?.viewport && response.hash) { // 子画布首次打开加载数据
        !flowReqRef.current.subFlowCreating && repairWorkflow(response.hash)
        flowReqRef.current.subFlowCreating = true
      }
      else {
        setData(response)
        workflowContext.setState({
          initDraftData: response,
          envSecrets: (response.environment_variables || []).filter(env => env.value_type === 'secret').reduce((acc, env) => {
            acc[env.id] = env.value
            return acc
          }, {} as Record<string, string>),
          environmentVariables: response.environment_variables?.map(env => env.value_type === 'secret' ? { ...env, value: '[__HIDDEN__]' } : env) || [],
        })
        // 从后端数据中恢复edgeMode设置
        if (response.graph?.edgeMode)
          workflowContext.getState().setEdgeModeFromDraft(response.graph.edgeMode)
        setSyncWorkflowDraf(response.hash)
        setIsLoading(false)
      }
    }
    catch (error: any) {
      if (error && error.json && !error.bodyUsed && appDetail) {
        error.json().then((err: any) => {
          if (err.code === 'draft_workflow_not_exist')
            repairWorkflow()
        })
      }
    }
  }, [appDetail, nodesTemplate, edgesTemplate, workflowContext, setSyncWorkflowDraf, patentAppId])

  const handleGetDebugStatus = useCallback(() => {
    if (appDetail.id) {
      getAppDebuggingEnableStatus(appDetail.id).then((response: any) => {
        if (response.status)
          setInstanceState({ ...instanceState, debugStatus: response.status })
      })
    }
  }, [])

  useEffect(() => {
    handleGetInitialWorkflowData()
    handleGetDebugStatus()
  }, [])

  const handleFetchPreload = useCallback(async () => {
    try {
      const nodesDefaultConfigs = [
        {
          type: 'code',
          config: {
            variables: [
              {
                variable: 'arg1',
                value_selector: [],
              },
              {
                variable: 'arg2',
                value_selector: [],
              },
            ],
            code_language: 'python3',
            code: '\ndef main(arg1: int, arg2: int) -> dict:\n    return {\n        "result": arg1 + arg2,\n    }\n',
            outputs: {
              result: {
                type: 'string',
                children: null,
              },
            },
          },
          available_dependencies: [
            {
              name: 'jinja2',
              version: '',
            },
            {
              name: 'httpx',
              version: '',
            },
            {
              name: 'requests',
              version: '',
            },
          ],
        },
        {
          type: 'code',
          config: {
            variables: [
              {
                variable: 'arg1',
                value_selector: [],
              },
              {
                variable: 'arg2',
                value_selector: [],
              },
            ],
            code_language: 'javascript',
            code: '\nfunction main({arg1, arg2}) {\n    return {\n        result: arg1 + arg2\n    }\n}\n',
            outputs: {
              result: {
                type: 'string',
                children: null,
              },
            },
          },
          available_dependencies: [],
        },
      ]
      if (patentKind !== 'Template') {
        if (patentAppId)
          return
        const publishedWorkflow = await fetchPublishedWorkflow(`/apps/${patentAppId || appDetail?.id}/workflows/publish`)
        workflowContext.getState().setPublishedAt(publishedWorkflow?.updated_at)
      }
      workflowContext.setState({
        nodesDefaultConfigs: nodesDefaultConfigs.reduce((acc, block) => {
          if (!acc[block.type])
            acc[block.type] = { ...block.config }
          return acc
        }, {} as Record<string, any>),
      })
    }
    catch (e) {

    }
  }, [workflowContext, appDetail, patentAppId])

  function formatRespondedResources(data: any[]) {
    return data?.map((resource) => {
      return ({
        ...resource,
        categorization: resource.mixed ? ResourceClassificationEnum.Custom : (resource?.categorization || resource?.data?.categorization),
        type: resource.mixed ? CustomResourceEnum.Custom : resource.type,
        data: {
          ...resource?.data,
          categorization: resource.mixed ? ResourceClassificationEnum.Custom : (resource?.categorization || resource?.data?.categorization),
          id: resource?.id || resource?.data?.id,
          selected: false,
        },
      })
    }) || []
  }

  useEffect(() => {
    handleFetchPreload()
    handleFetchAllUniverse()
    handleFetchCustomResourceTypes()
    handleFetchWebOrServerUrl()
  }, [handleFetchPreload, handleFetchAllUniverse, handleFetchCustomResourceTypes, handleFetchWebOrServerUrl])

  useEffect(() => {
    if (data) {
      workflowContext.getState().setDraftUpdatedAt(data.updated_at)
      workflowContext.getState().setToolPublished(data.tool_published)
      setResources(formatRespondedResources((data?.graph?.resources || [])))
    }
  }, [data, workflowContext, setResources])

  return {
    data,
    isLoading,
  }
}

export const useWorkflowReadOnly = () => {
  const workflowContext = useWorkflowStore()
  const workflowLiveData = useStore(s => s.workflowLiveData)

  const getReadOnlyWorkflow = useCallback(() => {
    return workflowContext.getState().workflowLiveData?.result.status === ExecutionexecutionStatus.Running
  }, [workflowContext])

  return {
    workflowReadOnly: workflowLiveData?.result.status === ExecutionexecutionStatus.Running,
    getWorkflowReadOnly: getReadOnlyWorkflow,
  }
}
export const useReadonlyNodes = () => {
  const workflowContext = useWorkflowStore()
  const workflowLiveData = useStore(s => s.workflowLiveData)
  const historyWorkflowData = useStore(s => s.historyWorkflowData)
  const appDetail = useAppStore(state => state.appDetail)
  const patentState = useStore(s => s.patentState)
  const instanceState = useStore(s => s.instanceState)
  const isRestoring = useStore(s => s.isRestoring)
  const { initDraftData } = workflowContext.getState()
  const { teamData, userSpecified } = useApplicationContext()
  const { hasPermit } = usePermitCheck()
  const { debugStatus } = instanceState || {}

  const isBuiltIn = initDraftData?.created_by === administratorId
  const isAuthor = initDraftData?.created_by && (initDraftData.created_by === userSpecified?.id)
  const hasAuth = isBuiltIn ? administratorId === userSpecified?.id : (isAuthor || hasPermit('AUTH_3002'))
  const isTeamLock = !hasAuth && (teamData?.coopAppIds?.includes(patentState.patentAppId || appDetail?.id) === false)

  // debugStatus - stop|starting|start|error
  const isProcessLock = patentState.patentKind === 'App' || isTeamLock || (!(patentState.historyStacks?.length >= 2) && debugStatus && debugStatus !== 'stop' && debugStatus !== 'error')

  const getReadOnlyNodes = useCallback(() => {
    const {
      workflowLiveData,
      historyWorkflowData,
      isRestoring,
    } = workflowContext.getState()
    // 保存
    return (workflowLiveData?.result.status === ExecutionexecutionStatus.Running || historyWorkflowData || isRestoring || isProcessLock)
  }, [workflowContext, debugStatus, isProcessLock])

  const getNodesCheckDetails = useCallback(() => {
    const resultData = { warnText: '' }

    if (getReadOnlyNodes()) {
      if (patentState.patentKind === 'App')
        resultData.warnText = '画布类型为应用，不可操作'
      else if (isTeamLock)
        resultData.warnText = '没有权限'
      else if (debugStatus === 'start')
        resultData.warnText = '调试正在运行中，不可操作'
      else if (debugStatus === 'starting')
        resultData.warnText = '正在启动调试，不可操作'
      else
        resultData.warnText = '正在运行中，不可操作'
    }
    return resultData
  }, [getReadOnlyNodes, patentState.patentKind, isTeamLock, debugStatus])

  return {
    nodesReadOnly: !!(workflowLiveData?.result.status === ExecutionexecutionStatus.Running || historyWorkflowData || isRestoring) || isProcessLock,
    getNodesReadOnly: getReadOnlyNodes,
    getNodesCheckDetails,
  }
}

export const useToolIcon = (data: ExecutionNode['data']) => {
  const buildTools = useStore(s => s.buildInTools)
  const customTools = useStore(s => s.customTools)
  const workflowTools = useStore(s => s.workflowTools)
  const toolIcon = useMemo(() => {
    if (data.type === ExecutionBlockEnum.Tool) {
      let targetTools = buildTools
      if (data.provider_type === ContainerType.builtin)
        targetTools = buildTools
      else if (data.provider_type === ContainerType.custom)
        targetTools = customTools
      else
        targetTools = workflowTools
      return targetTools.find(toolWithProvider => toolWithProvider.id === data.provider_id)?.icon
    }
  }, [data, buildTools, customTools, workflowTools])

  return toolIcon
}
