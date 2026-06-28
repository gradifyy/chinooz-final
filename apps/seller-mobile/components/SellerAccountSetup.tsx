import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii, fontFamily } from '@chinooz/theme'
import { useSellerSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { SlideUp } from '@chinooz/ui/Animate'
import LanguageToggle from './LanguageToggle'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

export default function SellerAccountSetup() {
  const { t } = useTranslation()
  const router = useRouter()
  const { phone } = useLocalSearchParams<{ phone: string }>()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const login = useSellerSessionStore(s => s.login)
  const updateSeller = useSellerSessionStore(s => s.updateSeller)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const shakeX = useSharedValue(0)
  const nameRef = useRef<TextInput>(null)

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }))

  const handleFinish = useCallback(async () => {
    if (name.trim().length < 2) {
      setError(t('seller.auth.nameRequired'))
      if (!reduced) {
        shakeX.value = withSequence(
          withTiming(-8, { duration: 50 }),
          withTiming(8, { duration: 50 }),
          withTiming(-4, { duration: 50 }),
          withTiming(4, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        )
      }
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } catch {}
      return
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('seller.auth.emailInvalid'))
      if (!reduced) {
        shakeX.value = withSequence(
          withTiming(-8, { duration: 50 }),
          withTiming(8, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        )
      }
      return
    }

    Keyboard.dismiss()
    setLoading(true)
    setError('')

    try {
      updateSeller({
        name: name.trim(),
        email: email.trim(),
        phone: phone || '',
      })
      login('seller-1', name.trim())
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      setTimeout(() => router.replace('/setup-store'), 400)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [name, email, phone, login, updateSeller, router, t, reduced])

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View
        style={[styles.container, { paddingTop: insets.top }, containerStyle]}
      >
        <View style={styles.topBar}>
          <LanguageToggle />
        </View>

        <View style={styles.content}>
          <SlideUp delay={reduced ? 0 : 100} distance={reduced ? 0 : 20}>
            <Text accessibilityRole="header" style={styles.title}>
              {t('seller.auth.accountTitle')}
            </Text>
            <Text style={styles.subtitle}>{t('seller.auth.accountSubtitle')}</Text>
          </SlideUp>

          <SlideUp delay={reduced ? 0 : 200} distance={reduced ? 0 : 16}>
            <View style={styles.field}>
              <Text style={styles.label}>{t('seller.auth.nameLabel')}</Text>
              <TextInput
                ref={nameRef}
                style={styles.input}
                value={name}
                onChangeText={text => { setName(text); setError('') }}
                placeholder={t('seller.auth.namePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                autoFocus
                returnKeyType="next"
                accessibilityLabel={t('seller.auth.nameLabel')}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('seller.auth.emailLabel')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={text => { setEmail(text); setError('') }}
                placeholder={t('seller.auth.emailPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleFinish}
                accessibilityLabel={t('seller.auth.emailLabel')}
              />
            </View>

            {error ? (
              <Text style={styles.error} accessibilityRole="alert">{error}</Text>
            ) : null}
          </SlideUp>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
          <SlideUp delay={reduced ? 0 : 300} distance={reduced ? 0 : 12}>
            <AnimatedTouchable
              onPress={handleFinish}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('seller.auth.finishSetup')}
              style={[styles.button, loading && styles.buttonLoading]}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <View style={styles.loadingDot} />
                  <View style={[styles.loadingDot, { marginLeft: 6 }]} />
                  <View style={[styles.loadingDot, { marginLeft: 6 }]} />
                </View>
              ) : (
                <Text style={styles.buttonText}>{t('seller.auth.finishSetup')}</Text>
              )}
            </AnimatedTouchable>
          </SlideUp>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[10],
    gap: spacing[6],
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing[2],
    fontFamily: fontFamily.sansBold[0],
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
  field: {
    gap: spacing[2],
    marginTop: spacing[4],
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  error: {
    fontSize: 13,
    color: colors.error,
    marginTop: spacing[2],
  },
  footer: {
    paddingHorizontal: spacing[6],
    gap: spacing[4],
  },
  button: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLoading: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
})
