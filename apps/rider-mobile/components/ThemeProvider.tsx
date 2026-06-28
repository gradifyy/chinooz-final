import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_700Bold,
} from '@expo-google-fonts/noto-sans-devanagari'
import { colors } from '@chinooz/theme'

/**
 * ThemeProvider loads the shared design-system fonts (Inter + Noto Sans
 * Devanagari) so the typography tokens in @chinooz/theme resolve to the real
 * typefaces from screen one. Until fonts are ready, a calm branded splash is
 * shown so riders never see a flash of system text.
 *
 * This reuses the shared @chinooz/theme fontFamily tokens — it does NOT fork
 * the design system. The native font names registered here match the first
 * entries in packages/theme/typography.ts (Inter, Inter-SemiBold, Inter-Bold,
 * Noto Sans Devanagari, Noto Sans Devanagari-Bold). Screens apply fonts via
 * the shared `fontFamily` tokens in their styles.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [loaded] = useFonts({
    Inter: Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Noto Sans Devanagari': NotoSansDevanagari_400Regular,
    'Noto Sans Devanagari-Bold': NotoSansDevanagari_700Bold,
  })

  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    if (loaded) return
    const t = setTimeout(() => setTimedOut(true), 4000)
    return () => clearTimeout(t)
  }, [loaded])

  if (!loaded && !timedOut) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    )
  }

  return <>{children}</>
}

