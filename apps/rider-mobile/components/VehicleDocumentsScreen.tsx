import React, {
  useCallback,
  useMemo,
  useState,
} from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  AccessibilityInfo,
  Image,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  ReduceMotion,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  Check,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ShieldCheck,
  FileText,
  Camera,
  CalendarClock,
  Lock,
} from 'lucide-react-native'
import {
  colors,
  spacing,
  radii,
  fontFamily,
  fontSize,
} from '@chinooz/theme'
import { analytics } from '@chinooz/analytics'
import { useA11y } from './A11yProvider'
import { useAppState } from './AppStateProvider'
import {
  VehicleDocsSkeleton,
  LoadErrorState,
  SaveFailState,
  UploadFailState,
  OfflineProfileBanner,
  DocExpiredBanner,
  DocRejectedBanner,
  VerificationPendingLock,
} from './ProfileStates'
import {
  getRiderVehicle,
  updateRiderVehicle,
  getRiderDocuments,
  resubmitRiderDocument,
  daysUntilExpiry,
  RIDER_DOC_EXPIRY_REMIND_DAYS,
  type RiderVehicle,
  type RiderVehicleType,
  type RiderDocument,
  type RiderDocumentStatus,
  type RiderDocumentKind,
} from '@chinooz/mock-data'

const VEHICLE_TYPES: { value: RiderVehicleType; labelKey: string }[] = [
  { value: 'bike', labelKey: 'rider.profile.vehicle.typeBike' },
  { value: 'scooter', labelKey: 'rider.profile.vehicle.typeScooter' },
  { value: 'motorcycle', labelKey: 'rider.profile.vehicle.typeMotorcycle' },
  { value: 'bicycle', labelKey: 'rider.profile.vehicle.typeBicycle' },
  { value: 'other', labelKey: 'rider.profile.vehicle.typeOther' },
]

const STATUS_STYLE: Record<
  RiderDocumentStatus,
  { fg: string; bg: string; icon: React.ReactNode; labelKey: string }
> = {
  verified: {
    fg: colors.success,
    bg: colors.successLight,
    icon: <Check size={12} color={colors.success} strokeWidth={3} />,
    labelKey: 'rider.profile.vehicle.docs.statusVerified',
  },
  pending: {
    fg: colors.warning,
    bg: colors.warningLight,
    icon: <Clock size={12} color={colors.warning} strokeWidth={2.5} />,
    labelKey: 'rider.profile.vehicle.docs.statusPending',
  },
  expired: {
    fg: colors.warning,
    bg: colors.warningLight,
    icon: <AlertTriangle size={12} color={colors.warning} strokeWidth={2.5} />,
    labelKey: 'rider.profile.vehicle.docs.statusExpired',
  },
  rejected: {
    fg: colors.error,
    bg: colors.errorLight,
    icon: <XCircle size={12} color={colors.error} strokeWidth={2.5} />,
    labelKey: 'rider.profile.vehicle.docs.statusRejected',
  },
}

const KIND_ICON: Record<RiderDocumentKind, React.ReactNode> = {
  id: <FileText size={20} color={colors.textSecondary} strokeWidth={2} />,
  license: <FileText size={20} color={colors.textSecondary} strokeWidth={2} />,
  registration: <FileText size={20} color={colors.textSecondary} strokeWidth={2} />,
  selfie: <Camera size={20} color={colors.textSecondary} strokeWidth={2} />,
}

function formatIsoDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface VehicleForm {
  type: RiderVehicleType
  plate: string
  model: string
  color: string
}

