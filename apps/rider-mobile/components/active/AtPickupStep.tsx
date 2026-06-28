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
  ScanLine,
  Camera,
  Banknote,
  Wallet,
  AlertTriangle,
  ChevronRight,
  X,
  CheckCircle2,
  Package,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, shadows } from '@chinooz/theme'
import { useA11y } from '../A11yProvider'
import { analytics } from '@chinooz/analytics'
import type { ActiveDelivery } from '@chinooz/types'

interface AtPickupStepProps {
  delivery: ActiveDelivery
  /** Fired when the rider taps "Picked up — start delivery" (collection confirmed). */
  onPickedUp: () => void
  /** Fired when the rider cancels from the issues flow. */
  onCancel: (reason: string) => void
}

type VerifyState = 'idle' | 'scanning' | 'verified'
type PhotoState = 'idle' | 'captured'
type IssueType = 'missing' | 'not_ready' | 'cant_collect'

function formatNpr(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`
}

/**
 * RA3 — at_pickup step content.
 *
 * Renders a collection checklist (checkbox per item from the seller's
 * sub-order), optional scan/verify order code (mock), optional package photo
 * (mock), a prepaid vs COD payment note, an issues-at-pickup flow that can
 * report to dispatch and cancel, and a guarded "Picked up — start delivery"
 * primary that cannot be tapped until every item is confirmed collected.
 *
 * All values come from the shared activeDelivery store (single source of
 * truth). The step owns only transient UI state (checkboxes, verify, photo).
 */
export default function AtPickupStep({ delivery, onPickedUp, onCancel }: AtPickupStepProps) {
  const { t } = useTranslation()
  const { reducedMotion, minTouchTarget } = useA11y()
  const { pickup, isCod, codAmount } = delivery

  const items = pickup.items ?? []
  const itemCount = items.length

  // Transient collection state.
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false))
  const [verifyState, setVerifyState] = useState<VerifyState>('idle')
  const [photoState, setPhotoState] = useState<PhotoState>('idle')

  // Issues flow state.
  const [issueOpen, setIssueOpen] = useState(false)
  const [issueType, setIssueType] = useState<IssueType | null>(null)
  const [issueText, setIssueText] = useState('')

  // Reset collection state if the delivery changes (e.g. resumed).
  const prevJobRef = useRef(delivery.jobId)
  useEffect(() => {
    if (prevJobRef.current !== delivery.jobId) {
      prevJobRef.current = delivery.jobId
      setChecked(items.map(() => false))
      setVerifyState('idle')
      setPhotoState('idle')
      setIssueOpen(false)
      setIssueType(null)
      setIssueText('')
    }
  }, [delivery.jobId, items])

  const collectedCount = useMemo(() => checked.filter(Boolean).length, [checked])
  const remaining = itemCount - collectedCount
  const allCollected = itemCount > 0 && remaining === 0

  // Announce collection progress for screen readers.
  useEffect(() => {
    if (itemCount === 0) return
    const msg = allCollected
      ? t('rider.active.checklistAllCollected')
      : t('rider.active.checklistRemaining', { count: remaining })
    try { AccessibilityInfo.announceForAccessibility(msg) } catch {}
  }, [allCollected, remaining, itemCount, t])

  const toggleItem = useCallback((index: number) => {
    setChecked(prev => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
    try {
      if (!reducedMotion) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }
    } catch {}
  }, [reducedMotion])

  // --- Scan / verify order code (mock) ---
  const handleScan = useCallback(() => {
    if (verifyState === 'scanning' || verifyState === 'verified') return
    setVerifyState('scanning')
    analytics.track({ event: 'rider_active_verify_code', screen: 'rider-active-delivery' })
    // Mock: simulate scan latency then succeed.
    setTimeout(() => {
      setVerifyState('verified')
      try {
        if (!reducedMotion) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }
      } catch {}
      try {
        AccessibilityInfo.announceForAccessibility(t('rider.active.verifyCodeSuccess'))
      } catch {}
    }, 1200)
  }, [verifyState, reducedMotion, t])

  const handleSkipVerify = useCallback(() => {
    setVerifyState('idle')
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [reducedMotion])

  // --- Package photo (mock) ---
  const handlePhoto = useCallback(() => {
    setPhotoState('captured')
    analytics.track({ event: 'rider_active_package_photo', screen: 'rider-active-delivery' })
    try {
      if (!reducedMotion) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } catch {}
    try {
      AccessibilityInfo.announceForAccessibility(t('rider.active.packagePhotoDone'))
    } catch {}
  }, [reducedMotion, t])

  const handleRetakePhoto = useCallback(() => {
    setPhotoState('idle')
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [reducedMotion])

  // --- Issues flow ---
  const openIssues = useCallback(() => {
    setIssueOpen(true)
    setIssueType(null)
    setIssueText('')
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [reducedMotion])

  const closeIssues = useCallback(() => {
    setIssueOpen(false)
    setIssueType(null)
    setIssueText('')
  }, [])

  const submitIssue = useCallback(() => {
    const detail = issueText || t('rider.active.issueReportPlaceholder')
    analytics.track({
      event: 'rider_active_issue_reported',
      screen: 'rider-active-delivery',
      type: issueType,
      detail,
    })
    closeIssues()
    try {
      AccessibilityInfo.announceForAccessibility(t('rider.active.issueReported'))
    } catch {}
    // Keep the rider on the step; dispatch is notified.
    // The rider can continue or cancel from here.
  }, [issueType, issueText, closeIssues, t])

  const cancelFromIssue = useCallback(() => {
    const reason = issueType
      ? `${issueType}: ${issueText || t('rider.active.issueReportPlaceholder')}`
      : issueText || 'pickup_issue'
    analytics.track({ event: 'rider_active_cancel_from_issue', screen: 'rider-active-delivery', type: issueType })
    closeIssues()
    onCancel(reason)
  }, [issueType, issueText, closeIssues, onCancel])

  // --- Picked up — start delivery (guarded) ---
  const handlePickedUp = useCallback(() => {
    if (!allCollected) {
      // Guard: can't skip collection.
      try {
        if (!reducedMotion) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        }
      } catch {}
      try {
        AccessibilityInfo.announceForAccessibility(
          t('rider.active.confirmGuardRemaining', { count: remaining }),
        )
      } catch {}
      return
    }
    try {
      if (!reducedMotion) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } catch {}
    try {
      AccessibilityInfo.announceForAccessibility(t('rider.active.pickedUpSuccess'))
    } catch {}
    analytics.track({ event: 'rider_active_picked_up', screen: 'rider-active-delivery' })
    onPickedUp()
  }, [allCollected, remaining, reducedMotion, t, onPickedUp])

  const issueTypes: { key: IssueType; label: string; desc: string }[] = [
    { key: 'missing', label: t('rider.active.issueMissing'), desc: t('rider.active.issueMissingDesc') },
    { key: 'not_ready', label: t('rider.active.issueNotReady'), desc: t('rider.active.issueNotReadyDesc') },
    { key: 'cant_collect', label: t('rider.active.issueCantCollect'), desc: t('rider.active.issueCantCollectDesc') },
  ]

  return (
    <View style={styles.wrap} testID="at-pickup-step">
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('rider.active.atPickupTitle')}</Text>
        <Text style={styles.subtitle}>{t('rider.active.atPickupSubtitle')}</Text>
      </View>

      {/* Collection checklist */}
      {itemCount > 0 ? (
        <View style={styles.checklistCard}>
          <View style={styles.checklistHeader}>
            <Package size={16} color={colors.textMuted} />
            <Text style={styles.checklistTitle}>{t('rider.active.checklistTitle')}</Text>
            <View
              style={[
                styles.checklistPill,
                allCollected ? styles.checklistPillDone : styles.checklistPillPending,
              ]}
            >
              <Text
                style={[
                  styles.checklistPillText,
                  allCollected ? styles.checklistPillTextDone : styles.checklistPillTextPending,
                ]}
              >
                {allCollected
                  ? t('rider.active.checklistAllCollected')
                  : t('rider.active.checklistRemaining', { count: remaining })}
              </Text>
            </View>
          </View>

          {items.map((item, i) => {
            const isChecked = checked[i] ?? false
            return (
              <TouchableOpacity
                key={i}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isChecked }}
                accessibilityLabel={t('rider.active.checklistItemAria', {
                  index: i + 1,
                  total: itemCount,
                  item,
                  state: isChecked
                    ? t('rider.active.checklistChecked')
                    : t('rider.active.checklistUnchecked'),
                })}
                accessibilityHint={
                  isChecked
                    ? t('rider.active.checklistTapToUncheck')
                    : t('rider.active.checklistTapToCheck')
                }
                onPress={() => toggleItem(i)}
                style={styles.checklistRow}
                activeOpacity={0.7}
                testID={`at-pickup-checklist-item-${i}`}
              >
                {isChecked ? (
                  <View style={styles.checkboxChecked}>
                    <Check size={16} color={colors.white} strokeWidth={3} />
                  </View>
                ) : (
                  <View style={styles.checkboxUnchecked} />
                )}
                <Text
                  style={[
                    styles.checklistItemText,
                    isChecked && styles.checklistItemTextChecked,
                  ]}
                  numberOfLines={2}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      ) : (
        <View style={styles.checklistCard}>
          <Text style={styles.noItemsText}>{t('rider.active.atPickupSubtitle')}</Text>
        </View>
      )}

      {/* Scan / verify order code (optional, mock) */}
      <View style={styles.optionalCard}>
        <View style={styles.optionalHeader}>
          <View style={styles.optionalIconWrap}>
            <ScanLine size={18} color={colors.primary} />
          </View>
          <View style={styles.optionalTextWrap}>
            <Text style={styles.optionalTitle}>{t('rider.active.verifyCode')}</Text>
            <Text style={styles.optionalHint}>{t('rider.active.verifyCodeHint')}</Text>
          </View>
        </View>
        {verifyState === 'idle' && (
          <View style={styles.optionalActions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.active.verifyCodeAria')}
              onPress={handleScan}
              style={[styles.optionalBtn, { minHeight: minTouchTarget }]}
              activeOpacity={0.85}
              testID="at-pickup-verify-scan"
            >
              <ScanLine size={16} color={colors.primary} />
              <Text style={styles.optionalBtnText}>{t('rider.active.verifyCode')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.active.verifyCodeSkip')}
              onPress={handleSkipVerify}
              style={[styles.optionalBtnGhost, { minHeight: minTouchTarget }]}
            >
              <Text style={styles.optionalBtnGhostText}>{t('rider.active.verifyCodeSkip')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {verifyState === 'scanning' && (
          <View style={styles.verifyScanningRow}>
            <Text style={styles.verifyScanningText}>{t('rider.active.verifyCodeScanning')}</Text>
          </View>
        )}
        {verifyState === 'verified' && (
          <View style={styles.verifyDoneRow}>
            <CheckCircle2 size={18} color={colors.success} />
            <Text style={styles.verifyDoneText}>{t('rider.active.verifyCodeSuccess')}</Text>
          </View>
        )}
      </View>

      {/* Package photo (optional, mock) */}
      <View style={styles.optionalCard}>
        <View style={styles.optionalHeader}>
          <View style={styles.optionalIconWrap}>
            <Camera size={18} color={colors.primary} />
          </View>
          <View style={styles.optionalTextWrap}>
            <Text style={styles.optionalTitle}>{t('rider.active.packagePhoto')}</Text>
            <Text style={styles.optionalHint}>{t('rider.active.packagePhotoHint')}</Text>
          </View>
        </View>
        {photoState === 'idle' ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.active.packagePhotoAria')}
            onPress={handlePhoto}
            style={[styles.optionalBtn, { minHeight: minTouchTarget }]}
            activeOpacity={0.85}
            testID="at-pickup-photo"
          >
            <Camera size={16} color={colors.primary} />
            <Text style={styles.optionalBtnText}>{t('rider.active.packagePhotoTake')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.photoDoneRow}>
            <View style={styles.photoDoneBadge}>
              <Check size={14} color={colors.success} strokeWidth={3} />
              <Text style={styles.photoDoneText}>{t('rider.active.packagePhotoMock')}</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.active.packagePhotoRetake')}
              onPress={handleRetakePhoto}
              style={[styles.optionalBtnGhost, { minHeight: minTouchTarget }]}
            >
              <Text style={styles.optionalBtnGhostText}>{t('rider.active.packagePhotoRetake')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Payment note: prepaid vs COD */}
      <View
        style={[
          styles.paymentCard,
          isCod ? styles.paymentCardCod : styles.paymentCardPrepaid,
        ]}
        accessibilityRole="summary"
      >
        {isCod ? (
          <>
            <View style={styles.paymentHeader}>
              <View style={styles.paymentIconCod}>
                <Banknote size={18} color={colors.gold} />
              </View>
              <View style={styles.paymentTextWrap}>
                <Text style={styles.paymentTitle}>{t('rider.active.paymentNoteCodShort')}</Text>
                <Text style={styles.paymentBody}>
                  {t('rider.active.paymentNoteCod', { amount: formatNpr(codAmount) })}
                </Text>
              </View>
            </View>
            <View style={styles.codAmountPill}>
              <Text style={styles.codAmountText}>{formatNpr(codAmount)}</Text>
            </View>
          </>
        ) : (
          <View style={styles.paymentHeader}>
            <View style={styles.paymentIconPrepaid}>
              <Wallet size={18} color={colors.success} />
            </View>
            <View style={styles.paymentTextWrap}>
              <Text style={styles.paymentTitlePrepaid}>Prepaid</Text>
              <Text style={styles.paymentBody}>{t('rider.active.paymentNotePrepaid')}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Issues entry — clear secondary */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('rider.active.issueReportAria')}
        accessibilityHint={t('rider.active.issueReportHint')}
        onPress={openIssues}
        style={[styles.issuesBtn, { minHeight: minTouchTarget }]}
        activeOpacity={0.85}
        testID="at-pickup-issues"
      >
        <AlertTriangle size={18} color={colors.warning} />
        <Text style={styles.issuesText}>{t('rider.active.issuesTitle')}</Text>
        <ChevronRight size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Primary: Picked up — start delivery (guarded) */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={
          allCollected
            ? t('rider.active.primary_at_pickup_confirm_aria')
            : t('rider.active.confirmGuard')
        }
        accessibilityState={{ disabled: !allCollected }}
        onPress={handlePickedUp}
        style={[
          styles.primaryBtn,
          allCollected ? styles.primaryBtnReady : styles.primaryBtnGuarded,
        ]}
        activeOpacity={allCollected ? 0.85 : 1}
        testID="at-pickup-confirm"
      >
        <Text
          style={[
            styles.primaryText,
            allCollected ? styles.primaryTextReady : styles.primaryTextGuarded,
          ]}
        >
          {allCollected
            ? t('rider.active.primary_at_pickup_confirm')
            : t('rider.active.primary_at_pickup_guarded')}
        </Text>
        {allCollected && <ChevronRight size={20} color={colors.white} />}
      </TouchableOpacity>

      {/* Issues modal */}
      <Modal
        transparent
        visible={issueOpen}
        animationType="fade"
        onRequestClose={closeIssues}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeIssues}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('rider.active.issueReportTitle')}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.issueReportKeep')}
                onPress={closeIssues}
                style={styles.modalCloseBtn}
                hitSlop={12}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{t('rider.active.issuesSubtitle')}</Text>
            <Text style={styles.modalBody}>{t('rider.active.issueReportBody')}</Text>

            {/* Issue type selection */}
            <View style={styles.issueTypesWrap}>
              {issueTypes.map(({ key, label, desc }) => {
                const selected = issueType === key
                return (
                  <TouchableOpacity
                    key={key}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={label}
                    onPress={() => {
                      setIssueType(key)
                      try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
                    }}
                    style={[
                      styles.issueTypeBtn,
                      selected && styles.issueTypeBtnSelected,
                    ]}
                    activeOpacity={0.85}
                    testID={`at-pickup-issue-type-${key}`}
                  >
                    <View style={styles.issueTypeTextWrap}>
                      <Text
                        style={[
                          styles.issueTypeLabel,
                          selected && styles.issueTypeLabelSelected,
                        ]}
                      >
                        {label}
                      </Text>
                      <Text style={styles.issueTypeDesc}>{desc}</Text>
                    </View>
                    {selected && <Check size={18} color={colors.primary} strokeWidth={3} />}
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Report text input */}
            <View style={styles.inputWrap}>
              <TextInput
                accessibilityLabel={t('rider.active.issueReportPlaceholder')}
                value={issueText}
                onChangeText={setIssueText}
                placeholder={t('rider.active.issueReportPlaceholder')}
                placeholderTextColor={colors.textMuted}
                multiline
                style={styles.input}
                testID="at-pickup-issue-text"
              />
            </View>

            {/* Modal actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.issueReportKeep')}
                onPress={closeIssues}
                style={styles.modalSecondary}
              >
                <Text style={styles.modalSecondaryText}>{t('rider.active.issueReportKeep')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.issueReportSubmit')}
                onPress={submitIssue}
                style={styles.modalPrimary}
              >
                <Text style={styles.modalPrimaryText}>{t('rider.active.issueReportSubmit')}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.active.issueReportCancel')}
              onPress={cancelFromIssue}
              style={styles.modalCancelBtn}
            >
              <Text style={styles.modalCancelText}>{t('rider.active.issueReportCancel')}</Text>
            </TouchableOpacity>
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
  // Checklist card
  checklistCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    gap: spacing[2],
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  checklistTitle: {
    flex: 1,
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  checklistPill: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  checklistPillDone: {
    backgroundColor: colors.successLight,
  },
  checklistPillPending: {
    backgroundColor: colors.primary50,
  },
  checklistPillText: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
  },
  checklistPillTextDone: {
    color: colors.success,
  },
  checklistPillTextPending: {
    color: colors.primary,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
    borderRadius: radii.lg,
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnchecked: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  checklistItemText: {
    flex: 1,
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.text,
  },
  checklistItemTextChecked: {
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  noItemsText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
    paddingVertical: spacing[2],
  },
  // Optional cards (verify + photo)
  optionalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    gap: spacing[2],
  },
  optionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  optionalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionalTextWrap: {
    flex: 1,
    gap: 1,
  },
  optionalTitle: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  optionalHint: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  optionalActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  optionalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    paddingVertical: spacing[2.5],
  },
  optionalBtnText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  optionalBtnGhost: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.lg,
  },
  optionalBtnGhostText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  verifyScanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  verifyScanningText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.textSecondary,
  },
  verifyDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  verifyDoneText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.success,
  },
  photoDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  photoDoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  photoDoneText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.success,
  },
  // Payment note
  paymentCard: {
    borderRadius: radii.xl,
    padding: spacing[3],
    borderWidth: 1,
  },
  paymentCardCod: {
    backgroundColor: colors.warningLight,
    borderColor: colors.gold,
  },
  paymentCardPrepaid: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  paymentIconCod: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(224,169,59,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIconPrepaid: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(22,163,74,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTextWrap: {
    flex: 1,
    gap: 1,
  },
  paymentTitle: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.gold,
  },
  paymentTitlePrepaid: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.success,
  },
  paymentBody: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
  },
  codAmountPill: {
    alignSelf: 'flex-start',
    marginTop: spacing[2],
    backgroundColor: colors.gold,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.lg,
  },
  codAmountText: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.white,
  },
  // Issues button
  issuesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    backgroundColor: colors.warningLight,
  },
  issuesText: {
    flex: 1,
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
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
    backgroundColor: colors.primary,
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
  // Issues modal
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
  issueTypesWrap: {
    gap: spacing[2],
  },
  issueTypeBtn: {
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
  issueTypeBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  issueTypeTextWrap: {
    flex: 1,
    gap: 1,
  },
  issueTypeLabel: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  issueTypeLabelSelected: {
    color: colors.primary,
  },
  issueTypeDesc: {
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
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalPrimaryText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.white,
  },
  modalCancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  modalCancelText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.error,
  },
})
