import React, { createContext, useContext } from 'react'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'

interface A11yContextValue {
  reducedMotion: boolean
  minTouchTarget: number
  fontScaleEnabled: boolean
}

const A11yContext = createContext<A11yContextValue>({
  reducedMotion: false,
  minTouchTarget: 44,
  fontScaleEnabled: true,
})

export function useA11y() {
  return useContext(A11yContext)
}

export function A11yProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion()

  return (
    <A11yContext.Provider
      value={{ reducedMotion, minTouchTarget: 44, fontScaleEnabled: true }}
    >
      {children}
    </A11yContext.Provider>
  )
}
