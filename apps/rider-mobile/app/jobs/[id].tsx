import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  AccessibilityInfo,
  Dimensions,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  MapPin,
  Navigation,
  Clock,
  Banknote,
  Package,
  Store,
  User,
  Phone,
  StickyNote,
  Lock,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { useJobById, useAcceptJob, useDeclineJob } from '@chinooz/hooks'
import { useActiveDeliveryStore, useCodLimitStatus } from '@chinooz/state'
import { jobRequestToActivePayload } from '@chinooz/rs3'
import { analytics } from '@chinooz/analytics'
import { RIDER_LOCATION } from '@chinooz/mock-data'
import type { RiderJob } from '@chinooz/types'
import { formatNpr, formatNprTabular, formatKm, formatDuration, formatCountdown } from '../../components/jobs/format'
import RoutePreviewMap from '../../components/jobs/RoutePreviewMap'
import PayoutBreakdownCard, { derivePayoutBreakdown } from '../../components/jobs/PayoutBreakdownCard'

/** Translate with an inline English fallback (rider i18n is under restructuring). */
function useTt() {
  const { t } = useTranslation()
  return useCallback(
    (key: string, vars?: Record<string, string | number>, fallback?: string) => {
      const raw = t(key, vars ?? {})
      if (raw === key || raw === undefined) return fallback ?? key
      return raw
    },
    [t],
  )
}

/** Extract extended metadata from a RiderJob (items, totalNpr, prepNote). */
function getJobExtras(job: RiderJob) {
  const items = (job as unknown as { items?: { name: string }[] }).items
  const totalNpr = (job as unknown as { totalNpr?: number }).totalNpr
  const prepNote = job.pickup.prepNote
  const deliveryNote = job.dropoff.prepNote
  return {
    itemNames: items?.map(i => i.name) ?? [],
    totalNpr,
    prepNote,
    deliveryNote,
  }
}

