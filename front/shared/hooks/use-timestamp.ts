'use client'

import { useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { useApplicationContext } from '@/shared/hooks/app-context'

// 扩展 dayjs 插件
dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * 常用时间格式常量
 */
export const TIME_FORMATS = {
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm:ss',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  DATETIME_SHORT: 'MM-DD HH:mm',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSS[Z]',
  RELATIVE: 'relative',
} as const

/**
 * 时间格式化选项类型
 */
type FormatOptions = {
  timezone?: string
  locale?: string
  relative?: boolean
}

/**
 * Hook 返回值类型
 */
type UseTimestampReturn = {
  formatTime: (timestamp: number, format?: string, options?: FormatOptions) => string
  formatRelativeTime: (timestamp: number) => string
  getCurrentTime: (format?: string) => string
  userTimezone: string
}

/**
 * 时间戳格式化 Hook
 *
 * @description
 * 提供时间戳格式化功能，支持用户时区、相对时间显示等
 * 自动使用用户配置的时区进行时间转换
 *
 * @returns 包含各种时间格式化方法的对象
 *
 * @example
 * ```tsx
 * const { formatTime, formatRelativeTime, getCurrentTime } = useTimestamp()
 *
 * // 格式化时间戳
 * const formattedTime = formatTime(1234567890, TIME_FORMATS.DATETIME)
 *
 * // 显示相对时间
 * const relativeTime = formatRelativeTime(Date.now() - 3600000) // "1小时前"
 *
 * // 获取当前时间
 * const currentTime = getCurrentTime(TIME_FORMATS.DATE)
 * ```
 */
const useTimestamp = (): UseTimestampReturn => {
  const { userSpecified } = useApplicationContext()
  const userTimezone = userSpecified?.timezone || 'Asia/Shanghai'

  /**
   * 创建带时区的 dayjs 实例
   */
  const createDayjsInstance = useCallback((timestamp: number, tz?: string) => {
    return dayjs.unix(timestamp).tz(tz || userTimezone)
  }, [userTimezone])

  /**
   * 格式化时间戳
   */
  const formatTime = useCallback((
    timestamp: number,
    format: string = TIME_FORMATS.DATETIME,
    options: FormatOptions = {},
  ): string => {
    try {
      const targetTimezone = options.timezone || userTimezone
      const dayjsInstance = createDayjsInstance(timestamp, targetTimezone)

      if (options.relative || format === TIME_FORMATS.RELATIVE)
        return formatRelativeTime(timestamp)

      return dayjsInstance.format(format)
    }
    catch (error) {
      console.warn('时间格式化失败:', error)
      return '无效时间'
    }
  }, [userTimezone, createDayjsInstance])

  /**
   * 格式化相对时间（如：3分钟前、1小时前等）
   */
  const formatRelativeTime = useCallback((timestamp: number): string => {
    try {
      const now = dayjs().tz(userTimezone)
      const target = createDayjsInstance(timestamp)
      const diffInMinutes = now.diff(target, 'minute')
      const diffInHours = now.diff(target, 'hour')
      const diffInDays = now.diff(target, 'day')

      if (diffInMinutes < 1)
        return '刚刚'

      else if (diffInMinutes < 60)
        return `${diffInMinutes}分钟前`

      else if (diffInHours < 24)
        return `${diffInHours}小时前`

      else if (diffInDays < 7)
        return `${diffInDays}天前`

      else
        return target.format(TIME_FORMATS.DATE)
    }
    catch (error) {
      console.warn('相对时间格式化失败:', error)
      return '时间未知'
    }
  }, [userTimezone, createDayjsInstance])

  /**
   * 获取当前时间
   */
  const getCurrentTime = useCallback((format: string = TIME_FORMATS.DATETIME): string => {
    try {
      return dayjs().tz(userTimezone).format(format)
    }
    catch (error) {
      console.warn('获取当前时间失败:', error)
      return '时间获取失败'
    }
  }, [userTimezone])

  return useMemo(() => ({
    formatTime,
    formatRelativeTime,
    getCurrentTime,
    userTimezone,
  }), [formatTime, formatRelativeTime, getCurrentTime, userTimezone])
}

export default useTimestamp
