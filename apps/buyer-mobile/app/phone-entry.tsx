import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSessionStore } from '@chinooz/state'
import { colors, spacing, radii } from '@chinooz/theme'

export default function PhoneEntryScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const login = useSessionStore(s => s.login)

  const handleContinue = () => {
    login('user-1', 'Ayush Chaudhary')
    router.replace('/(tabs)')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[6], gap: spacing[4] }}>
        <Text style={{ fontSize: 48 }}>📱</Text>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
          Enter your phone number
        </Text>
        <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
          We'll send you a verification code to confirm your identity.
        </Text>
        <View style={{
          width: '100%',
          height: 52,
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1.5,
          borderColor: colors.border,
          alignItems: 'center',
          paddingHorizontal: spacing[4],
          flexDirection: 'row',
          marginTop: spacing[2],
        }}>
          <Text style={{ fontSize: 15, color: colors.textMuted, marginRight: spacing[2] }}>+977</Text>
          <Text style={{ fontSize: 15, color: colors.textTertiary }}>98XXXXXXXX</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: spacing[6], paddingBottom: insets.bottom + spacing[4] }}>
        <TouchableOpacity
          onPress={handleContinue}
          style={{
            backgroundColor: colors.primary,
            height: 52,
            borderRadius: radii.lg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          activeOpacity={0.85}
        >
          <Text style={{ color: colors.white, fontSize: 16, fontWeight: '600' }}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
