import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Location from 'expo-location'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { addressFormSchema } from '@chinooz/validation'
import { useSessionStore, useUIStore, useAddressStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { SlideUp } from '@chinooz/ui/Animate'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

const KATHMANDU_AREAS = [
  'Baneshwor', 'Thamel', 'New Road', 'Patan', 'Bhaktapur', 'Koteshwor',
  'Tokha', 'Budhanilkantha', 'Balaju', 'Maharajgunj', 'Lazimpat', 'Durbar Marg',
  'Putalisadak', 'Maitidevi', 'Sinamangal', 'Chabahil', 'Swayambhu', 'Kalanki',
  'Thankot', 'Chandragiri', 'Godawari', 'Lubhu', 'Sankhu', 'Jorpati',
]

export default function LocationScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams<{ from?: string }>()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()

  const profile = useSessionStore(s => s.profile)
  const addAddress = useAddressStore(s => s.addAddress)
  const setLocationCoords = useAddressStore(s => s.setLocationCoords)
  const setAddressReminderPending = useUIStore(s => s.setAddressReminderPending)
  const addToast = useUIStore(s => s.addToast)

  const [mode, setMode] = useState<'permission' | 'manual' | 'granting'>('permission')
  const [grantError, setGrantError] = useState('')
  const [name, setName] = useState(profile.name || '')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [area, setArea] = useState('')
  const [city] = useState('Kathmandu')
  const [label, setLabel] = useState<'home' | 'work' | 'other'>('home')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const floatY = useSharedValue(0)

  useEffect(() => {
    if (reduced || mode === 'manual') return
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    )
    return () => { floatY.value = 0 }
  }, [reduced, mode])

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))

  const handleAllowLocation = useCallback(async () => {
    setMode('granting')
    setGrantError('')

    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setMode('manual')
        setGrantError(t('location.denied'))
        addToast({ message: t('location.denied'), variant: 'warning' })
        return
      }

      const timeoutPromise = new Promise<null>(r => setTimeout(() => r(null), 5000))
      const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })

      const result = await Promise.race([locationPromise, timeoutPromise])

      if (result && 'coords' in result) {
        setLocationCoords({ lat: result.coords.latitude, lng: result.coords.longitude })
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
        if (params.from === 'profile') {
          router.back()
        } else {
          router.replace('/(tabs)')
        }
      } else {
        setMode('manual')
        setGrantError(t('location.denied'))
        addToast({ message: t('location.denied'), variant: 'warning' })
      }
    } catch {
      setMode('manual')
      setGrantError(t('location.denied'))
      addToast({ message: t('location.denied'), variant: 'warning' })
    }
  }, [t, params.from, router, setLocationCoords, addToast])

  const handleEnterManually = useCallback(() => {
    setMode('manual')
  }, [])

  const handleSkip = useCallback(() => {
    setAddressReminderPending(true)
    if (params.from === 'profile') {
      router.back()
    } else {
      router.replace('/(tabs)')
    }
  }, [params.from, router, setAddressReminderPending])

  const validate = useCallback(() => {
    const result = addressFormSchema.safeParse({ fullName: name, phone, street, area, city, label })
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      result.error.issues.forEach(issue => {
        newErrors[issue.path[0] as string] = issue.message
      })
      setErrors(newErrors)
      return false
    }
    setErrors({})
    return true
  }, [name, phone, street, area, city, label])

  const isValid = name.trim().length >= 2 && phone.length === 10 && street.length >= 3 && area.length >= 2

  const handleSave = useCallback(async () => {
    if (!validate()) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error) } catch {}
      return
    }

    Keyboard.dismiss()
    setSaving(true)

    try {
      await new Promise(r => setTimeout(r, 400))
      addAddress({ fullName: name.trim(), phone, street: street.trim(), area, city, label })
      setAddressReminderPending(false)
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
      addToast({ message: t('location.saved'), variant: 'success' })

      if (params.from === 'profile') {
        router.back()
      } else {
        router.replace('/(tabs)')
      }
    } catch {} finally {
      setSaving(false)
    }
  }, [name, phone, street, area, city, label, validate, addAddress, setAddressReminderPending, addToast, t, params.from, router])

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + spacing[4] }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {mode === 'permission' || mode === 'granting' ? (
          <View style={styles.permissionContent}>
            <SlideUp delay={reduced ? 0 : 100} distance={reduced ? 0 : 16}>
              <Animated.View style={[styles.illustrationWrap, floatStyle]}>
                <View style={styles.illustration}>
                  <View style={styles.illustrationInner}>
                    <View style={styles.locationDot} />
                  </View>
                </View>
              </Animated.View>
            </SlideUp>

            <SlideUp delay={reduced ? 0 : 200} distance={reduced ? 0 : 12}>
              <Text style={styles.title}>{t('location.title')}</Text>
              <Text style={styles.subtitle}>{t('location.subtitle')}</Text>
            </SlideUp>

            <SlideUp delay={reduced ? 0 : 300} distance={reduced ? 0 : 10}>
              {grantError ? <Text style={styles.grantError}>{grantError}</Text> : null}

              <AnimatedTouchable
                onPress={handleAllowLocation}
                disabled={mode === 'granting'}
                activeOpacity={0.85}
                style={styles.allowButton}
              >
                {mode === 'granting' ? (
                  <View style={styles.loadingDots}>
                    <View style={styles.loadingDot} />
                    <View style={[styles.loadingDot, { marginLeft: 6 }]} />
                    <View style={[styles.loadingDot, { marginLeft: 6 }]} />
                  </View>
                ) : (
                  <Text style={styles.allowText}>{t('location.allow')}</Text>
                )}
              </AnimatedTouchable>

              <TouchableOpacity onPress={handleEnterManually} style={styles.manualButton} activeOpacity={0.7}>
                <Text style={styles.manualText}>{t('location.enterManually')}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.7}>
                <Text style={styles.skipText}>{t('location.skip')}</Text>
              </TouchableOpacity>
            </SlideUp>
          </View>
        ) : (
          <View style={styles.formContent}>
            <SlideUp delay={reduced ? 0 : 100} distance={reduced ? 0 : 12}>
              <Text style={styles.title}>{t('location.manualTitle')}</Text>
            </SlideUp>

            <SlideUp delay={reduced ? 0 : 150} distance={reduced ? 0 : 10}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{t('location.fullName')} *</Text>
                <TextInput
                  style={[styles.input, errors.fullName && styles.inputError]}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('location.fullName')}
                  placeholderTextColor={colors.textTertiary}
                  maxLength={100}
                  returnKeyType="next"
                />
                {errors.fullName ? <Text style={styles.error}>{errors.fullName}</Text> : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{t('location.phone')} *</Text>
                <TextInput
                  style={[styles.input, errors.phone && styles.inputError]}
                  value={phone}
                  onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98XXXXXXXX"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                  maxLength={10}
                  returnKeyType="next"
                />
                {errors.phone ? <Text style={styles.error}>{errors.phone}</Text> : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{t('location.street')} *</Text>
                <TextInput
                  style={[styles.input, errors.street && styles.inputError]}
                  value={street}
                  onChangeText={setStreet}
                  placeholder={t('location.street')}
                  placeholderTextColor={colors.textTertiary}
                  maxLength={200}
                  returnKeyType="next"
                />
                {errors.street ? <Text style={styles.error}>{errors.street}</Text> : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{t('location.area')} *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.areaChips}>
                  {KATHMANDU_AREAS.map(a => (
                    <TouchableOpacity
                      key={a}
                      onPress={() => setArea(a)}
                      style={[styles.areaChip, area === a && styles.areaChipActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.areaChipText, area === a && styles.areaChipTextActive]}>{a}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.area ? <Text style={styles.error}>{errors.area}</Text> : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{t('location.city')}</Text>
                <TextInput
                  style={[styles.input, styles.inputLocked]}
                  value={city}
                  editable={false}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{t('location.label')}</Text>
                <View style={styles.labelRow}>
                  {(['home', 'work', 'other'] as const).map(l => (
                    <TouchableOpacity
                      key={l}
                      onPress={() => setLabel(l)}
                      style={[styles.labelChip, label === l && styles.labelChipActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.labelChipText, label === l && styles.labelChipTextActive]}>
                        {t(`location.${l}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </SlideUp>

            <SlideUp delay={reduced ? 0 : 250} distance={reduced ? 0 : 10}>
              <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={!isValid || saving}
                  style={[styles.saveButton, { opacity: isValid && !saving ? 1 : 0.5 }]}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <View style={styles.loadingDots}>
                      <View style={styles.loadingDot} />
                      <View style={[styles.loadingDot, { marginLeft: 6 }]} />
                      <View style={[styles.loadingDot, { marginLeft: 6 }]} />
                    </View>
                  ) : (
                    <Text style={styles.saveText}>{t('location.save')}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.7}>
                  <Text style={styles.skipText}>{t('location.skip')}</Text>
                </TouchableOpacity>
              </View>
            </SlideUp>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  permissionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingTop: spacing[10],
    gap: spacing[5],
  },
  illustrationWrap: {
    marginBottom: spacing[4],
  },
  illustration: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(138, 27, 87, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  grantError: {
    fontSize: 13,
    color: colors.warning,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  allowButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  allowText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  manualButton: {
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  manualText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  skipButton: {
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  formContent: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    gap: spacing[4],
  },
  fieldGroup: {
    gap: spacing[1.5],
    marginTop: spacing[2],
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
  inputLocked: {
    backgroundColor: colors.background,
    color: colors.textMuted,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing[0.5],
  },
  areaChips: {
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  areaChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 36,
    justifyContent: 'center',
  },
  areaChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  areaChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  areaChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  labelChip: {
    flex: 1,
    height: 44,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  labelChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  labelChipTextActive: {
    color: colors.primary,
  },
  footer: {
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
})
