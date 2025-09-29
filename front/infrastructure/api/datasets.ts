import type { Fetcher } from 'swr'
import { del, get, post } from './base'
import type { BaseResponse } from '@/core/data/common'

export type ErrorDocumentationResponse = {
  data: any[]
  total: number
}

export const getErrorDocs: Fetcher<ErrorDocumentationResponse, { datasetId: string }> = ({ datasetId }) => {
  return get<ErrorDocumentationResponse>(`/datasets/${datasetId}/error-docs`)
}

export const retryErrorDocs: Fetcher<BaseResponse, { datasetId: string; document_ids: string[] }> = ({ datasetId, document_ids }) => {
  return post<BaseResponse>(`/datasets/${datasetId}/retry`, { body: { document_ids } })
}

export const fetchDataSources = () => {
  return get<BaseResponse>('api-key-auth/data-source')
}

export const createDataSourceApiKeyBinding: Fetcher<BaseResponse, Record<string, any>> = (body) => {
  return post<BaseResponse>('api-key-auth/data-source/binding', { body })
}

export const removeDataSourceApiKeyBinding: Fetcher<BaseResponse, string> = (id: string) => {
  return del<BaseResponse>(`api-key-auth/data-source/${id}`)
}
