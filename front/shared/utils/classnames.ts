import { twMerge } from 'tailwind-merge'
import clsx, { type ClassValue } from 'clsx'

/**
 * LazyLLM 样式类名合并工具
 * 结合 clsx 和 tailwind-merge 的功能
 * 提供高效的条件样式类名处理和 Tailwind CSS 类名冲突解决
 */
const lazyllmClassNames = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs))
}

// 导出主函数和类型别名
export default lazyllmClassNames
export type { ClassValue }

// 兼容性别名，确保不破坏现有引用
export const cn = lazyllmClassNames
export const classNames = lazyllmClassNames
