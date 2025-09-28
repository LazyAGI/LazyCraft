import type { Fetcher } from 'swr'
import { get, post } from './base'
import type {

  BaseResponse,

} from '@/core/data/common'

export const getScriptList: Fetcher<BaseResponse, { url: string; options: { params: { script_type: string } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const getKnowledgeBaseList: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) =>
  post<BaseResponse>(url, { body })

export const createKnowledgeBase: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const updateKnowledgeBase: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const deleteKnowledgeBase: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const getFileList: Fetcher<BaseResponse, { url: string; options: { params: { file_name: string; knowledge_base_id: string; page: number; page_size: number } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const addFile: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const deleteFile: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const getFilePathById: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const handleFile: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}
