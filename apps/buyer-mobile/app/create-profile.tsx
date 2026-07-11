import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Keyboard,
  Image,
} from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { colors as lightColors, spacing, radii, fontSz, springs } from '@chinooz/theme'
import { createProfileSchema } from '@chinooz/validation'
import { useSessionStore, useUIStore } from '@chinooz/state'
import { useReducedMotion, Button, SlideUp, PressScale } from '@chinooz/ui'
import { getInitials } from '@chinooz/utils'
import { AuthShell } from '../components/AuthShell'
import { useAppTheme } from '../components/ThemeProvider'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)
const LANGUAGES: ('en' | 'ne')[] = ['en', 'ne']

export default function CreateProfileScreen() {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()

  const profile = useSessionStore(s => s.profile)
  const updateProfile = useSessionStore(s => s.updateProfile)
  const markProfileComplete = useSessionStore(s => s.markProfileComplete)
  const setLocale = useUIStore(s => s.setLocale)
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const profileComplete = useSessionStore(s => s.profileComplete)
  const isReturning = isLoggedIn && !profileComplete

  const [name, setName] = useState(profile.name || '')
  const [email, setEmail] = useState(profile.email || '')
  const [language, setLanguage] = useState<'en' | 'ne'>(profile.language || 'en')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [avatarUri, setAvatarUri] = useState<string | null>(profile.avatarUri ?? null)

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
  }, [validate])

  const isValid = name.trim().length >= 2

  // Apply the language choice immediately so the selector visibly "works".
  const handleLanguage = useCallback(
    (lang: 'en' | 'ne') => {
      setLanguage(lang)
      setLocale(lang)
      if (i18n.isInitialized) i18n.changeLanguage(lang)
      Haptics.selectionAsync().catch(() => {})
    },
    [setLocale, i18n],
  )

  const handlePickAvatar = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) return
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })
      if (!result.canceled && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri)
        updateProfile({ avatarUri: result.assets[0].uri })
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      }
    } catch (err) {
      console.error('pick avatar failed', err)
    }
  }, [updateProfile])

  const handleSave = useCallback(async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      router.replace('/(tabs)')
    } catch (err) {
      console.error('save profile failed', err)
    } finally {
      setLoading(false)
    }
  }, [name, email, language, validate, updateProfile, markProfileComplete, setLocale, router, i18n])

  const handleSkip = useCallback(() => {
    // Mirror web create-profile: if a usable name is present, persist it and
    // mark the profile complete; otherwise just proceed (the user can finish
    // later via the returning-user prompt). Web also drops a cookie here — that
    // is web-route-guard specific and has no mobile equivalent.
    if (name.trim().length >= 2) {
      updateProfile({ name: name.trim(), language })
      markProfileComplete()
      setLocale(language)
      if (i18n.isInitialized) i18n.changeLanguage(language)
    }
    router.replace('/(tabs)')
  }, [name, language, updateProfile, markProfileComplete, setLocale, router, i18n])

  const avatarStyle = useAnimatedStyle(() => ({ transform: [{ scale: avatarScale.value }] }))
  const initials = getInitials(name || '?')

  return (
    <AuthShell step={2}>
      <View style={styles.col}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
              onPress={handlePickAvatar}
              onPressIn={() => {
                avatarScale.value = withSpring(0.95, springs.press)
              }}
              onPressOut={() => {
                avatarScale.value = withSpring(1, springs.press)
              }}
              activeOpacity={0.85}
              style={[styles.avatarWrap, avatarStyle]}
            >
              <View style={[styles.avatar, name.trim() ? styles.avatarActive : null]}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </View>
              <View style={styles.cam}>
                <Text style={styles.camPlus}>+</Text>
              </View>
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
              <View style={styles.langRow}>
                {LANGUAGES.map(lang => (
                  <TouchableOpacity
                    key={lang}
                    onPress={() => handleLanguage(lang)}
                    style={[styles.langButton, language === lang ? styles.langButtonActive : null]}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: language === lang }}
                  >
                    <Text
                      style={[styles.langText, language === lang ? styles.langTextActive : null]}
                    >
                      {lang === 'en' ? 'English' : 'नेपाली'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </SlideUp>
        </ScrollView>

        <View style={styles.footer}>
          <SlideUp delay={reduced ? 0 : 350} distance={reduced ? 0 : 10}>
            <Button
              variant="primary"
              size="lg"
              shape="pill"
              fullWidth
              haptic="medium"
              disabled={!isValid || loading}
              loading={loading}
              onPress={handleSave}
              accessibilityLabel={t('createProfile.save')}
            >
              {t('createProfile.save')}
            </Button>

            <PressScale
              onPress={handleSkip}
              style={styles.skipBtn}
              haptic="selection"
              accessibilityRole="button"
              accessibilityLabel={t('createProfile.skip')}
            >
              <Text style={styles.skipText}>{t('createProfile.skip')}</Text>
            </PressScale>
          </SlideUp>
        </View>
      </View>
    </AuthShell>
  )
}

const makeStyles = (c: typeof lightColors) =>
  StyleSheet.create({
    col: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingTop: spacing[2], paddingBottom: spacing[4], gap: spacing[5] },
    promptBanner: {
      backgroundColor: c.primary50,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
      borderRadius: radii.lg,
    },
    promptText: {
      fontFamily: 'Inter',
      fontSize: fontSz('base')[0],
      color: c.primary,
      fontWeight: '600',
      textAlign: 'center',
    },
    title: {
      fontFamily: 'Fraunces',
      fontSize: fontSz('3xl')[0],
      lineHeight: fontSz('3xl')[1],
      color: c.text,
      letterSpacing: -0.4,
      marginBottom: spacing[1],
    },
    subtitle: {
      fontFamily: 'Inter',
      fontSize: fontSz('base')[0],
      color: c.textMuted,
      lineHeight: 22,
    },
    avatarWrap: {
      alignSelf: 'center',
      width: 100,
      height: 100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: radii.full,
      backgroundColor: c.primary50,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: 'transparent',
      overflow: 'hidden',
    },
    avatarActive: { borderColor: c.primary },
    avatarImage: { width: '100%', height: '100%' },
    avatarInitials: {
      fontFamily: 'Fraunces',
      fontSize: fontSz('4xl')[0],
      color: c.primary,
    },
    cam: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 32,
      height: 32,
      borderRadius: radii.full,
      backgroundColor: c.gold,
      borderWidth: 3,
      borderColor: c.cream,
      alignItems: 'center',
      justifyContent: 'center',
    },
    camPlus: {
      color: c.white,
      fontSize: fontSz('lg')[0],
      fontWeight: '700',
      marginTop: -2,
    },
    fieldGroup: { gap: spacing[1.5] },
    label: {
      fontFamily: 'Inter',
      fontSize: fontSz('sm')[0],
      fontWeight: '600',
      color: c.primary,
    },
    input: {
      height: 54,
      backgroundColor: c.surface,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: c.border,
      paddingHorizontal: spacing[4],
      fontFamily: 'Inter',
      fontSize: fontSz('md')[0],
      color: c.text,
    },
    inputError: { borderColor: c.error },
    error: {
      fontFamily: 'Inter',
      fontSize: fontSz('sm')[0],
      color: c.error,
      marginTop: spacing[0.5],
    },
    langRow: { flexDirection: 'row', gap: spacing[2] },
    langButton: {
      flex: 1,
      height: 50,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    langButtonActive: { borderColor: c.primary, backgroundColor: c.primary50 },
    langText: {
      fontFamily: 'Inter',
      fontSize: fontSz('base')[0],
      fontWeight: '600',
      color: c.textMuted,
    },
    langTextActive: { color: c.primary },
    footer: { paddingTop: spacing[3] },
    skipBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing[2.5],
      marginTop: spacing[2],
    },
    skipText: {
      fontFamily: 'Inter',
      fontSize: fontSz('base')[0],
      fontWeight: '500',
      color: c.textMuted,
    },
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
  })
