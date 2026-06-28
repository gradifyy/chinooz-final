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
import { ChevronLeft, Bike, Scooter, Wind, Check } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { riderOnboardingVehicleSchema } from '@chinooz/validation'
import { useOnboardingStore, type VehicleDraft, type OnboardingStep } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { analytics } from '@chinooz/analytics'
import ProgressStepper from './ProgressStepper'

type VehicleType = 'bicycle' | 'motorbike' | 'scooter' | ''

const VEHICLE_OPTIONS: {
  key: Exclude<VehicleType, ''>
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
  labelKey: string
  noteKey: string
}[] = [
  { key: 'bicycle', icon: Wind, labelKey: 'rider.onboarding.vehicle.typeBicycle', noteKey: 'rider.onboarding.vehicle.typeBicycleNote' },
  { key: 'motorbike', icon: Bike, labelKey: 'rider.onboarding.vehicle.typeMotorbike', noteKey: 'rider.onboarding.vehicle.typeMotorbikeNote' },
  { key: 'scooter', icon: Scooter, labelKey: 'rider.onboarding.vehicle.typeScooter', noteKey: 'rider.onboarding.vehicle.typeScooterNote' },
]

const STEP_LABEL_KEYS: Record<OnboardingStep, string> = {
  personal: 'rider.onboarding.stepPersonal',
  vehicle: 'rider.onboarding.stepVehicle',
  documents: 'rider.onboarding.stepDocuments',
  review: 'rider.onboarding.stepReview',
}

