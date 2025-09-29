import type { Fetcher } from 'swr'
import { get, post } from './base'
import type { AiToolsBody, ApiResponse, BaseResponse, EnableAiBody } from '@/core/data/common'

export const toggleAiStatus: Fetcher<ApiResponse, { url: string; body: EnableAiBody }> = ({ url, body }) => {
  return post<ApiResponse>(url, { body })
}

export const getModelListAI: Fetcher<ApiResponse, { url: string; body: AiToolsBody }> = ({ url, body }) => {
  return post<ApiResponse>(url, { body })
}

export const uploadMerge: Fetcher<BaseResponse, { url: string; body: { filename: string; file_dir: string } }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const checkName: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse & { then?: (data: any) => any }>(url, { body })
}

export const deleteModel: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const editModel: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const createModel: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const reDown: Fetcher<BaseResponse, { url: string }> = ({ url }) =>
  get<BaseResponse>(url)

export const getModelInfo: Fetcher<BaseResponse, { url: string; options: { params: {} } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const getModelListNew: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}
