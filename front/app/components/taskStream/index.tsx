'use client'

import type { FC } from 'react'
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import produce, { setAutoFreeze } from 'immer'
import {
  useEventListener,
  useKeyPress,
} from 'ahooks'
import {
  Background,
  ReactFlowProvider,
  SelectionMode,
  useEdgesState,
  useNodesState,
  useOnViewportChange,
  useReactFlow,
  useStoreApi,
} from 'reactflow'
import type {
  Viewport,
} from 'reactflow'
import 'reactflow/dist/style.css'
import './style.css'
import dynamic from 'next/dynamic'
import {
  type ExecutionEdge,
  type ExecutionNode,
} from './types'
import { WorkflowContextProvider } from './scope-context'
import {
  IWorkflowHistoryEvent,
  initCheckNodeShape,
  useLazyLLMEdgesInteractions,
  useNodesHandlers,
  usePanelEvents,
  useReadonlyNodes,
  useSelectionInteractions,
  useSyncDraft,
  useWorkflow,
  useWorkflowInit,
  useWorkflowLog,
  useWorkflowReadOnly,
  useWorkflowStartRun,
  useWorkflowUpdate,
} from './logicHandlers'
import Header from './topBar'
import CustomNode from './elements'
import WorkflowNoteNode from './text-element'
import { NOTE_NODE_CUSTOM } from './text-element/constants'
import WorkflowOperator from './manageUnit/start'
import CustomEdge, { DashEdge } from './unique-link'
import CustomConnectionLine from './special-link'
import WorkflowPanel from './board'
import AlignmentIndicatorContainer from './guideStrip/HelpLine'
import OptionNode from './option-element'
import WorkflowPanelContextMenu from './board-popup'
import WorkflowNodeActionsMenu from './workflow-node-actions-menu'
import {
  useStore,
  useWorkflowStore,
} from './store'
import {
  generateFlowImg,
  getKeyboardKeyCodeBySystem,
  initializeEdges,
  initializeNodes,
  isEventTargetInputArea,
  newNodeGenerate,
} from './utils'
import {
  CUSTOM_NODE_TYPE,
  NODE_WIDTH_AND_X_OFFSET,
  WORKFLOW_DATA_UPDATE_EVENT,
  Z_INDEX_OF_ITERATION_CHILDREN,
} from './fixed-values'
import { WorkflowExecutionProvider } from './workflow-execution-manager'
import { useCarrierControl } from './elements/_foundation/components/drill-down-wrapper/hook-carrier'
import { generateDefaultConfig } from './module-panel/components/utils'
import { syncDownstreamAggregators } from './logicHandlers/mergerAdjust'
import { useCheckNodeShape } from '@/app/components/taskStream/logicHandlers/checkList'
import Loading from '@/app/components/base/loading'
import { FeaturesProvider, useFeaturesStore } from '@/app/components/base/features'
import type { Features as FeaturesData } from '@/app/components/base/features/types'
import { useEmitterContext } from '@/shared/hooks/event-emitter'

// 动态导入ReactFlow组件
const DynamicReactFlow = dynamic(
  () => import('reactflow').then(mod => mod.ReactFlow),
  {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full">正在加载工作流编辑器...</div>,
  },
)

// 动态导入节点面板
const DynamicNodePanel = dynamic(() => import('./module-panel'), { ssr: false })

// 节点类型配置映射
const nodeTypeMapping = {
  [CUSTOM_NODE_TYPE]: CustomNode,
  [NOTE_NODE_CUSTOM]: WorkflowNoteNode,
} as const

// 边类型配置映射
const edgeTypeMapping = {
  [CUSTOM_NODE_TYPE]: CustomEdge,
  'dash-edge': DashEdge,
} as const

type WorkflowComponentProps = {
  nodes: ExecutionNode[]
  edges: ExecutionEdge[]
  viewport?: Viewport
}

