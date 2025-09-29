import type { Fetcher } from 'swr'
import { del, get, post, put } from './base'
import type { BaseResponse } from '@/core/data/common'

export const getDocList: Fetcher<BaseResponse, { url: string; options: { params: { page: string; limit: string } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const getDocInfo: Fetcher<BaseResponse, { url: string; options: { params: { id: number } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const publishDoc: Fetcher<BaseResponse, { url: string; options: { params: { id: number } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const createDoc: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}
export const editDoc: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return put<BaseResponse>(url, { body })
}
export const deleteDoc: Fetcher<BaseResponse, { url: string; options: {} }> = ({ url, options }) =>
  del<BaseResponse>(url, options)
