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
import { colors } from '../lib/theme'

/**
 * Loads the shared design-system fonts (Inter + Noto Sans Devanagari) so the
 * typography tokens in @chinooz/theme resolve to the real typefaces from
 * screen one, satisfying the bilingual EN/नेपाली requirement (no Devanagari
 * tofu on Android). Mirrors the proven rider-mobile pattern: a calm branded
 * splash until fonts are ready, with a 4s timeout fallback so a font hiccup
 * never blocks the app.
 *
 * The registered family names match the first entries in
 * packages/theme/typography.ts so screens keep using the shared `fontFamily`
 * tokens — this does NOT fork the design system.
 */
export function FontProvider({ children }: { children: React.ReactNode }) {
  const [loaded] = useFonts({
    Inter: Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Noto Sans Devanagari': NotoSansDevanagari_400Regular,
    'Noto Sans Devanagari-Bold': NotoSansDevanagari_700Bold,
    'Sora-SemiBold': require('../assets/fonts/Sora_600SemiBold.ttf'),
    'Sora-Bold': require('../assets/fonts/Sora_700Bold.ttf'),
    'Sora-ExtraBold': require('../assets/fonts/Sora_800ExtraBold.ttf'),
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