export default function VehicleDocumentsScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { reducedMotion } = useA11y()

  const [loading, setLoading] = useState(true)
  const [vehicle, setVehicle] = useState<RiderVehicle | null>(null)
  const [form, setForm] = useState<VehicleForm | null>(null)
  const [initial, setInitial] = useState<VehicleForm | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [saveFail, setSaveFail] = useState(false)
  const [uploadFailId, setUploadFailId] = useState<string | null>(null)
  const { connectivity } = useAppState()
  const isOffline = connectivity === 'offline'

  const [docs, setDocs] = useState<RiderDocument[]>([])
  const [resubmittingId, setResubmittingId] = useState<string | null>(null)

  const announce = useCallback((msg: string) => {
    try {
      ;(AccessibilityInfo as any).announceForScreenReader?.(msg)
    } catch {}
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [v, d] = await Promise.all([getRiderVehicle(), getRiderDocuments()])
      const f: VehicleForm = {
        type: v.type,
        plate: v.plate,
        model: v.model,
        color: v.color,
      }
      setVehicle(v)
      setForm(f)
      setInitial(f)
      setDocs(d)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      analytics.screen({ name: 'rider-vehicle-documents' })
      load()
    }, [load]),
  )

  // ----- Vehicle edit ----------------------------------------------------
  const isDirty = useMemo(() => {
    if (!form || !initial) return false
    return (Object.keys(form) as (keyof VehicleForm)[]).some(
      k => form[k] !== initial[k],
    )
  }, [form, initial])

  const typeChanged = !!form && !!initial && form.type !== initial.type
  const plateChanged = !!form && !!initial && form.plate !== initial.plate
  const reverifyNeeded = typeChanged || plateChanged

  const setField = useCallback(
    <K extends keyof VehicleForm>(key: K, value: VehicleForm[K]) => {
      setForm(prev => (prev ? { ...prev, [key]: value } : prev))
      setErrors(prev => {
        if (!prev[key as string]) return prev
        const next = { ...prev }
        delete next[key as string]
        return next
      })
      setSavedMsg(null)
    },
    [],
  )

  const validate = useCallback((): boolean => {
    if (!form) return false
    const e: Record<string, string> = {}
    if (!form.plate.trim()) e.plate = t('rider.profile.vehicle.validationPlate')
    if (!form.model.trim()) e.model = t('rider.profile.vehicle.validationModel')
    if (!form.color.trim()) e.color = t('rider.profile.vehicle.validationColor')
    setErrors(e)
    if (Object.keys(e).length > 0) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } catch {}
      announce(Object.values(e).join('. '))
      return false
    }
    return true
  }, [form, t, announce])

  const handleSaveVehicle = useCallback(async () => {
    if (!form || !vehicle) return
    if (!validate()) return
    setSaving(true)
    try {
      const res = await updateRiderVehicle({
        type: form.type,
        plate: form.plate,
        model: form.model,
        color: form.color,
      })
      const next: RiderVehicle = {
        ...vehicle,
        type: form.type,
        plate: form.plate,
        model: form.model,
        color: form.color,
      }
      setVehicle(next)
      setInitial({
        type: form.type,
        plate: form.plate,
        model: form.model,
        color: form.color,
      })
      setSaving(false)
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      if (res.requiresReverification) {
        setSavedMsg(t('rider.profile.vehicle.savedReverify'))
        announce(t('rider.profile.vehicle.savedReverifyAria'))
      } else {
        setSavedMsg(t('rider.profile.vehicle.saved'))
        announce(t('rider.profile.vehicle.savedAria'))
      }
      // Clear the success message after a few seconds.
      setTimeout(() => setSavedMsg(null), 4000)
    } catch {
      setSaving(false)
      setSaveFail(true)
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } catch {}
    }
  }, [form, vehicle, validate, t, announce])

  // ----- Document resubmit ----------------------------------------------
  const handleResubmit = useCallback(
    async (doc: RiderDocument) => {
      if (resubmittingId) return
      setResubmittingId(doc.id)
      try {
        await resubmitRiderDocument(doc.id)
        // Move the doc to pending after re-upload.
        setDocs(prev =>
          prev.map(d =>
            d.id === doc.id
              ? {
                  ...d,
                  status: 'pending',
                  uploadedAt: new Date().toISOString().slice(0, 10),
                  rejectionReasonKey: null,
                  thumbnailUrl: d.thumbnailUrl ?? `https://picsum.photos/seed/${d.id}-re/200/200`,
                }
              : d,
          ),
        )
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } catch {}
        const label = t(doc.labelKey)
        announce(
          t('rider.profile.vehicle.docs.resubmittedAria', { doc: label }),
        )
      } catch {
        setUploadFailId(doc.id)
      }
      setResubmittingId(null)
    },
    [resubmittingId, t, announce],
  )

  // ----- Expiry reminders ------------------------------------------------
  const reminders = useMemo(() => {
    const out: { doc: RiderDocument; days: number; messageKey: string; vars: Record<string, unknown> }[] = []
    for (const d of docs) {
      const days = daysUntilExpiry(d.expiresAt)
      if (days === null) continue
      if (d.status === 'expired' || days < 0) {
        out.push({
          doc: d,
          days: Math.abs(days),
          messageKey: 'rider.profile.vehicle.docs.reminderExpired',
          vars: { doc: t(d.labelKey) },
        })
      } else if (days <= RIDER_DOC_EXPIRY_REMIND_DAYS && d.kind === 'license') {
        out.push({
          doc: d,
          days,
          messageKey: 'rider.profile.vehicle.docs.reminderLicenseSoon',
          vars: { days },
        })
      } else if (days <= RIDER_DOC_EXPIRY_REMIND_DAYS && d.status !== 'verified') {
        // Generic soon-expiry for non-verified docs within window.
        out.push({
          doc: d,
          days,
          messageKey: 'rider.profile.vehicle.docs.reminderExpired',
          vars: { doc: t(d.labelKey) },
        })
      }
    }
    return out
  }, [docs, t])

  // ----- Render ----------------------------------------------------------
  if (loading || !form || !vehicle) {
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
            {t('rider.profile.vehicle.title')}
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
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('rider.profile.back')}
        >
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {t('rider.profile.vehicle.title')}
        </Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing[10] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          {t('rider.profile.vehicle.subtitle')}
        </Text>

        {/* ---------- Vehicle details ---------- */}
        <SectionLabel text={t('rider.profile.vehicle.sectionVehicle')} />

        {vehicle.verificationLinked && (
          <View style={styles.linkedBanner}>
            <Lock size={13} color={colors.textMuted} />
            <Text style={styles.linkedBannerText}>
              {t('rider.profile.vehicle.verificationLinkedHelper')}
            </Text>
          </View>
        )}

        {/* Type selector */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            {t('rider.profile.vehicle.type')}
          </Text>
          <View style={styles.typeRow}>
            {VEHICLE_TYPES.map(vt => {
              const active = form.type === vt.value
              const willReverify = typeChanged && active
              return (
                <Pressable
                  key={vt.value}
                  onPress={() => setField('type', vt.value)}
                  style={({ pressed }) => [
                    styles.typeBtn,
                    active && styles.typeBtnActive,
                    pressed && styles.typeBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(vt.labelKey)}
                >
                  <Text
                    style={[styles.typeBtnText, active && styles.typeBtnTextActive]}
                    numberOfLines={1}
                  >
                    {t(vt.labelKey)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          {typeChanged && (
            <View
              style={styles.flagRow}
              accessibilityRole="alert"
              accessibilityLabel={t('rider.profile.vehicle.changeFlaggedAria', {
                field: t('rider.profile.vehicle.type'),
              })}
            >
              <AlertTriangle size={12} color={colors.warning} />
              <Text style={styles.flagText}>
                {t('rider.profile.vehicle.changeFlagged')}
              </Text>
            </View>
          )}
        </View>

        <Field
          label={t('rider.profile.vehicle.plate')}
          helper={t('rider.profile.vehicle.plateHelper')}
          error={errors.plate}
          flagged={plateChanged}
          flaggedText={t('rider.profile.vehicle.changeFlagged')}
          flaggedAria={t('rider.profile.vehicle.changeFlaggedAria', {
            field: t('rider.profile.vehicle.plate'),
          })}
        >
          <Input
            value={form.plate}
            onChangeText={v => setField('plate', v)}
            placeholder={t('rider.profile.vehicle.platePlaceholder')}
            ariaLabel={t('rider.profile.vehicle.plate')}
            error={!!errors.plate}
          />
        </Field>

        <Field
          label={t('rider.profile.vehicle.model')}
          error={errors.model}
        >
          <Input
            value={form.model}
            onChangeText={v => setField('model', v)}
            placeholder={t('rider.profile.vehicle.modelPlaceholder')}
            ariaLabel={t('rider.profile.vehicle.model')}
            error={!!errors.model}
          />
        </Field>

        <Field
          label={t('rider.profile.vehicle.color')}
          error={errors.color}
        >
          <Input
            value={form.color}
            onChangeText={v => setField('color', v)}
            placeholder={t('rider.profile.vehicle.colorPlaceholder')}
            ariaLabel={t('rider.profile.vehicle.color')}
            error={!!errors.color}
          />
        </Field>

        <AnimatedSaveButton
          onPress={handleSaveVehicle}
          disabled={!isDirty || saving}
          saving={saving}
          saveLabel={t('rider.profile.vehicle.save')}
          savingLabel={t('rider.profile.vehicle.saving')}
          saveAria={t('rider.profile.vehicle.saveAria')}
          reduced={reducedMotion}
        />

        {savedMsg && (
          <View
            style={styles.successRow}
            accessibilityRole="summary"
            accessibilityLiveRegion="polite"
          >
            <Check size={15} color={colors.success} />
            <Text style={styles.successText}>{savedMsg}</Text>
          </View>
        )}

        {/* Offline banner — edits queued */}
        {isOffline && (
          <OfflineProfileBanner
            cachedDate={new Date().toISOString().slice(0, 10)}
            queuedEdits={isDirty}
            title={t('rider.profile.offlineTitle')}
            bodyTemplate={t('rider.profile.offlineBody')}
            queuedNote={t('rider.profile.offlineQueued')}
            ariaLabel={t('rider.profile.offlineAria')}
            retry={t('rider.profile.offlineRetry')}
            retryAria={t('rider.profile.offlineRetryAria')}
            onRetry={handleSaveVehicle}
          />
        )}

        {/* Save failure — preserves edits */}
        {saveFail && (
          <SaveFailState
            title={t('rider.profile.errorSaveTitle')}
            body={t('rider.profile.errorSaveBody')}
            preservedNote={t('rider.profile.errorSavePreserved')}
            retry={t('rider.profile.errorSaveRetry')}
            retryAria={t('rider.profile.errorSaveRetryAria')}
            onRetry={handleSaveVehicle}
            cancelLabel={t('rider.profile.errorSaveCancel')}
            cancelAria={t('rider.profile.errorSaveCancelAria')}
            onCancel={() => setSaveFail(false)}
          />
        )}

        {/* Verification-pending lock — limits vehicle changes */}
        {vehicle.verificationLinked && reverifyNeeded && (
          <VerificationPendingLock
            title={t('rider.profile.verificationLockTitle')}
            body={t('rider.profile.verificationLockBody')}
            ariaLabel={t('rider.profile.verificationLockAria')}
          />
        )}

        {/* ---------- Expiry reminders ---------- */}
        {reminders.length > 0 && (
          <View style={styles.remindersWrap}>
            {reminders.map((r, i) => {
              const message = t(r.messageKey, r.vars)
              return (
                <View
                  key={`${r.doc.id}-${i}`}
                  style={styles.reminderCard}
                  accessibilityRole="summary"
                  accessibilityLabel={t('rider.profile.vehicle.docs.reminderAria', {
                    message,
                  })}
                >
                  <CalendarClock size={16} color={colors.warning} />
                  <Text style={styles.reminderText}>{message}</Text>
                </View>
              )
            })}
          </View>
        )}

        {/* ---------- Documents ---------- */}
        <SectionLabel text={t('rider.profile.vehicle.sectionDocuments')} />

        <View style={styles.docsList}>
          {docs.map((doc, idx) => {
            const st = STATUS_STYLE[doc.status]
            const statusLabel = t(st.labelKey)
            const docLabel = t(doc.labelKey)
            const expiryText = doc.expiresAt
              ? daysUntilExpiry(doc.expiresAt) !== null &&
                daysUntilExpiry(doc.expiresAt)! < 0
                ? t('rider.profile.vehicle.docs.expiredAgo', {
                    days: Math.abs(daysUntilExpiry(doc.expiresAt)!),
                  })
                : t('rider.profile.vehicle.docs.expiryOn', {
                    date: formatIsoDate(doc.expiresAt),
                  })
              : ''
            const uploadedText = doc.uploadedAt
              ? t('rider.profile.vehicle.docs.uploadedOn', {
                  date: formatIsoDate(doc.uploadedAt),
                })
              : ''
            const isLast = idx === docs.length - 1
            const canResubmit =
              doc.status === 'rejected' || doc.status === 'expired'
            const isResubmitting = resubmittingId === doc.id
            const cardAria = t('rider.profile.vehicle.docs.cardAria', {
              doc: docLabel,
              status: statusLabel,
              expiry: expiryText || uploadedText,
            })

            return (
              <View
                key={doc.id}
                style={[styles.docCard, !isLast && styles.docCardBorder]}
                accessibilityRole="summary"
                accessibilityLabel={cardAria}
              >
                <View style={styles.docCardTop}>
                  <View style={styles.docIconWrap}>
                    {doc.thumbnailUrl ? (
                      <Image
                        source={{ uri: doc.thumbnailUrl }}
                        style={styles.docThumb}
                      />
                    ) : (
                      KIND_ICON[doc.kind]
                    )}
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docLabel} numberOfLines={1}>
                      {docLabel}
                    </Text>
                    {doc.maskedNumber && (
                      <Text style={styles.docMasked} numberOfLines={1}>
                        {t('rider.profile.vehicle.docs.maskedLabel')}: {doc.maskedNumber}
                      </Text>
                    )}
                    {uploadedText ? (
                      <Text style={styles.docMeta} numberOfLines={1}>
                        {uploadedText}
                      </Text>
                    ) : null}
                    {expiryText ? (
                      <Text
                        style={[
                          styles.docMeta,
                          doc.status === 'expired' && styles.docMetaWarn,
                        ]}
                        numberOfLines={1}
                      >
                        {expiryText}
                      </Text>
                    ) : null}
                  </View>
                  {/* Status pill — not color-only (icon + label) */}
                  <View
                    style={[styles.statusPill, { backgroundColor: st.bg }]}
                    accessibilityRole="text"
                    accessibilityLabel={statusLabel}
                  >
                    {st.icon}
                    <Text style={[styles.statusPillText, { color: st.fg }]}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>

                {/* Rejection reason */}
                {doc.status === 'rejected' && doc.rejectionReasonKey && (
                  <View
                    style={styles.rejectionRow}
                    accessibilityRole="alert"
                    accessibilityLabel={t('rider.profile.vehicle.docs.rejectionAria', {
                      reason: t(doc.rejectionReasonKey),
                    })}
                  >
                    <XCircle size={13} color={colors.error} />
                    <Text style={styles.rejectionText}>
                      {t(doc.rejectionReasonKey)}
                    </Text>
                  </View>
                )}

                {/* Replace / Re-upload action */}
                <View style={styles.docActions}>
                  {canResubmit ? (
                    <Pressable
                      onPress={() => handleResubmit(doc)}
                      disabled={isResubmitting}
                      style={({ pressed }) => [
                        styles.resubmitBtn,
                        isResubmitting && styles.resubmitBtnDisabled,
                        pressed && styles.resubmitBtnPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={t('rider.profile.vehicle.docs.resubmitAria', {
                        doc: docLabel,
                      })}
                    >
                      <RefreshCw size={14} color={colors.primary} />
                      <Text style={styles.resubmitBtnText}>
                        {isResubmitting
                          ? t('rider.profile.vehicle.docs.resubmitting')
                          : t('rider.profile.vehicle.docs.resubmit')}
                      </Text>
                    </Pressable>
                  ) : doc.status === 'verified' || doc.status === 'pending' ? (
                    <Pressable
                      onPress={() => handleResubmit(doc)}
                      disabled={isResubmitting}
                      style={({ pressed }) => [
                        styles.replaceBtn,
                        pressed && styles.replaceBtnPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={t('rider.profile.vehicle.docs.replaceAria', {
                        doc: docLabel,
                      })}
                    >
                      <RefreshCw size={14} color={colors.textMuted} />
                      <Text style={styles.replaceBtnText}>
                        {t('rider.profile.vehicle.docs.replace')}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {/* Upload failure — preserves form, offers retry */}
                {uploadFailId === doc.id && (
                  <UploadFailState
                    title={t('rider.profile.errorUploadTitle')}
                    body={t('rider.profile.errorUploadBody')}
                    retry={t('rider.profile.errorUploadRetry')}
                    retryAria={t('rider.profile.errorUploadRetryAria')}
                    onRetry={() => {
                      setUploadFailId(null)
                      handleResubmit(doc)
                    }}
                    onCancel={() => setUploadFailId(null)}
                    cancelLabel={t('rider.profile.errorUploadCancel')}
                    cancelAria={t('rider.profile.errorUploadCancelAria')}
                  />
                )}

                {/* Document expired/rejected edge banners */}
                {doc.status === 'expired' && (
                  <DocExpiredBanner
                    title={t('rider.profile.docExpiredTitle')}
                    body={t('rider.profile.docExpiredBody')}
                    ariaLabel={t('rider.profile.docExpiredAria')}
                    actionLabel={t('rider.profile.docExpiredAction')}
                    actionAria={t('rider.profile.docExpiredActionAria')}
                    onAction={() => handleResubmit(doc)}
                  />
                )}
                {doc.status === 'rejected' && !doc.rejectionReasonKey && (
                  <DocRejectedBanner
                    title={t('rider.profile.docRejectedTitle')}
                    body={t('rider.profile.docRejectedBody')}
                    ariaLabel={t('rider.profile.docRejectedAria')}
                    actionLabel={t('rider.profile.docRejectedAction')}
                    actionAria={t('rider.profile.docRejectedActionAria')}
                    onAction={() => handleResubmit(doc)}
                  />
                )}
              </View>
            )
          })}
        </View>

        {/* ---------- Trust copy ---------- */}
        <View style={styles.trustCard}>
          <View style={styles.trustIconWrap}>
            <ShieldCheck size={18} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.trustBody}>
            <Text style={styles.trustTitle}>
              {t('rider.profile.vehicle.sectionTrust')}
            </Text>
            <Text style={styles.trustText}>
              {t('rider.profile.vehicle.trustBody')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

// ----- Animated save button (press-scale) --------------------------------

function AnimatedSaveButton({
  onPress,
  disabled,
  saving,
  saveLabel,
  savingLabel,
  saveAria,
  reduced,
}: {
  onPress: () => void
  disabled: boolean
  saving: boolean
  saveLabel: string
  savingLabel: string
  saveAria: string
  reduced: boolean
}) {
  const scale = useSharedValue(1)
  const handlePressIn = () => {
    if (reduced) return
    scale.value = withSpring(0.97, { damping: 20, stiffness: 400, reduceMotion: ReduceMotion.System })
  }
  const handlePressOut = () => {
    if (reduced) return
    scale.value = withSpring(1, { damping: 20, stiffness: 400, reduceMotion: ReduceMotion.System })
  }
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View style={btnStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={({ pressed }) => [
          styles.saveBtn,
          disabled && styles.saveBtnDisabled,
          pressed && styles.saveBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={saving ? savingLabel : saveAria}
        accessibilityState={{ disabled }}
      >
        <Text style={styles.saveBtnText}>
          {saving ? savingLabel : saveLabel}
        </Text>
      </Pressable>
    </Animated.View>
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
  helper?: string
  error?: string
  flagged?: boolean
  flaggedText?: string
  flaggedAria?: string
  children: React.ReactNode
}

function Field({
  label,
  helper,
  error,
  flagged,
  flaggedText,
  flaggedAria,
  children,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {flagged && flaggedText && (
        <View
          style={styles.flagRow}
          accessibilityRole="alert"
          accessibilityLabel={flaggedAria}
        >
          <AlertTriangle size={12} color={colors.warning} />
          <Text style={styles.flagText}>{flaggedText}</Text>
        </View>
      )}
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
  ariaLabel: string
  error?: boolean
}

const Input = React.forwardRef<TextInput, InputProps>(function Input(
  { value, onChangeText, placeholder, ariaLabel, error },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      style={[styles.input, error && styles.inputError]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      accessibilityLabel={ariaLabel}
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
  linkedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
  },
  linkedBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 17,
  },
  field: {
    gap: spacing[1.5],
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
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  typeBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  typeBtnPressed: {
    backgroundColor: colors.borderLight,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  typeBtnTextActive: {
    color: colors.primary,
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.warningLight,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1.5],
  },
  flagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  saveBtn: {
    height: 50,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[1],
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
    paddingVertical: spacing[1],
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  remindersWrap: {
    gap: spacing[2],
    marginTop: spacing[1],
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    backgroundColor: colors.warningLight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
  },
  reminderText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontFamily: fontFamily.sans[0],
    lineHeight: 18,
  },
  docsList: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  docCard: {
    padding: spacing[4],
    gap: spacing[2.5],
  },
  docCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  docCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  docIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  docThumb: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
  },
  docInfo: {
    flex: 1,
    gap: 2,
  },
  docLabel: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  docMasked: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  docMeta: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  docMetaWarn: {
    color: colors.warning,
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    flexShrink: 0,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  rejectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[1.5],
    backgroundColor: colors.errorLight,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[2],
  },
  rejectionText: {
    flex: 1,
    fontSize: 12,
    color: colors.error,
    fontFamily: fontFamily.sans[0],
    lineHeight: 17,
  },
  docActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  resubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
    backgroundColor: colors.primary50,
    minHeight: 40,
  },
  resubmitBtnDisabled: {
    opacity: 0.5,
  },
  resubmitBtnPressed: {
    backgroundColor: '#F0DCE8',
  },
  resubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  replaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 40,
  },
  replaceBtnPressed: {
    backgroundColor: colors.borderLight,
  },
  replaceBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    marginTop: spacing[1],
  },
  trustIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: '#F0DCE8',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  trustBody: {
    flex: 1,
    gap: spacing[1],
  },
  trustTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  trustText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
    lineHeight: 17,
  },
})
