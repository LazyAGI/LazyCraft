// 测试工具函数
import type { ReactElement } from 'react'
import type { RenderOptions } from '@testing-library/react'
import { render } from '@testing-library/react'

// 自定义render函数，可以包装Provider等
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  return render(ui, { ...options })
}

// Mock API响应生成器
export const mockSuccessResponse = (data: any = {}) => ({
  result: 'success',
  data,
})

export const mockErrorResponse = (message = 'Error') => ({
  result: 'error',
  message,
})

// 延迟函数，用于测试异步行为
export const wait = (ms = 0) =>
  new Promise(resolve => setTimeout(resolve, ms))

// 导出所有testing-library的功能和自定义render
export * from '@testing-library/react'
export { customRender }
