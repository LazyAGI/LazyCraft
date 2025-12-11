import type { Fetcher } from 'swr'
import { get, post } from './base'
import type {
  BaseResponse,
} from '@/core/data/common'

export const sendForgotPasswordEmail: Fetcher<BaseResponse, { url: string; body: { email: string } }> = ({ url, body }) =>
  post<BaseResponse>(url, { body })

export const changePasswordWithToken: Fetcher<BaseResponse, { url: string; body: { token: string; new_password: string; password_confirm: string } }> = ({ url, body }) =>
  post<BaseResponse>(url, { body })

export const login: Fetcher<BaseResponse & { data: string }, { url: string; body: Record<string, any> }> = ({ url, body }) => {
  return post(url, { body }) as Promise<BaseResponse & { data: string }>
}

export const checkExist: Fetcher<BaseResponse & { data: string }, { url: string; body: Record<string, any> }> = ({ url, body }) => {
  return post(url, { body }) as Promise<BaseResponse & { data: string }>
}

export const commonPost: Fetcher<BaseResponse & { data: string }, { url: string; body: Record<string, any> }> = ({ url, body }) => {
  return post(url, { body }) as Promise<BaseResponse & { data: string }>
}

// 添加用户
export const addUser: Fetcher<BaseResponse & { data: string }, { url: string; body: Record<string, any> }> = ({ url, body }) => {
  return post(url, { body }) as Promise<BaseResponse & { data: string }>
}

// 修改密码
export const updatePassword: Fetcher<BaseResponse & { data: string }, { url: string; body: Record<string, any> }> = ({ url, body }) => {
  return post(url, { body }) as Promise<BaseResponse & { data: string }>
}

// 重置密码
export const resetPassword: Fetcher<BaseResponse & { data: string }, { url: string; body: Record<string, any> }> = ({ url, body }) => {
  return post(url, { body }) as Promise<BaseResponse & { data: string }>
}

export const getUserInfo = () => {
  return get('account/profile')
}

export const logout: Fetcher<BaseResponse, { url: string; params: Record<string, any> }> = ({ url, params }) => {
  return get<BaseResponse>(url, params)
}

// 密钥交换接口
export const keyExchange = (body: { frontend_public_key: string }) => {
  return post<{
    backend_public_key: string
    session_id: string
    expires_in?: number
    algorithm?: string
    curve?: string
    key_size?: number
  }>('/key_exchange', { body })
}
