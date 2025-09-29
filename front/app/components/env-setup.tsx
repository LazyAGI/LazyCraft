'use client'

/**
 * 存储模拟器 - 为不支持 localStorage 的环境提供兼容性支持
 */
class StorageSimulator {
  private storage: Map<string, string>

  constructor() {
    this.storage = new Map()
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value)
  }

  getItem(key: string): string | null {
    return this.storage.get(key) || null
  }

  removeItem(key: string): void {
    this.storage.delete(key)
  }

  clear(): void {
    this.storage.clear()
  }

  get length(): number {
    return this.storage.size
  }

  key(index: number): string | null {
    const keys = Array.from(this.storage.keys())
    return keys[index] || null
  }
}

/**
 * 获取可用的存储对象，如果不支持则使用模拟实现
 */
function getStorageImplementation() {
  let local: Storage | StorageSimulator
  let session: Storage | StorageSimulator

  try {
    // 尝试获取真实的存储对象
    local = globalThis.localStorage
    session = globalThis.sessionStorage
  }
  catch {
    // 降级到模拟实现
    local = new StorageSimulator()
    session = new StorageSimulator()
  }

  return { local, session }
}

// 初始化存储环境
const { local, session } = getStorageImplementation()

// 绑定到全局对象
Object.defineProperties(globalThis, {
  localStorage: {
    value: local,
    writable: false,
    configurable: false,
  },
  sessionStorage: {
    value: session,
    writable: false,
    configurable: false,
  },
})

/**
 * LazyLLM 存储初始化器组件
 * 确保应用在任何环境下都能正常使用浏览器存储功能
 */
const LazyLLMStorageInitor: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  return children
}

export default LazyLLMStorageInitor
