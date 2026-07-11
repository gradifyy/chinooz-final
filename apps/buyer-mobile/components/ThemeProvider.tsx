import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { View, useColorScheme } from 'react-native'
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
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces'
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk'
import { useUIStore } from '@chinooz/state'
import { colors as lightColors, darkColors } from '@chinooz/theme'
import { UIThemeProvider } from '@chinooz/ui'
import type { ThemeMode } from '@chinooz/state'

interface ThemeContextValue {
  isDark: boolean
  mode: ThemeMode
  colors: typeof lightColors
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  mode: 'system',
  colors: lightColors,
})

/**
 * Loads the shared design-system fonts (Inter + Noto Sans Devanagari) so the
 * typography tokens in @chinooz/theme resolve to the real typefaces — and the
 * bilingual EN/नेपाली requirement never tofus on Android. Mirrors the proven
 * rider-mobile pattern: gate render behind a brief branded splash with a
 * 4s timeout fallback so a font hiccup never blocks the app.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore(s => s.theme)
  const systemScheme = useColorScheme()

  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Noto Sans Devanagari': NotoSansDevanagari_400Regular,
    'Noto Sans Devanagari-Bold': NotoSansDevanagari_700Bold,
    Fraunces: Fraunces_700Bold,
    'Fraunces-SemiBold': Fraunces_600SemiBold,
    SpaceGrotesk: SpaceGrotesk_700Bold,
  })

  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    if (fontsLoaded) return
    const t = setTimeout(() => setTimedOut(true), 4000)
    return () => clearTimeout(t)
  }, [fontsLoaded])

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = theme === 'dark' || (theme === 'system' && systemScheme === 'dark')
    return {
      isDark,
      mode: theme,
      colors: isDark ? darkColors : lightColors,
    }
  }, [theme, systemScheme])

  if (!fontsLoaded && !timedOut) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: lightColors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    )
  }

  return (
    <ThemeContext.Provider value={value}>
      <UIThemeProvider colors={value.colors}>{children}</UIThemeProvider>
    </ThemeContext.Provider>
  )
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