const WorkflowComponent: FC<WorkflowComponentProps> = memo(({
  nodes: initialNodesData,
  edges: initialEdgesData,
  viewport,
}) => {
  const workflowContainerRef = useRef<HTMLDivElement>(null)
  const workflowStoreInstance = useWorkflowStore()
  const reactflowInstance = useReactFlow()
  const featuresStoreInstance = useFeaturesStore()
  const [nodes, setNodes] = useNodesState(initialNodesData)
  const [edges, setEdges] = useEdgesState(initialEdgesData)
  const controlMode = useStore(s => s.controlMode)
  const nodeAnimation = useStore(s => s.nodeAnimation)
  const patentState = useStore(s => s.patentState)
  const instanceState = useStore(s => s.instanceState)
  const setInstanceState = useStore(s => s.setInstanceState)
  const { generateCheckParameters } = useCheckNodeShape()

  const { screenToFlowPosition } = reactflowInstance

  const {
    setControlPromptEditorRerenderKey,
    setSyncWorkflowHash,
  } = workflowStoreInstance.getState()
  const {
    handleDraftWorkflowSync,
    syncWorkflowDraftOnPageClose,
  } = useSyncDraft()
  const { workflowReadOnly } = useWorkflowReadOnly()
  const { nodesReadOnly } = useReadonlyNodes()

  const { emitter } = useEmitterContext()

  emitter?.useSubscription((eventData: any) => {
    if (eventData.type === WORKFLOW_DATA_UPDATE_EVENT) {
      setNodes(initCheckNodeShape({ nodeList: eventData.payload.nodes, edgeList: eventData.payload.edges }))
      setEdges(eventData.payload.edges)

      if (eventData.payload.viewport)
        reactflowInstance.setViewport(eventData.payload.viewport)

      if (eventData.payload.features && featuresStoreInstance) {
        const { setFeatures } = featuresStoreInstance.getState()
        setFeatures(eventData.payload.features)
      }

      if (eventData.payload.hash)
        setSyncWorkflowHash(eventData.payload.hash)

      setTimeout(() => setControlPromptEditorRerenderKey(Date.now()))
    }
  })

  useEffect(() => {
    setAutoFreeze(false)
    return () => {
      setAutoFreeze(true)
      // 清理鼠标移动定时器
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      handleDraftWorkflowSync(true, true)
    }
  }, [instanceState.preview_url, handleDraftWorkflowSync])

  useEffect(() => {
    const previewTimer = setInterval(() => {
      if (patentState.historyStacks?.length >= 2) {
        generateFlowImg((result) => {
          setInstanceState({ preview_url: result })
        })
      }
    }, 1000 * 30)

    return () => {
      clearInterval(previewTimer)
    }
  }, [patentState, setInstanceState])

  const { handleRefreshWorkflowDraft } = useWorkflowUpdate()
  const handlePageVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden')
      syncWorkflowDraftOnPageClose()

    else if (document.visibilityState === 'visible')
      setTimeout(() => handleRefreshWorkflowDraft(), 500)
  }, [syncWorkflowDraftOnPageClose, handleRefreshWorkflowDraft])

  useEffect(() => {
    document.addEventListener('visibilitychange', handlePageVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handlePageVisibilityChange)
    }
  }, [handlePageVisibilityChange])

  useEventListener('keydown', (e) => {
    if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey))
      e.preventDefault()
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey))
      e.preventDefault()
    if ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey))
      e.preventDefault()
    if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey))
      e.preventDefault()
  })

  // 使用防抖处理鼠标移动事件，避免频繁的状态更新
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastMousePositionRef = useRef<{ pageX: number; pageY: number } | null>(null)

  useEventListener('mousemove', (e: any) => {
    // 检查是否在表单输入区域，如果是则跳过鼠标位置更新
    if (isEventTargetInputArea(e.target as HTMLElement)) {
      return
    }

    // 检查是否在模态框或弹窗中，如果是则跳过更新
    const target = e.target as HTMLElement
    if (target.closest('.ant-modal') || target.closest('.ant-drawer') || target.closest('.ant-popover')) {
      return
    }

    // 清除之前的定时器
    if (mouseMoveTimeoutRef.current) {
      clearTimeout(mouseMoveTimeoutRef.current)
    }

    // 检查鼠标位置是否真的发生了变化
    const currentPosition = { pageX: e.clientX, pageY: e.clientY }
    const lastPosition = lastMousePositionRef.current
    
    if (lastPosition && 
        Math.abs(currentPosition.pageX - lastPosition.pageX) < 1 && 
        Math.abs(currentPosition.pageY - lastPosition.pageY) < 1) {
      return // 位置变化太小，跳过更新
    }

    // 防抖处理，避免频繁更新
    mouseMoveTimeoutRef.current = setTimeout(() => {
      const containerRect = workflowContainerRef.current?.getBoundingClientRect()
      if (containerRect) {
        const newMousePosition = {
          pageX: e.clientX,
          pageY: e.clientY,
          elementX: e.clientX - containerRect.left,
          elementY: e.clientY - containerRect.top,
        }

        // 检查位置是否真的发生了变化
        const currentState = workflowStoreInstance.getState()
        const currentMousePos = currentState.mousePosition
        
        if (!currentMousePos || 
            Math.abs(newMousePosition.pageX - currentMousePos.pageX) >= 1 || 
            Math.abs(newMousePosition.pageY - currentMousePos.pageY) >= 1) {
          
          lastMousePositionRef.current = currentPosition
          workflowStoreInstance.setState({
            mousePosition: newMousePosition,
          })
        }
      }
    }, 16) // 约60fps的更新频率
  })

  const { recordStateToHistory } = useWorkflowLog()
  const {
    handleNodeMoveBegin,
    handleNodeMove,
    handleNodeDragEnd,
    handleNodeMouseEnter,
    handleNodeMouseLeave,
    handleNodeActivate,
    handleNodeCancel,
    handleNodeLink,
    handleNodeLinkStart,
    handleNodeLinkEnd,
    handleNodeOptions,
    handleNodePick,
    handleCopyNodes,
    handleNodesInsert,
    handleDuplicateNodes,
    handleRemoveNodes,
    handleHistoryUndo,
    handleHistoryRedo,
  } = useNodesHandlers()
  const {
    handleEdgeEnter,
    handleEdgeLeave,
    handleEdgeDelete,
    handleEdgesChange,
  } = useLazyLLMEdgesInteractions()
  const {
    handleSelectionStart,
    handleSelectionChange,
    handleSelectionDrag,
  } = useSelectionInteractions()
  const {
    handlePaneContextMenu,
  } = usePanelEvents()
  const {
    isValidConnection,
  } = useWorkflow()
  const { handleStartWorkflowRun } = useWorkflowStartRun()

  const lastviewportSyncTime = useRef(0)
  const throttledviewportSync = useCallback(() => {
    const currentTime = Date.now()
    if (currentTime - lastviewportSyncTime.current >= 500) {
      lastviewportSyncTime.current = currentTime
      handleDraftWorkflowSync()
    }
  }, [handleDraftWorkflowSync])

  useOnViewportChange({
    onEnd: throttledviewportSync,
  })

  useKeyPress(['delete', 'backspace'], (e) => {
    if (isEventTargetInputArea(e.target as HTMLElement))
      return
    handleRemoveNodes()
    handleEdgeDelete()
  })
  useKeyPress(`${getKeyboardKeyCodeBySystem('ctrl')}.c`, (e) => {
    if (isEventTargetInputArea(e.target as HTMLElement))
      return
    handleCopyNodes()
  }, { exactMatch: true, useCapture: true })
  useKeyPress(`${getKeyboardKeyCodeBySystem('ctrl')}.v`, (e) => {
    if (isEventTargetInputArea(e.target as HTMLElement))
      return
    handleNodesInsert()
  }, { exactMatch: true, useCapture: true })
  useKeyPress(`${getKeyboardKeyCodeBySystem('ctrl')}.d`, handleDuplicateNodes, { exactMatch: true, useCapture: true })
  useKeyPress(`${getKeyboardKeyCodeBySystem('alt')}.r`, handleStartWorkflowRun, { exactMatch: true, useCapture: true })

  const storeInstance = useStoreApi()
  if (process.env.NODE_ENV === 'development') {
    storeInstance.getState().onError = (code, message) => {
      if (code === '002')
        return
      console.warn(message)
    }
  }

  const handleDropEvent = useCallback((e: any) => {
    e.preventDefault()
    const moduleInfo = sessionStorage.getItem('drag_module_info') || e.dataTransfer.getData('module_info')
    const moduleDefaultData = moduleInfo ? JSON.parse(moduleInfo) : {}
    console.log('Dropped module info:', moduleDefaultData)
    if (sessionStorage.getItem('drag_module_info')) {
      setTimeout(() => {
        sessionStorage.removeItem('drag_module_info')
      }, 1000)
    }
    const { getNodes, setNodes, setEdges, edges } = storeInstance.getState()
    const nodes = getNodes()

    const newNode = newNodeGenerate({
      data: {
        ...moduleDefaultData,
        _isCandidate: true,
      },
      position: {
        x: 0,
        y: 0,
      },
    })

    if (newNode) {
      const { x, y } = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const { configParameters, _valid_form_success } = generateCheckParameters({ targetInfo: { ...newNode } })

      const shouldCreateAggregator = moduleDefaultData._createAggregator
      let aggregatorNode
      let dashEdge

      if (shouldCreateAggregator && moduleDefaultData._aggregatorConfig) {
        const aggregatorDefaultConfig = generateDefaultConfig(moduleDefaultData._aggregatorConfig, storeInstance)
        const aggregatorId = `${newNode.id}_link`

        aggregatorNode = newNodeGenerate({
          id: aggregatorId,
          data: {
            ...aggregatorDefaultConfig,
            _isCandidate: false,
            createWithIntention: true,
          },
          position: {
            x: x + NODE_WIDTH_AND_X_OFFSET,
            y,
          },
        })

        dashEdge = {
          id: `${newNode.id}-${aggregatorId}-dash`,
          source: newNode.id,
          sourceHandle: 'false',
          targetHandle: '',
          target: aggregatorId,
          type: 'dash-edge',
          data: {
            sourceType: newNode.data.type,
            targetType: aggregatorNode.data.type,
          },
        } as any

        (newNode.data as any).linkNodeId = aggregatorId
      }

      const newNodes = produce(nodes, (draft) => {
        const commonNodeData = {
          ...newNode,
          data: {
            ...newNode.data,
            config__parameters: configParameters,
            _valid_form_success,
            _isCandidate: false,
          },
          position: {
            x,
            y,
          },
        }
        draft.push(commonNodeData)
        if (aggregatorNode)
          draft.push(aggregatorNode)
      })

      const newEdges = dashEdge
        ? produce(edges, (draft) => {
          draft.push(dashEdge)
        })
        : edges

      setNodes(newNodes)
      setEdges(newEdges)

      setTimeout(() => {
        const branchNodeTypes = ['if-else', 'question-classifier', 'switch-case']
        if (branchNodeTypes.includes(newNode.data.type))
          syncDownstreamAggregators(newNode.id, storeInstance)

        if (newNode.data.payload__kind === 'aggregator') {
          const { getNodes, edges } = storeInstance.getState()
          const currentNodes = getNodes()

          const upstreamEdges = edges.filter((edge: any) => edge.target === newNode.id)

          upstreamEdges.forEach((edge: any) => {
            const sourceNode = currentNodes.find((node: any) => node.id === edge.source)
            if (sourceNode && branchNodeTypes.includes(sourceNode.data.type))
              syncDownstreamAggregators(sourceNode.id, storeInstance)
          })
        }
      }, 200)

      if (newNode.type === NOTE_NODE_CUSTOM) {
        recordStateToHistory(IWorkflowHistoryEvent.NoteAdd)
        handleNodePick(newNode.id)
      }
      else {
        recordStateToHistory(IWorkflowHistoryEvent.NodeCreate, newNode?.data?.title)
      }
    }
  }, [screenToFlowPosition, generateCheckParameters, handleNodePick, recordStateToHistory, storeInstance])

  const handleDragOver = useCallback((e: any) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  useEffect(() => {
    if (controlMode === 'hand') {
      const { zoomTo } = reactflowInstance
      const currentZoom = reactflowInstance.getZoom()
      zoomTo(currentZoom * 0.999)

      storeInstance.setState({
        userSelectionActive: false,
      })

      setTimeout(() => {
        zoomTo(currentZoom)
      }, 10)
    }
  }, [controlMode, reactflowInstance, storeInstance])

  return (
    <div
      id='graph-canvas'
      className={`
        relative w-full min-w-[960px] h-full bg-[#F0F2F7]
        ${workflowReadOnly && 'canvas-panel-animate'}
        ${nodeAnimation && 'graph-node-animate'}
      `}
      ref={workflowContainerRef}
    >
      <OptionNode />
      <Header />
      <WorkflowPanel />
      <WorkflowOperator onRedo={handleHistoryRedo} onUndo={handleHistoryUndo} />
      <WorkflowPanelContextMenu />
      <WorkflowNodeActionsMenu />
      <AlignmentIndicatorContainer />
      <DynamicReactFlow
        nodeTypes={nodeTypeMapping}
        edgeTypes={edgeTypeMapping}
        nodes={nodes}
        edges={edges}
        onDrop={handleDropEvent}
        onDragOver={handleDragOver}
        onNodeDragStart={handleNodeMoveBegin}
        onNodeDrag={handleNodeMove}
        onNodeDragStop={handleNodeDragEnd}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onNodeClick={handleNodeActivate}
        onClick={handleNodeCancel}
        onNodeContextMenu={handleNodeOptions}
        onConnect={handleNodeLink}
        onConnectStart={handleNodeLinkStart}
        onConnectEnd={handleNodeLinkEnd}
        onEdgeMouseEnter={handleEdgeEnter}
        onEdgeMouseLeave={handleEdgeLeave}
        onEdgesChange={handleEdgesChange}
        onSelectionStart={handleSelectionStart}
        onSelectionChange={handleSelectionChange}
        onSelectionDrag={handleSelectionDrag}
        onPaneContextMenu={handlePaneContextMenu}
        connectionLineComponent={CustomConnectionLine}
        connectionLineContainerStyle={{ zIndex: Z_INDEX_OF_ITERATION_CHILDREN }}
        defaultViewport={viewport}
        multiSelectionKeyCode={null}
        deleteKeyCode={null}
        nodesDraggable={!nodesReadOnly || !!instanceState?.isLoosen}
        nodesConnectable={!nodesReadOnly}
        nodesFocusable={!nodesReadOnly}
        edgesFocusable={!nodesReadOnly}
        panOnDrag={controlMode === 'hand' && !workflowReadOnly}
        zoomOnPinch={!workflowReadOnly}
        zoomOnScroll={!workflowReadOnly}
        zoomOnDoubleClick={!workflowReadOnly}
        isValidConnection={isValidConnection}
        selectionKeyCode={null}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag={controlMode === 'pointer' && !workflowReadOnly}
        minZoom={0.25}
        id='reactFlowEle'
      >
        <Background
          gap={[14, 14]}
          size={2}
          color='#E4E5E7'
        />
      </DynamicReactFlow>
    </div>
  )
})
WorkflowComponent.displayName = 'WorkflowComponent'

