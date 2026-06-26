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
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { verifyOtp, requestOtp, __IS_DEV__ } from '@chinooz/mock-data'
import { useSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { SlideUp } from '@chinooz/ui/Animate'

const OTP_LENGTH = 6
const RESEND_SECONDS = 30

export default function OtpScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { phone } = useLocalSearchParams<{ phone: string }>()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const login = useSessionStore(s => s.login)

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resendIn, setResendIn] = useState(RESEND_SECONDS)
  const [showVerifyButton, setShowVerifyButton] = useState(false)
  const [autoSubmitFailed, setAutoSubmitFailed] = useState(false)
  const inputRefs = useRef<(TextInput | null)[]>([])

  const shakeX = useSharedValue(0)
  const boxScales = useRef(Array.from({ length: OTP_LENGTH }, () => useSharedValue(1))).current

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setInterval(() => setResendIn(s => s - 1), 1000)
    return () => clearInterval(timer)
  }, [resendIn])

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    )
  }, [])

  const handleVerify = useCallback(async (code: string, isAutoSubmit: boolean) => {
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
        login(result.userId || 'user-1', 'Ayush Chaudhary')
        setTimeout(() => router.replace('/(tabs)'), 800)
      } else {
        setError(result.error || t('otp.invalidCode'))
        setAutoSubmitFailed(true)
        setShowVerifyButton(true)
        triggerShake()
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        } catch {}
      }
    } catch {
      setError(t('otp.invalidCode'))
      setAutoSubmitFailed(true)
      setShowVerifyButton(true)
      triggerShake()
    } finally {
      setLoading(false)
    }
  }, [phone, login, router, t, loading, triggerShake])

  const handleChange = useCallback((text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setError('')

    if (digit) {
      boxScales[index].value = withSequence(
        withSpring(1.05, { damping: 12, stiffness: 400 }),
        withSpring(1, { damping: 15, stiffness: 300 }),
      )

      if (index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus()
      }
    }

    const code = next.join('')
    if (code.length === OTP_LENGTH && next.every(d => d.length === 1)) {
      if (!autoSubmitFailed) {
        handleVerify(code, true)
      }
    }
  }, [digits, autoSubmitFailed, handleVerify])

  const handleKeyPress = useCallback((e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
      setAutoSubmitFailed(false)
      setShowVerifyButton(false)
    }
  }, [digits])

  const handlePaste = useCallback((e: any) => {
    const pasted = (e?.nativeEvent?.text || '').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (pasted.length === OTP_LENGTH) {
      const next = pasted.split('')
      setDigits(next)
      setError('')
      Keyboard.dismiss()
      if (!autoSubmitFailed) {
        handleVerify(pasted, true)
      }
    }
  }, [autoSubmitFailed, handleVerify])

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
    } catch {}
  }, [resendIn, phone])

  const handleChangeNumber = useCallback(() => {
    router.back()
  }, [router])

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }))

  const allFilled = digits.every(d => d.length === 1)

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View
        style={[styles.container, { paddingTop: insets.top }, containerStyle]}
      >
        {__IS_DEV__ && (
          <View style={styles.devBanner}>
            <Text style={styles.devBannerText}>{t('otp.devBanner')}</Text>
          </View>
        )}

        <View style={styles.content}>
          <SlideUp delay={reduced ? 0 : 100} distance={reduced ? 0 : 16}>
            <TouchableOpacity onPress={handleChangeNumber} style={styles.changeNumber}>
              <Text style={styles.changeNumberText}>← {t('otp.changeNumber')}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t('otp.title')}</Text>
            <TouchableOpacity onPress={handleChangeNumber}>
              <Text style={styles.subtitle}>
                {t('otp.subtitle')}{' '}
                <Text style={styles.phoneText}>+977 {phone}</Text>
              </Text>
            </TouchableOpacity>
          </SlideUp>

          <SlideUp delay={reduced ? 0 : 200} distance={reduced ? 0 : 12}>
            <View style={styles.otpRow}>
              {digits.map((digit, i) => {
                const boxStyle = useAnimatedStyle(() => ({
                  transform: [{ scale: boxScales[i].value }],
                }))
                return (
                  <Animated.View key={i} style={[styles.otpBox, boxStyle]}>
                    <TextInput
                      ref={ref => { inputRefs.current[i] = ref }}
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
                      accessibilityLabel={`OTP digit ${i + 1}`}
                    />
                    <View style={[
                      styles.otpUnderline,
                      digit ? styles.otpUnderlineFilled : null,
                      error ? styles.otpUnderlineError : null,
                    ]} />
                  </Animated.View>
                )
              })}
            </View>

            {error ? (
              <Animated.View>
                <Text style={styles.error}>{error}</Text>
              </Animated.View>
            ) : null}

            {success ? (
              <View style={styles.successRow}>
                <Text style={styles.successCheck}>✓</Text>
                <Text style={styles.successText}>{t('otp.successTitle')}</Text>
              </View>
            ) : null}
          </SlideUp>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
          <SlideUp delay={reduced ? 0 : 300} distance={reduced ? 0 : 10}>
            {(showVerifyButton || (allFilled && !autoSubmitFailed)) && !success ? (
              <TouchableOpacity
                onPress={() => handleVerify(digits.join(''), false)}
                disabled={loading}
                style={[styles.verifyButton, loading && styles.verifyButtonLoading]}
                activeOpacity={0.85}
              >
                {loading ? (
                  <View style={styles.loadingDots}>
                    <View style={styles.loadingDot} />
                    <View style={[styles.loadingDot, { marginLeft: 6 }]} />
                    <View style={[styles.loadingDot, { marginLeft: 6 }]} />
                  </View>
                ) : (
                  <Text style={styles.verifyText}>{t('otp.verify')}</Text>
                )}
              </TouchableOpacity>
            ) : null}

            <View style={styles.resendRow}>
              {resendIn > 0 ? (
                <Text style={styles.resendIn}>
                  {t('otp.resendIn', { seconds: resendIn })}
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                  <Text style={styles.resend}>{t('otp.resend')}</Text>
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
  changeNumberText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing[2],
  },
  subtitle: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  phoneText: { fontWeight: '600', color: colors.text },
  otpRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing[5],
    justifyContent: 'center',
  },
  otpBox: {
    alignItems: 'center',
  },
  otpInput: {
    width: 48,
    height: 52,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    textAlign: 'center',
  },
  otpInputFilled: {
    color: colors.primary,
  },
  otpInputError: {
    color: colors.error,
  },
  otpUnderline: {
    width: 48,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  otpUnderlineFilled: {
    backgroundColor: colors.primary,
  },
  otpUnderlineError: {
    backgroundColor: colors.error,
  },
  error: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing[3],
    fontWeight: '500',
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
  },
  footer: {
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  verifyButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonLoading: {
    opacity: 0.8,
  },
  verifyText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
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
    fontSize: 14,
    color: colors.textTertiary,
  },
  resend: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
})