export default function JobDetailScreen() {
  const tt = useTt()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const params = useLocalSearchParams<{ id: string }>()

  const jobId = params.id

  // Fetch the job by id (TanStack Query, 15s staleTime).
  const { data: job, isLoading, isError, refetch } = useJobById(jobId)

  // COD limit — at limit, COD jobs can't be accepted.
  const codLimitStatus = useCodLimitStatus()
  const codAtLimit = codLimitStatus.kind === 'atLimit'

  // Active delivery store (accept → store + navigate to Active).
  const acceptJobStore = useActiveDeliveryStore(s => s.acceptJob)

  // Accept / decline mutations.
  const acceptMutation = useAcceptJob()
  const declineMutation = useDeclineJob()

  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)

  // Track whether this job was taken/expired while viewing.
  const [takenState, setTakenState] = useState<'taken' | 'expired' | null>(null)
  const prevJobExists = useRef(true)

  // Detect job disappearing from the pool (accepted by someone else / expired).
  useEffect(() => {
    if (job === null && prevJobExists.current && !isLoading) {
      setTakenState('taken')
      AccessibilityInfo.announceForAccessibility(
        tt('rider.jobs.detail.takenAnnounce', undefined, 'This job is no longer available.'),
      )
    }
    if (job !== null) prevJobExists.current = true
    else prevJobExists.current = false
  }, [job, isLoading, tt])

  // Countdown for time-limited offers (mock: 180s from screen open).
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null)
  const [nowTick, setNowTick] = useState(Date.now())
  const lastAnnouncedMinute = useRef<number | null>(null)

  useEffect(() => {
    if (job) {
      // Use the job's createdAt + 180s as the expiry window (mock time limit).
      const created = new Date(job.createdAt).getTime()
      const expiry = created + 180_000
      if (expiry > Date.now()) {
        setExpiresAtMs(expiry)
      } else {
        setTakenState('expired')
        setExpiresAtMs(null)
      }
    }
  }, [job])

  // Tick every second for the countdown.
  useEffect(() => {
    if (!expiresAtMs) return
    const id = setInterval(() => {
      const now = Date.now()
      setNowTick(now)
      if (now >= expiresAtMs) {
        setTakenState('expired')
        setExpiresAtMs(null)
        AccessibilityInfo.announceForAccessibility(
          tt('rider.jobs.detail.expiredAnnounce', undefined, 'This job offer has expired.'),
        )
        clearInterval(id)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAtMs, tt])

  // Announce countdown at minute intervals.
  useEffect(() => {
    if (!expiresAtMs) return
    const remaining = expiresAtMs - nowTick
    if (remaining <= 0) return
    const minutes = Math.ceil(remaining / 60000)
    if (minutes !== lastAnnouncedMinute.current && minutes <= 3 && minutes > 0) {
      lastAnnouncedMinute.current = minutes
      AccessibilityInfo.announceForAccessibility(
        tt('rider.jobs.detail.countdownAnnounce', { minutes }, `${minutes} minute${minutes === 1 ? '' : 's'} remaining to accept.`),
      )
    }
  }, [nowTick, expiresAtMs, tt])

  useEffect(() => {
    analytics.screen({ name: 'rider-job-detail', properties: { jobId } })
  }, [jobId])

  const tick = () => {
    try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }

  const handleAccept = useCallback(async () => {
    if (!job || accepting || takenState) return
    // COD at limit — can't accept COD jobs.
    if (job.isCod && codAtLimit) return

    setAccepting(true)
    try { if (!reduced) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
    analytics.track({ name: 'rider_accept_job', properties: { jobId: job.id, orderRef: job.orderRef } })

    const opRef = `accept-${job.id}-${Date.now()}`
    const result = await acceptMutation.mutateAsync({ jobId: job.id, opRef })

    if (result.success && result.activeDelivery) {
      // Store the active delivery in the Zustand store + navigate to Active.
      const payload = jobRequestToActivePayload({
        id: job.id,
        orderRef: job.orderRef,
        pickupLabel: job.pickup.label,
        dropoffLabel: job.dropoff.label,
        payout: job.payout,
      })
      acceptJobStore(payload)
      AccessibilityInfo.announceForAccessibility(
        tt('rider.jobs.detail.acceptedAnnounce', undefined, 'Job accepted. Starting delivery.'),
      )
      router.replace('/active')
    } else {
      // Accept failed — job may have been taken.
      setTakenState('taken')
      AccessibilityInfo.announceForAccessibility(
        tt('rider.jobs.detail.takenAnnounce', undefined, 'This job is no longer available.'),
      )
    }
  }, [job, accepting, takenState, codAtLimit, reduced, acceptMutation, acceptJobStore, router, tt])

  const handleDecline = useCallback(async () => {
    if (!job || declining) return
    setDeclining(true)
    tick()
    analytics.track({ name: 'rider_decline_job', properties: { jobId: job.id } })

    const opRef = `decline-${job.id}-${Date.now()}`
    try {
      await declineMutation.mutateAsync({ jobId: job.id, opRef })
    } catch {
      // Even if the API fails, navigate back to the list.
    }
    AccessibilityInfo.announceForAccessibility(
      tt('rider.jobs.detail.declinedAnnounce', undefined, 'Job declined.'),
    )
    router.back()
  }, [job, declining, reduced, declineMutation, router, tt])

  const handleBack = useCallback(() => {
    tick()
    router.back()
  }, [router])

  // Derived data for the route map + breakdown.
  const tripDistanceKm = useMemo(() => {
    if (!job) return 0
    return Math.max(0.1, Math.round((job.legToDropoff.distanceMeters / 1000) * 10) / 10)
  }, [job])

  const pickupDistanceKm = useMemo(() => {
    if (!job) return 0
    return Math.max(0.1, Math.round((job.legToPickup.distanceMeters / 1000) * 10) / 10)
  }, [job])

  const estTimeMin = useMemo(() => {
    if (!job) return 0
    return Math.max(1, Math.round((job.legToPickup.etaSeconds + job.legToDropoff.etaSeconds) / 60))
  }, [job])

  const breakdown = useMemo(() => {
    if (!job) return null
    return derivePayoutBreakdown(job.payout, tripDistanceKm)
  }, [job, tripDistanceKm])

  const extras = useMemo(() => (job ? getJobExtras(job) : null), [job])

  const countdownLabel = useMemo(() => {
    if (!expiresAtMs) return null
    return formatCountdown(expiresAtMs, nowTick)
  }, [expiresAtMs, nowTick])

  const isCodJob = job?.isCod && job.codAmount > 0
  const codBlocked = isCodJob && codAtLimit

  // -- Loading state --
  if (isLoading && !job) {
    return (
      <View style={styles.container}>
        <DetailHeader onBack={handleBack} title={tt('rider.jobs.detail.title', undefined, 'Job details')} insets={insets} />
        <View style={styles.skeletonWrap}>
          <View style={[styles.skeletonBlock, { height: 240 }]} />
          <View style={[styles.skeletonBlock, { height: 160 }]} />
          <View style={[styles.skeletonBlock, { height: 120 }]} />
          <View style={[styles.skeletonBlock, { height: 120 }]} />
        </View>
      </View>
    )
  }

  // -- Error state --
  if (isError && !job) {
    return (
      <View style={styles.container}>
        <DetailHeader onBack={handleBack} title={tt('rider.jobs.detail.title', undefined, 'Job details')} insets={insets} />
        <View style={styles.emptyWrap}>
          <AlertTriangle size={32} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>{tt('rider.jobs.detail.errorTitle', undefined, 'Could not load job')}</Text>
          <Text style={styles.emptySubtitle}>{tt('common.error', undefined, 'Something went wrong')}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={tt('common.retry', undefined, 'Retry')}
            onPress={() => refetch()}
            style={styles.retryBtn}
          >
            <Text style={styles.retryText}>{tt('common.retry', undefined, 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // -- Taken / expired state (role=alert) --
  if (takenState || !job) {
    const isExpired = takenState === 'expired'
    const isTaken = takenState === 'taken' || !job
    return (
      <View style={styles.container}>
        <DetailHeader onBack={handleBack} title={tt('rider.jobs.detail.title', undefined, 'Job details')} insets={insets} />
        <View
          style={styles.takenWrap}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          testID="job-detail-unavailable"
        >
          <View style={styles.takenIcon}>
            {isExpired ? (
              <Clock size={32} color={colors.warning} />
            ) : (
              <X size={32} color={colors.error} />
            )}
          </View>
          <Text style={styles.takenTitle}>
            {isExpired
              ? tt('rider.jobs.detail.expiredTitle', undefined, 'Offer expired')
              : tt('rider.jobs.detail.takenTitle', undefined, 'Job no longer available')}
          </Text>
          <Text style={styles.takenSubtitle}>
            {isExpired
              ? tt('rider.jobs.detail.expiredSubtitle', undefined, 'This job offer has expired. Check the Available list for more deliveries.')
              : tt('rider.jobs.detail.takenSubtitle', undefined, 'Another rider may have accepted this job. Check the Available list for more deliveries.')}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={tt('rider.jobs.detail.backToList', undefined, 'Back to available jobs')}
            onPress={() => router.replace('/jobs')}
            style={styles.takenCta}
          >
            <Text style={styles.takenCtaText}>{tt('rider.jobs.detail.backToList', undefined, 'Back to available jobs')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // -- Job detail content --
  return (
    <View style={styles.container}>
      <DetailHeader
        onBack={handleBack}
        title={tt('rider.jobs.detail.title', undefined, 'Job details')}
        insets={insets}
        countdown={countdownLabel}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, gap: spacing[3] }}
        showsVerticalScrollIndicator={false}
        testID="job-detail-scroll"
      >
        {/* Order ref + COD pill */}
        <View style={styles.refRow}>
          <Text style={styles.orderRef}>
            {tt('rider.jobs.activeOrderRef', { ref: job.orderRef }, `Order ${job.orderRef}`)}
          </Text>
          {isCodJob ? (
            <View style={styles.codPill} testID="job-detail-cod-pill">
              <Banknote size={13} color={colors.warning} />
              <Text style={styles.codPillText}>
                {tt('rider.jobs.detail.codToCollect', { amount: formatNpr(job.codAmount) }, `COD: ${formatNpr(job.codAmount)}`)}
              </Text>
            </View>
          ) : (
            <View style={styles.prepaidPill}>
              <CheckCircle2 size={13} color={colors.success} />
              <Text style={styles.prepaidPillText}>{tt('rider.jobs.detail.prepaid', undefined, 'Prepaid')}</Text>
            </View>
          )}
        </View>

        {/* Hero: route preview map */}
        <View style={styles.heroWrap}>
          <RoutePreviewMap
            riderLocation={RIDER_LOCATION}
            pickup={job.pickup}
            dropoff={job.dropoff}
            pickupLabel={job.pickup.label}
            dropoffLabel={job.dropoff.label}
            tripDistanceKm={tripDistanceKm}
            estTimeMin={estTimeMin}
            estPayout={job.payout}
            testID="job-detail-route-map"
          />
        </View>

        {/* Payout breakdown */}
        {breakdown && (
          <View style={styles.sectionWrap}>
            <PayoutBreakdownCard
              breakdown={breakdown}
              testID="job-detail-payout"
            />
          </View>
        )}

        {/* Pickup details card */}
        <DetailCard
          testID="job-detail-pickup"
          icon={<Store size={16} color={colors.gold} />}
          iconBg={colors.warningLight}
          title={tt('rider.jobs.detail.pickupTitle', undefined, 'Pickup')}
          placeName={job.pickup.label}
          area={job.pickup.area}
          address={job.pickup.address}
          contactName={job.pickup.contactName}
          contactPhone={job.pickup.contactPhone}
          items={extras?.itemNames}
          prepNote={extras?.prepNote}
          distanceLabel={tt('rider.jobs.detail.pickupDistance', { km: formatKm(pickupDistanceKm) }, `${formatKm(pickupDistanceKm)} from you`)}
          tt={tt}
        />

        {/* Drop-off details card */}
        <DetailCard
          testID="job-detail-dropoff"
          icon={<User size={16} color={colors.info} />}
          iconBg={colors.infoLight}
          title={tt('rider.jobs.detail.dropoffTitle', undefined, 'Drop-off')}
          placeName={job.dropoff.label}
          area={job.dropoff.area}
          address={job.dropoff.address}
          contactName={job.dropoff.contactName}
          contactPhone={job.dropoff.contactPhone}
          deliveryNote={extras?.deliveryNote}
          distanceLabel={tt('rider.jobs.detail.tripDistance', { km: formatKm(tripDistanceKm) }, `${formatKm(tripDistanceKm)} trip`)}
          tt={tt}
        />

        {/* COD-to-collect pill (standalone, if COD) */}
        {isCodJob && (
          <View style={styles.codCollectCard} testID="job-detail-cod-collect">
            <View style={styles.codCollectLeft}>
              <View style={[styles.codCollectIcon, { backgroundColor: colors.warningLight }]}>
                <Banknote size={18} color={colors.warning} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.codCollectTitle}>{tt('rider.jobs.detail.codToCollectTitle', undefined, 'Cash to collect on delivery')}</Text>
                <Text style={styles.codCollectSub}>{tt('rider.jobs.detail.codToCollectSub', undefined, 'Collect this amount from the buyer at drop-off.')}</Text>
              </View>
            </View>
            <Text style={styles.codCollectAmount}>{formatNprTabular(job.codAmount)}</Text>
          </View>
        )}

        {/* COD-limit warning (if blocked) */}
        {codBlocked && (
          <View
            style={styles.codBlockedBanner}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            testID="job-detail-cod-blocked"
          >
            <View style={styles.codBlockedHeader}>
              <Lock size={16} color={colors.error} />
              <Text style={styles.codBlockedTitle}>{tt('rider.jobs.detail.codBlockedTitle', undefined, 'COD jobs paused')}</Text>
            </View>
            <Text style={styles.codBlockedSub}>
              {tt('rider.jobs.detail.codBlockedSub', { limit: codLimitStatus.maxCodFloat }, "You're at the COD cash limit. Deposit cash to unlock COD orders.")}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={tt('rider.jobs.detail.depositToUnlock', undefined, 'Deposit to unlock')}
              onPress={() => router.push('/wallet/deposit' as never)}
              style={styles.codBlockedCta}
            >
              <Text style={styles.codBlockedCtaText}>{tt('rider.jobs.detail.depositToUnlock', undefined, 'Deposit to unlock')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Sticky action bar: Accept (primary) + Decline */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing[3] }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={tt('rider.jobs.detail.declineAria', undefined, 'Decline this job and go back')}
          accessibilityHint={tt('rider.jobs.detail.declineHint', undefined, 'Removes this job from your available list')}
          onPress={handleDecline}
          disabled={declining || !!takenState}
          style={styles.declineBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.declineText}>
            {declining ? tt('rider.jobs.detail.declining', undefined, 'Declining…') : tt('rider.jobs.detail.decline', undefined, 'Decline')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            codBlocked
              ? tt('rider.jobs.detail.acceptBlockedAria', undefined, 'Accept is disabled. You are at the COD cash limit. Deposit to unlock COD orders.')
              : tt('rider.jobs.detail.acceptAria', { ref: job.orderRef }, `Accept job ${job.orderRef}`)
          }
          accessibilityHint={tt('rider.jobs.detail.acceptHint', undefined, 'Accepts this delivery and starts the active trip')}
          onPress={handleAccept}
          disabled={accepting || !!takenState || codBlocked}
          style={[
            styles.acceptBtn,
            (accepting || takenState || codBlocked) && styles.acceptBtnDisabled,
          ]}
          activeOpacity={0.85}
          testID="job-detail-accept"
        >
          {accepting ? (
            <Text style={styles.acceptText}>{tt('rider.jobs.detail.accepting', undefined, 'Accepting…')}</Text>
          ) : codBlocked ? (
            <>
              <Lock size={18} color={colors.white} />
              <Text style={styles.acceptText}>{tt('rider.jobs.detail.acceptBlocked', undefined, 'COD locked')}</Text>
            </>
          ) : (
            <>
              <CheckCircle2 size={18} color={colors.white} />
              <Text style={styles.acceptText}>{tt('rider.jobs.detail.accept', undefined, 'Accept job')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

/* ------------------------------- header -------------------------------- */

function DetailHeader({
  onBack,
  title,
  insets,
  countdown,
}: {
  onBack: () => void
  title: string
  insets: { top: number }
  countdown?: string | null
}) {
  return (
    <View style={[styles.headerBar, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={styles.backBtn}
        >
          <ChevronLeft size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={styles.headerTitle}>{title}</Text>
        </View>
        {countdown && (
          <View
            style={styles.countdownPill}
            accessibilityRole="timer"
            accessibilityLabel={`Offer expires in ${countdown}`}
            testID="job-detail-countdown"
          >
            <Clock size={13} color={colors.white} />
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}
      </View>
    </View>
  )
}

/* --------------------------- detail card ------------------------------- */

function DetailCard({
  icon,
  iconBg,
  title,
  placeName,
  area,
  address,
  contactName,
  contactPhone,
  items,
  prepNote,
  deliveryNote,
  distanceLabel,
  tt,
  testID,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  placeName: string
  area?: string
  address: string
  contactName: string
  contactPhone: string
  items?: string[]
  prepNote?: string
  deliveryNote?: string
  distanceLabel: string
  tt: (key: string, vars?: Record<string, string | number>, fallback?: string) => string
  testID?: string
}) {
  const hasItems = items && items.length > 0
  const hasNote = !!(prepNote || deliveryNote)
  const note = prepNote ?? deliveryNote

  return (
    <View style={styles.detailCard} testID={testID}>
      {/* Title row */}
      <View style={styles.detailTitleRow}>
        <View style={[styles.detailIcon, { backgroundColor: iconBg }]}>{icon}</View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.detailTitle}>{title}</Text>
          <Text style={styles.detailPlace} numberOfLines={1}>{placeName}</Text>
        </View>
        <View style={styles.detailDistPill}>
          <Navigation size={11} color={colors.textMuted} />
          <Text style={styles.detailDistText}>{distanceLabel}</Text>
        </View>
      </View>

      {/* Address */}
      <View style={styles.detailRow}>
        <MapPin size={14} color={colors.textMuted} />
        <Text style={styles.detailRowText}>{address}{area ? `, ${area}` : ''}</Text>
      </View>

      {/* Contact */}
      <View style={styles.detailRow}>
        <User size={14} color={colors.textMuted} />
        <Text style={styles.detailRowText}>{contactName}</Text>
        <Phone size={12} color={colors.textTertiary} />
        <Text style={styles.detailRowPhone}>{contactPhone}</Text>
      </View>

      {/* Items to collect (pickup only) */}
      {hasItems && (
        <View style={styles.detailItemsSection}>
          <View style={styles.detailItemsHeader}>
            <Package size={13} color={colors.textMuted} />
            <Text style={styles.detailItemsTitle}>
              {tt('rider.jobs.detail.itemsToCollect', undefined, 'Items to collect')}
            </Text>
          </View>
          {items!.map((item, i) => (
            <View key={i} style={styles.detailItemRow}>
              <View style={styles.detailItemDot} />
              <Text style={styles.detailItemText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Prep / delivery note */}
      {hasNote && note && (
        <View style={styles.detailNoteBox}>
          <StickyNote size={13} color={colors.warning} />
          <Text style={styles.detailNoteText}>{note}</Text>
        </View>
      )}
    </View>
  )
}

/* ------------------------------- styles -------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { backgroundColor: colors.primary, paddingHorizontal: spacing[4] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingBottom: spacing[3] },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.xl[0], fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  countdownText: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.white, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },

  scroll: { flex: 1 },
  heroWrap: { paddingHorizontal: spacing[4] },
  sectionWrap: { paddingHorizontal: spacing[4] },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  orderRef: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.textSecondary, fontFamily: fontFamily.sansSemiBold[0] },
  codPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  codPillText: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.warning, fontFamily: fontFamily.sansBold[0], fontVariant: ['tabular-nums'] },
  prepaidPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  prepaidPillText: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.success, fontFamily: fontFamily.sansBold[0] },

  // Route map + payout get paddingHorizontal from their own cards (full-width hero).
  // Wrap them in a padded container via the scroll content gap.

  // Detail card
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    ...shadow('sm'),
  },
  detailTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5], marginBottom: spacing[3] },
  detailIcon: { width: 36, height: 36, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fontFamily.sansSemiBold[0] },
  detailPlace: { fontSize: fontSize.md[0], fontWeight: '700', color: colors.text, marginTop: 1, fontFamily: fontFamily.sansBold[0] },
  detailDistPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  detailDistText: { fontSize: 11, fontWeight: '600', color: colors.textMuted, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansSemiBold[0] },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: 6 },
  detailRowText: { flex: 1, fontSize: fontSize.sm[0], color: colors.textSecondary, fontFamily: fontFamily.sans[0] },
  detailRowPhone: { fontSize: fontSize.sm[0], color: colors.textTertiary, fontFamily: fontFamily.sans[0], fontVariant: ['tabular-nums'] },

  detailItemsSection: { marginTop: spacing[2], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.borderLight },
  detailItemsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], marginBottom: spacing[2] },
  detailItemsTitle: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fontFamily.sansSemiBold[0] },
  detailItemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: 4 },
  detailItemDot: { width: 5, height: 5, borderRadius: radii.full, backgroundColor: colors.gold },
  detailItemText: { flex: 1, fontSize: fontSize.sm[0], color: colors.text, fontFamily: fontFamily.sans[0] },

  detailNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginTop: spacing[2],
    backgroundColor: colors.warningLight,
    borderRadius: radii.md,
    padding: spacing[3],
  },
  detailNoteText: { flex: 1, fontSize: fontSize.sm[0], color: colors.textSecondary, fontFamily: fontFamily.sans[0], lineHeight: 19 },

  // COD collect card
  codCollectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    ...shadow('sm'),
  },
  codCollectLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1, minWidth: 0 },
  codCollectIcon: { width: 36, height: 36, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  codCollectTitle: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  codCollectSub: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: 1, fontFamily: fontFamily.sans[0] },
  codCollectAmount: { fontSize: fontSize.xl[0], fontWeight: '700', color: colors.warning, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },

  // COD blocked banner
  codBlockedBanner: {
    backgroundColor: colors.errorLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.error,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    gap: spacing[2],
  },
  codBlockedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  codBlockedTitle: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.error, fontFamily: fontFamily.sansBold[0] },
  codBlockedSub: { fontSize: fontSize.sm[0], color: colors.textSecondary, fontFamily: fontFamily.sans[0], lineHeight: 19 },
  codBlockedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    alignSelf: 'flex-start',
    minHeight: 44,
  },
  codBlockedCtaText: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },

  // Sticky action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  declineBtn: {
    flex: 0.4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3.5],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 52,
  },
  declineText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.textSecondary, fontFamily: fontFamily.sansSemiBold[0] },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3.5],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    minHeight: 52,
  },
  acceptBtnDisabled: { opacity: 0.5 },
  acceptText: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },

  // Loading skeleton
  skeletonWrap: { padding: spacing[4], gap: spacing[3] },
  skeletonBlock: { borderRadius: radii.lg, backgroundColor: colors.shimmer },

  // Error / empty
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[6], gap: spacing[2] },
  emptyTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  emptySubtitle: { fontSize: fontSize.base[0], color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },
  retryBtn: { marginTop: spacing[3], paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radii.lg, backgroundColor: colors.primary },
  retryText: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },

  // Taken / expired
  takenWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[6], gap: spacing[3] },
  takenIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  takenTitle: { fontSize: fontSize.xl[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0], textAlign: 'center' },
  takenSubtitle: { fontSize: fontSize.base[0], color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0], lineHeight: 21 },
  takenCta: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  takenCtaText: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
})
