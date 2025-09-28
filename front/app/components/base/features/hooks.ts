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

/**
 * LazyLLM 功能特性操作钩子
 * 提供常用的功能特性操作方法
 * @returns 功能特性操作方法集合
 */
export function useLazyLLMFeatureActions() {
  const store = useLazyLLMFeatureStore()

  return {
    // 获取当前功能特性配置
    getCurrentFeatures: () => store.getState().features,

    // 更新功能特性配置
    updateFeatures: (features: ReturnType<typeof store.getState>['features']) => {
      const { setFeatures } = store.getState()
      setFeatures(features)
    },

    // 切换模态框显示状态
    toggleModal: (visible?: boolean) => {
      const state = store.getState()
      const currentState = state.showFeaturesDialog
      state.setShowFeaturesModal(visible ?? !currentState)
    },

    // 重置功能特性到默认状态
    resetToDefaults: () => {
      const { setFeatures } = store.getState()
      const defaultFeatures = {
        opening: { enabled: false },
        suggested: { enabled: false },
        text2speech: { enabled: false },
        speech2text: { enabled: false },
        citation: { enabled: false },
        moderation: { enabled: false },
        file: { image: { enabled: false } },
      }
      setFeatures(defaultFeatures)
    },
  }
}

// 向后兼容的别名导出
export const useFeatures = useLazyLLMFeatureSelector
export const useFeaturesStore = useLazyLLMFeatureStore
