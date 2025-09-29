import type { Fetcher } from 'swr'
import { get, post, ssePost } from './base'
import type { ToolListInfo } from './types'
import type { BaseResponse } from '@/core/data/common'
import type {
  FetchWorkflowDraftResult,
} from '@/shared/types/workflow'

export const addWorkflowOperationLog = (data: { app_id: string; app_name: string; action: string; node_name?: string; res_name?: string }) => {
  return post<any>('apps/workflows/add_log', { body: { ...data } })
}

export const fetchWebOrServerUrlInWorkflow = ({ appId }): Promise<any> => {
  return get(`apps/${appId}/workflows/draft/status`)
}

export const fetchAllPromptList = (params): Promise<any> => {
  return post('prompt/list', { body: params })
}

export const fetchToolFieldList = (params): Promise<any> => {
  return post('tool/tool_fields', { body: params })
}

export const fetchApiToolInfo = (params): Promise<any> => {
  return get('tool/tool_api_info', { params })
}

export const fetchToolList = (params): Promise<ToolListInfo> => {
  return post('tool/list', { body: params })
}

export const stopAppDebuggingEnableStatus = (appId: any, { onFinish }) => {
  return ssePost(`apps/${appId}/workflows/draft/stop`, {}, { onFinish })
}

export const startAppDebuggingEnableStatus = (appId: any, { onError, onFinish }) => {
  return ssePost(`apps/${appId}/workflows/draft/start`, {
    body: { response_mode: 'streaming' },
  }, { onError, onFinish })
}

export const getAppDebuggingEnableStatus = (appId: any) => {
  return get(`apps/${appId}/workflows/draft/status`)
}

export const stopWorkflowRun = (url: string) => {
  return post<BaseResponse>(url)
}

export const fetchPublishedWorkflow: Fetcher<FetchWorkflowDraftResult, string> = (url) => {
  return get<FetchWorkflowDraftResult>(url)
}

export const restoreAppVersion = (appId: string, version: string) => {
  return post<BaseResponse>(`/apps/${appId}/versions/restore`, { body: { version } })
}

export const fetchCheckVersion = (appId: string) => {
  return get<{ is_over_limit: boolean; message: string }>(`/apps/${appId}/versions/check-count`)
}

export const fetchAppVersionList = (appId: string) => {
  return get<{
    items: Array<{ id: string; version: string; description: string; publisher: string; published_at: number; is_current?: boolean }>
  }>(`/apps/${appId}/versions`)
}

export const publishWorkflow = (url: string, { version, description }: { version: string; description: string }) => {
  return post<BaseResponse & { publish_at: number }>(url, { body: { version, description } })
}

export const getIterationSingleNodeRunUrl = (isChatFlow: boolean, appId: string, nodeId: string) => {
  return `apps/${appId}/${isChatFlow ? 'advanced-chat/' : ''}workflows/draft/iteration/nodes/${nodeId}/run`
}

export const batchLogReport = (body: object) => {
  return post('apps/workflows/batch_log', { body })
}

export const syncWorkflowDraft = ({ url, params }: { url: string; params: Pick<FetchWorkflowDraftResult, 'graph' | 'features' | 'environment_variables'> }) => {
  // 保存
  return post<BaseResponse & { updated_at: number; hash: string }>(url, { body: params }, { silent: true })
}

export const fetchWorkflowDraft = (url: string) => {
  return get(url, {}, { silent: true }) as Promise<FetchWorkflowDraftResult>
}
