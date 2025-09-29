import { type ReactNode, createContext, useContext, useMemo, useState } from 'react'
import { type StoreApi, create } from 'zustand'
import { type TemporalState, temporal } from 'zundo'
import isDeepEqual from 'fast-deep-equal'
import type { ExecutionEdge, ExecutionNode } from './types'
import type { IWorkflowHistoryEvent } from './logicHandlers'

// 新增一个空函数，避免在 context 默认值中重复创建
const noop = () => { }

const WorkflowExecutionStoreContext = createContext<WorkflowExecutionStoreContextType>({ store: null, shortcutsAvailable: true, enableShortcuts: noop })
const Provider = WorkflowExecutionStoreContext.Provider

export function WorkflowExecutionProvider({ nodes, edges, children }: WorkflowExecutionProviderProps) {
  const [shortcutsAvailable, enableShortcuts] = useState(true)
  const [store] = useState(() =>
    createWorkflowExecutionStore({
      nodes,
      edges,
    }),
  )

  // 使用 useMemo 保证 context 值引用稳定，减少不必要重渲染
  const contextValue = useMemo(
    () => ({
      store,
      shortcutsAvailable,
      enableShortcuts,
    }),
    [store, shortcutsAvailable],
  )

  return (
    <Provider value={contextValue}>
      {children}
    </Provider>
  )
}

export function useWorkflowExecutionStore() {
  const {
    store,
    shortcutsAvailable,
    enableShortcuts,
  } = useContext(WorkflowExecutionStoreContext)
  if (store === null)
    throw new Error('error')

  return {
    store: useMemo(
      () => ({
        getState: store.getState,
        setState: (state: WorkflowExecutionSnapshot) => {
          store.setState({
            workflowEventLog: state.workflowEventLog,
            nodes: state.nodes.map((node: ExecutionNode) => ({ ...node, data: { ...node.data, selected: false } })),
            edges: state.edges.map((edge: ExecutionEdge) => ({ ...edge, selected: false }) as ExecutionEdge),
          })
        },
        subscribe: store.subscribe,
        temporal: store.temporal,
      }),
      [store],
    ),
    shortcutsAvailable,
    enableShortcuts,
  }
}

function createWorkflowExecutionStore({
  nodes: storeNodes, edges: storeEdges,
}: {
  nodes: ExecutionNode[]
  edges: ExecutionEdge[]
}): WorkflowExecutionStoreApi {
  const store = create(temporal<WorkflowExecutionState>(
    (set, get) => {
      return {
        workflowEventLog: undefined, nodes: storeNodes, edges: storeEdges, getNodes: () => get().nodes, setNodes: (nodes: ExecutionNode[]) => set({ nodes }), setEdges: (edges: ExecutionEdge[]) => set({ edges }),
      }
    },
    {
      equality: (pastState, currentState) =>
        isDeepEqual(pastState, currentState),
    },
  ),
  )

  return store
}

type WorkflowExecutionStore = {
  nodes: ExecutionNode[]
  edges: ExecutionEdge[]
  workflowEventLog: IWorkflowHistoryEvent | undefined
}

type WorkflowExecutionActions = {
  getNodes: () => ExecutionNode[]
  setNodes: (nodes: ExecutionNode[]) => void
  setEdges: (edges: ExecutionEdge[]) => void
}

export type WorkflowExecutionState = WorkflowExecutionStore & WorkflowExecutionActions

// 更精确的快照入参类型，仅包含实际需要的字段
type WorkflowExecutionSnapshot = Pick<WorkflowExecutionState, 'nodes' | 'edges' | 'workflowEventLog'>

type WorkflowExecutionStoreContextType = {
  store: ReturnType<typeof createWorkflowExecutionStore> | null
  shortcutsAvailable: boolean
  enableShortcuts: (enabled: boolean) => void
}

type WorkflowExecutionStoreApi = StoreApi<WorkflowExecutionState> & { temporal: StoreApi<TemporalState<WorkflowExecutionState>> }

type WorkflowExecutionProviderProps = {
  nodes: ExecutionNode[]
  edges: ExecutionEdge[]
  children: ReactNode
}
