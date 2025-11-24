/* eslint-disable no-undef */
// Jest setup文件 - 在每个测试文件运行之前执行
import '@testing-library/jest-dom'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() { }

  disconnect() { }

  observe() { }

  takeRecords() {
    return []
  }

  unobserve() { }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() { }

  disconnect() { }

  observe() { }

  unobserve() { }
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock window.localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock window.scrollTo
global.scrollTo = jest.fn()

// 抑制 console.error 中的某些警告
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string') {
      // 忽略React DOM相关警告
      if (args[0].includes('Warning: ReactDOM.render'))
        return

      // 忽略未实现的方法警告
      if (args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
        return

      // 忽略Ant Design的act警告
      if (args[0].includes('Warning: An update to') && args[0].includes('was not wrapped in act'))
        return

      // 忽略ItemHolder和Captcha的act警告
      if (args[0].includes('inside a test was not wrapped in act'))
        return

      // 忽略callback is deprecated警告
      if (args[0].includes('Warning: `callback` is deprecated'))
        return

      // 注意：不过滤 'Missing openid or provider parameters'
      // 这是测试用例故意触发的，显示它证明错误处理正常工作
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
