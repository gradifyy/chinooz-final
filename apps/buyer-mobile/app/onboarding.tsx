import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSessionStore } from '@chinooz/state'
import { colors, spacing, radii } from '@chinooz/theme'

export default function OnboardingScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const markOnboardingSeen = useSessionStore(s => s.markOnboardingSeen)

  const handleGetStarted = () => {
    markOnboardingSeen()
    router.replace('/phone-entry')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[6], gap: spacing[4] }}>
        <Text style={{ fontSize: 48 }}>🛍️</Text>
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
          Welcome to Chinooz
        </Text>
        <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
          Discover Nepal's best products from local sellers. Shop electronics, fashion, handicrafts and more.
        </Text>
      </View>
      <View style={{ paddingHorizontal: spacing[6], paddingBottom: insets.bottom + spacing[4] }}>
        <TouchableOpacity
          onPress={handleGetStarted}
          style={{
            backgroundColor: colors.primary,
            height: 52,
            borderRadius: radii.lg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          activeOpacity={0.85}
        >
          <Text style={{ color: colors.white, fontSize: 16, fontWeight: '600' }}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
