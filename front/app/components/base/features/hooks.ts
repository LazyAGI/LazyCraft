import { useContext } from 'react'
import { useStore } from 'zustand'
import { FeaturesContext } from './context'
import type { FeaturesStoreState } from './store'

/**
 * LazyLLM 功能特性选择器钩子
 * 用于获取特定的功能状态切片
 * @param selector 状态选择器函数
 * @returns 选中的状态切片
 */
export function useLazyLLMFeatureSelector<TSelected>(
  selector: (state: FeaturesStoreState) => TSelected,
): TSelected {
  const featureStore = useContext(FeaturesContext)

  if (!featureStore) {
    throw new Error(
      'useLazyLLMFeatureSelector 必须在 FeaturesProvider 组件内部使用。'
      + '请确保组件被正确的 Provider 包装。',
    )
  }

  return useStore(featureStore, selector)
}

/**
 * LazyLLM 功能特性存储钩子
 * 用于获取完整的功能特性存储实例
 * @returns 功能特性存储实例
 */
export function useLazyLLMFeatureStore() {
  const featureStore = useContext(FeaturesContext)

  if (!featureStore) {
    throw new Error(
      'useLazyLLMFeatureStore 必须在 FeaturesProvider 组件内部使用。'
      + '请检查组件树中是否包含了正确的 Provider 配置。',
    )
  }

  return featureStore
}

// 向后兼容的别名导出
export const useFeatures = useLazyLLMFeatureSelector
export const useFeaturesStore = useLazyLLMFeatureStore
