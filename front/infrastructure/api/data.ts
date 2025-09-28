import type { Fetcher } from 'swr'
import { get, post } from './base'
import type {
  BaseResponse,
} from '@/core/data/common'

export const getDatasetFileRefluxList: Fetcher<BaseResponse, { url: string; options: { params: { reflux_data_id: string } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const getDatasetListNew: Fetcher<Promise<BaseResponse>, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const getDatasetList: Fetcher<Promise<BaseResponse>, { url: string; options: { params: { page: string; page_size: string; label?: string; data_type: string; qtype: string; name?: string } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const getDatasetVersionList: Fetcher<BaseResponse, { url: string; options: { params: { page: string; page_size: string; data_set_id: string; version_type: string } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const getDatasetInfo: Fetcher<BaseResponse, { url: string; options: { params: { data_set_id: string } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const getDatasetVersionInfo: Fetcher<BaseResponse, { url: string; options: { params: { data_set_version_id: string } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const getDatasetFileList: Fetcher<BaseResponse, { url: string; options: { params: { page: string; page_size: string; data_set_version_id: string } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const getDatasetTagList: Fetcher<BaseResponse, { url: string; options: { params: { data_set_id: string } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const createDataset: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const addBranch: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const addFile: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const updateFile: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const deleteDataset: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const deleteDatasetVersion: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const deleteFile: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const publish: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const getJsonFile: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body }, { needAllResponseContent: true })
}
