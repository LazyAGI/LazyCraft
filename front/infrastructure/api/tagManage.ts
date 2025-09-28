import type { Fetcher } from 'swr'
import { get, post } from './base'
import type { BaseResponse } from '@/core/data/common'

export const getTagList: Fetcher<BaseResponse, { url: string; options: { params: { type?: string } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const createTag: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}
export const deleteTag: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}
export const bindTags: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}
export const updateList: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}
export const apiPublish: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}
export const deleteFile: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}
