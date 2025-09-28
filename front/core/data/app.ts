import type { App } from '@/shared/types/app'

// 应用列表响应结构
export type AppListResult = {
  data: App[]
  hasAdditional: boolean
  page: number
}

// 应用详情响应
export type AppDetailResponse = App
