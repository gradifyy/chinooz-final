import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
  Linking,
  Platform,
  Alert,
  Modal,
  Pressable,
  TextInput,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  Navigation2,
  Phone,
  MessageCircle,
  MapPin,
  StickyNote,
  ChevronRight,
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  ArrowUpRight,
  ArrowUpLeft,
  Banknote,
  Wallet,
  AlertTriangle,
  X,
  Check,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, shadows } from '@chinooz/theme'
import { useA11y } from '../A11yProvider'
import { turnHint } from '@chinooz/rs3'
import { analytics } from '@chinooz/analytics'
import type { ActiveDelivery } from '@chinooz/types'

interface InTransitStepProps {
  delivery: ActiveDelivery
  /** Fired when the rider taps "Arrived at drop-off". */
  onArrived: () => void
  /** Fired when the rider cancels from the can't-find flow. */
  onCancel: (reason: string) => void
}

type CantFindIssueType = 'address' | 'customer' | 'other'

function formatEta(sec: number): string {
  if (sec <= 0) return '0 min'
  const mins = Math.max(1, Math.round(sec / 60))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

function formatDistance(meters: number): string {
  if (meters <= 0) return '0 m'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function formatNpr(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`
}

/**
 * RA4 — in_transit step content.
 *
 * Renders the route ETA/distance with a turn hint driven by the RS3 trip
 * simulator on the drop-off leg, a "Navigate" handoff button (deep-link to
 * external maps), a drop-off card (buyer name/area/address, delivery note,
 * COD-to-collect pill, contact call/chat), a "can't find address / customer
 * unreachable" issue flow (report to dispatch or cancel), and the obvious
 * "Arrived at drop-off" primary action.
 *
 * Battery/data-conscious: the step avoids re-renders when ETA buckets don't
 * change (30s granularity for announcements), uses lightweight SVG-driven
 * visuals, and the simulator tick is owned by the route (1s interval) so the
 * step only reads the store.
 *
 * All values come from the shared activeDelivery store (single source of
 * truth).
 */
export default function InTransitStep({ delivery, onArrived, onCancel }: InTransitStepProps) {
  const { t } = useTranslation()
  const { reducedMotion, minTouchTarget } = useA11y()
  const { dropoff, legToDropoff, legProgress, etaSeconds, distanceMeters, isCod, codAmount, customerName } = delivery

  // Turn hint driven by the simulator progress on the drop-off leg.
  const hint = useMemo(() => turnHint(legToDropoff, legProgress), [legToDropoff, legProgress])

  const turnText = useMemo(() => {
    if (!hint) return null
    const distStr =
      hint.distanceMeters >= 1000
        ? t('rider.active.turnDistanceKm', { distance: (hint.distanceMeters / 1000).toFixed(1) })
        : t('rider.active.turnDistanceM', { distance: hint.distanceMeters })
    if (hint.instruction === 'arrived') return t('rider.active.turnArrived')
    const dirKey = `rider.active.turn${hint.instruction.charAt(0).toUpperCase()}${hint.instruction.slice(1)}`
    return `${t(dirKey, { heading: hint.heading })} ${distStr}`
  }, [hint, t])

  const TurnIcon = useMemo(() => {
    if (!hint) return ArrowUp
    switch (hint.instruction) {
      case 'slight_left': return ArrowUpLeft
      case 'slight_right': return ArrowUpRight
      case 'left': return CornerUpLeft
      case 'right': return CornerUpRight
      case 'arrived': return MapPin
      default: return ArrowUp
    }
  }, [hint])

  // Announce ETA/distance on meaningful change (every ~30s or on arrival).
  // Battery/data-conscious: only announce when the rounded bucket changes.
  const prevAnnounce = useRef<string>('')
  useEffect(() => {
    const arrived = distanceMeters <= 0
    const msg = arrived
      ? t('rider.active.etaArrivedAnnounce')
      : t('rider.active.etaAnnounce', {
          eta: formatEta(etaSeconds),
          distance: formatDistance(distanceMeters),
        })
    const bucket = arrived ? 'arrived' : `${Math.round(etaSeconds / 30)}`
    if (bucket !== prevAnnounce.current) {
      prevAnnounce.current = bucket
      try { AccessibilityInfo.announceForAccessibility(msg) } catch {}
    }
  }, [etaSeconds, distanceMeters, t])

  // Announce COD reminder once on entry (if COD).
  const codAnnounced = useRef(false)
  useEffect(() => {
    if (isCod && codAmount > 0 && !codAnnounced.current) {
      codAnnounced.current = true
      try {
        AccessibilityInfo.announceForAccessibility(
          t('rider.active.codReminderAria', { amount: formatNpr(codAmount) }),
        )
      } catch {}
    }
  }, [isCod, codAmount, t])

  // Navigate handoff: deep-link to the drop-off in external maps.
  const handleNavigate = useCallback(async () => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) } catch {}
    analytics.track({ event: 'rider_active_navigate', screen: 'rider-active-delivery', target: 'dropoff' })
    const { lat, lng } = dropoff
    const apple = `maps://app?daddr=${lat},${lng}&q=${encodeURIComponent(dropoff.label)}`
    const google = `google.navigation:q=${lat},${lng}&mode=two_wheeler`
    const googleHttp = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    const tryOpen = async (url: string): Promise<boolean> => {
      try {
        const can = await Linking.canOpenURL(url)
        if (can) {
          await Linking.openURL(url)
          return true
        }
      } catch {}
      return false
    }

    if (Platform.OS === 'ios') {
      if (await tryOpen(apple)) return
      if (await tryOpen(googleHttp)) return
    } else {
      if (await tryOpen(google)) return
      if (await tryOpen(googleHttp)) return
    }
    try { AccessibilityInfo.announceForAccessibility(t('rider.active.navigateUnavailable')) } catch {}
    Alert.alert(t('rider.active.navigate'), t('rider.active.navigateUnavailable'))
  }, [reducedMotion, dropoff, t])

  const handleCall = useCallback(async () => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    const url = Platform.OS === 'ios' ? `telprompt:${dropoff.contactPhone}` : `tel:${dropoff.contactPhone}`
    try { await Linking.openURL(url) } catch {}
  }, [reducedMotion, dropoff])

  const handleChat = useCallback(() => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    try { AccessibilityInfo.announceForAccessibility(t('rider.active.contactChatSoon')) } catch {}
    Alert.alert(t('rider.active.contactChat'), t('rider.active.contactChatSoon'))
  }, [reducedMotion, t])

  const handleArrived = useCallback(() => {
    try { if (!reducedMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
    try {
      AccessibilityInfo.announceForAccessibility(t('rider.active.primary_in_transit_arrived_aria'))
    } catch {}
    analytics.track({ event: 'rider_active_arrived_dropoff', screen: 'rider-active-delivery' })
    onArrived()
  }, [reducedMotion, t, onArrived])

  // --- Can't-find-address / customer-unreachable flow ---
  const [issueOpen, setIssueOpen] = useState(false)
  const [issueType, setIssueType] = useState<CantFindIssueType | null>(null)
  const [issueText, setIssueText] = useState('')

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
    const detail = issueText || t('rider.active.cantFindPlaceholder')
    analytics.track({
      event: 'rider_active_dropoff_issue',
      screen: 'rider-active-delivery',
      type: issueType,
      detail,
    })
    closeIssues()
    try { AccessibilityInfo.announceForAccessibility(t('rider.active.cantFindReported')) } catch {}
  }, [issueType, issueText, closeIssues, t])

  const cancelFromIssue = useCallback(() => {
    const reason = issueType
      ? `${issueType}: ${issueText || t('rider.active.cantFindPlaceholder')}`
      : issueText || 'dropoff_issue'
    analytics.track({
      event: 'rider_active_cancel_from_dropoff_issue',
      screen: 'rider-active-delivery',
      type: issueType,
    })
    closeIssues()
    onCancel(reason)
  }, [issueType, issueText, closeIssues, onCancel, t])

  const issueTypes: { key: CantFindIssueType; label: string; desc: string }[] = [
    { key: 'address', label: t('rider.active.cantFindAddressIssue'), desc: t('rider.active.cantFindAddressDesc') },
    { key: 'customer', label: t('rider.active.cantFindCustomerIssue'), desc: t('rider.active.cantFindCustomerDesc') },
    { key: 'other', label: t('rider.active.cantFindOtherIssue'), desc: t('rider.active.cantFindOtherDesc') },
  ]

  return (
    <View style={styles.wrap} testID="in-transit-step">
      {/* ETA + turn hint band — glanceable, high-contrast */}
      <View style={styles.navBand} accessibilityRole="summary">
        <View style={styles.turnIconWrap}>
          <TurnIcon size={22} color={colors.white} />
        </View>
        <View style={styles.turnTextWrap}>
          {turnText ? (
            <Text style={styles.turnText} numberOfLines={2}>{turnText}</Text>
          ) : (
            <Text style={styles.turnText} numberOfLines={1}>
              {t('rider.active.inTransitTitle')}
            </Text>
          )}
          <Text style={styles.etaText} numberOfLines={1}>
            {distanceMeters <= 0
              ? t('rider.active.etaArrivedAnnounce')
              : `${formatEta(etaSeconds)} · ${formatDistance(distanceMeters)}`}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('rider.active.navigateAria')}
          accessibilityHint={t('rider.active.navigateHint')}
          onPress={handleNavigate}
          style={[styles.navigateBtn, { minWidth: 56, minHeight: 56 }]}
          activeOpacity={0.85}
          testID="in-transit-navigate"
        >
          <Navigation2 size={22} color={colors.white} />
          <Text style={styles.navigateText}>{t('rider.active.navigate')}</Text>
        </TouchableOpacity>
      </View>

      {/* Drop-off card */}
      <View style={styles.dropoffCard} accessibilityRole="summary">
        <View style={styles.dropoffHeader}>
          <View style={styles.dropoffIcon}>
            <MapPin size={16} color={colors.primaryDark} />
          </View>
          <View style={styles.dropoffHeaderText}>
            <Text style={styles.dropoffTitle} numberOfLines={1}>{dropoff.label}</Text>
            {dropoff.area ? (
              <Text style={styles.dropoffArea} numberOfLines={1}>
                {t('rider.active.dropoffCardArea')}: {dropoff.area}
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.dropoffAddress} numberOfLines={2}>{dropoff.address}</Text>

        {/* Delivery note */}
        {dropoff.deliveryNote ? (
          <View style={styles.noteBlock}>
            <View style={styles.noteHeader}>
              <StickyNote size={14} color={colors.gold} />
              <Text style={styles.noteTitle}>{t('rider.active.dropoffCardNote')}</Text>
            </View>
            <Text style={styles.noteFrom}>
              {t('rider.active.dropoffCardNoteFrom', { buyer: customerName })}
            </Text>
            <Text style={styles.noteText}>{dropoff.deliveryNote}</Text>
          </View>
        ) : (
          <View style={styles.noteBlock}>
            <Text style={styles.noNoteText}>{t('rider.active.dropoffCardNoNote')}</Text>
          </View>
        )}

        {/* COD reminder — prominent pill */}
        <View
          style={[
            styles.codReminder,
            isCod ? styles.codReminderCod : styles.codReminderPrepaid,
          ]}
          accessibilityRole="summary"
          accessibilityLabel={
            isCod
              ? t('rider.active.codReminderAria', { amount: formatNpr(codAmount) })
              : t('rider.active.codReminderPrepaid')
          }
        >
          {isCod ? (
            <>
              <View style={styles.codIconWrap}>
                <Banknote size={18} color={colors.gold} />
              </View>
              <View style={styles.codTextWrap}>
                <Text style={styles.codTitle}>{t('rider.active.codReminderTitle')}</Text>
                <Text style={styles.codBody}>
                  {t('rider.active.codReminderBody', { amount: formatNpr(codAmount) })}
                </Text>
              </View>
              <View style={styles.codPill}>
                <Text style={styles.codPillText}>{formatNpr(codAmount)}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.codIconWrapPrepaid}>
                <Wallet size={18} color={colors.success} />
              </View>
              <View style={styles.codTextWrap}>
                <Text style={styles.codTitlePrepaid}>{t('rider.active.codReminderTitle')}</Text>
                <Text style={styles.codBody}>{t('rider.active.codReminderPrepaid')}</Text>
              </View>
            </>
          )}
        </View>

        {/* Contact: call + chat */}
        <View style={styles.contactRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.active.contactCallAria', {
              name: dropoff.contactName,
              phone: dropoff.contactPhone,
            })}
            onPress={handleCall}
            style={[styles.contactBtn, { minHeight: minTouchTarget }]}
            activeOpacity={0.85}
            testID="in-transit-call"
          >
            <Phone size={16} color={colors.primary} />
            <Text style={styles.contactText}>{t('rider.active.contactCall')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.active.contactChatAria', { name: dropoff.contactName })}
            onPress={handleChat}
            style={[styles.contactBtn, styles.contactBtnChat, { minHeight: minTouchTarget }]}
            activeOpacity={0.85}
            testID="in-transit-chat"
          >
            <MessageCircle size={16} color={colors.primary} />
            <Text style={styles.contactText}>{t('rider.active.contactChat')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Can't-find-address — clear secondary */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('rider.active.cantFindAddressAria')}
        accessibilityHint={t('rider.active.cantFindAddressHint')}
        onPress={openIssues}
        style={[styles.issuesBtn, { minHeight: minTouchTarget }]}
        activeOpacity={0.85}
        testID="in-transit-cant-find"
      >
        <AlertTriangle size={18} color={colors.warning} />
        <Text style={styles.issuesText}>{t('rider.active.cantFindAddress')}</Text>
        <ChevronRight size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Primary: Arrived at drop-off — huge + obvious */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('rider.active.primary_in_transit_arrived_aria')}
        onPress={handleArrived}
        style={styles.arrivedBtn}
        activeOpacity={0.85}
        testID="in-transit-arrived"
      >
        <MapPin size={22} color={colors.white} />
        <Text style={styles.arrivedText}>{t('rider.active.primary_in_transit_arrived')}</Text>
        <ChevronRight size={20} color={colors.white} />
      </TouchableOpacity>

      {/* Can't-find-address modal */}
      <Modal
        transparent
        visible={issueOpen}
        animationType="fade"
        onRequestClose={closeIssues}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeIssues}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('rider.active.cantFindTitle')}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.cantFindKeep')}
                onPress={closeIssues}
                style={styles.modalCloseBtn}
                hitSlop={12}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{t('rider.active.cantFindSubtitle')}</Text>
            <Text style={styles.modalBody}>{t('rider.active.cantFindBody')}</Text>

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
                    testID={`in-transit-issue-type-${key}`}
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
                accessibilityLabel={t('rider.active.cantFindPlaceholder')}
                value={issueText}
                onChangeText={setIssueText}
                placeholder={t('rider.active.cantFindPlaceholder')}
                placeholderTextColor={colors.textMuted}
                multiline
                style={styles.input}
                testID="in-transit-issue-text"
              />
            </View>

            {/* Modal actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.cantFindKeep')}
                onPress={closeIssues}
                style={styles.modalSecondary}
              >
                <Text style={styles.modalSecondaryText}>{t('rider.active.cantFindKeep')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.cantFindSubmit')}
                onPress={submitIssue}
                style={styles.modalPrimary}
              >
                <Text style={styles.modalPrimaryText}>{t('rider.active.cantFindSubmit')}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.active.cantFindCancel')}
              onPress={cancelFromIssue}
              style={styles.modalCancelBtn}
            >
              <Text style={styles.modalCancelText}>{t('rider.active.cantFindCancel')}</Text>
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
  // Nav band: ETA + turn hint + Navigate button
  navBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.primaryDark,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  turnIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnTextWrap: {
    flex: 1,
    gap: 1,
  },
  turnText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.white,
    lineHeight: 19,
  },
  etaText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: 'rgba(255,255,255,0.8)',
  },
  navigateBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[2],
    gap: 2,
  },
  navigateText: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.primaryDark,
  },
  // Drop-off card
  dropoffCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  dropoffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  dropoffIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropoffHeaderText: {
    flex: 1,
    gap: 1,
  },
  dropoffTitle: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  dropoffArea: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  dropoffAddress: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
  },
  // Delivery note
  noteBlock: {
    gap: spacing[1],
    paddingTop: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  noteTitle: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  noteFrom: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  noteText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  noNoteText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  // COD reminder
  codReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderRadius: radii.lg,
    padding: spacing[3],
  },
  codReminderCod: {
    backgroundColor: colors.warningLight,
  },
  codReminderPrepaid: {
    backgroundColor: colors.successLight,
  },
  codIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(224,169,59,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codIconWrapPrepaid: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(22,163,74,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codTextWrap: {
    flex: 1,
    gap: 1,
  },
  codTitle: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.gold,
  },
  codTitlePrepaid: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.success,
  },
  codBody: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
  },
  codPill: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.lg,
  },
  codPillText: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.white,
  },
  // Contact
  contactRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingTop: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    paddingVertical: spacing[2.5],
  },
  contactBtnChat: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary50,
  },
  contactText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  // Can't-find-address secondary
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
  // Arrived primary
  arrivedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    width: '100%',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    minHeight: 60,
    ...shadows.md,
  },
  arrivedText: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.white,
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
