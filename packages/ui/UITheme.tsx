import React, { createContext, useContext, useMemo } from 'react'
import { colors as lightColors } from '@chinooz/theme'

export type UIColors = typeof lightColors

type UIThemeValue = {
  colors: UIColors
}

const UIThemeContext = createContext<UIThemeValue>({
  colors: lightColors,
})

/**
 * Optional theme bridge so primitives (Button, BottomSheet, …) pick up the
 * host app's light/dark semantic colors instead of the static light palette.
 * Buyer/seller ThemeProviders should wrap the tree with this when available.
 */
export function UIThemeProvider({
  colors,
  children,
}: {
  colors: UIColors
  children: React.ReactNode
}) {
  const value = useMemo(() => ({ colors }), [colors])
  return <UIThemeContext.Provider value={value}>{children}</UIThemeContext.Provider>
}

export function useUIColors(): UIColors {
  return useContext(UIThemeContext).colors
}
