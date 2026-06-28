import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
  Image,
  Alert,
  Pressable,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { ChevronLeft, Camera, Search, Check, X } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { riderOnboardingPersonalSchema } from '@chinooz/validation'
import { useOnboardingStore, type PersonalDraft, type OnboardingStep } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { analytics } from '@chinooz/analytics'
import ProgressStepper from './ProgressStepper'

/** Kathmandu Valley areas used by the city/zone searchable select. */
const VALLEY_AREAS = [
  'Thamel',
  'New Baneshwor',
  'Lalitpur (Patan)',
  'Koteshwor',
  'Bhaktapur',
  'Boudha',
  'Chabahil',
  'Maharajgunj',
  'Kalanki',
  'Kirtipur',
  'Bhaisepati',
  'Sanepa',
  'Balaju',
  'Gongabu',
  'Swayambhu',
]

const GENDER_OPTIONS = [
  { key: 'male', labelKey: 'rider.onboarding.personal.genderMale' },
  { key: 'female', labelKey: 'rider.onboarding.personal.genderFemale' },
  { key: 'other', labelKey: 'rider.onboarding.personal.genderOther' },
  { key: 'prefer_not_to_say', labelKey: 'rider.onboarding.personal.genderPreferNotToSay' },
] as const

type GenderKey = '' | 'male' | 'female' | 'other' | 'prefer_not_to_say'

const STEP_LABEL_KEYS: Record<OnboardingStep, string> = {
  personal: 'rider.onboarding.stepPersonal',
  vehicle: 'rider.onboarding.stepVehicle',
  documents: 'rider.onboarding.stepDocuments',
  review: 'rider.onboarding.stepReview',
}