export default function VehicleStepScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const draft = useOnboardingStore(s => s.draft.vehicle)
  const setVehicle = useOnboardingStore(s => s.setVehicle)
  const setCurrentStep = useOnboardingStore(s => s.setCurrentStep)

  const [form, setForm] = useState<VehicleDraft>(draft)
  const [initial, setInitial] = useState<VehicleDraft>(draft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirtyOpen, setDirtyOpen] = useState(false)
  const pendingExit = useRef<(() => void) | null>(null)

  useEffect(() => {
    setCurrentStep('vehicle')
    analytics.screen({ name: 'rider-onboarding-vehicle' })
  }, [setCurrentStep])

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
    return (Object.keys(form) as (keyof VehicleDraft)[]).some(
      k => form[k] !== initial[k],
    )
  }, [form, initial])

  const isMotorized = form.type === 'motorbike' || form.type === 'scooter'

  const setField = useCallback(
    <K extends keyof VehicleDraft>(key: K, value: VehicleDraft[K]) => {
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

  const selectType = useCallback(
    (type: Exclude<VehicleType, ''>) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
      // Clear plate error when switching to bicycle (plate not required).
      setForm(prev => ({ ...prev, type }))
      setErrors(prev => {
        const next = { ...prev }
        if (type === 'bicycle') delete next.plate
        delete next.type
        return next
      })
      setSaved(false)
    },
    [],
  )

  const validate = useCallback((): boolean => {
    const result = riderOnboardingVehicleSchema.safeParse(form)
    if (result.success) {
      setErrors({})
      return true
    }
    const e: Record<string, string> = {}
    const map: Record<string, string> = {
      type: t('rider.onboarding.vehicle.validationType'),
      plate: t('rider.onboarding.vehicle.validationPlate'),
      color: t('rider.onboarding.vehicle.validationColor'),
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

  // ----- Next → Documents ------------------------------------------------
  const handleNext = useCallback(async () => {
    if (!validate()) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } catch {}
      return
    }
    setSaving(true)
    setVehicle(form)
    try {
      await new Promise(r => setTimeout(r, 350))
      setInitial(form)
      setSaved(true)
      setCurrentStep('documents')
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      analytics.track({ name: 'rider_onboarding_vehicle_next' })
      setTimeout(() => router.push('/onboarding/documents'), 400)
    } finally {
      setSaving(false)
    }
  }, [validate, form, setVehicle, setCurrentStep, router])

  // ----- Plate auto-uppercase -------------------------------------------
  const handlePlateChange = useCallback(
    (v: string) => {
      setField('plate', v.toUpperCase())
    },
    [setField],
  )

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

  const selectedOption = VEHICLE_OPTIONS.find(o => o.key === form.type)

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
            accessibilityLabel={t('rider.onboarding.vehicle.backAria')}
          >
            <ChevronLeft size={22} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t('rider.onboarding.vehicle.title')}
          </Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
        <ProgressStepper currentStep="vehicle" labels={stepLabels} />
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
            {t('rider.onboarding.vehicle.subtitle')}
          </Text>

          {/* Vehicle type cards */}
          <SectionLabel text={t('rider.onboarding.vehicle.typeLabel')} />
          <View style={styles.typeGroup} accessibilityRole="radiogroup" accessibilityLabel={t('rider.onboarding.vehicle.typeLabel')}>
            {VEHICLE_OPTIONS.map(opt => {
              const selected = form.type === opt.key
              const Icon = opt.icon
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => selectType(opt.key)}
                  style={[styles.typeCard, selected && styles.typeCardSelected]}
                  activeOpacity={0.85}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(opt.labelKey)}
                >
                  <View style={[styles.typeIconWrap, selected && styles.typeIconWrapSelected]}>
                    <Icon size={24} color={selected ? colors.primary : colors.textMuted} strokeWidth={2} />
                  </View>
                  <View style={styles.typeBody}>
                    <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>
                      {t(opt.labelKey)}
                    </Text>
                    <Text style={styles.typeNote}>
                      {t(opt.noteKey)}
                    </Text>
                  </View>
                  {selected ? (
                    <View style={styles.typeCheck}>
                      <Check size={16} color={colors.white} strokeWidth={3} />
                    </View>
                  ) : (
                    <View style={styles.typeRadio} />
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
          {errors.type ? (
            <Text style={styles.fieldError} accessibilityRole="alert">
              {errors.type}
            </Text>
          ) : null}

          {/* Requirements note */}
          {selectedOption ? (
            <View style={styles.reqCard} accessibilityRole="summary">
              <Text style={styles.reqTitle}>
                {t('rider.onboarding.vehicle.requirementsTitle')}
              </Text>
              <Text style={styles.reqText}>
                {form.type === 'bicycle'
                  ? t('rider.onboarding.vehicle.reqBicycle')
                  : t('rider.onboarding.vehicle.reqMotorized')}
              </Text>
            </View>
          ) : null}

          {/* Make / model (optional) */}
          <SectionLabel text={t('rider.onboarding.vehicle.makeModelLabel')} />
          <Field
            label={t('rider.onboarding.vehicle.makeModelLabel')}
            helper={t('rider.onboarding.vehicle.makeModelHelper')}
          >
            <Input
              value={form.makeModel}
              onChangeText={v => setField('makeModel', v)}
              placeholder={t('rider.onboarding.vehicle.makeModelPlaceholder')}
              ariaLabel={t('rider.onboarding.vehicle.makeModelLabel')}
            />
          </Field>

          {/* Plate (conditional) */}
          {isMotorized ? (
            <Field
              label={t('rider.onboarding.vehicle.plateLabel')}
              required
              helper={t('rider.onboarding.vehicle.plateHelper')}
              error={errors.plate}
            >
              <Input
                value={form.plate}
                onChangeText={handlePlateChange}
                placeholder={t('rider.onboarding.vehicle.platePlaceholder')}
                ariaLabel={t('rider.onboarding.vehicle.plateLabel')}
                error={!!errors.plate}
              />
            </Field>
          ) : form.type === 'bicycle' ? (
            <View style={styles.plateOptionalRow}>
              <Text style={styles.plateOptionalText}>
                {t('rider.onboarding.vehicle.plateOptional')}
              </Text>
            </View>
          ) : null}

          {/* Color */}
          <Field
            label={t('rider.onboarding.vehicle.colorLabel')}
            required
            helper={t('rider.onboarding.vehicle.colorHelper')}
            error={errors.color}
          >
            <Input
              value={form.color}
              onChangeText={v => setField('color', v)}
              placeholder={t('rider.onboarding.vehicle.colorPlaceholder')}
              ariaLabel={t('rider.onboarding.vehicle.colorLabel')}
              error={!!errors.color}
            />
          </Field>

          {saved ? (
            <View style={styles.savedRow}>
              <Check size={16} color={colors.success} strokeWidth={2.5} />
              <Text style={styles.savedText}>{t('rider.onboarding.vehicle.saved')}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer with Back + Next */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
        <View style={styles.footerBtns}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backNavBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('rider.onboarding.vehicle.backAria')}
          >
            <Text style={styles.backNavText}>{t('rider.onboarding.vehicle.back')}</Text>
          </TouchableOpacity>
          <Animated.View style={[styles.nextBtnWrap, nextBtnStyle]}>
            <TouchableOpacity
              onPressIn={onPressInNext}
              onPressOut={onPressOutNext}
              onPress={handleNext}
              style={[styles.nextBtn, saving && styles.nextBtnDisabled]}
              activeOpacity={0.85}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={t('rider.onboarding.vehicle.nextAria')}
            >
              <Text style={styles.nextBtnText}>
                {saving ? t('rider.onboarding.vehicle.saving') : t('rider.onboarding.vehicle.next')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* Dirty guard dialog */}
      <Modal visible={dirtyOpen} transparent animationType="fade" onRequestClose={() => setDirtyOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDirtyOpen(false)}>
          <Pressable style={styles.dirtySheet} onPress={e => e.stopPropagation()}>
            <Text style={styles.dirtyTitle}>
              {t('rider.onboarding.vehicle.dirtyTitle')}
            </Text>
            <Text style={styles.dirtyBody}>
              {t('rider.onboarding.vehicle.dirtyBody')}
            </Text>
            <View style={styles.dirtyActions}>
              <TouchableOpacity
                onPress={() => {
                  setDirtyOpen(false)
                  pendingExit.current = null
                }}
                style={styles.dirtyStayBtn}
                accessibilityRole="button"
                accessibilityLabel={t('rider.onboarding.vehicle.dirtyStay')}
              >
                <Text style={styles.dirtyStayText}>{t('rider.onboarding.vehicle.dirtyStay')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setDirtyOpen(false)
                  pendingExit.current?.()
                  pendingExit.current = null
                }}
                style={styles.dirtyLeaveBtn}
                accessibilityRole="button"
                accessibilityLabel={t('rider.onboarding.vehicle.dirtyLeave')}
              >
                <Text style={styles.dirtyLeaveText}>{t('rider.onboarding.vehicle.dirtyLeave')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
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
  // Vehicle type cards
  typeGroup: {
    gap: spacing[3],
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  typeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  typeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconWrapSelected: {
    backgroundColor: colors.surface,
  },
  typeBody: {
    flex: 1,
    gap: spacing[1],
  },
  typeLabel: {
    fontSize: fontSize.md[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  typeLabelSelected: {
    color: colors.primary,
  },
  typeNote: {
    fontSize: fontSize.xs[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 16,
  },
  typeCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  // Requirements card
  reqCard: {
    backgroundColor: colors.primary50,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[1],
  },
  reqTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansBold[0],
  },
  reqText: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 18,
  },
  // Plate optional note (bicycle)
  plateOptionalRow: {
    paddingVertical: spacing[1],
  },
  plateOptionalText: {
    fontSize: fontSize.sm[0],
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
    fontStyle: 'italic',
  },
  // Form fields
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
  // Saved indicator
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
  // Footer
  footer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerBtns: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  backNavBtn: {
    flex: 1,
    height: 54,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backNavText: {
    fontSize: fontSize.lg[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  nextBtnWrap: {
    flex: 1.5,
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
