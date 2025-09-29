import type { Fetcher } from 'swr'
import { del, get, post, put, ssePost, upload } from './base'
import type { AppDetailResponse, AppListResult } from '@/core/data/app'
import type { BaseResponse } from '@/core/data/common'
export const getJoins: Fetcher<BaseResponse, { url: string; options: { params: { target_type: string } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const createTemplateApp: Fetcher<any, any> = (body) => {
  return post<any>('/apptemplate/to/apps', { body })
}

export const appAddToTemplateApp: Fetcher<BaseResponse, { id: string }> = (data) => {
  return post<BaseResponse>('apps/to/apptemplate', { body: data })
}

export const fetchAppDetail = ({ url, id }: { url: string; id: string }) => {
  return get<AppDetailResponse>(`${url}/${id}`)
}

export const updateAppInfo: Fetcher<AppDetailResponse, { appID: string; name: string; icon: string; icon_background: string; description: string }> = ({ appID, name, icon, icon_background, description }) => {
  return put<AppDetailResponse>(`apps/${appID}`, { body: { name, icon, icon_background, description } })
}

export const enableApi = ({ id, ...rest }, { onError, onFinish }) => {
  return ssePost(`apps/${id}/enable_api`, {
    body: {
      ...rest,
      response_mode: 'streaming',
    },
  }, { onError, onFinish })
}

export const exportAppConfig: Fetcher<{ data: string }, { appID: string; include?: boolean }> = ({ appID, include = false }) => {
  return get<{ data: string }>(`apps/${appID}/export?include_secret=${include}`)
}

export const downloadAppJson: Fetcher<any, any> = (id) => {
  return get<any>(`apps/${id}/export?format=json`)
}

export const importApp: Fetcher<any, any> = (body) => {
  return upload(body, false, '/apps/import')
}

export const deleteApp: Fetcher<BaseResponse, string> = (appID) => {
  return del<BaseResponse>(`apps/${appID}`)
}

export const dragApp: Fetcher<any, any> = (body) => {
  return post<any>('apps/workflows/drag_app', { body })
}

export const dragEmptySubmodule: Fetcher<any, any> = (body) => {
  return post<any>('apps/workflows/drag_empty', { body })
}

export const dragAppTemplate: Fetcher<any, any> = (body) => {
  return post<any>('apps/workflows/drag_template', { body })
}

export const enableBackflow: Fetcher<any, any> = (body) => {
  return post<any>(`apps/${body.app_id}/enable_backflow`, { body })
}

export const cancelPublish: Fetcher<any, any> = (body) => {
  return post<any>(`apps/${body.app_id}/workflows/cancel_publish`, { body })
}

export const fetchAppList: Fetcher<AppListResult, { url: string; params?: Record<string, any> }> = ({ url, params }) => {
  return get<AppListResult>(url, { params })
}

export const createApp: Fetcher<AppDetailResponse, any> = (body) => {
  return post<AppDetailResponse>('apps', { body })
}
