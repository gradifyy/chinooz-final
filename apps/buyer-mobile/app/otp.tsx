import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
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
import { colors, spacing, radii } from '@chinooz/theme'
import { otpSchema } from '@chinooz/validation'
import { verifyOtp } from '@chinooz/mock-data'
import { useSessionStore } from '@chinooz/state'
import { SlideUp } from '@chinooz/ui/Animate'

const OTP_LENGTH = 6

export default function OtpScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { phone } = useLocalSearchParams<{ phone: string }>()
  const insets = useSafeAreaInsets()
  const login = useSessionStore(s => s.login)

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(60)
  const inputRefs = useRef<(TextInput | null)[]>([])

  const shakeX = useSharedValue(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setInterval(() => setResendIn(s => s - 1), 1000)
    return () => clearInterval(timer)
  }, [resendIn])

  const handleChange = useCallback((text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setError('')

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    if (next.every(d => d.length === 1)) {
      const code = next.join('')
      handleSubmit(code)
    }
  }, [digits])

  const handleKeyPress = useCallback((e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }, [digits])

  const handleSubmit = useCallback(async (code: string) => {
    const validation = otpSchema.safeParse({ otp: code })
    if (!validation.success) {
      setError(t('otp.invalidCode'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await verifyOtp(phone || '', code)
      if (result.success) {
        login(result.userId || 'user-1', 'Ayush Chaudhary')
        router.replace('/(tabs)')
      } else {
        setError(t('otp.invalidCode'))
        setDigits(Array(OTP_LENGTH).fill(''))
        inputRefs.current[0]?.focus()
        shakeX.value = withSequence(
          withTiming(-8, { duration: 50 }),
          withTiming(8, { duration: 50 }),
          withTiming(-4, { duration: 50 }),
          withTiming(4, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        )
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        } catch {}
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [phone, login, router, t])

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }))

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View
        style={[styles.container, { paddingTop: insets.top }, containerStyle]}
      >
        <View style={styles.content}>
          <SlideUp delay={100}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>← {t('common.back')}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t('otp.title')}</Text>
            <Text style={styles.subtitle}>
              {t('otp.subtitle')} +977 {phone}
            </Text>
          </SlideUp>

          <SlideUp delay={200}>
            <View style={styles.otpRow}>
              {digits.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={ref => { inputRefs.current[i] = ref }}
                  style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                  value={digit}
                  onChangeText={text => handleChange(text, i)}
                  onKeyPress={e => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  autoFocus={i === 0}
                  accessibilityLabel={`Digit ${i + 1}`}
                />
              ))}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </SlideUp>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
          {resendIn > 0 ? (
            <Text style={styles.resendIn}>{t('otp.resendIn', { seconds: resendIn })}</Text>
          ) : (
            <TouchableOpacity onPress={() => setResendIn(60)}>
              <Text style={styles.resend}>{t('otp.resend')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: spacing[6], paddingTop: spacing[6], gap: spacing[6] },
  backButton: { marginBottom: spacing[4] },
  backText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, letterSpacing: -0.3, marginBottom: spacing[2] },
  subtitle: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  otpRow: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[4], justifyContent: 'center' },
  otpInput: {
    width: 48, height: 56, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, fontSize: 22, fontWeight: '700', color: colors.text,
  },
  otpInputFilled: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  error: { fontSize: 13, color: colors.error, textAlign: 'center', marginTop: spacing[2] },
  footer: { paddingHorizontal: spacing[6], alignItems: 'center' },
  resendIn: { fontSize: 14, color: colors.textTertiary },
  resend: { fontSize: 14, color: colors.primary, fontWeight: '600' },
})
