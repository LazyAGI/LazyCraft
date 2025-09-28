'use client'
import { useEffect, useMemo, useState } from 'react'

// 设备类型枚举 - 用于 lazylm 响应式布局
export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
}

// 响应式断点配置
const RESPONSIVE_BREAKPOINTS = {
  MOBILE: 640,
  TABLET: 768,
} as const

/**
 * 响应式断点检测 Hook
 * 根据当前窗口宽度自动判断设备类型，用于 lazylm 的响应式布局
 */
const useResponsiveBreakpoints = () => {
  // 使用 useState 管理窗口宽度状态
  const [windowWidth, setWindowWidth] = useState<number>(() => {
    // 服务端渲染兼容性处理
    if (typeof window !== 'undefined')
      return window.innerWidth

    return 1024 // 默认桌面端宽度
  })

  // 使用 useMemo 优化设备类型计算，避免重复计算
  const currentDeviceType = useMemo((): DeviceType => {
    if (windowWidth <= RESPONSIVE_BREAKPOINTS.MOBILE)
      return DeviceType.MOBILE

    if (windowWidth <= RESPONSIVE_BREAKPOINTS.TABLET)
      return DeviceType.TABLET

    return DeviceType.DESKTOP
  }, [windowWidth])

  // 窗口大小变化监听
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    // 添加事件监听器
    window.addEventListener('resize', handleResize)

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return currentDeviceType
}

// 为了保持向后兼容，保留原有的导出名称
export default useResponsiveBreakpoints

// 兼容性导出，保持原有 API 不变
export const MediaType = DeviceType
export const useBreakpoints = useResponsiveBreakpoints
