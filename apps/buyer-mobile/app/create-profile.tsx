import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { createProfileSchema } from '@chinooz/validation'
import { useSessionStore } from '@chinooz/state'
import { useUIStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { SlideUp } from '@chinooz/ui/Animate'
import { getInitials } from '@chinooz/utils'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

export default function CreateProfileScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()

  const profile = useSessionStore(s => s.profile)
  const updateProfile = useSessionStore(s => s.updateProfile)
  const markProfileComplete = useSessionStore(s => s.markProfileComplete)
  const setLocale = useUIStore(s => s.setLocale)
  const isReturning = useSessionStore(s => s.isLoggedIn) && !useSessionStore(s => s.profileComplete)

  const [name, setName] = useState(profile.name || '')
  const [email, setEmail] = useState(profile.email || '')
  const [language, setLanguage] = useState<'en' | 'ne'>(profile.language || 'en')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const avatarScale = useSharedValue(1)
  const nameInputRef = useRef<TextInput>(null)

  const validate = useCallback(() => {
    const result = createProfileSchema.safeParse({ name, email, language })
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      result.error.issues.forEach(issue => {
        const field = issue.path[0] as string
        newErrors[field] = issue.message
      })
      setErrors(newErrors)
      return false
    }
    setErrors({})
    return true
  }, [name, email, language])

  useEffect(() => {
    validate()
  }, [name, email, language])

  const isValid = name.trim().length >= 2

  const handleSave = useCallback(async () => {
    if (!validate()) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error) } catch {}
      return
    }

    Keyboard.dismiss()
    setLoading(true)

    try {
      await new Promise(r => setTimeout(r, 400))
      updateProfile({ name: name.trim(), email: email.trim(), language })
      markProfileComplete()
      setLocale(language)
      if (i18n.isInitialized) i18n.changeLanguage(language)

      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
      router.replace('/(tabs)')
    } catch {
    } finally {
      setLoading(false)
    }
  }, [name, email, language, validate, updateProfile, markProfileComplete, setLocale, router])

  const handleSkip = useCallback(() => {
    if (name.trim().length >= 2) {
      updateProfile({ name: name.trim(), language })
      markProfileComplete()
      setLocale(language)
      if (i18n.isInitialized) i18n.changeLanguage(language)
    }
    router.replace('/(tabs)')
  }, [name, language, updateProfile, markProfileComplete, setLocale, router])

  const initials = getInitials(name || '?')

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + spacing[4] }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {isReturning && (
            <SlideUp delay={reduced ? 0 : 50} distance={reduced ? 0 : 12}>
              <View style={styles.promptBanner}>
                <Text style={styles.promptText}>{t('createProfile.finishPrompt')}</Text>
              </View>
            </SlideUp>
          )}

          <SlideUp delay={reduced ? 0 : 100} distance={reduced ? 0 : 16}>
            <Text style={styles.title}>{t('createProfile.title')}</Text>
            <Text style={styles.subtitle}>{t('createProfile.subtitle')}</Text>
          </SlideUp>

          <SlideUp delay={reduced ? 0 : 200} distance={reduced ? 0 : 12}>
            <AnimatedTouchable
              onPressIn={() => { avatarScale.value = withSpring(0.95, { damping: 15, stiffness: 400 }) }}
              onPressOut={() => { avatarScale.value = withSpring(1, { damping: 15, stiffness: 300 }) }}
              activeOpacity={0.8}
              style={[styles.avatarButton, useAnimatedStyle(() => ({ transform: [{ scale: avatarScale.value }] }))]}
            >
              <View style={[styles.avatar, name.trim() ? styles.avatarActive : null]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
              <Text style={styles.avatarLabel}>
                {t('createProfile.addPhoto')}
              </Text>
            </AnimatedTouchable>
          </SlideUp>

          <SlideUp delay={reduced ? 0 : 250} distance={reduced ? 0 : 10}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('createProfile.fullName')} *</Text>
              <TextInput
                ref={nameInputRef}
                style={[styles.input, errors.name ? styles.inputError : null]}
                value={name}
                onChangeText={setName}
                placeholder={t('createProfile.fullNamePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                maxLength={100}
                returnKeyType="next"
                accessibilityLabel={t('createProfile.fullName')}
                autoFocus
              />
              {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('createProfile.email')}</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                value={email}
                onChangeText={setEmail}
                placeholder={t('createProfile.emailPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
                accessibilityLabel={t('createProfile.email')}
              />
              {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('createProfile.language')}</Text>
              <View style={styles.languageRow}>
                {(['en', 'ne'] as const).map(lang => (
                  <TouchableOpacity
                    key={lang}
                    onPress={() => setLanguage(lang)}
                    style={[styles.langButton, language === lang ? styles.langButtonActive : null]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.langText, language === lang ? styles.langTextActive : null]}>
                      {lang === 'en' ? 'English' : 'नेपाली'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </SlideUp>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
          <SlideUp delay={reduced ? 0 : 350} distance={reduced ? 0 : 10}>
            <AnimatedTouchable
              onPress={handleSave}
              disabled={!isValid || loading}
              activeOpacity={0.85}
              style={[styles.saveButton, { opacity: isValid && !loading ? 1 : 0.5 }]}
            >
              {loading ? (
                <View style={styles.loadingDots}>
                  <View style={styles.loadingDot} />
                  <View style={[styles.loadingDot, { marginLeft: 6 }]} />
                  <View style={[styles.loadingDot, { marginLeft: 6 }]} />
                </View>
              ) : (
                <Text style={styles.saveText}>{t('createProfile.save')}</Text>
              )}
            </AnimatedTouchable>

            <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.7}>
              <Text style={styles.skipText}>{t('createProfile.skip')}</Text>
            </TouchableOpacity>
          </SlideUp>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    gap: spacing[5],
  },
  promptBanner: {
    backgroundColor: colors.primary50,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radii.lg,
    marginBottom: spacing[2],
  },
  promptText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
  avatarButton: {
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarActive: {
    borderColor: colors.primary,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },
  avatarLabel: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  fieldGroup: {
    gap: spacing[1.5],
    marginTop: spacing[3],
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  input: {
    height: 52,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    fontSize: 15,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing[0.5],
  },
  languageRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  langButton: {
    flex: 1,
    height: 48,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  langText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  langTextActive: {
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    gap: spacing[3],
  },
  saveButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
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
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  skipText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
})
