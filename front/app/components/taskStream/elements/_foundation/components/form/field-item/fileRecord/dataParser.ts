import { create } from 'zustand'

// 解析状态接口
type ParseState = {
  uploadProgress: number
  uploadStatus: string
  showProgress: boolean
  isLoading: boolean
  hasParsed: boolean
  needsReparse: boolean
}

// 解析状态 store 接口
type ParseStoreState = {
  // 存储每个节点的解析状态，key 为节点 ID
  nodeStates: Record<string, ParseState>

  // 获取指定节点的解析状态
  getNodeState: (nodeId: string) => ParseState

  // 更新指定节点的解析状态
  updateNodeState: (nodeId: string, state: Partial<ParseState>) => void

  // 清除指定节点的解析状态
  clearNodeState: (nodeId: string) => void

  // 重置指定节点的解析状态
  resetNodeState: (nodeId: string) => void

  // 清除所有节点的解析状态
  clearAllStates: () => void
}

// 默认解析状态
const defaultParseState: ParseState = {
  uploadProgress: 0,
  uploadStatus: '',
  showProgress: false,
  isLoading: false,
  hasParsed: false,
  needsReparse: false,
}

// 创建 zustand store
export const useParseStore = create<ParseStoreState>((set, get) => ({
  nodeStates: {},

  // 获取指定节点的解析状态
  getNodeState: (nodeId: string) => {
    const { nodeStates } = get()
    return nodeStates[nodeId] || defaultParseState
  },

  // 更新指定节点的解析状态
  updateNodeState: (nodeId: string, state: Partial<ParseState>) => {
    set(prevState => ({
      nodeStates: {
        ...prevState.nodeStates,
        [nodeId]: {
          ...prevState.nodeStates[nodeId] || defaultParseState,
          ...state,
        },
      },
    }))
  },

  // 清除指定节点的解析状态
  clearNodeState: (nodeId: string) => {
    set((prevState) => {
      const newStates = { ...prevState.nodeStates }
      delete newStates[nodeId]
      return { nodeStates: newStates }
    })
  },

  // 重置指定节点的解析状态
  resetNodeState: (nodeId: string) => {
    set(prevState => ({
      nodeStates: {
        ...prevState.nodeStates,
        [nodeId]: defaultParseState,
      },
    }))
  },

  // 清除所有节点的解析状态
  clearAllStates: () => {
    set({ nodeStates: {} })
  },
}))
