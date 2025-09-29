import type { Fetcher } from 'swr'
import { get } from './base'
import type {
  OperationLogsRequest,
  OperationLogsResponse,
  WorkflowxEcutionDetailResponse,
} from '@/core/data/log'
import type { NodeMonitorListResponse } from '@/shared/types/workflow'
export const fetchExecutionDetail = ({ appID, runID }: { appID: string; runID: string }) => {
  return get<WorkflowxEcutionDetailResponse>(`/apps/${appID}/workflow-runs/${runID}`)
}

export const fetchTraceList: Fetcher<NodeMonitorListResponse, { url: string }> = ({ url }) => {
  return get<NodeMonitorListResponse>(url)
}
export const fetchDebuggingList = (appID: string, conversationType: 'single' | 'multi' = 'multi') => {
  return get<any>(`/apps/${appID}/workflows/draft/debug-detail`, { params: { conversation_type: conversationType } })
}

export const fetchNodeLogDetail = ({ appID }: { appID: string }) => {
  return get<any>(`/apps/${appID}/workflows/node/debug-detail`, { params: { conversation_type: 'single' } })
}

export const queryOperationLogs = ({ params }: { params: OperationLogsRequest }) => {
  return get<OperationLogsResponse>('/logs', { params })
}
