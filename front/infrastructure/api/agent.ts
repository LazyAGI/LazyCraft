import type { Fetcher } from 'swr'
import { get, post } from './base'
import type { BaseResponse } from '@/core/data/common'

export const getAgentSessions = ({ appId }) => {
  return get(`conversation/${appId}/sessions`)
}

export const getAgentInit = ({ appId }) => {
  return get(`conversation/${appId}/init`)
}

export const getChatDetail: Fetcher<Promise<BaseResponse>, { url: string; options: { params: any } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)

export const chatFeedback: Fetcher<any, any> = ({ appId, ...others }) => {
  return post<any>(`/conversation/${appId}/feedback`, { body: others })
}
