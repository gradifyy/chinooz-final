import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  AccessibilityInfo,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { verifyOtp, requestOtp, lookupRiderAccount, __IS_DEV__ } from '@chinooz/mock-data'
import { useRiderSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { SlideUp } from '@chinooz/ui/Animate'
import LanguageToggle from './LanguageToggle'

const OTP_LENGTH = 6
const RESEND_SECONDS = 30

/**
 * Rider OTP verify (RO2/RO3/RO6). Reuses the shared mock OTP boundary
 * (@chinooz/mock-data verifyOtp/requestOtp). On success it looks up the
 * rider account state and branches:
 *  - "new"      → /onboarding  (RO3 stepper)
 *  - "approved" → /jobs        (Home)
 *  - "pending"  → /pending     (RO6 approval state)
 */
export default function RiderOtpVerify() {
  const { t } = useTranslation()
  const router = useRouter()
  const { phone, mode } = useLocalSearchParams<{ phone: string; mode: string }>()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const login = useRiderSessionStore(s => s.login)
  const setAccountState = useRiderSessionStore(s => s.setAccountState)
  const markOnboardingSeen = useRiderSessionStore(s => s.markOnboardingSeen)

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resendIn, setResendIn] = useState(RESEND_SECONDS)
  const [showVerifyButton, setShowVerifyButton] = useState(false)
  const [autoSubmitFailed, setAutoSubmitFailed] = useState(false)
  const inputRefs = useRef<(TextInput | null)[]>([])

  const shakeX = useSharedValue(0)
  // OTP_LENGTH is a fixed constant (6), so the per-box animated values and
  // styles are unrolled at the top level to satisfy the Rules of Hooks
  // (hooks cannot be called inside Array.from callbacks).
  const boxScale0 = useSharedValue(1)
  const boxScale1 = useSharedValue(1)
  const boxScale2 = useSharedValue(1)
  const boxScale3 = useSharedValue(1)
  const boxScale4 = useSharedValue(1)
  const boxScale5 = useSharedValue(1)
  const boxScales = [boxScale0, boxScale1, boxScale2, boxScale3, boxScale4, boxScale5]
  // Precompute per-box animated styles at the top level (hooks rules).
  const boxStyle0 = useAnimatedStyle(() => ({ transform: [{ scale: boxScale0.value }] }))
  const boxStyle1 = useAnimatedStyle(() => ({ transform: [{ scale: boxScale1.value }] }))
  const boxStyle2 = useAnimatedStyle(() => ({ transform: [{ scale: boxScale2.value }] }))
  const boxStyle3 = useAnimatedStyle(() => ({ transform: [{ scale: boxScale3.value }] }))
  const boxStyle4 = useAnimatedStyle(() => ({ transform: [{ scale: boxScale4.value }] }))
  const boxStyle5 = useAnimatedStyle(() => ({ transform: [{ scale: boxScale5.value }] }))
  const boxStyles = [boxStyle0, boxStyle1, boxStyle2, boxStyle3, boxStyle4, boxStyle5]

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setInterval(() => setResendIn(s => s - 1), 1000)
    return () => clearInterval(timer)
  }, [resendIn])

  const triggerShake = useCallback(() => {
    if (reduced) return
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    )
  }, [reduced])

  const branchAfterVerify = useCallback(
    async (verifiedUserId: string) => {
      try {
        const account = await lookupRiderAccount(phone || '')
        setAccountState(account.state)

        if (account.state === 'approved') {
          login(account.riderId || verifiedUserId, account.name || 'Chinooz Rider')
          try {
            AccessibilityInfo.announceForAccessibility(t('rider.auth.successLogin'))
          } catch {}
          setTimeout(() => router.replace('/jobs'), 800)
        } else if (account.state === 'pending') {
          // Not fully logged in; route to the pending/approval screen (RO6).
          try {
            AccessibilityInfo.announceForAccessibility(t('rider.auth.successPending'))
          } catch {}
          setTimeout(() => router.replace('/pending'), 800)
        } else {
          // "new" → onboarding stepper (RO3). Mark onboarding seen.
          markOnboardingSeen()
          try {
            AccessibilityInfo.announceForAccessibility(t('rider.auth.successSignup'))
          } catch {}
          setTimeout(() => router.replace('/onboarding'), 800)
        }
      } catch {
        // Fallback: treat as new rider → onboarding.
        setAccountState('new')
        markOnboardingSeen()
        setTimeout(() => router.replace('/onboarding'), 800)
      }
    },
    [phone, login, setAccountState, markOnboardingSeen, router, t],
  )

  const handleVerify = useCallback(
    async (code: string) => {
      if (loading) return
      Keyboard.dismiss()
      setLoading(true)
      setError('')

      try {
        const result = await verifyOtp(phone || '', code)
        if (result.success) {
          setSuccess(true)
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          } catch {}
          try {
            AccessibilityInfo.announceForAccessibility(t('rider.auth.successAnnounce'))
          } catch {}
          await branchAfterVerify(result.userId || 'rider-1')
        } else {
          setError(result.error || t('rider.auth.invalidCode'))
          setAutoSubmitFailed(true)
          setShowVerifyButton(true)
          triggerShake()
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          } catch {}
          try {
            AccessibilityInfo.announceForAccessibility(t('rider.auth.errorAnnounce'))
          } catch {}
        }
      } catch {
        setError(t('rider.auth.invalidCode'))
        setAutoSubmitFailed(true)
        setShowVerifyButton(true)
        triggerShake()
        try {
          AccessibilityInfo.announceForAccessibility(t('rider.auth.errorAnnounce'))
        } catch {}
      } finally {
        setLoading(false)
      }
    },
    [phone, t, loading, triggerShake, branchAfterVerify],
  )

  const handleChange = useCallback(
    (text: string, index: number) => {
      const cleaned = text.replace(/\D/g, '')
      // Paste support: if more than one digit arrives (e.g. pasting "123456"),
      // distribute across boxes starting at `index`.
      if (cleaned.length > 1) {
        const next = [...digits]
        for (let k = 0; k < cleaned.length && index + k < OTP_LENGTH; k++) {
          next[index + k] = cleaned[k]
        }
        setDigits(next)
        setError('')
        const code = next.join('')
        const lastFilled = Math.min(index + cleaned.length, OTP_LENGTH) - 1
        inputRefs.current[lastFilled]?.focus()
        if (code.length === OTP_LENGTH && next.every(d => d.length === 1)) {
          if (!autoSubmitFailed) handleVerify(code)
        }
        return
      }

      const digit = cleaned.slice(-1)
      const next = [...digits]
      next[index] = digit
      setDigits(next)
      setError('')

      if (digit) {
        if (!reduced) {
          boxScales[index].value = withSequence(
            withSpring(1.08, { damping: 12, stiffness: 400 }),
            withSpring(1, { damping: 15, stiffness: 300 }),
          )
        }
        // Announce the entered digit value politely.
        try {
          AccessibilityInfo.announceForAccessibility(
            t('rider.auth.digitValueAria', { n: index + 1, value: digit }),
          )
        } catch {}

        if (index < OTP_LENGTH - 1) {
          inputRefs.current[index + 1]?.focus()
        }
      }

      const code = next.join('')
      if (code.length === OTP_LENGTH && next.every(d => d.length === 1)) {
        if (!autoSubmitFailed) {
          handleVerify(code)
        }
      }
    },
    [digits, autoSubmitFailed, handleVerify, reduced, t, boxScales],
  )

  const handleKeyPress = useCallback(
    (e: { nativeEvent: { key: string } }, index: number) => {
      if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
        setAutoSubmitFailed(false)
        setShowVerifyButton(false)
      }
    },
    [digits],
  )

  const handleResend = useCallback(async () => {
    if (resendIn > 0) return
    try {
      await requestOtp(phone || '')
      setResendIn(RESEND_SECONDS)
      setDigits(Array(OTP_LENGTH).fill(''))
      setError('')
      setAutoSubmitFailed(false)
      setShowVerifyButton(false)
      inputRefs.current[0]?.focus()
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      try {
        AccessibilityInfo.announceForAccessibility(t('rider.auth.codeSent'))
      } catch {}
    } catch {}
  }, [resendIn, phone, t])

  const handleChangeNumber = useCallback(() => {
    router.back()
  }, [router])

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }))

  const allFilled = digits.every(d => d.length === 1)
  const subtitleKey =
    mode === 'login' ? 'rider.auth.otpLoginSubtitle' : 'rider.auth.otpSignupSubtitle'
  const successKey = mode === 'login' ? 'rider.auth.successLogin' : 'rider.auth.successSignup'

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View style={[styles.container, { paddingTop: insets.top }, containerStyle]}>
        <View style={styles.topBar}>
          <LanguageToggle />
        </View>

        {__IS_DEV__ && (
          <View style={styles.devBanner}>
            <Text style={styles.devBannerText}>{t('rider.auth.devBanner')}</Text>
          </View>
        )}

        <View style={styles.content}>
          <SlideUp delay={reduced ? 0 : 100} distance={reduced ? 0 : 16}>
            <TouchableOpacity
              onPress={handleChangeNumber}
              style={styles.changeNumber}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t('rider.auth.changeNumber')}
            >
              <Text style={styles.changeNumberText}>← {t('rider.auth.changeNumber')}</Text>
            </TouchableOpacity>
            <Text accessibilityRole="header" style={styles.title}>
              {t('rider.auth.otpTitle')}
            </Text>
            <TouchableOpacity onPress={handleChangeNumber}>
              <Text style={styles.subtitle}>
                {t(subtitleKey)} <Text style={styles.phoneText}>+977 {phone}</Text>
              </Text>
            </TouchableOpacity>
          </SlideUp>

          <SlideUp delay={reduced ? 0 : 200} distance={reduced ? 0 : 12}>
            <Text style={styles.label}>{t('rider.auth.otpLabel')}</Text>
            <View style={styles.otpRow} accessibilityLabel={t('rider.auth.otpTitle')}>
              {digits.map((digit, i) => {
                return (
                  <Animated.View key={i} style={[styles.otpBoxWrap, boxStyles[i]]}>
                    <TextInput
                      ref={ref => {
                        inputRefs.current[i] = ref
                      }}
                      style={[
                        styles.otpInput,
                        digit ? styles.otpInputFilled : null,
                        error ? styles.otpInputError : null,
                      ]}
                      value={digit}
                      onChangeText={text => handleChange(text, i)}
                      onKeyPress={e => handleKeyPress(e, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      textAlign="center"
                      autoFocus={i === 0}
                      selectTextOnFocus
                      editable={!success}
                      accessibilityLabel={t('rider.auth.digitAria', { n: i + 1 })}
                    />
                  </Animated.View>
                )
              })}
            </View>
            {!error && !success && <Text style={styles.helper}>{t('rider.auth.otpHelper')}</Text>}

            {error ? (
              <View>
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              </View>
            ) : null}

            {success ? (
              <View style={styles.successRow} accessibilityRole="alert">
                <Text style={styles.successCheck}>✓</Text>
                <Text style={styles.successText}>{t(successKey)}</Text>
              </View>
            ) : null}
          </SlideUp>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
          <SlideUp delay={reduced ? 0 : 300} distance={reduced ? 0 : 10}>
            {(showVerifyButton || (allFilled && !autoSubmitFailed)) && !success ? (
              <TouchableOpacity
                onPress={() => handleVerify(digits.join(''))}
                disabled={loading}
                style={[styles.verifyButton, loading && styles.verifyButtonLoading]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('rider.auth.verify')}
                accessibilityState={{ disabled: loading }}
              >
                {loading ? (
                  <View style={styles.loadingDots}>
                    <View style={styles.loadingDot} />
                    <View style={[styles.loadingDot, { marginLeft: 6 }]} />
                    <View style={[styles.loadingDot, { marginLeft: 6 }]} />
                  </View>
                ) : (
                  <Text style={styles.verifyText}>{t('rider.auth.verify')}</Text>
                )}
              </TouchableOpacity>
            ) : null}

            <View style={styles.resendRow}>
              {resendIn > 0 ? (
                <Text
                  style={styles.resendIn}
                  accessibilityLabel={t('rider.auth.resendDisabled', { seconds: resendIn })}
                >
                  {t('rider.auth.resendIn', { seconds: resendIn })}
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleResend}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('rider.auth.resendAria')}
                >
                  <Text style={styles.resend}>{t('rider.auth.resend')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </SlideUp>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  devBanner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
  },
  devBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    gap: spacing[6],
  },
  changeNumber: { marginBottom: spacing[3] },
  changeNumberText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  title: {
    fontSize: fontSize['2xl'][0],
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing[2],
    fontFamily: fontFamily.sansBold[0],
  },
  subtitle: { fontSize: fontSize.base[0], color: colors.textMuted, lineHeight: 22 },
  phoneText: { fontWeight: '600', color: colors.text },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
    fontFamily: fontFamily.sansSemiBold[0],
  },
  helper: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textTertiary,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  otpBoxWrap: {
    width: 48,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpInput: {
    width: '100%',
    height: '100%',
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    textAlign: 'center',
  },
  otpInputFilled: {
    color: colors.primary,
    borderColor: colors.primary,
  },
  otpInputError: {
    color: colors.error,
    borderColor: colors.error,
  },
  error: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing[3],
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  successCheck: {
    fontSize: 20,
    color: colors.success,
    fontWeight: '700',
  },
  successText: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  footer: {
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  verifyButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonLoading: {
    opacity: 0.8,
  },
  verifyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  loadingDots: {
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
  resendRow: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  resendIn: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  resend: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
