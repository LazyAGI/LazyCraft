import { createStore } from 'zustand'
import type { Features as FeaturesType } from './types'
import { ITransferMethod } from '@/shared/types/app'

export type FeaturesStoreStateOnly = {
  features: FeaturesType
}

export type FeaturesStoreState = FeaturesStoreStateOnly & {
  setFeatures: (features: FeaturesType) => void
  showFeaturesDialog: boolean
  setShowFeaturesModal: (isFeaturesModalOpen: boolean) => void
}

export type FeaturesStoreInstance = ReturnType<typeof createFeaturesStoreInstance>

export const createFeaturesStoreInstance = (initProps?: Partial<FeaturesStoreStateOnly>) => {
  const LazyLLMDEFAULT_FEATURES: FeaturesStoreStateOnly = {
    features: {
      opening: {
        enabled: false,
      },
      suggested: { enabled: false },
      text2speech: { enabled: false },
      moderation: { enabled: false },
      citation: { enabled: false },
      file: {
        image: {
          enabled: false,
          transfer_methods: [ITransferMethod.local_file, ITransferMethod.remote_url],
          number_limits: 3,
        },
      },
      speech2text: { enabled: false },
    },
  }

  const LazyLLMcreateStoreInstance = () => createStore<FeaturesStoreState>()(set => ({
    ...LazyLLMDEFAULT_FEATURES,
    ...initProps,
    setFeatures: features => set(() => ({ features })),
    showFeaturesDialog: false,
    setShowFeaturesModal: isFeaturesModalOpen => set(() => ({ showFeaturesDialog: isFeaturesModalOpen })),
  }))

  return LazyLLMcreateStoreInstance()
}
