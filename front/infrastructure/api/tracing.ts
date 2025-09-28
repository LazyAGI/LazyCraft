import { del, get } from './base'

// 获取追踪历史数据
export const fetchTracingHistory = async (appId: string, mode: string): Promise<any> => {
  return get<any>(`/apps/${appId}/workflows/${mode}/debug-detail/history`)
}

// 清除追踪历史数据
export const clearTracingHistory = async (appId: string, mode: string): Promise<void> => {
  return del(`/apps/${appId}/workflows/${mode}/debug-detail/history`)
}

// 获取当前调试详情（用于轮询）
export const fetchTracingDebugDetail = async (
  appId: string,
  mode: string,
  conversationType: 'single' | 'multi' = 'multi',
): Promise<any> => {
  return get<any>(`/apps/${appId}/workflows/${mode}/debug-detail`, { params: { conversation_type: conversationType } })
}
