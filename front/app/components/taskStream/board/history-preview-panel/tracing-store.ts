import { create } from 'zustand'
import type { NodeMonitoring } from '@/shared/types/workflow'
import { clearTracingHistory, fetchTracingDebugDetail, fetchTracingHistory } from '@/infrastructure/api//tracing'

// 历史数据的原始格式（按turn_number分组）
type HistoryDataFormat = {
  [turnNumber: string]: Array<{
    node_id: string
    node_type: string
    title: string
    inputs: string
    outputs: string
    status: string
    consumed_time: number
    prompt_tokens: number
    completion_tokens: number
    sessionid: string
    turn_number: string
  }>
}

// 转换后的历史数据格式（按轮次组织）
type HistoryTurn = {
  turnNumber: string
  sessionId: string
  nodes: NodeMonitoring[]
}

type TracingState = {
  tracingData: NodeMonitoring[]
  historyData: HistoryTurn[] // 新增：按轮次组织的历史数据
  isLoading: boolean
  error: string | null
  isStreaming: boolean
  eventSource: EventSource | null
  pollTimer: number | null
}

type TracingActions = {
  // 获取历史追踪数据
  fetchHistoryData: (appId: string, mode: string) => Promise<void>
  // 设置历史数据（用于测试或直接设置数据）
  setHistoryData: (data: HistoryDataFormat) => void
  // 开始流式连接
  startStreaming: (appId: string, mode: string) => void
  // 停止流式连接
  stopStreaming: () => void
  // 更新追踪数据（用于流式更新）
  updateTracingData: (data: NodeMonitoring[]) => void
  // 添加新的追踪数据（用于流式更新）
  addTracingData: (data: NodeMonitoring) => void
  // 清除历史数据
  clearHistoryData: (appId: string, mode: string) => Promise<void>
  // 重置状态
  reset: () => void
}

// 将原始历史数据转换为NodeMonitoring格式
const convertHistoryDataToNodeMonitoring = (rawData: HistoryDataFormat): HistoryTurn[] => {
  const turns: HistoryTurn[] = []
  // 映射node_type到BlockEnum
  const mapNodeTypeToExecutionBlockEnum = (nodeType: string): any => {
    switch (nodeType) {
      case 'Code':
        return 'code'
      case 'LLM':
        return 'universe' // 或者其他合适的类型
      case 'Tool':
        return 'tool'
      default:
        return nodeType.toLowerCase()
    }
  }

  Object.keys(rawData).forEach((turnNumber) => {
    const turnData = rawData[turnNumber]
    if (turnData && turnData.length > 0) {
      const nodes: NodeMonitoring[] = turnData.map((item, index) => ({
        id: `${item.sessionid}-${item.turn_number}-${item.node_id}`,
        index,
        predecessor_node_id: '',
        node_id: item.node_id,
        node_type: mapNodeTypeToExecutionBlockEnum(item.node_type),
        title: item.title,
        inputs: item.inputs,
        process_record: null,
        outputs: item.outputs,
        status: item.status,
        consumed_time: item.consumed_time,
        execution_metadata: {
          total_tokens: item.prompt_tokens + item.completion_tokens,
          total_price: 0,
          currency: 'USD',
          steps_boundary: [],
        },
        metadata: {
          iterator_length: 0,
        },
        created_at: Date.now(),
        created_by: {
          id: 'system',
          name: 'System',
          email: '',
        },
        terminated_at: Date.now(),
        prompt_tokens: item.prompt_tokens,
        completion_tokens: item.completion_tokens,
      }))
      turns.push({
        turnNumber,
        sessionId: turnData[0].sessionid,
        nodes,
      })
    }
  })
  return turns.sort((a, b) => parseInt(a.turnNumber) - parseInt(b.turnNumber))
}