export default function PersonalStepScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const draft = useOnboardingStore(s => s.draft.personal)
  const setPersonal = useOnboardingStore(s => s.setPersonal)
  const setCurrentStep = useOnboardingStore(s => s.setCurrentStep)

  const [form, setForm] = useState<PersonalDraft>(draft)
  const [initial, setInitial] = useState<PersonalDraft>(draft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [genderOpen, setGenderOpen] = useState(false)
  const [zoneOpen, setZoneOpen] = useState(false)
  const [zoneQuery, setZoneQuery] = useState('')
  const [dirtyOpen, setDirtyOpen] = useState(false)
  const pendingExit = useRef<(() => void) | null>(null)

  useEffect(() => {
    analytics.screen({ name: 'rider-onboarding-personal' })
  }, [])

  const stepLabels = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(STEP_LABEL_KEYS) as OnboardingStep[]).map(k => [
          k,
          t(STEP_LABEL_KEYS[k]),
        ]),
      ) as Record<OnboardingStep, string>,
    [t],
  )

  const isDirty = useMemo(() => {
    return (Object.keys(form) as (keyof PersonalDraft)[]).some(
      k => form[k] !== initial[k],
    )
  }, [form, initial])

  const setField = useCallback(
    <K extends keyof PersonalDraft>(key: K, value: PersonalDraft[K]) => {
      setForm(prev => ({ ...prev, [key]: value }))
      setErrors(prev => {
        if (!prev[key as string]) return prev
        const next = { ...prev }
        delete next[key as string]
        return next
      })
      setSaved(false)
    },
    [],
  )

  const validate = useCallback((): boolean => {
    const result = riderOnboardingPersonalSchema.safeParse(form)
    if (result.success) {
      setErrors({})
      return true
    }
    const e: Record<string, string> = {}
    const map: Record<string, string> = {
      name: t('rider.onboarding.personal.validationName'),
      dateOfBirth: t('rider.onboarding.personal.validationDob'),
      city: t('rider.onboarding.personal.validationCity'),
      zone: t('rider.onboarding.personal.validationZone'),
      emergencyName: t('rider.onboarding.personal.validationEmergencyName'),
      emergencyPhone: t('rider.onboarding.personal.validationEmergencyPhone'),
      emergencyRelation: t('rider.onboarding.personal.validationEmergencyRelation'),
    }
    result.error.issues.forEach(issue => {
      const key = String(issue.path[0])
      if (!e[key]) e[key] = map[key] ?? issue.message
    })
    setErrors(e)
    try {
      AccessibilityInfo.announceForAccessibility(Object.values(e).join('. '))
    } catch {}
    return false
  }, [form, t])

  // ----- Photo (mock capture/upload via action sheet) --------------------
  const handlePhotoPress = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    Alert.alert(
      t('rider.onboarding.personal.photoChange'),
      t('rider.onboarding.personal.photoHelper'),
      [
        { text: t('rider.onboarding.personal.photoCapture'), onPress: () => setField('photoUri', 'mock://camera') },
        { text: t('rider.onboarding.personal.photoUpload'), onPress: () => setField('photoUri', 'mock://gallery') },
        ...(form.photoUri
          ? [{ text: t('rider.onboarding.personal.photoRemove'), onPress: () => setField('photoUri', '') }]
          : []),
        { text: t('common.cancel'), style: 'cancel' as const },
      ],
    )
  }, [t, form.photoUri, setField])

  // ----- Dirty guard -----------------------------------------------------
  const guardedExit = useCallback(
    (exitFn: () => void) => {
      if (!isDirty) {
        exitFn()
        return
      }
      pendingExit.current = exitFn
      setDirtyOpen(true)
    },
    [isDirty],
  )

  const handleBack = useCallback(() => {
    guardedExit(() => router.back())
  }, [guardedExit, router])

  // ----- Next → Vehicle --------------------------------------------------
  const handleNext = useCallback(async () => {
    if (!validate()) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } catch {}
      return
    }
    setSaving(true)
    setPersonal(form)
    try {
      await new Promise(r => setTimeout(r, 350))
      setInitial(form)
      setSaved(true)
      setCurrentStep('vehicle')
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      analytics.track({ name: 'rider_onboarding_personal_next' })
      setTimeout(() => router.push('/onboarding/vehicle'), 400)
    } finally {
      setSaving(false)
    }
  }, [validate, form, setPersonal, setCurrentStep, router])

  const filteredAreas = useMemo(() => {
    const q = zoneQuery.trim().toLowerCase()
    if (!q) return VALLEY_AREAS
    return VALLEY_AREAS.filter(a => a.toLowerCase().includes(q))
  }, [zoneQuery])

  const nextBtnScale = useSharedValue(1)
  const onPressInNext = useCallback(() => {
    if (reduced) return
    nextBtnScale.value = withSpring(0.97, { damping: 18, stiffness: 400 })
  }, [reduced])
  const onPressOutNext = useCallback(() => {
    if (reduced) return
    nextBtnScale.value = withSpring(1, { damping: 18, stiffness: 400 })
  }, [reduced])
  const nextBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nextBtnScale.value }],
  }))

  return (
    <View style={styles.screen}>
      {/* Header with back + stepper */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('rider.onboarding.personal.backAria')}
          >
            <ChevronLeft size={22} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t('rider.onboarding.personal.title')}
          </Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
        <ProgressStepper currentStep="personal" labels={stepLabels} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing[10] },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            {t('rider.onboarding.personal.subtitle')}
          </Text>

          {/* Photo */}
          <View style={styles.photoSection} accessibilityRole="summary">
            <TouchableOpacity
              onPress={handlePhotoPress}
              style={styles.photoRing}
              accessibilityRole="button"
              accessibilityLabel={t('rider.onboarding.personal.photoAria')}
            >
              {form.photoUri ? (
                <Image source={{ uri: form.photoUri }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoFallback]}>
                  <Text style={styles.photoInitials}>
                    {t('rider.onboarding.personal.photoInitials')}
                  </Text>
                </View>
              )}
              <View style={styles.photoBadge}>
                <Camera size={13} color={colors.white} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoLabel}>{t('rider.onboarding.personal.photoLabel')}</Text>
            <Text style={styles.photoHelper}>{t('rider.onboarding.personal.photoHelper')}</Text>
          </View>

          {/* Identity section */}
          <SectionLabel text={t('rider.onboarding.personal.sectionIdentity')} />
          <Field
            label={t('rider.onboarding.personal.nameLabel')}
            required
            helper={t('rider.onboarding.personal.nameHelper')}
            error={errors.name}
          >
            <Input
              value={form.name}
              onChangeText={v => setField('name', v)}
              placeholder={t('rider.onboarding.personal.namePlaceholder')}
              ariaLabel={t('rider.onboarding.personal.nameLabel')}
              error={!!errors.name}
            />
          </Field>
          <Field
            label={t('rider.onboarding.personal.dobLabel')}
            required
            helper={t('rider.onboarding.personal.dobHelper')}
            error={errors.dateOfBirth}
          >
            <Input
              value={form.dateOfBirth}
              onChangeText={v => setField('dateOfBirth', v.replace(/[^\d-]/g, '').slice(0, 10))}
              placeholder={t('rider.onboarding.personal.dobPlaceholder')}
              keyboardType="default"
              ariaLabel={t('rider.onboarding.personal.dobLabel')}
              error={!!errors.dateOfBirth}
            />
          </Field>
          <Field
            label={t('rider.onboarding.personal.genderLabel')}
            helper=""
            error={undefined}
          >
            <SelectTrigger
              label={
                form.gender
                  ? t(`rider.onboarding.personal.gender${cap(form.gender)}`)
                  : t('rider.onboarding.personal.genderPlaceholder')
              }
              placeholder={!form.gender}
              onPress={() => setGenderOpen(true)}
              ariaLabel={t('rider.onboarding.personal.genderLabel')}
            />
          </Field>

          {/* Location section */}
          <SectionLabel text={t('rider.onboarding.personal.sectionContact')} />
          <Field
            label={t('rider.onboarding.personal.cityLabel')}
            required
            helper={t('rider.onboarding.personal.cityHelper')}
            error={errors.city}
          >
            <SelectTrigger
              label={form.city || t('rider.onboarding.personal.cityPlaceholder')}
              placeholder={!form.city}
              onPress={() => setZoneOpen(true)}
              ariaLabel={t('rider.onboarding.personal.cityLabel')}
            />
          </Field>
          <Field
            label={t('rider.onboarding.personal.zoneLabel')}
            required
            helper={t('rider.onboarding.personal.zoneHelper')}
            error={errors.zone}
          >
            <SelectTrigger
              label={form.zone || t('rider.onboarding.personal.zonePlaceholder')}
              placeholder={!form.zone}
              onPress={() => setZoneOpen(true)}
              ariaLabel={t('rider.onboarding.personal.zoneLabel')}
            />
          </Field>

          {/* Emergency contact section (grouped) */}
          <SectionLabel text={t('rider.onboarding.personal.sectionEmergency')} />
          <Text style={styles.sectionHelper}>
            {t('rider.onboarding.personal.emergencyHelper')}
          </Text>
          <View style={styles.emergencyGroup} accessibilityRole="summary">
            <Field
              label={t('rider.onboarding.personal.emergencyNameLabel')}
              required
              error={errors.emergencyName}
            >
              <Input
                value={form.emergencyName}
                onChangeText={v => setField('emergencyName', v)}
                placeholder={t('rider.onboarding.personal.emergencyNamePlaceholder')}
                ariaLabel={t('rider.onboarding.personal.emergencyNameLabel')}
                error={!!errors.emergencyName}
              />
            </Field>
            <Field
              label={t('rider.onboarding.personal.emergencyPhoneLabel')}
              required
              helper={t('rider.onboarding.personal.emergencyPhoneHelper')}
              error={errors.emergencyPhone}
            >
              <Input
                value={form.emergencyPhone}
                onChangeText={v => setField('emergencyPhone', v.replace(/\D/g, '').slice(0, 10))}
                placeholder={t('rider.onboarding.personal.emergencyPhonePlaceholder')}
                keyboardType="number-pad"
                ariaLabel={t('rider.onboarding.personal.emergencyPhoneLabel')}
                error={!!errors.emergencyPhone}
              />
            </Field>
            <Field
              label={t('rider.onboarding.personal.emergencyRelationLabel')}
              required
              error={errors.emergencyRelation}
            >
              <Input
                value={form.emergencyRelation}
                onChangeText={v => setField('emergencyRelation', v)}
                placeholder={t('rider.onboarding.personal.emergencyRelationPlaceholder')}
                ariaLabel={t('rider.onboarding.personal.emergencyRelationLabel')}
                error={!!errors.emergencyRelation}
              />
            </Field>
          </View>

          {saved && (
            <View style={styles.savedRow} accessibilityRole="alert">
              <Check size={15} color={colors.success} strokeWidth={2.5} />
              <Text style={styles.savedText}>{t('rider.onboarding.personal.saved')}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
        <Animated.View style={nextBtnStyle}>
          <Pressable
            onPress={handleNext}
            onPressIn={onPressInNext}
            onPressOut={onPressOutNext}
            disabled={saving}
            style={({ pressed }) => [styles.nextBtn, saving && styles.nextBtnDisabled, pressed && styles.nextBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('rider.onboarding.personal.nextAria')}
            accessibilityState={{ disabled: saving }}
          >
            {saving ? (
              <Text style={styles.nextBtnText}>{t('rider.onboarding.personal.saving')}</Text>
            ) : (
              <Text style={styles.nextBtnText}>{t('rider.onboarding.personal.next')}</Text>
            )}
          </Pressable>
        </Animated.View>
      </View>

      {/* Gender modal */}
      <Modal visible={genderOpen} transparent animationType="fade" onRequestClose={() => setGenderOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setGenderOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('rider.onboarding.personal.genderLabel')}</Text>
            {GENDER_OPTIONS.map(opt => {
              const selected = form.gender === opt.key
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => {
                    setField('gender', opt.key as GenderKey)
                    setGenderOpen(false)
                  }}
                  style={[styles.optionRow, selected && styles.optionRowSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {t(opt.labelKey)}
                  </Text>
                  {selected && <Check size={16} color={colors.primary} strokeWidth={2.5} />}
                </TouchableOpacity>
              )
            })}
          </View>
        </Pressable>
      </Modal>

      {/* City / zone searchable select modal */}
      <Modal visible={zoneOpen} transparent animationType="slide" onRequestClose={() => setZoneOpen(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.zoneSheet}>
            <View style={styles.zoneHeader}>
              <Text style={styles.modalTitle}>{t('rider.onboarding.personal.zoneLabel')}</Text>
              <TouchableOpacity
                onPress={() => setZoneOpen(false)}
                style={styles.zoneCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <X size={20} color={colors.textMuted} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <View style={styles.zoneSearchRow}>
              <Search size={16} color={colors.textTertiary} strokeWidth={2} />
              <TextInput
                style={styles.zoneSearchInput}
                value={zoneQuery}
                onChangeText={setZoneQuery}
                placeholder={t('rider.onboarding.personal.zonePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                autoFocus
                accessibilityLabel={t('rider.onboarding.personal.zonePlaceholder')}
              />
            </View>
            <ScrollView style={styles.zoneList} keyboardShouldPersistTaps="handled">
              {filteredAreas.length === 0 ? (
                <Text style={styles.zoneEmpty}>{t('common.noResults')}</Text>
              ) : (
                filteredAreas.map(area => {
                  const selected = form.city === area || form.zone === area
                  return (
                    <TouchableOpacity
                      key={area}
                      onPress={() => {
                        setField('city', area)
                        setField('zone', area)
                        setZoneOpen(false)
                        setZoneQuery('')
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        } catch {}
                      }}
                      style={[styles.optionRow, selected && styles.optionRowSelected]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={area}
                    >
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                        {area}
                      </Text>
                      {selected && <Check size={16} color={colors.primary} strokeWidth={2.5} />}
                    </TouchableOpacity>
                  )
                })
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Dirty-guard dialog */}
      <Modal visible={dirtyOpen} transparent animationType="fade" onRequestClose={() => setDirtyOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDirtyOpen(false)}>
          <View style={styles.dirtySheet}>
            <Text style={styles.dirtyTitle}>{t('rider.onboarding.personal.dirtyTitle')}</Text>
            <Text style={styles.dirtyBody}>{t('rider.onboarding.personal.dirtyBody')}</Text>
            <View style={styles.dirtyActions}>
              <TouchableOpacity
                onPress={() => setDirtyOpen(false)}
                style={styles.dirtyStayBtn}
                accessibilityRole="button"
                accessibilityLabel={t('rider.onboarding.personal.dirtyStay')}
              >
                <Text style={styles.dirtyStayText}>{t('rider.onboarding.personal.dirtyStay')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setDirtyOpen(false)
                  pendingExit.current?.()
                  pendingExit.current = null
                }}
                style={styles.dirtyLeaveBtn}
                accessibilityRole="button"
                accessibilityLabel={t('rider.onboarding.personal.dirtyLeave')}
              >
                <Text style={styles.dirtyLeaveText}>{t('rider.onboarding.personal.dirtyLeave')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ----- Sub-components ----------------------------------------------------

function SectionLabel({ text }: { text: string }) {
  return (
    <View style={styles.sectionLabelWrap}>
      <Text style={styles.sectionLabel} accessibilityRole="header">
        {text}
      </Text>
    </View>
  )
}

interface FieldProps {
  label: string
  required?: boolean
  helper?: string
  error?: string
  children: React.ReactNode
}

function Field({ label, required, helper, error, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? ' *' : ''}
      </Text>
      {children}
      {error ? (
        <Text style={styles.fieldError} accessibilityRole="alert">
          {error}
        </Text>
      ) : helper ? (
        <Text style={styles.fieldHelper}>{helper}</Text>
      ) : null}
    </View>
  )
}

interface InputProps {
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'email-address' | 'number-pad'
  ariaLabel: string
  error?: boolean
}

const Input = React.forwardRef<TextInput, InputProps>(function Input(
  { value, onChangeText, placeholder, keyboardType = 'default', ariaLabel, error },
) {
  return (
    <TextInput
      style={[styles.input, error && styles.inputError]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      keyboardType={keyboardType}
      autoCapitalize="words"
      accessibilityLabel={ariaLabel}
    />
  )
})

function SelectTrigger({
  label,
  placeholder,
  onPress,
  ariaLabel,
}: {
  label: string
  placeholder: boolean
  onPress: () => void
  ariaLabel: string
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.selectTrigger, placeholder && styles.selectTriggerPlaceholder]}
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      accessibilityValue={{ text: label }}
    >
      <Text style={[styles.selectText, placeholder && styles.selectTextPlaceholder]} numberOfLines={1}>
        {label}
      </Text>
      <ChevronLeft size={16} color={colors.textTertiary} strokeWidth={2.5} style={{ transform: [{ rotate: '270deg' }] }} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  backBtnPlaceholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    gap: spacing[4],
  },
  subtitle: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 20,
  },
  photoSection: {
    alignItems: 'center',
    gap: spacing[1.5],
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
  },
  photoRing: {
    width: 96,
    height: 96,
    borderRadius: radii.md,
    position: 'relative',
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: radii.md,
  },
  photoFallback: {
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitials: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  photoBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  photoHelper: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textTertiary,
    textAlign: 'center',
  },
  sectionLabelWrap: {
    paddingTop: spacing[2],
  },
  sectionLabel: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansBold[0],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHelper: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: -spacing[2],
  },
  emergencyGroup: {
    gap: spacing[4],
  },
  field: {
    gap: spacing[2],
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  fieldHelper: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textTertiary,
  },
  fieldError: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.error,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    height: 52,
    fontSize: fontSize.md[0],
    color: colors.text,
    fontFamily: fontFamily.sans[0],
  },
  inputError: {
    borderColor: colors.error,
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    height: 52,
  },
  selectTriggerPlaceholder: {
    borderColor: colors.borderLight,
  },
  selectText: {
    flex: 1,
    fontSize: fontSize.md[0],
    color: colors.text,
    fontFamily: fontFamily.sans[0],
  },
  selectTextPlaceholder: {
    color: colors.textTertiary,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    justifyContent: 'center',
    paddingTop: spacing[2],
  },
  savedText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.success,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.7,
  },
  nextBtnPressed: {
    opacity: 0.88,
  },
  nextBtnText: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[5],
    gap: spacing[1],
  },
  modalTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    marginBottom: spacing[2],
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
  },
  optionRowSelected: {
    backgroundColor: colors.primary50,
  },
  optionText: {
    fontSize: fontSize.md[0],
    color: colors.text,
    fontFamily: fontFamily.sans[0],
  },
  optionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Zone sheet
  zoneSheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    marginTop: spacing[10],
    padding: spacing[5],
  },
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  zoneCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  zoneSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    height: 44,
    marginBottom: spacing[3],
  },
  zoneSearchInput: {
    flex: 1,
    fontSize: fontSize.md[0],
    color: colors.text,
    fontFamily: fontFamily.sans[0],
    paddingVertical: 0,
  },
  zoneList: {
    flex: 1,
  },
  zoneEmpty: {
    fontSize: fontSize.md[0],
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing[6],
  },
  // Dirty dialog
  dirtySheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[5],
    gap: spacing[2],
  },
  dirtyTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  dirtyBody: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    lineHeight: 20,
    fontFamily: fontFamily.sans[0],
    marginBottom: spacing[2],
  },
  dirtyActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  dirtyStayBtn: {
    flex: 1,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirtyStayText: {
    fontSize: fontSize.md[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  dirtyLeaveBtn: {
    flex: 1,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirtyLeaveText: {
    fontSize: fontSize.md[0],
    fontWeight: '600',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
