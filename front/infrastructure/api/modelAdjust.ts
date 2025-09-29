import type { Fetcher } from 'swr'
import { del, get, post } from './base'
import type {
  BaseResponse,
  ModelListResponse,
} from '@/core/data/common'

export const getModelListFromFinetune: Fetcher<ModelListResponse, { url: string }> = ({ url }) => {
  return get<ModelListResponse>(url)
}

export const getModelList: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const getModelListDraw: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return get<BaseResponse>(url, { params: body })
}

export const getBaseModelList: Fetcher<BaseResponse, { url: string; options: {} }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const getAdjustInfo: Fetcher<BaseResponse, { url: string }> = ({ url }) =>
  get<BaseResponse>(url)

export const createModel: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const startModel: Fetcher<BaseResponse, { url: string }> = ({ url }) => {
  return get<BaseResponse>(url)
}

export const stopModel: Fetcher<BaseResponse, { url: string }> = ({ url }) => {
  return get<BaseResponse>(url)
}

export const deleteModel: Fetcher<BaseResponse, { url: string }> = ({ url }) => {
  return del<BaseResponse>(url)
}

export const deleteParam: Fetcher<BaseResponse, { url: string; options: {} }> = ({ url, options }) =>
  del<BaseResponse>(url, options)

export const cancelModel: Fetcher<BaseResponse, { url: string }> = ({ url }) => {
  return del<BaseResponse>(url)
}