const WorkflowWrapper = memo(() => {
  const {
    data,
    isLoading,
  } = useWorkflowInit()

  const { edgesData, nodesData } = useMemo(() => {
    const edgesData = data ? initializeEdges(data.graph.edges, data.graph.nodes) : []
    const nodesData = data ? initializeNodes(data.graph.nodes, data.graph.edges) : []
    return {
      edgesData,
      nodesData: initCheckNodeShape({ nodeList: nodesData, edgeList: edgesData }),
    }
  }, [data])

  if (!data || isLoading) {
    return (
      <div className='flex justify-center items-center relative w-full h-full bg-[#F0F2F7]'>
        <Loading />
      </div>
    )
  }

  const features = data.features || {}
  const initialFeatures: FeaturesData = {
    file: {
      image: {
        enabled: !!features.file_upload?.image.enabled,
        number_limits: features.file_upload?.image.number_limits || 3,
        transfer_methods: features.file_upload?.image.transfer_methods || ['local_file', 'remote_url'],
      },
    },
    opening: {
      enabled: !!features.opening_statement,
      opening_statement: features.opening_statement,
      suggested_questions: features.suggested_questions,
    },
    suggested: features.suggested_questions_after_answer || { enabled: false },
    speech2text: features.speech_to_text || { enabled: false },
    text2speech: features.text_to_speech || { enabled: false },
    citation: features.retriever_resource || { enabled: false },
    moderation: features.sensitive_word_avoidance || { enabled: false },
  }

  return (
    <ReactFlowProvider>
      <WorkflowExecutionProvider
        nodes={nodesData}
        edges={edgesData} >
        <FeaturesProvider features={initialFeatures}>
          <DynamicNodePanel>
            <WorkflowComponent
              nodes={nodesData}
              edges={edgesData}
              viewport={data?.graph.viewport}
            />
          </DynamicNodePanel>
        </FeaturesProvider>
      </WorkflowExecutionProvider>
    </ReactFlowProvider>
  )
})

WorkflowWrapper.displayName = 'WorkflowWrapper'

const WorkflowPatentWrapper = memo((props: any) => {
  const { children } = props
  const { isTriggering } = useCarrierControl()
  return isTriggering ? null : children
})
WorkflowPatentWrapper.displayName = 'WorkflowPatentWrapper'

const WorkflowContainer = () => {
  return (
    <WorkflowContextProvider>
      <WorkflowPatentWrapper>
        <WorkflowWrapper />
      </WorkflowPatentWrapper>
    </WorkflowContextProvider>
  )
}

export default memo(WorkflowContainer)
