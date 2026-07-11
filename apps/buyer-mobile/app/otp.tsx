import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors as lightColors, spacing, radii, fontSz, springs } from '@chinooz/theme'
import { verifyOtp, requestOtp, __IS_DEV__ } from '@chinooz/mock-data'
import { useSessionStore } from '@chinooz/state'
import { useReducedMotion, Button, SlideUp } from '@chinooz/ui'
import { AuthShell } from '../components/AuthShell'
import { useAppTheme } from '../components/ThemeProvider'
import Icon from '../components/Icon'

const OTP_LENGTH = 6
const RESEND_SECONDS = 30

export default function OtpScreen() {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { t } = useTranslation()
  const router = useRouter()
  const { phone } = useLocalSearchParams<{ phone: string }>()
  const reduced = useReducedMotion()
  const login = useSessionStore(s => s.login)
  const updateProfile = useSessionStore(s => s.updateProfile)

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resendIn, setResendIn] = useState(RESEND_SECONDS)
  const [showVerifyButton, setShowVerifyButton] = useState(false)
  const [autoSubmitFailed, setAutoSubmitFailed] = useState(false)
  const inputRefs = useRef<(TextInput | null)[]>([])

  const shakeX = useSharedValue(0)

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
  }, [shakeX])

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
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
          login(result.userId || 'user-1', '')
          updateProfile({ phone: phone || '' })
          setTimeout(() => router.replace('/create-profile'), 800)
        } else {
          setError(result.error || t('otp.invalidCode'))
          setAutoSubmitFailed(true)
          setShowVerifyButton(true)
          triggerShake()
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
        }
      } catch {
        setError(t('otp.invalidCode'))
        setAutoSubmitFailed(true)
        setShowVerifyButton(true)
        triggerShake()
      } finally {
        setLoading(false)
      }
    },
    [phone, login, updateProfile, router, t, loading, triggerShake],
  )

  const handleChange = useCallback(
    (text: string, index: number) => {
      const digit = text.replace(/\D/g, '').slice(-1)
      const next = [...digits]
      next[index] = digit
      setDigits(next)
      setError('')

      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus()
      }

      const code = next.join('')
      if (code.length === OTP_LENGTH && next.every(d => d.length === 1) && !autoSubmitFailed) {
        handleVerify(code)
      }
    },
    [digits, autoSubmitFailed, handleVerify],
  )

  const handleKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    } catch (err) {
      console.error('resend otp failed', err)
    }
  }, [resendIn, phone])

  const handleChangeNumber = useCallback(() => router.back(), [router])

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }))
  const allFilled = digits.every(d => d.length === 1)

  return (
    <AuthShell step={1}>
      <View style={styles.col}>
        <View style={styles.body}>
          {__DEV__ && __IS_DEV__ && (
            <View style={styles.devBanner}>
              <Text style={styles.devBannerText}>{t('otp.devBanner')}</Text>
            </View>
          )}

          <SlideUp delay={reduced ? 0 : 100} distance={reduced ? 0 : 16}>
            <Text style={styles.title}>{t('otp.title')}</Text>
            <Text style={styles.subtitle}>
              {t('otp.subtitle')} <Text style={styles.phoneText}>+977 {phone}</Text>
            </Text>
            <TouchableOpacity onPress={handleChangeNumber} hitSlop={8}>
              <Text style={styles.changeNumber}>{t('otp.changeNumber')}</Text>
            </TouchableOpacity>
          </SlideUp>

          <SlideUp delay={reduced ? 0 : 200} distance={reduced ? 0 : 12}>
            <Animated.View style={[styles.otpRow, shakeStyle]}>
              {digits.map((digit, i) => (
                <OtpCell
                  key={i}
                  value={digit}
                  isError={!!error}
                  editable={!success}
                  reduced={reduced}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus={i === 0}
                  inputRef={ref => {
                    inputRefs.current[i] = ref
                  }}
                  onChangeText={text => handleChange(text, i)}
                  onKeyPress={e => handleKeyPress(e, i)}
                  accessibilityLabel={t('a11y.otpDigit', { number: i + 1 })}
                />
              ))}
            </Animated.View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? (
              <View style={styles.successRow}>
                <View style={styles.successCheck}>
                  <Icon name="checkmark" size={12} color={colors.white} />
                </View>
                <Text style={styles.successText}>{t('otp.successTitle')}</Text>
              </View>
            ) : null}
          </SlideUp>
        </View>

        <View style={styles.footer}>
          <SlideUp delay={reduced ? 0 : 300} distance={reduced ? 0 : 10}>
            {(showVerifyButton || (allFilled && !autoSubmitFailed)) && !success ? (
              <Button
                variant="primary"
                size="lg"
                shape="pill"
                fullWidth
                haptic="medium"
                loading={loading}
                disabled={loading}
                onPress={() => handleVerify(digits.join(''))}
                accessibilityLabel={t('otp.verify')}
              >
                {t('otp.verify')}
              </Button>
            ) : null}

            <View style={styles.resendRow}>
              {resendIn > 0 ? (
                <Text style={styles.resendIn}>{t('otp.resendIn', { seconds: resendIn })}</Text>
              ) : (
                <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                  <Text style={styles.resend}>{t('otp.resend')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </SlideUp>
        </View>
      </View>
    </AuthShell>
  )
}

interface OtpCellProps {
  value: string
  isError: boolean
  editable: boolean
  reduced: boolean
  autoFocus: boolean
  inputRef: (ref: TextInput | null) => void
  onChangeText: (text: string) => void
  onKeyPress: (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void
  accessibilityLabel: string
}

function OtpCell({
  value,
  isError,
  editable,
  reduced,
  autoFocus,
  inputRef,
  onChangeText,
  onKeyPress,
  accessibilityLabel,
}: OtpCellProps) {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const scale = useSharedValue(1)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (value && !reduced) {
      scale.value = withSequence(withSpring(1.06, springs.bounce), withSpring(1, springs.press))
    }
  }, [value, reduced, scale])

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Animated.View
      style={[
        styles.cell,
        value ? styles.cellFilled : null,
        focused ? styles.cellFocused : null,
        isError ? styles.cellError : null,
        style,
      ]}
    >
      <TextInput
        ref={inputRef}
        style={styles.cellInput}
        value={value}
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={1}
        textAlign="center"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        selectTextOnFocus
        editable={editable}
        accessibilityLabel={accessibilityLabel}
      />
    </Animated.View>
  )
}

