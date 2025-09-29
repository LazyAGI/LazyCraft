import { createContext, useRef } from 'react'
import type { FeaturesStoreInstance, FeaturesStoreStateOnly } from './store'
import { createFeaturesStoreInstance } from './store'

export const FeaturesContext = createContext<FeaturesStoreInstance | null>(null)

type FeaturesProviderComponentProps = {
  children: React.ReactNode
} & Partial<FeaturesStoreStateOnly>

export const FeaturesProvider = ({ children, ...featureProps }: FeaturesProviderComponentProps) => {
  const featuresStoreRef = useRef<FeaturesStoreInstance>()

  const initializeFeaturesStore = () => {
    if (!featuresStoreRef.current)
      featuresStoreRef.current = createFeaturesStoreInstance(featureProps)
  }

  initializeFeaturesStore()

  return (
    <FeaturesContext.Provider value={featuresStoreRef.current || null}>
      {children}
    </FeaturesContext.Provider>
  )
}
