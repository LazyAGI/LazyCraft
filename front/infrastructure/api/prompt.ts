import type { Fetcher } from 'swr'
import { get, post } from './base'
import type { BaseResponse, PromptAIResponse } from '@/core/data/common'

export const getValidateStatu: Fetcher<BaseResponse, { url: string }> = ({ url }) =>
  get<BaseResponse>(url)

export const getPromptDetail: Fetcher<BaseResponse, { url: string }> = ({ url }) =>
  get<BaseResponse>(url)

export const createCodeAI = ({ url, body }: { url: string; body: Record<string, any> }, otherOptions?: any) => {
  return post(url, { body }, { customTimeout: 1000 * 60 * 5, ...otherOptions }) as Promise<BaseResponse & { message: string }>
}

// ai提示词
export const createPromptAI: Fetcher<PromptAIResponse, { body: Record<string, any> }> = ({ body }) => {
  return post('/apps/workflows/prompt_assistant', { body }, { customTimeout: 1000 * 60 * 5 }) as Promise<PromptAIResponse>
}

export const deletePrompt: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const createPrompt: Fetcher<BaseResponse & { data: string }, { url: string; body: Record<string, any> }> = ({ url, body }) => {
  return post(url, { body }, { customTimeout: 1000 * 60 * 5 }) as Promise<BaseResponse & { data: string }>
}

export const getAdjustList: Fetcher<BaseResponse, { url: string; body: any }> = ({ url, body }) => {
  return post<BaseResponse>(url, { body })
}

export const getPromptList: Fetcher<BaseResponse, { url: string; options: { params?: { page: string; per_page: string } } }> = ({ url, options }) =>
  get<BaseResponse>(url, options)
