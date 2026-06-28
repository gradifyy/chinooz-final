import React, { useState, useRef, useCallback } from 'react'
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
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii, fontFamily } from '@chinooz/theme'
import { nepaliPhoneSchema } from '@chinooz/validation'
import { requestOtp } from '@chinooz/mock-data'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { SlideUp } from '@chinooz/ui/Animate'
import LanguageToggle from './LanguageToggle'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

interface Props {
  mode: 'signup' | 'login'
}

export default function SellerPhoneEntry({ mode }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const inputRef = useRef<TextInput>(null)

  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [alreadySent, setAlreadySent] = useState(false)
  const [focused, setFocused] = useState(false)

  const shakeX = useSharedValue(0)

  const titleKey = 'seller.auth.phoneTitle'
  const subtitleKey = mode === 'signup' ? 'seller.auth.phoneSignupSubtitle' : 'seller.auth.phoneLoginSubtitle'

  const validate = useCallback((value: string) => {
    const result = nepaliPhoneSchema.safeParse({ phone: value })
    if (!result.success) {
      return result.error.issues[0]?.message || 'Invalid phone number'
    }
    return ''
  }, [])

  const handleChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 10)
    setPhone(digits)
    setError('')
    setAlreadySent(false)
  }, [])

  const handleFocus = useCallback(() => {
    setFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    setFocused(false)
  }, [phone])

  const isValid = phone.length === 10 && (phone.startsWith('97') || phone.startsWith('98'))

  const handleSubmit = useCallback(async () => {
    const validationError = validate(phone)
    if (validationError) {
      setError(validationError)
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

    Keyboard.dismiss()
    setLoading(true)
    setError('')
    setAlreadySent(false)

    try {
      const result = await requestOtp(phone)
      if (result.message.includes('already sent')) {
        setAlreadySent(true)
      } else {
        router.push({ pathname: '/otp', params: { phone, mode } })
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [phone, validate, router, mode, reduced])

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }))

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: focused
      ? colors.primary
      : error
      ? colors.error
      : colors.border,
    borderWidth: 1.5,
  }))

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
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
              {t(titleKey)}
            </Text>
            <Text style={styles.subtitle}>{t(subtitleKey)}</Text>
          </SlideUp>

          <SlideUp delay={reduced ? 0 : 200} distance={reduced ? 0 : 16}>
            <Animated.View style={[styles.inputRow, borderStyle]}>
              <View style={styles.prefix}>
                <Text style={styles.prefixText}>🇳🇵</Text>
                <Text style={styles.prefixNumber}>+977</Text>
              </View>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={phone}
                onChangeText={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="98XXXXXXXX"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                maxLength={10}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                accessibilityLabel={t('seller.auth.phoneAria')}
                inputMode="tel"
              />
            </Animated.View>

            {error ? (
              <Text style={styles.error} accessibilityRole="alert">{error}</Text>
            ) : alreadySent ? (
              <Text style={styles.alreadySent}>{t('seller.auth.alreadySent')}</Text>
            ) : null}
          </SlideUp>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
          <SlideUp delay={reduced ? 0 : 300} distance={reduced ? 0 : 12}>
            <AnimatedTouchable
              onPress={handleSubmit}
              disabled={!isValid || loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('seller.auth.continue')}
              style={[
                styles.button,
                { opacity: isValid && !loading ? 1 : 0.5 },
              ]}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <View style={styles.loadingDot} />
                  <View style={[styles.loadingDot, { marginLeft: 6 }]} />
                  <View style={[styles.loadingDot, { marginLeft: 6 }]} />
                </View>
              ) : (
                <Text style={styles.buttonText}>{t('seller.auth.continue')}</Text>
              )}
            </AnimatedTouchable>

            <Text style={styles.terms}>
              {t('seller.auth.termsPrefix')}{' '}
              <Text style={styles.link}>{t('seller.auth.terms')}</Text>
              {' '}{t('seller.auth.and')}{' '}
              <Text style={styles.link}>{t('seller.auth.privacy')}</Text>
            </Text>
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    height: 56,
    marginTop: spacing[4],
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingRight: spacing[3],
    borderRightWidth: 1,
    borderRightColor: colors.border,
    marginRight: spacing[3],
  },
  prefixText: {
    fontSize: 18,
  },
  prefixNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    letterSpacing: 1,
    paddingVertical: 0,
  },
  error: {
    fontSize: 13,
    color: colors.error,
    marginTop: spacing[2],
  },
  alreadySent: {
    fontSize: 13,
    color: colors.primary,
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
  terms: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: colors.primary,
    fontWeight: '500',
  },
})
