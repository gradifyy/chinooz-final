import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  AccessibilityInfo,
  Image,
  Alert,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { ChevronLeft, Lock, Camera, Check } from 'lucide-react-native'
import {
  colors,
  spacing,
  radii,
  fontFamily,
  fontSize,
  duration,
  easing,
} from '@chinooz/theme'
import { riderPersonalSchema } from '@chinooz/validation'
import { analytics } from '@chinooz/analytics'
import { useA11y } from './A11yProvider'
import {
  getRiderPersonalProfile,
  updateRiderPersonalProfile,
  requestRiderPhoneOtp,
  verifyRiderPhoneOtp,
  RIDER_OTP_LENGTH,
  RIDER_OTP_RESEND_SECONDS,
  RIDER_OTP_DEV_CODE,
  type RiderPersonalProfile,
} from '@chinooz/mock-data'

interface FormState {
  name: string
  email: string
  phone: string
  city: string
  zone: string
  emergencyName: string
  emergencyPhone: string
  emergencyRelation: string
}

function toForm(p: RiderPersonalProfile): FormState {
  return {
    name: p.name,
    email: p.email,
    phone: p.phone,
    city: p.city,
    zone: p.zone,
    emergencyName: p.emergency.name,
    emergencyPhone: p.emergency.phone,
    emergencyRelation: p.emergency.relation,
  }
}

const PHONET_REGEX = /^\d{10}$/

