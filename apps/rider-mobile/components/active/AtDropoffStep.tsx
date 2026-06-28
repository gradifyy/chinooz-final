import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
  Modal,
  Pressable,
  TextInput,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  Check,
  Camera,
  PenLine,
  AlertTriangle,
  ChevronRight,
  X,
  Package,
  User,
  Banknote,
  RotateCcw,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, shadows } from '@chinooz/theme'
import { useA11y } from '../A11yProvider'
import { analytics } from '@chinooz/analytics'
import type { ActiveDelivery } from '@chinooz/types'

interface AtDropoffStepProps {
  delivery: ActiveDelivery
  /** Fired when the rider confirms delivery (all proofs passed). */
  onDelivered: () => void
  /** Fired when the rider reports a failed delivery. */
  onFailed: (reason: string) => void
}

type OtpState = 'idle' | 'validating' | 'verified' | 'error'
type PhotoState = 'idle' | 'captured'
type SignatureState = 'idle' | 'captured'
type FailedReasonType = 'absent' | 'refused' | 'wrong_address' | 'other'

function formatNpr(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`
}

/**
 * RA5 — at_dropoff proof-of-delivery step.
 *
 * Renders a "hand over to" summary (buyer name/area, items), configurable
 * proof-of-delivery options (OTP code, delivery photo, signature capture),
 * a guarded "Confirm delivered" primary that requires all configured proofs,
 * and a "Failed delivery" path (customer absent / refused / wrong address)
 * that captures a reason + optional photo, sets failed, and shows next steps
 * (return to seller).
 *
 * All values come from the shared activeDelivery store (single source of
 * truth). The step owns transient UI state (OTP digits, photo, signature).
 */
export default function AtDropoffStep({ delivery, onDelivered, onFailed }: AtDropoffStepProps) {
  const { t } = useTranslation()
  const { reducedMotion, minTouchTarget } = useA11y()
  const { dropoff, pickup, customerName, isCod, codAmount, proof } = delivery

  const items = pickup.items ?? []
  const otpRequired = proof?.otpRequired ?? false
  const photoRequired = proof?.photoRequired ?? false
  const signatureRequired = proof?.signatureRequired ?? false

  // If no proof config, default to OTP only (sensible default).
  const hasAnyProof = otpRequired || photoRequired || signatureRequired
  const effectiveOtp = otpRequired || (!hasAnyProof ? true : false)

  // --- OTP state ---
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', ''])
  const [otpState, setOtpState] = useState<OtpState>('idle')
  const otpRefs = useRef<(TextInput | null)[]>([])

  // --- Photo state ---
  const [photoState, setPhotoState] = useState<PhotoState>('idle')

  // --- Signature state ---
  const [sigState, setSigState] = useState<SignatureState>('idle')

  // --- Failed delivery flow state ---
  const [failedOpen, setFailedOpen] = useState(false)
  const [failedType, setFailedType] = useState<FailedReasonType | null>(null)
  const [failedText, setFailedText] = useState('')
  const [failedPhoto, setFailedPhoto] = useState(false)

  // Reset transient state if the delivery changes.
  const prevJobRef = useRef(delivery.jobId)
  useEffect(() => {
    if (prevJobRef.current !== delivery.jobId) {
      prevJobRef.current = delivery.jobId
      setOtpDigits(['', '', '', ''])
      setOtpState('idle')
      setPhotoState('idle')
      setSigState('idle')
      setFailedOpen(false)
      setFailedType(null)
      setFailedText('')
      setFailedPhoto(false)
    }
  }, [delivery.jobId])

  // --- OTP handling ---
  const otpComplete = otpDigits.every(d => d.length === 1)

  const handleOtpChange = useCallback((index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1)
    setOtpDigits(prev => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    setOtpState('idle')
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    // Auto-advance to next box.
    if (digit && index < 3) {
      otpRefs.current[index + 1]?.focus()
    }
  }, [reducedMotion])

  const handleOtpKeyPress = useCallback((index: number, key: string) => {
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }, [otpDigits])

  const validateOtp = useCallback(() => {
    if (!otpComplete) return
    setOtpState('validating')
    analytics.track({ event: 'rider_active_otp_validate', screen: 'rider-active-delivery' })
    // Mock: any 4-digit code "validates" — simulate latency.
    setTimeout(() => {
      setOtpState('verified')
      try {
        if (!reducedMotion) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }
      } catch {}
      try { AccessibilityInfo.announceForAccessibility(t('rider.active.proofOtpSuccess')) } catch {}
    }, 1000)
  }, [otpComplete, reducedMotion, t])

  // Auto-validate when all 4 digits entered.
  useEffect(() => {
    if (otpComplete && otpState === 'idle') {
      validateOtp()
    }
  }, [otpComplete, otpState, validateOtp])

  // --- Photo handling ---
  const handlePhoto = useCallback(() => {
    setPhotoState('captured')
    analytics.track({ event: 'rider_active_delivery_photo', screen: 'rider-active-delivery' })
    try {
      if (!reducedMotion) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } catch {}
    try { AccessibilityInfo.announceForAccessibility(t('rider.active.proofPhotoDone')) } catch {}
  }, [reducedMotion, t])

  // --- Signature handling ---
  const handleSignature = useCallback(() => {
    setSigState('captured')
    analytics.track({ event: 'rider_active_signature', screen: 'rider-active-delivery' })
    try {
      if (!reducedMotion) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } catch {}
    try { AccessibilityInfo.announceForAccessibility(t('rider.active.proofSignatureDone')) } catch {}
  }, [reducedMotion, t])

  // --- Proof completion ---
  const proofChecks = useMemo(() => {
    const checks: { label: string; done: boolean }[] = []
    if (effectiveOtp) checks.push({ label: t('rider.active.proofOtp'), done: otpState === 'verified' })
    if (photoRequired) checks.push({ label: t('rider.active.proofPhoto'), done: photoState === 'captured' })
    if (signatureRequired) checks.push({ label: t('rider.active.proofSignature'), done: sigState === 'captured' })
    return checks
  }, [effectiveOtp, photoRequired, signatureRequired, otpState, photoState, sigState, t])

  const completedProofs = proofChecks.filter(c => c.done).length
  const totalProofs = proofChecks.length
  const allProofsComplete = totalProofs > 0 && completedProofs === totalProofs
  const remainingProofs = totalProofs - completedProofs

  // Announce proof progress.
  useEffect(() => {
    if (totalProofs === 0) return
    const msg = allProofsComplete
      ? t('rider.active.proofComplete')
      : t('rider.active.proofIncomplete', { count: remainingProofs })
    try { AccessibilityInfo.announceForAccessibility(msg) } catch {}
  }, [allProofsComplete, remainingProofs, totalProofs, t])

  // --- Confirm delivered (guarded) ---
  const handleDelivered = useCallback(() => {
    if (!allProofsComplete) {
      try {
        if (!reducedMotion) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        }
      } catch {}
      try {
        AccessibilityInfo.announceForAccessibility(t('rider.active.confirmDeliveredGuarded'))
      } catch {}
      return
    }
    try {
      if (!reducedMotion) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } catch {}
    try {
      AccessibilityInfo.announceForAccessibility(t('rider.active.deliveredCelebration'))
    } catch {}
    analytics.track({ event: 'rider_active_delivered', screen: 'rider-active-delivery' })
    onDelivered()
  }, [allProofsComplete, reducedMotion, t, onDelivered])

  // --- Failed delivery flow ---
  const openFailed = useCallback(() => {
    setFailedOpen(true)
    setFailedType(null)
    setFailedText('')
    setFailedPhoto(false)
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [reducedMotion])

  const closeFailed = useCallback(() => {
    setFailedOpen(false)
    setFailedType(null)
    setFailedText('')
    setFailedPhoto(false)
  }, [])

  const submitFailed = useCallback(() => {
    const reason = failedType
      ? `${failedType}: ${failedText || t('rider.active.failedPlaceholder')}`
      : failedText || 'delivery_failed'
    analytics.track({
      event: 'rider_active_failed_delivery',
      screen: 'rider-active-delivery',
      type: failedType,
      detail: failedText,
    })
    closeFailed()
    try { AccessibilityInfo.announceForAccessibility(t('rider.active.failedRecorded')) } catch {}
    onFailed(reason)
  }, [failedType, failedText, closeFailed, t, onFailed])

  const failedReasons: { key: FailedReasonType; label: string; desc: string }[] = [
    { key: 'absent', label: t('rider.active.failedReasonAbsent'), desc: t('rider.active.failedReasonAbsentDesc') },
    { key: 'refused', label: t('rider.active.failedReasonRefused'), desc: t('rider.active.failedReasonRefusedDesc') },
    { key: 'wrong_address', label: t('rider.active.failedReasonWrongAddress'), desc: t('rider.active.failedReasonWrongAddressDesc') },
    { key: 'other', label: t('rider.active.failedReasonOther'), desc: t('rider.active.failedReasonOtherDesc') },
  ]

  return (
    <View style={styles.wrap} testID="at-dropoff-step">
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('rider.active.atDropoffTitle')}</Text>
        <Text style={styles.subtitle}>{t('rider.active.atDropoffSubtitle')}</Text>
      </View>

      {/* Hand-over-to summary */}
      <View style={styles.handOverCard} accessibilityRole="summary">
        <View style={styles.handOverHeader}>
          <View style={styles.handOverIcon}>
            <User size={16} color={colors.primary} />
          </View>
          <View style={styles.handOverHeaderText}>
            <Text style={styles.handOverTitle}>{t('rider.active.handOverTo')}</Text>
            <Text style={styles.handOverName} numberOfLines={1}>{customerName}</Text>
            {dropoff.area ? (
              <Text style={styles.handOverArea} numberOfLines={1}>{dropoff.area}</Text>
            ) : null}
          </View>
        </View>

        {items.length > 0 && (
          <View style={styles.itemsBlock}>
            <View style={styles.itemsHeader}>
              <Package size={14} color={colors.textMuted} />
              <Text style={styles.itemsTitle}>{t('rider.active.handOverItems')}</Text>
            </View>
            {items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={styles.itemDot} />
                <Text style={styles.itemText} numberOfLines={2}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* COD reminder at drop-off */}
        {isCod && codAmount > 0 && (
          <View style={styles.codReminder}>
            <Banknote size={16} color={colors.gold} />
            <Text style={styles.codReminderText}>
              {t('rider.active.codReminderBody', { amount: formatNpr(codAmount) })}
            </Text>
            <View style={styles.codPill}>
              <Text style={styles.codPillText}>{formatNpr(codAmount)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Proof of delivery */}
      <View style={styles.proofCard}>
        <View style={styles.proofHeader}>
          <Text style={styles.proofTitle}>{t('rider.active.proofTitle')}</Text>
          <View
            style={[
              styles.proofPill,
              allProofsComplete ? styles.proofPillDone : styles.proofPillPending,
            ]}
          >
            <Text
              style={[
                styles.proofPillText,
                allProofsComplete ? styles.proofPillTextDone : styles.proofPillTextPending,
              ]}
            >
              {allProofsComplete
                ? t('rider.active.proofComplete')
                : t('rider.active.proofIncomplete', { count: remainingProofs })}
            </Text>
          </View>
        </View>
        <Text style={styles.proofSubtitle}>{t('rider.active.proofSubtitle')}</Text>

        {/* OTP boxes */}
        {effectiveOtp && (
          <View style={styles.proofSection}>
            <View style={styles.proofSectionHeader}>
              <Text style={styles.proofSectionTitle}>{t('rider.active.proofOtp')}</Text>
              {otpState === 'verified' && (
                <View style={styles.verifiedBadge}>
                  <Check size={12} color={colors.success} strokeWidth={3} />
                  <Text style={styles.verifiedText}>{t('rider.active.proofOtpVerified')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.proofSectionHint}>{t('rider.active.proofOtpHint')}</Text>
            <View style={styles.otpRow} accessibilityRole="group">
              {otpDigits.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => { otpRefs.current[i] = ref }}
                  accessibilityLabel={t('rider.active.proofOtpDigitAria', { index: i + 1, total: 4 })}
                  accessibilityRole="keyboardKey"
                  value={digit}
                  onChangeText={(v) => handleOtpChange(i, v)}
                  onKeyPress={(e) => handleOtpKeyPress(i, e.nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  style={[
                    styles.otpBox,
                    otpState === 'verified' && styles.otpBoxVerified,
                    otpState === 'error' && styles.otpBoxError,
                  ]}
                  testID={`at-dropoff-otp-${i}`}
                />
              ))}
            </View>
            {otpState === 'validating' && (
              <Text style={styles.validatingText}>{t('rider.active.proofOtpValidating')}</Text>
            )}
            {otpState === 'error' && (
              <Text
                style={styles.errorText}
                accessibilityRole="alert"
              >
                {t('rider.active.proofOtpFail')}
              </Text>
            )}
          </View>
        )}

        {/* Delivery photo */}
        {photoRequired && (
          <View style={styles.proofSection}>
            <View style={styles.proofSectionHeader}>
              <Text style={styles.proofSectionTitle}>{t('rider.active.proofPhoto')}</Text>
              {photoState === 'captured' && (
                <View style={styles.verifiedBadge}>
                  <Check size={12} color={colors.success} strokeWidth={3} />
                  <Text style={styles.verifiedText}>{t('rider.active.proofPhotoDone')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.proofSectionHint}>{t('rider.active.proofPhotoHint')}</Text>
            {photoState === 'idle' ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.proofPhotoAria')}
                onPress={handlePhoto}
                style={[styles.proofActionBtn, { minHeight: minTouchTarget }]}
                activeOpacity={0.85}
                testID="at-dropoff-photo"
              >
                <Camera size={18} color={colors.primary} />
                <Text style={styles.proofActionText}>{t('rider.active.proofPhotoTake')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.proofDoneRow}>
                <Text style={styles.proofDoneText}>{t('rider.active.proofPhotoMock')}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('rider.active.proofPhotoRetake')}
                  onPress={() => setPhotoState('idle')}
                  style={styles.retakeBtn}
                >
                  <RotateCcw size={14} color={colors.textMuted} />
                  <Text style={styles.retakeText}>{t('rider.active.proofPhotoRetake')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Signature capture */}
        {signatureRequired && (
          <View style={styles.proofSection}>
            <View style={styles.proofSectionHeader}>
              <Text style={styles.proofSectionTitle}>{t('rider.active.proofSignature')}</Text>
              {sigState === 'captured' && (
                <View style={styles.verifiedBadge}>
                  <Check size={12} color={colors.success} strokeWidth={3} />
                  <Text style={styles.verifiedText}>{t('rider.active.proofSignatureDone')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.proofSectionHint}>{t('rider.active.proofSignatureHint')}</Text>
            {sigState === 'idle' ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.proofSignatureAria')}
                onPress={handleSignature}
                style={[styles.signaturePad, { minHeight: 80 }]}
                activeOpacity={0.85}
                testID="at-dropoff-signature"
              >
                <PenLine size={24} color={colors.textMuted} />
                <Text style={styles.signaturePadText}>{t('rider.active.proofSignatureHint')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.signatureDone}>
                <View style={styles.signatureDoneBadge}>
                  <Check size={16} color={colors.success} strokeWidth={3} />
                  <Text style={styles.proofDoneText}>{t('rider.active.proofSignatureMock')}</Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('rider.active.proofSignatureClear')}
                  onPress={() => setSigState('idle')}
                  style={styles.retakeBtn}
                >
                  <RotateCcw size={14} color={colors.textMuted} />
                  <Text style={styles.retakeText}>{t('rider.active.proofSignatureClear')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Failed delivery — guarded secondary */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('rider.active.failedDeliveryAria')}
        accessibilityHint={t('rider.active.failedDeliveryHint')}
        onPress={openFailed}
        style={[styles.failedBtn, { minHeight: minTouchTarget }]}
        activeOpacity={0.85}
        testID="at-dropoff-failed"
      >
        <AlertTriangle size={18} color={colors.error} />
        <Text style={styles.failedBtnText}>{t('rider.active.failedDelivery')}</Text>
        <ChevronRight size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Primary: Confirm delivered (guarded) */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={
          allProofsComplete
            ? t('rider.active.confirmDeliveredAria')
            : t('rider.active.confirmDeliveredGuarded')
        }
        accessibilityState={{ disabled: !allProofsComplete }}
        onPress={handleDelivered}
        style={[
          styles.primaryBtn,
          allProofsComplete ? styles.primaryBtnReady : styles.primaryBtnGuarded,
        ]}
        activeOpacity={allProofsComplete ? 0.85 : 1}
        testID="at-dropoff-confirm"
      >
        <Text
          style={[
            styles.primaryText,
            allProofsComplete ? styles.primaryTextReady : styles.primaryTextGuarded,
          ]}
        >
          {allProofsComplete
            ? t('rider.active.confirmDelivered')
            : t('rider.active.confirmDeliveredGuarded')}
        </Text>
        {allProofsComplete && <ChevronRight size={20} color={colors.white} />}
      </TouchableOpacity>

      {/* Failed delivery modal */}
      <Modal
        transparent
        visible={failedOpen}
        animationType="fade"
        onRequestClose={closeFailed}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeFailed}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('rider.active.failedDeliveryTitle')}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.failedCancel')}
                onPress={closeFailed}
                style={styles.modalCloseBtn}
                hitSlop={12}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{t('rider.active.failedDeliverySubtitle')}</Text>
            <Text style={styles.modalBody}>{t('rider.active.failedDeliveryBody')}</Text>

            {/* Reason selection */}
            <View style={styles.reasonWrap}>
              {failedReasons.map(({ key, label, desc }) => {
                const selected = failedType === key
                return (
                  <TouchableOpacity
                    key={key}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={label}
                    onPress={() => {
                      setFailedType(key)
                      try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
                    }}
                    style={[
                      styles.reasonBtn,
                      selected && styles.reasonBtnSelected,
                    ]}
                    activeOpacity={0.85}
                    testID={`at-dropoff-failed-reason-${key}`}
                  >
                    <View style={styles.reasonTextWrap}>
                      <Text
                        style={[
                          styles.reasonLabel,
                          selected && styles.reasonLabelSelected,
                        ]}
                      >
                        {label}
                      </Text>
                      <Text style={styles.reasonDesc}>{desc}</Text>
                    </View>
                    {selected && <Check size={18} color={colors.primary} strokeWidth={3} />}
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Reason text input */}
            <View style={styles.inputWrap}>
              <TextInput
                accessibilityLabel={t('rider.active.failedPlaceholder')}
                value={failedText}
                onChangeText={setFailedText}
                placeholder={t('rider.active.failedPlaceholder')}
                placeholderTextColor={colors.textMuted}
                multiline
                style={styles.input}
                testID="at-dropoff-failed-text"
              />
            </View>

            {/* Optional evidence photo */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.active.failedPhotoHint')}
              onPress={() => {
                setFailedPhoto(true)
                try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
              }}
              style={[styles.evidenceBtn, failedPhoto && styles.evidenceBtnDone]}
              disabled={failedPhoto}
            >
              <Camera size={16} color={failedPhoto ? colors.success : colors.textMuted} />
              <Text style={[styles.evidenceText, failedPhoto && styles.evidenceTextDone]}>
                {failedPhoto ? t('rider.active.proofPhotoMock') : t('rider.active.failedPhotoHint')}
              </Text>
            </TouchableOpacity>

            {/* Modal actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.failedCancel')}
                onPress={closeFailed}
                style={styles.modalSecondary}
              >
                <Text style={styles.modalSecondaryText}>{t('rider.active.failedCancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.failedSubmit')}
                onPress={submitFailed}
                style={styles.modalPrimary}
              >
                <Text style={styles.modalPrimaryText}>{t('rider.active.failedSubmit')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[3],
  },
  // Header
  header: {
    gap: 2,
  },
  title: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  // Hand-over card
  handOverCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  handOverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  handOverIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handOverHeaderText: {
    flex: 1,
    gap: 1,
  },
  handOverTitle: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  handOverName: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  handOverArea: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  itemsBlock: {
    gap: spacing[2],
    paddingTop: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  itemsTitle: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  itemDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  itemText: {
    flex: 1,
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.text,
  },
  codReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.warningLight,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  codReminderText: {
    flex: 1,
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.textSecondary,
  },
  codPill: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.md,
  },
  codPillText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.white,
  },
  // Proof card
  proofCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    gap: spacing[2],
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  proofTitle: {
    flex: 1,
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  proofPill: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  proofPillDone: {
    backgroundColor: colors.successLight,
  },
  proofPillPending: {
    backgroundColor: colors.primary50,
  },
  proofPillText: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
  },
  proofPillTextDone: {
    color: colors.success,
  },
  proofPillTextPending: {
    color: colors.primary,
  },
  proofSubtitle: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  proofSection: {
    gap: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  proofSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  proofSectionTitle: {
    flex: 1,
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  proofSectionHint: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  verifiedText: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.success,
  },
  // OTP
  otpRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    fontSize: fontSize.xl[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    backgroundColor: colors.surface,
    maxHeight: 56,
  },
  otpBoxVerified: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
    color: colors.success,
  },
  otpBoxError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  validatingText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.error,
  },
  // Photo
  proofActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    paddingVertical: spacing[2.5],
  },
  proofActionText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  proofDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  proofDoneText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.success,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  retakeText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  // Signature
  signaturePad: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    backgroundColor: colors.background,
  },
  signaturePadText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  signatureDone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  signatureDoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  // Failed delivery button
  failedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    backgroundColor: colors.errorLight,
  },
  failedBtnText: {
    flex: 1,
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.error,
  },
  // Primary (guarded)
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: radii.xl,
    width: '100%',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    minHeight: 60,
    ...shadows.md,
  },
  primaryBtnReady: {
    backgroundColor: colors.success,
  },
  primaryBtnGuarded: {
    backgroundColor: colors.borderLight,
  },
  primaryText: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
  },
  primaryTextReady: {
    color: colors.white,
  },
  primaryTextGuarded: {
    color: colors.textMuted,
  },
  // Failed delivery modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    padding: spacing[4],
    gap: spacing[3],
    width: '100%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    flex: 1,
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalBody: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
  },
  reasonWrap: {
    gap: spacing[2],
  },
  reasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  reasonBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  reasonTextWrap: {
    flex: 1,
    gap: 1,
  },
  reasonLabel: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  reasonLabelSelected: {
    color: colors.primary,
  },
  reasonDesc: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  inputWrap: {
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  input: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.text,
    minHeight: 60,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  evidenceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  evidenceBtnDone: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  evidenceText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  evidenceTextDone: {
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.success,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  modalSecondary: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  modalSecondaryText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  modalPrimary: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  modalPrimaryText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.white,
  },
})
