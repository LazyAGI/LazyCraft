import type { Fetcher } from 'swr'
import { del, get, post, put } from './base'
import type { BaseResponse, IWorkspaceResponse } from '@/core/data/common'

export const getUserList: Fetcher<Promise<BaseResponse>, { url: string; options: { params: any } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const deleteUser: Fetcher<any, any> = (body) => {
  return post<any>('/workspaces/delete-account', { body }, { silent: true })
}

export const getUserGroupList: Fetcher<Promise<BaseResponse>, { url: string; options: { params: any } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const addUserGroup: Fetcher<any, any> = (body) => {
  return post<any>('/workspaces/add', { body })
}

export const removeGroupUser: Fetcher<any, any> = (body) => {
  return post<any>('/workspaces/delete-role', { body }, { silent: true })
}

export const deleteGroup: Fetcher<any, any> = (body) => {
  return post<any>('/workspaces/delete', { body }, { silent: true })
}

export const exitGroup: Fetcher<any, any> = (body) => {
  return post<any>('/workspaces/exit', { body }, { silent: true })
}

export const updateUserGroup: Fetcher<any, any> = (body) => {
  return post<any>('/workspaces/update-roles', { body })
}
export const updateUserSpace: Fetcher<any, any> = (body) => {
  return post<any>('/workspaces/personal-space/resources', { body })
}
export const moveUserAssets: Fetcher<any, any> = (body) => {
  return post<any>('/workspaces/move-assets', { body })
}

export const switchUserGroup: Fetcher<any, any> = (body) => {
  return post<any>('/workspaces/switch', { body })
}

export const coopOpen: Fetcher<any, any> = (body) => {
  return post<any>('/workspaces/coop/open', { body })
}

export const coopClose: Fetcher<any, any> = (body) => {
  return post<any>('/workspaces/coop/close', { body })
}

// 配额管理list接口
export const getquotaList: Fetcher<any, any> = (body) => {
  return post<any>('/workspaces/quota-requests/list', { body })
}
// 配额审批
export const getquotaApproval: Fetcher<any, any> = (body) => {
  return post<any>('/workspaces/quota-requests/process', {
    body: {
      request_id: body.id,
      action: body.action,
      amount: body.amount,
      reason: body.reason,
    },
  })
}
// 配额申请接口
export const getquotaApplication: Fetcher<any, any> = (body) => {
  return post<any>('/workspaces/quota-requests/requests', { body })
}

export const getGroupDetail: Fetcher<Promise<BaseResponse>, { url: string; options: { params: any } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const getCurrentGroupList = () => {
  return get('workspaces/current/list')
}
// API Key列表接口
export const getApikeyList = () => {
  return get('/apikey')
}
// 创建API Key
export const createApikey = (body: any) => {
  return post('/apikey', { body })
}
// 删除API Key
export const deleteApikey = (body: any) => {
  return del('/apikey', { body })
}
// 更新API Key状态
export const updateApikeyStatus = (body: { id: string; status: string }) => {
  return put('/apikey', { body })
}
// 删除模型清单接口
export const deleteModelList = (body: any) => {
  return post('/mh/delete_online_model_list', { body })
}
// 选择空间
export const getCurrentWorkspace = (searchValue?: string) => {
  return get<IWorkspaceResponse>('/workspaces/current/list', { params: { search: searchValue } })
}

export const getUserTenants: Fetcher<Promise<BaseResponse>, { url: string; options: { params: any } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const getCoopStatus: Fetcher<Promise<BaseResponse>, { url: string; options: { params: any } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const getCoopJoins: Fetcher<Promise<BaseResponse>, { url: string; options: { params: any } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)