export const useTracingStore = create<TracingState & TracingActions>((set, get) => ({
  tracingData: [],
  historyData: [],
  isLoading: false,
  error: null,
  isStreaming: false,
  eventSource: null,
  pollTimer: null,

  fetchHistoryData: async (appId: string, mode: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetchTracingHistory(appId, mode)
      // 后端直接返回按轮次分组的数据格式（不包装在data字段中）
      if (response && typeof response === 'object' && Object.keys(response).length > 0) {
        const historyTurns = convertHistoryDataToNodeMonitoring(response as HistoryDataFormat)
        const streaming = get().isStreaming
        set({
          historyData: historyTurns,
          // 不要把历史节点写入进行中列表，避免“进行中”短暂显示全部节点
          ...(streaming ? {} : { tracingData: [] }),
          isLoading: false,
        })
      }
      else {
        set({
          historyData: [],
          ...(get().isStreaming ? {} : { tracingData: [] }),
          isLoading: false,
        })
      }
    }
    catch (error) {
      console.error('获取历史数据失败:', error)
      set({
        error: error instanceof Error ? error.message : '获取历史数据失败',
        isLoading: false,
      })
    }
  },

  setHistoryData: (data: HistoryDataFormat) => {
    const historyTurns = convertHistoryDataToNodeMonitoring(data)
    // 将所有节点展平为一个数组用于TracingPanel显示
    const allNodes = historyTurns.flatMap(turn => turn.nodes)
    set({
      historyData: historyTurns,
      tracingData: allNodes,
      isLoading: false,
      error: null,
    })
  },

  startStreaming: (appId: string, mode: string) => {
    // 轮询模式替代 SSE
    const { pollTimer } = get()
    if (pollTimer)
      clearInterval(pollTimer)

    set({ isStreaming: true, error: null })

    const doPoll = async () => {
      try {
        const resp: any = await fetchTracingDebugDetail(appId, mode, 'multi')

        // 如果返回结果中包含特殊的 type（如 session_end），视为会话结束，立即停止轮询并刷新历史
        const hasTypeEvent = (
          Array.isArray(resp) && resp.some((item: any) => item && typeof item === 'object' && 'type' in item)
        ) || (
          resp && typeof resp === 'object' && 'type' in resp
        ) || (
          resp?.data && typeof resp.data === 'object' && 'type' in resp.data
        ) || (
          resp?.result && typeof resp.result === 'object' && 'type' in resp.result
        )
        if (hasTypeEvent) {
          const { pollTimer } = get()
          if (pollTimer)
            clearInterval(pollTimer)
          set({ isStreaming: false, pollTimer: null })
          await get().fetchHistoryData(appId, mode)
          return
        }

        // 判定是否完成
        const status = resp?.status || resp?.data?.status || resp?.result?.status
        const finished = status && ['succeeded', 'finished', 'failed', 'stopped'].includes(String(status))

        // 解析节点列表
        const nodes: NodeMonitoring[] = Array.isArray(resp)
          ? resp as NodeMonitoring[]
          : Array.isArray(resp?.nodes)
            ? resp.nodes as NodeMonitoring[]
            : Array.isArray(resp?.data)
              ? resp.data as NodeMonitoring[]
              : Array.isArray(resp?.result?.nodes)
                ? resp.result.nodes as NodeMonitoring[]
                : []

        // 识别当前轮次编号（若返回数组，取首个节点 turn_number）
        const currentTurnNumber = (nodes?.[0] as any)?.turn_number || resp?.turn_number || resp?.data?.turn_number
        if (currentTurnNumber) {
          const hasInHistory = get().historyData.some(turn => String(turn.turnNumber) === String(currentTurnNumber))
          if (hasInHistory) {
            // 若已在历史中，停止轮询并清空进行中数据，不再展示
            const { pollTimer } = get()
            if (pollTimer)
              clearInterval(pollTimer)
            set({ isStreaming: false, pollTimer: null, tracingData: [] })
            return
          }
        }

        if (nodes.length > 0)
          set({ tracingData: nodes })

        if (finished) {
          // 停止轮询并刷新历史
          const { pollTimer } = get()
          if (pollTimer)
            clearInterval(pollTimer)
          set({ isStreaming: false, pollTimer: null })
          await get().fetchHistoryData(appId, mode)
        }
      }
      catch (e) {
        // 出错也不中断界面，仅记录并继续下一轮
        set({ error: e instanceof Error ? e.message : '追踪轮询失败' })
      }
    }

    // 立即执行一次，再定时轮询
    doPoll()
    const timer = window.setInterval(doPoll, 2000)
    set({ pollTimer: timer })
  },

  stopStreaming: () => {
    const { eventSource, pollTimer } = get()
    if (eventSource)
      eventSource.close()
    if (pollTimer)
      clearInterval(pollTimer)
    set({ isStreaming: false, eventSource: null, pollTimer: null })
  },

  updateTracingData: (data: NodeMonitoring[]) => {
    set({ tracingData: data })
  },

  addTracingData: (data: NodeMonitoring) => {
    const currentData = get().tracingData
    set({ tracingData: [...currentData, data] })
  },

  clearHistoryData: async (appId: string, mode: string) => {
    set({ isLoading: true, error: null })
    try {
      await clearTracingHistory(appId, mode)
      set({ tracingData: [], isLoading: false })
    }
    catch (error) {
      set({
        error: error instanceof Error ? error.message : '清除历史数据失败',
        isLoading: false,
      })
    }
  },

  reset: () => {
    const { eventSource, pollTimer } = get()
    if (eventSource)
      eventSource.close()
    if (pollTimer)
      clearInterval(pollTimer)

    set({
      tracingData: [],
      historyData: [],
      isLoading: false,
      error: null,
      isStreaming: false,
      eventSource: null,
      pollTimer: null,
    })
  },
}))
