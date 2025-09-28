'use client'

import { createContext, useContext } from 'use-context-selector'
import { useEventEmitter as useEmitter } from 'ahooks'
import type { EventEmitter as Emitter } from 'ahooks/lib/useEventEmitter'

const EmitterContext = createContext<{ emitter: Emitter<string> | null }>({
  emitter: null,
})

export const useEmitterContext = () => useContext(EmitterContext)

type EmitterProviderProps = {
  children: React.ReactNode
}
export const EmitterProvider = ({ children }: EmitterProviderProps) => {
  const emitter = useEmitter<string>()

  return (
    <EmitterContext.Provider value={{ emitter }}>
      {children}
    </EmitterContext.Provider>
  )
}