export default function PersonalEditScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { reducedMotion } = useA11y()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<RiderPersonalProfile | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [initial, setInitial] = useState<FormState | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Phone-change OTP flow state.
  const [otpOpen, setOtpOpen] = useState(false)
  const [otpDigits, setOtpDigits] = useState<string[]>(
    Array(RIDER_OTP_LENGTH).fill(''),
  )
  const [otpError, setOtpError] = useState('')
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpResendIn, setOtpResendIn] = useState(0)
  const [otpSending, setOtpSending] = useState(false)
  const [otpSuccess, setOtpSuccess] = useState(false)
  const otpRefs = useRef<(TextInput | null)[]>([])
  const phoneEditRef = useRef<TextInput | null>(null)

  // Dirty-guard dialog.
  const [dirtyOpen, setDirtyOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const p = await getRiderPersonalProfile()
    const f = toForm(p)
    setProfile(p)
    setForm(f)
    setInitial(f)
    setLoading(false)
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      analytics.screen({ name: 'rider-personal-edit' })
      load()
    }, [load]),
  )

  // Resend countdown.
  useEffect(() => {
    if (otpResendIn <= 0) return
    const id = setInterval(() => setOtpResendIn(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [otpResendIn])

  const isDirty = useMemo(() => {
    if (!form || !initial) return false
    return (Object.keys(form) as (keyof FormState)[]).some(
      k => form[k] !== initial[k],
    )
  }, [form, initial])

  const phoneChanged = useMemo(
    () => !!form && !!initial && form.phone !== initial.phone,
    [form, initial],
  )

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm(prev => (prev ? { ...prev, [key]: value } : prev))
      // Clear field error on edit.
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
    if (!form) return false
    const result = riderPersonalSchema.safeParse(form)
    if (result.success) {
      setErrors({})
      return true
    }
    const e: Record<string, string> = {}
    const map: Record<string, string> = {
      name: t('rider.profile.personal.validationName'),
      email: t('rider.profile.personal.validationEmail'),
      phone: t('rider.profile.personal.validationPhone'),
      city: t('rider.profile.personal.validationCity'),
      zone: t('rider.profile.personal.validationZone'),
      emergencyName: t('rider.profile.personal.validationEmergencyName'),
      emergencyPhone: t('rider.profile.personal.validationEmergencyPhone'),
      emergencyRelation: t('rider.profile.personal.validationEmergencyRelation'),
    }
    result.error.issues.forEach(issue => {
      const key = String(issue.path[0])
      if (!e[key]) e[key] = map[key] ?? issue.message
    })
    setErrors(e)
    try {
      ;(AccessibilityInfo as any).announceForScreenReader?.(
        Object.values(e).join('. '),
      )
    } catch {}
    return false
  }, [form, t])

  const announce = useCallback((msg: string) => {
    try {
      ;(AccessibilityInfo as any).announceForScreenReader?.(msg)
    } catch {}
  }, [])

  // ----- Save flow -------------------------------------------------------
  const handleSave = useCallback(async () => {
    if (!form || !profile) return
    if (!validate()) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } catch {}
      return
    }

    // If phone changed, open the OTP gate instead of saving directly.
    if (phoneChanged) {
      setOtpOpen(true)
      setOtpDigits(Array(RIDER_OTP_LENGTH).fill(''))
      setOtpError('')
      setOtpSuccess(false)
      // Send the first code automatically.
      setOtpSending(true)
      try {
        await requestRiderPhoneOtp(form.phone)
        setOtpResendIn(RIDER_OTP_RESEND_SECONDS)
        announce(t('rider.profile.personal.otp.sentAnnounce'))
      } catch {}
      setOtpSending(false)
      return
    }

    setSaving(true)
    try {
      await updateRiderPersonalProfile({
        name: form.name,
        email: form.email,
        city: form.city,
        zone: form.zone,
        avatarUri: profile.avatarUri,
        emergency: {
          name: form.emergencyName,
          phone: form.emergencyPhone,
          relation: form.emergencyRelation,
        },
      })
      const next: RiderPersonalProfile = {
        ...profile,
        name: form.name,
        email: form.email,
        city: form.city,
        zone: form.zone,
        emergency: {
          name: form.emergencyName,
          phone: form.emergencyPhone,
          relation: form.emergencyRelation,
        },
      }
      setProfile(next)
      setInitial(toForm(next))
      setSaved(true)
      setSaving(false)
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      announce(t('rider.profile.personal.savedAria'))
    } catch {
      setSaving(false)
    }
  }, [form, profile, validate, phoneChanged, t, announce])

  // ----- OTP flow --------------------------------------------------------
  const handleOtpChange = useCallback(
    (text: string, index: number) => {
      const digit = text.replace(/\D/g, '').slice(-1)
      setOtpDigits(prev => {
        const next = [...prev]
        next[index] = digit
        return next
      })
      setOtpError('')
      if (digit && index < RIDER_OTP_LENGTH - 1) {
        otpRefs.current[index + 1]?.focus()
      }
    },
    [],
  )

  const handleOtpKeyPress = useCallback(
    (e: any, index: number) => {
      if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
        otpRefs.current[index - 1]?.focus()
      }
    },
    [otpDigits],
  )

  const handleVerifyOtp = useCallback(async () => {
    if (!form || otpVerifying) return
    const code = otpDigits.join('')
    if (code.length !== RIDER_OTP_LENGTH) {
      setOtpError(t('rider.profile.personal.otp.invalid'))
      return
    }
    Keyboard.dismiss()
    setOtpVerifying(true)
    setOtpError('')
    try {
      const res = await verifyRiderPhoneOtp(form.phone, code)
      if (res.success) {
        setOtpSuccess(true)
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } catch {}
        // Commit the save including the new phone.
        setSaving(true)
        await updateRiderPersonalProfile({
          name: form.name,
          email: form.email,
          phone: form.phone,
          city: form.city,
          zone: form.zone,
          avatarUri: profile?.avatarUri ?? null,
          emergency: {
            name: form.emergencyName,
            phone: form.emergencyPhone,
            relation: form.emergencyRelation,
          },
        })
        if (profile) {
          const next: RiderPersonalProfile = {
            ...profile,
            name: form.name,
            email: form.email,
            phone: form.phone,
            city: form.city,
            zone: form.zone,
            emergency: {
              name: form.emergencyName,
              phone: form.emergencyPhone,
              relation: form.emergencyRelation,
            },
          }
          setProfile(next)
          setInitial(toForm(next))
        }
        setSaving(false)
        setSaved(true)
        announce(t('rider.profile.personal.otp.success'))
        // Close OTP after a brief success beat.
        setTimeout(() => {
          setOtpOpen(false)
          setOtpSuccess(false)
        }, reducedMotion ? 0 : 700)
      } else {
        setOtpError(res.error || t('rider.profile.personal.otp.invalid'))
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        } catch {}
      }
    } catch {
      setOtpError(t('rider.profile.personal.otp.invalid'))
    } finally {
      setOtpVerifying(false)
    }
  }, [
    form,
    otpDigits,
    otpVerifying,
    profile,
    reducedMotion,
    t,
    announce,
  ])

  const handleResendOtp = useCallback(async () => {
    if (otpResendIn > 0 || !form) return
    setOtpSending(true)
    try {
      await requestRiderPhoneOtp(form.phone)
      setOtpResendIn(RIDER_OTP_RESEND_SECONDS)
      setOtpDigits(Array(RIDER_OTP_LENGTH).fill(''))
      setOtpError('')
      otpRefs.current[0]?.focus()
      announce(t('rider.profile.personal.otp.sentAnnounce'))
    } catch {}
    setOtpSending(false)
  }, [otpResendIn, form, announce, t])

  const closeOtp = useCallback(() => {
    setOtpOpen(false)
    setOtpDigits(Array(RIDER_OTP_LENGTH).fill(''))
    setOtpError('')
    setOtpSuccess(false)
  }, [])

  // ----- Back with dirty guard ------------------------------------------
  const handleBack = useCallback(() => {
    if (isDirty) {
      setDirtyOpen(true)
      return
    }
    router.back()
  }, [isDirty, router])

  const discardAndLeave = useCallback(() => {
    setDirtyOpen(false)
    router.back()
  }, [router])

  const pressScale = useSharedValue(1)
  const saveScale = useSharedValue(1)
  const photoScale = useSharedValue(reducedMotion ? 1 : 0.92)
  const photoOpacity = useSharedValue(reducedMotion ? 1 : 0)
  useEffect(() => {
    if (reducedMotion) {
      pressScale.value = 1
      saveScale.value = 1
      photoScale.value = 1
      photoOpacity.value = 1
      return
    }
    // Photo entrance: subtle scale-in + fade.
    photoScale.value = withSpring(1, { damping: 18, stiffness: 220, mass: 0.8 })
    photoOpacity.value = withTiming(1, { duration: duration.normal, easing: Easing.bezier(...easing.easeOut) })
  }, [reducedMotion])

  const saveBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }))
  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: photoScale.value }],
    opacity: photoOpacity.value,
  }))

  const onPressInSave = useCallback(() => {
    if (reducedMotion) return
    saveScale.value = withSpring(0.97, { damping: 20, stiffness: 400 })
  }, [reducedMotion])
  const onPressOutSave = useCallback(() => {
    if (reducedMotion) return
    saveScale.value = withSpring(1, { damping: 20, stiffness: 400 })
  }, [reducedMotion])

  // ----- Loading / empty -------------------------------------------------
  if (loading || !form || !profile) {
    return (
      <View style={styles.screen}>
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel={t('rider.profile.back')}
          >
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {t('rider.profile.personal.title')}
          </Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
        <View
          style={styles.loadingWrap}
          accessibilityRole="summary"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.loadingText}>
            {t('rider.profile.skeletonAria')}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('rider.profile.back')}
        >
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {t('rider.profile.personal.title')}
        </Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

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
          {t('rider.profile.personal.subtitle')}
        </Text>

        {/* Photo */}
        <View style={styles.photoWrap}>
          <Animated.View style={[styles.photoRing, photoStyle]}>
            {profile.avatarUri ? (
              <Image
                source={{ uri: profile.avatarUri }}
                style={styles.photo}
              />
            ) : (
              <View style={[styles.photo, styles.photoFallback]}>
                <Text style={styles.photoInitials}>
                  {profile.name
                    .split(' ')
                    .map(p => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
            )}
          </Animated.View>
          <Pressable
            onPress={() => Alert.alert(t('rider.profile.personal.changePhoto'), t('rider.profile.personal.photo'))}
            style={({ pressed }) => [
              styles.changePhotoBtn,
              pressed && styles.changePhotoPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('rider.profile.personal.photoAria')}
          >
            <Camera size={15} color={colors.primary} />
            <Text style={styles.changePhotoText}>
              {t('rider.profile.personal.changePhoto')}
            </Text>
          </Pressable>
        </View>

        {/* Identity section */}
        <SectionLabel text={t('rider.profile.personal.sectionIdentity')} />

        <Field
          label={t('rider.profile.personal.name')}
          required
          error={errors.name}
          helper={t('rider.profile.personal.nameHelper')}
        >
          <Input
            value={form.name}
            onChangeText={v => setField('name', v)}
            placeholder={t('rider.profile.personal.namePlaceholder')}
            ariaLabel={t('rider.profile.personal.name')}
            error={!!errors.name}
          />
        </Field>

        {/* Phone — locked visual + change triggers OTP */}
        <Field
          label={t('rider.profile.personal.phone')}
          helper={t('rider.profile.personal.phoneHelper')}
          locked
          lockedReason={t('rider.profile.personal.phoneLocked')}
          lockedAria={t('rider.profile.personal.lockedAria', {
            field: t('rider.profile.personal.phone'),
            reason: t('rider.profile.personal.phoneLocked'),
          })}
        >
          <View style={styles.lockedRow}>
            <Text style={styles.lockedValue}>+977 {form.phone}</Text>
            <Lock size={14} color={colors.textTertiary} />
          </View>
        </Field>
        <Pressable
          onPress={() => {
            phoneEditRef.current?.focus()
          }}
          style={({ pressed }) => [
            styles.changePhoneBtn,
            pressed && styles.changePhonePressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('rider.profile.personal.phoneChange')}
        >
          <Text style={styles.changePhotoText}>
            {t('rider.profile.personal.phoneChange')}
          </Text>
        </Pressable>

        {/* Editable phone (revealed for change). */}
        <Field
          label={t('rider.profile.personal.phone')}
          helper={t('rider.profile.personal.phoneHelper')}
          error={errors.phone}
        >
          <Input
            ref={phoneEditRef}
            value={form.phone}
            onChangeText={v => setField('phone', v.replace(/\D/g, '').slice(0, 10))}
            placeholder="98XXXXXXXX"
            keyboardType="number-pad"
            ariaLabel={t('rider.profile.personal.phone')}
            error={!!errors.phone}
          />
        </Field>

        <Field
          label={t('rider.profile.personal.email')}
          helper={t('rider.profile.personal.emailHelper')}
          error={errors.email}
        >
          <Input
            value={form.email}
            onChangeText={v => setField('email', v)}
            placeholder={t('rider.profile.personal.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            ariaLabel={t('rider.profile.personal.email')}
            error={!!errors.email}
          />
        </Field>

        {/* Contact section */}
        <SectionLabel text={t('rider.profile.personal.sectionContact')} />

        <Field
          label={t('rider.profile.personal.city')}
          helper={t('rider.profile.personal.cityHelper')}
          error={errors.city}
        >
          <Input
            value={form.city}
            onChangeText={v => setField('city', v)}
            placeholder={t('rider.profile.personal.cityPlaceholder')}
            ariaLabel={t('rider.profile.personal.city')}
            error={!!errors.city}
          />
        </Field>

        <Field
          label={t('rider.profile.personal.zone')}
          helper={t('rider.profile.personal.zoneHelper')}
          locked
          lockedReason={t('rider.profile.personal.zoneLocked')}
          lockedAria={t('rider.profile.personal.lockedAria', {
            field: t('rider.profile.personal.zone'),
            reason: t('rider.profile.personal.zoneLocked'),
          })}
          error={errors.zone}
        >
          <Input
            value={form.zone}
            onChangeText={v => setField('zone', v)}
            placeholder={t('rider.profile.personal.zonePlaceholder')}
            ariaLabel={t('rider.profile.personal.zone')}
            error={!!errors.zone}
            locked
          />
        </Field>

        {/* Emergency contact section */}
        <SectionLabel text={t('rider.profile.personal.sectionEmergency')} />
        <Text style={styles.sectionHelper}>
          {t('rider.profile.personal.emergencyHelper')}
        </Text>

        <Field
          label={t('rider.profile.personal.emergencyName')}
          error={errors.emergencyName}
        >
          <Input
            value={form.emergencyName}
            onChangeText={v => setField('emergencyName', v)}
            placeholder={t('rider.profile.personal.emergencyNamePlaceholder')}
            ariaLabel={t('rider.profile.personal.emergencyName')}
            error={!!errors.emergencyName}
          />
        </Field>

        <Field
          label={t('rider.profile.personal.emergencyPhone')}
          error={errors.emergencyPhone}
        >
          <Input
            value={form.emergencyPhone}
            onChangeText={v =>
              setField('emergencyPhone', v.replace(/\D/g, '').slice(0, 10))
            }
            placeholder={t('rider.profile.personal.emergencyPhonePlaceholder')}
            keyboardType="number-pad"
            ariaLabel={t('rider.profile.personal.emergencyPhone')}
            error={!!errors.emergencyPhone}
          />
        </Field>

        <Field
          label={t('rider.profile.personal.emergencyRelation')}
          error={errors.emergencyRelation}
        >
          <Input
            value={form.emergencyRelation}
            onChangeText={v => setField('emergencyRelation', v)}
            placeholder={t('rider.profile.personal.emergencyRelationPlaceholder')}
            ariaLabel={t('rider.profile.personal.emergencyRelation')}
            error={!!errors.emergencyRelation}
          />
        </Field>

        {/* Save */}
        <Animated.View style={saveBtnStyle}>
          <Pressable
            onPress={handleSave}
            onPressIn={onPressInSave}
            onPressOut={onPressOutSave}
            disabled={saving || !isDirty}
            style={({ pressed }) => [
              styles.saveBtn,
              (!isDirty || saving) && styles.saveBtnDisabled,
              pressed && styles.saveBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              saving
                ? t('rider.profile.personal.saving')
                : t('rider.profile.personal.saveAria')
            }
            accessibilityState={{ disabled: !isDirty || saving }}
          >
            {saving ? (
              <Text style={styles.saveBtnText}>
                {t('rider.profile.personal.saving')}
              </Text>
            ) : (
              <Text style={styles.saveBtnText}>
                {t('rider.profile.personal.save')}
              </Text>
            )}
          </Pressable>
        </Animated.View>

        {/* Success status */}
        {saved && (
          <View
            style={styles.successRow}
            accessibilityRole="summary"
            accessibilityLiveRegion="polite"
          >
            <Check size={16} color={colors.success} />
            <Text style={styles.successText}>
              {t('rider.profile.personal.saved')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Dirty-guard dialog */}
      <Modal
        visible={dirtyOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDirtyOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={styles.modalCard}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <Text style={styles.modalTitle}>
              {t('rider.profile.personal.dirtyTitle')}
            </Text>
            <Text style={styles.modalMsg}>
              {t('rider.profile.personal.dirtyMsg')}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setDirtyOpen(false)}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('rider.profile.personal.dirtyStay')}
              >
                <Text style={styles.cancelText}>
                  {t('rider.profile.personal.dirtyStay')}
                </Text>
              </Pressable>
              <Pressable
                onPress={discardAndLeave}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  pressed && styles.confirmPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('rider.profile.personal.dirtyDiscard')}
              >
                <Text style={styles.confirmText}>
                  {t('rider.profile.personal.dirtyDiscard')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* OTP verify modal */}
      <Modal
        visible={otpOpen}
        transparent
        animationType="slide"
        onRequestClose={closeOtp}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.otpOverlay}>
            <View style={styles.otpCard} accessibilityRole="alert" accessibilityLiveRegion="assertive">
              <Pressable
                onPress={closeOtp}
                style={styles.otpClose}
                accessibilityRole="button"
                accessibilityLabel={t('rider.profile.personal.phoneCancel')}
              >
                <Text style={styles.otpCloseText}>
                  {t('rider.profile.personal.phoneCancel')}
                </Text>
              </Pressable>

              <Text style={styles.otpTitle}>
                {t('rider.profile.personal.otp.title')}
              </Text>
              <Text style={styles.otpSubtitle}>
                {t('rider.profile.personal.otp.subtitle')} +977 {form.phone}
              </Text>

              {RIDER_OTP_DEV_CODE === '123456' && (
                <View style={styles.devBanner}>
                  <Text style={styles.devBannerText}>
                    {t('rider.profile.personal.otp.devBanner')}
                  </Text>
                </View>
              )}

              <View style={styles.otpRow}>
                {otpDigits.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={ref => {
                      otpRefs.current[i] = ref
                    }}
                    style={[
                      styles.otpInput,
                      d && styles.otpInputFilled,
                      otpError && styles.otpInputError,
                    ]}
                    value={d}
                    onChangeText={text => handleOtpChange(text, i)}
                    onKeyPress={e => handleOtpKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    autoFocus={i === 0}
                    selectTextOnFocus
                    editable={!otpSuccess && !otpVerifying}
                    accessibilityLabel={t('rider.profile.personal.otp.digitAria', {
                      n: i + 1,
                    })}
                  />
                ))}
              </View>

              {otpError ? (
                <Text
                  style={styles.otpError}
                  accessibilityRole="alert"
                >
                  {otpError}
                </Text>
              ) : null}

              {otpSuccess && (
                <View
                  style={styles.otpSuccessRow}
                  accessibilityRole="summary"
                  accessibilityLiveRegion="polite"
                >
                  <Check size={16} color={colors.success} />
                  <Text style={styles.otpSuccessText}>
                    {t('rider.profile.personal.otp.success')}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={handleVerifyOtp}
                disabled={otpVerifying || otpSuccess}
                style={({ pressed }) => [
                  styles.otpVerifyBtn,
                  (otpVerifying || otpSuccess) && styles.otpVerifyDisabled,
                  pressed && styles.saveBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  otpVerifying
                    ? t('rider.profile.personal.otp.verifying')
                    : t('rider.profile.personal.otp.verify')
                }
              >
                <Text style={styles.otpVerifyText}>
                  {otpVerifying
                    ? t('rider.profile.personal.otp.verifying')
                    : t('rider.profile.personal.otp.verify')}
                </Text>
              </Pressable>

              <View style={styles.resendRow}>
                {otpResendIn > 0 ? (
                  <Text style={styles.resendIn}>
                    {t('rider.profile.personal.otp.resendIn', {
                      seconds: otpResendIn,
                    })}
                  </Text>
                ) : (
                  <Pressable
                    onPress={handleResendOtp}
                    disabled={otpSending}
                    accessibilityRole="button"
                    accessibilityLabel={t('rider.profile.personal.otp.resend')}
                  >
                    <Text style={styles.resend}>
                      {otpSending
                        ? t('rider.profile.personal.otp.sending')
                        : t('rider.profile.personal.otp.resend')}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

// Ref for the editable phone input (used by the "change phone" button).

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
  locked?: boolean
  lockedReason?: string
  lockedAria?: string
  children: React.ReactNode
}

function Field({
  label,
  required,
  helper,
  error,
  locked,
  lockedReason,
  lockedAria,
  children,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>
          {label}
          {required ? ' *' : ''}
        </Text>
        {locked && lockedReason && (
          <View
            style={styles.lockedBadge}
            accessibilityRole="text"
            accessibilityLabel={lockedAria}
          >
            <Lock size={11} color={colors.textMuted} />
            <Text style={styles.lockedBadgeText}>{lockedReason}</Text>
          </View>
        )}
      </View>
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
  autoCapitalize?: 'none' | 'sentences' | 'words'
  ariaLabel: string
  error?: boolean
  locked?: boolean
}

const Input = React.forwardRef<TextInput, InputProps>(function Input(
  {
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    ariaLabel,
    error,
    locked,
  },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      style={[styles.input, error && styles.inputError, locked && styles.inputLocked]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      accessibilityLabel={ariaLabel}
      accessibilityRole="none"
    />
  )
})

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: colors.background,
  },
  topBarTitle: {
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  photoWrap: {
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  photoRing: {
    width: 88,
    height: 88,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: {
    width: 88,
    height: 88,
    borderRadius: radii.full,
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary50,
  },
  photoInitials: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansBold[0],
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    minHeight: 36,
  },
  changePhotoPressed: {
    backgroundColor: '#F0DCE8',
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  changePhoneBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
    marginBottom: spacing[1],
  },
  changePhonePressed: {
    backgroundColor: colors.borderLight,
  },
  sectionLabelWrap: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[1],
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionHelper: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    paddingHorizontal: spacing[1],
    marginTop: -spacing[2],
    lineHeight: 18,
  },
  field: {
    gap: spacing[1.5],
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    flexWrap: 'wrap',
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
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  fieldError: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.error,
    fontFamily: fontFamily.sans[0],
  },
  input: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    fontSize: 16,
    color: colors.text,
    fontFamily: fontFamily.sans[0],
  },
  inputError: {
    borderColor: colors.error,
  },
  inputLocked: {
    backgroundColor: colors.background,
    borderColor: colors.borderLight,
  },
  lockedRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[3],
  },
  lockedValue: {
    fontSize: 16,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  lockedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  saveBtn: {
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  saveBtnDisabled: {
    backgroundColor: colors.border,
  },
  saveBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // ----- Dirty guard modal -----
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    padding: spacing[5],
    width: '100%',
    maxWidth: 340,
    gap: spacing[3],
  },
  modalTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  modalMsg: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  btnPressed: {
    backgroundColor: colors.borderLight,
  },
  cancelText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.error,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  confirmPressed: {
    backgroundColor: '#B91C1C',
  },
  confirmText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // ----- OTP modal -----
  otpOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[5],
  },
  otpCard: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    padding: spacing[5],
    width: '100%',
    maxWidth: 380,
    gap: spacing[3],
  },
  otpClose: {
    alignSelf: 'flex-end',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },
  otpCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  otpTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  otpSubtitle: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 20,
  },
  devBanner: {
    backgroundColor: colors.warningLight,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
  },
  devBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    fontFamily: fontFamily.sansSemiBold[0],
    textAlign: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
    paddingVertical: spacing[2],
  },
  otpInput: {
    width: 44,
    height: 52,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    textAlign: 'center',
    fontFamily: fontFamily.sansBold[0],
  },
  otpInputFilled: {
    borderColor: colors.primary,
    color: colors.primary,
  },
  otpInputError: {
    borderColor: colors.error,
    color: colors.error,
  },
  otpError: {
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  otpSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  otpSuccessText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  otpVerifyBtn: {
    height: 50,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpVerifyDisabled: {
    backgroundColor: colors.border,
  },
  otpVerifyText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  resendRow: {
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  resendIn: {
    fontSize: 13,
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },
  resend: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