const makeStyles = (c: typeof lightColors) =>
  StyleSheet.create({
    col: { flex: 1 },
    body: { flex: 1, gap: spacing[6], paddingTop: spacing[2] },
    devBanner: {
      backgroundColor: c.warningLight,
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[4],
      borderRadius: radii.md,
      alignSelf: 'flex-start',
    },
    devBannerText: {
      fontFamily: 'Inter',
      fontSize: fontSz('sm')[0],
      fontWeight: '600',
      color: c.warningText,
    },
    title: {
      fontFamily: 'Fraunces',
      fontSize: fontSz('3xl')[0],
      lineHeight: fontSz('3xl')[1],
      color: c.text,
      letterSpacing: -0.4,
      marginBottom: spacing[2],
    },
    subtitle: {
      fontFamily: 'Inter',
      fontSize: fontSz('base')[0],
      color: c.textMuted,
      lineHeight: 22,
    },
    phoneText: { fontFamily: 'Inter', fontWeight: '700', color: c.text },
    changeNumber: {
      fontFamily: 'Inter',
      fontSize: fontSz('base')[0],
      color: c.primary,
      fontWeight: '600',
      marginTop: spacing[2],
    },
    otpRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing[4],
    },
    cell: {
      width: 49,
      height: 58,
      borderRadius: radii.md,
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellFilled: { borderColor: c.primary },
    cellFocused: {
      borderColor: c.primary,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 2,
    },
    cellError: { borderColor: c.error },
    cellInput: {
      width: '100%',
      height: '100%',
      fontFamily: 'Inter',
      fontSize: fontSz('2xl')[0],
      fontWeight: '700',
      color: c.primary,
      textAlign: 'center',
      paddingVertical: 0,
    },
    error: {
      fontFamily: 'Inter',
      fontSize: fontSz('base')[0],
      color: c.error,
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
      width: 24,
      height: 24,
      borderRadius: radii.full,
      backgroundColor: c.success,
      alignItems: 'center',
      justifyContent: 'center',
    },
    successCheckMark: { color: c.white, fontSize: fontSz('sm')[0], fontWeight: '700' },
    successText: {
      fontFamily: 'Inter',
      fontSize: fontSz('md')[0],
      color: c.success,
      fontWeight: '600',
    },
    footer: { gap: spacing[3] },
    cta: {
      backgroundColor: c.primary,
      height: 56,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 14,
      elevation: 8,
    },
    ctaLoading: { opacity: 0.8 },
    ctaText: {
      fontFamily: 'Inter',
      fontSize: fontSz('md')[0],
      fontWeight: '700',
      color: c.white,
      letterSpacing: 0.2,
    },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    loadingDot: {
      width: 8,
      height: 8,
      borderRadius: radii.sm,
      backgroundColor: 'rgba(255,255,255,0.6)',
    },
    resendRow: { alignItems: 'center', paddingVertical: spacing[2] },
    resendIn: { fontFamily: 'Inter', fontSize: fontSz('base')[0], color: c.textTertiary },
    resend: {
      fontFamily: 'Inter',
      fontSize: fontSz('base')[0],
      color: c.primary,
      fontWeight: '600',
    },
  })
