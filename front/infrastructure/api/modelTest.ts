import type { Fetcher } from 'swr'
import { get, post } from './base'
import type {

  BaseResponse,

} from '@/core/data/common'

export const deleteTest: Fetcher<BaseResponse, { url: string }> = ({ url }) => {
  return post<BaseResponse>(url)
}

export const saveChoose: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const getResultInfo: Fetcher<BaseResponse, { url: string; options: { params: { page: number; option_select_id?: any } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const getAdjustInfo: Fetcher<BaseResponse, { url: string }> = ({ url }) =>
  get<BaseResponse>(url)

export const getTestList: Fetcher<BaseResponse, { url: string; options: { params: { page: string; per_page: string; keyword: string } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)
