import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  AccessibilityInfo,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { MapPin, Navigation, Package, Banknote, X, Clock, ChevronRight } from 'lucide-react-native'
import { runOnJS } from 'react-native-reanimated'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { colors, spacing, radii, fontFamily, fontSize, shadow, duration, easing } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import { useAppActiveCallback } from './AppStateProvider'
import { useActiveDeliveryStore, hasActiveDelivery } from '@chinooz/state'
import { useAvailableJobs, useAcceptJob, useDeclineJob } from '@chinooz/hooks'
import { formatNPR } from '@chinooz/utils'
import type { RiderJob } from '@chinooz/types'

/** Countdown seconds before auto-decline. */
const COUNTDOWN_SECONDS = 20
/** Announce the countdown at these intervals (not every tick). */
const ANNOUNCE_AT = new Set([15, 10, 5, 3])

interface RequestSlotProps {
  status: 'online' | 'offline' | 'paused'
  title: string
  placeholder: string
}

type Phase = 'listening' | 'offered' | 'accepting' | 'declining' | 'expired' | 'taken' | 'accept_error'

/**
 * RH4 — Incoming job-request overlay.
 *
 * Appears when the rider is online and a job is offered. Shows a prominent
 * request card with pickup → drop-off route hero, distance, payout (NPR),
 * COD amount, item summary, and a countdown ring that auto-declines on
 * timeout. Accept hands off to the Active Delivery route; Decline returns
 * to listening. Handles expired + already-taken states, and a calm
 * "finding deliveries…" listening state between offers.
 *
 * Battery/data-conscious: the countdown timer only runs while the app is
 * foregrounded (via useAppActiveCallback). No continuous animation when idle.
 */
export default function RequestSlot({ status, title }: RequestSlotProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { reducedMotion, minTouchTarget } = useA11y()

  const isOnline = status === 'online'
  const activeDelivery = useActiveDeliveryStore(s => s.activeDelivery)
  const acceptJobStore = useActiveDeliveryStore(s => s.acceptJob)

  const jobsQuery = useAvailableJobs(1)
  const acceptMutation = useAcceptJob()
  const declineMutation = useDeclineJob()

  const offeredJob = useMemo<RiderJob | null>(() => {
    if (!isOnline) return null
    if (hasActiveDelivery(activeDelivery)) return null
    return jobsQuery.data?.[0] ?? null
  }, [isOnline, activeDelivery, jobsQuery.data])

  const [phase, setPhase] = useState<Phase>('listening')
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS)
  const phaseRef = useRef<Phase>('listening')

  // Track the current offered job id so we reset the countdown on new offers.
  const offeredJobIdRef = useRef<string | null>(null)

  // Update phase when the offered job changes.
  useEffect(() => {
    if (!isOnline || hasActiveDelivery(activeDelivery)) {
      setPhase('listening')
      phaseRef.current = 'listening'
      offeredJobIdRef.current = null
      return
    }

    if (offeredJob && offeredJob.id !== offeredJobIdRef.current) {
      // New job offer arrived.
      offeredJobIdRef.current = offeredJob.id
      setPhase('offered')
      phaseRef.current = 'offered'
      setSecondsLeft(COUNTDOWN_SECONDS)

      // Arrival cue: haptic (heavier) + screen-reader announcement.
      try {
        if (!reducedMotion) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        }
      } catch {}

      const itemCount = getJobItemCount(offeredJob)
      const codStr = offeredJob.isCod
        ? t('rider.home.requestCod', { amount: offeredJob.codAmount.toLocaleString('en-IN') })
        : ''
      try {
        AccessibilityInfo.announceForAccessibility(
          t('rider.home.requestArrivalAria', {
            pickup: offeredJob.pickup.label,
            dropoff: offeredJob.dropoff.label ?? offeredJob.dropoff.area ?? '',
            payout: offeredJob.payout,
            cod: codStr,
            items: itemCount,
            seconds: COUNTDOWN_SECONDS,
          }),
        )
      } catch {}
    }

    if (!offeredJob && phaseRef.current === 'offered') {
      // Job was removed (accepted by someone else or expired externally).
      setPhase('taken')
      phaseRef.current = 'taken'
    }
  }, [offeredJob, isOnline, activeDelivery, reducedMotion, t])

  // Countdown timer — only runs while foregrounded + in the offered phase.
  useAppActiveCallback(
    () => {
      if (phaseRef.current !== 'offered') return () => {}
      const id = setInterval(() => {
        setSecondsLeft(prev => {
          const next = prev - 1
          if (ANNOUNCE_AT.has(next)) {
            try {
              AccessibilityInfo.announceForAccessibility(
                t('rider.home.requestCountdownAria', { seconds: next }),
              )
            } catch {}
          }
          if (next <= 0) {
            clearInterval(id)
            // Auto-decline on timeout.
            runOnJS(handleAutoDecline)()
          }
          return next
        })
      }, 1000)
      return () => clearInterval(id)
    },
    () => {},
    [phase, t],
  )

  const handleAutoDecline = useCallback(() => {
    setPhase('expired')
    phaseRef.current = 'expired'
    try {
      AccessibilityInfo.announceForAccessibility(t('rider.home.requestAutoDeclineAria'))
    } catch {}
    // Actually decline via the mock API (removes from pool).
    if (offeredJobIdRef.current) {
      declineMutation.mutate({
        jobId: offeredJobIdRef.current,
        opRef: `auto-decline-${offeredJobIdRef.current}-${Date.now()}`,
      })
    }
    // Return to listening after a brief expired state.
    setTimeout(() => {
      setPhase('listening')
      phaseRef.current = 'listening'
      offeredJobIdRef.current = null
    }, 2500)
  }, [declineMutation, t])

  const handleAccept = useCallback(() => {
    if (!offeredJob) return
    setPhase('accepting')
    phaseRef.current = 'accepting'

    try {
      if (!reducedMotion) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } catch {}

    acceptMutation.mutate(
      { jobId: offeredJob.id, opRef: `accept-${offeredJob.id}-${Date.now()}` },
      {
        onSuccess: data => {
          if (data.success && data.activeDelivery) {
            // The store is seeded via the query cache; also accept into the
            // local store so the resume banner + active route work.
            acceptJobStore(offeredJob)
            router.push('/active')
          } else {
            // Already taken or error.
            setPhase('accept_error')
            phaseRef.current = 'accept_error'
          }
        },
        onError: () => {
          setPhase('accept_error')
          phaseRef.current = 'accept_error'
        },
      },
    )
  }, [offeredJob, acceptMutation, acceptJobStore, router, reducedMotion])

  const handleDecline = useCallback(() => {
    if (!offeredJob) return
    setPhase('declining')
    phaseRef.current = 'declining'

    try {
      if (!reducedMotion) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }
    } catch {}

    declineMutation.mutate(
      { jobId: offeredJob.id, opRef: `decline-${offeredJob.id}-${Date.now()}` },
      {
        onSettled: () => {
          setPhase('listening')
          phaseRef.current = 'listening'
          offeredJobIdRef.current = null
        },
      },
    )
  }, [offeredJob, declineMutation, reducedMotion])

  const handleDismiss = useCallback(() => {
    setPhase('listening')
    phaseRef.current = 'listening'
    offeredJobIdRef.current = null
  }, [])

  // Offline: no request surface at all.
  if (!isOnline) return null

  // Accept-error: job gone, calm recovery with back-to-listening.
  if (phase === 'accept_error') {
    return (
      <InfoState
        icon={<X size={24} color={colors.textTertiary} />}
        title={t('rider.home.acceptErrorTitle')}
        sub={t('rider.home.acceptErrorBody')}
        onDismiss={handleDismiss}
        dismissLabel={t('rider.home.acceptErrorRetry')}
        dismissAria={t('rider.home.acceptErrorRetryAria')}
        minTouchTarget={minTouchTarget}
      />
    )
  }

  // Listening state (no offer, or between offers) — quiet/hotspots nudge.
  if (phase === 'listening' && !offeredJob) {
    return (
      <QuietState
        title={t('rider.home.quietTitle')}
        sub={t('rider.home.quietSub')}
        hotspotsLabel={t('rider.home.quietHotspots')}
        hotspotsAria={t('rider.home.quietHotspotsAria')}
        ariaLabel={t('rider.home.quietAria')}
        onHotspots={() => router.push('/hotspots')}
        minTouchTarget={minTouchTarget}
        reducedMotion={reducedMotion}
      />
    )
  }

  // Expired state.
  if (phase === 'expired') {
    return (
      <InfoState
        icon={<Clock size={24} color={colors.textTertiary} />}
        title={t('rider.home.requestExpired')}
        sub={t('rider.home.requestExpiredSub')}
      />
    )
  }

  // Already taken state.
  if (phase === 'taken') {
    return (
      <InfoState
        icon={<X size={24} color={colors.textTertiary} />}
        title={t('rider.home.requestTaken')}
        sub={t('rider.home.requestTakenSub')}
        onDismiss={handleDismiss}
        dismissLabel={t('rider.home.requestDismiss')}
        dismissAria={t('rider.home.requestDismiss')}
        minTouchTarget={minTouchTarget}
      />
    )
  }

  // No job to show.
  if (!offeredJob) {
    return (
      <QuietState
        title={t('rider.home.quietTitle')}
        sub={t('rider.home.quietSub')}
        hotspotsLabel={t('rider.home.quietHotspots')}
        hotspotsAria={t('rider.home.quietHotspotsAria')}
        ariaLabel={t('rider.home.quietAria')}
        onHotspots={() => router.push('/hotspots')}
        minTouchTarget={minTouchTarget}
        reducedMotion={reducedMotion}
      />
    )
  }

  const tripKm = Math.max(
    0.1,
    Math.round((offeredJob.legToDropoff.distanceMeters / 1000) * 10) / 10,
  )
  const itemCount = getJobItemCount(offeredJob)
  const isAccepting = phase === 'accepting'
  const isDeclining = phase === 'declining'
  const isBusy = isAccepting || isDeclining

  // Arrival attention animation: slide-up + scale-in when a new offer appears.
  const cardEnter = useSharedValue(reducedMotion ? 0 : 1)
  const cardScale = useSharedValue(reducedMotion ? 1 : 0.92)

  useEffect(() => {
    if (reducedMotion) {
      cardEnter.value = 0
      cardScale.value = 1
    } else {
      cardEnter.value = withSequence(
        withTiming(0, { duration: duration.fast, easing: Easing.bezier(...easing.easeOut) }),
      )
      cardScale.value = withSpring(1, {
        damping: 16,
        stiffness: 200,
        mass: 0.8,
        reduceMotion: ReduceMotion.System,
      })
    }
  }, [offeredJob?.id, reducedMotion])

  const cardEnterStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: cardEnter.value * 24 },
      { scale: cardScale.value },
    ],
    opacity: reducedMotion ? 1 : 1 - cardEnter.value * 0.3,
  }))

  // Accept/decline press-scale feedback.
  const acceptScale = useSharedValue(1)
  const declineScale = useSharedValue(1)

  const handleAcceptPressIn = useCallback(() => {
    if (reducedMotion) return
    acceptScale.value = withSpring(0.96, { damping: 20, stiffness: 400 })
  }, [reducedMotion])

  const handleAcceptPressOut = useCallback(() => {
    if (reducedMotion) return
    acceptScale.value = withSpring(1, { damping: 20, stiffness: 400 })
  }, [reducedMotion])

  const handleDeclinePressIn = useCallback(() => {
    if (reducedMotion) return
    declineScale.value = withSpring(0.96, { damping: 20, stiffness: 400 })
  }, [reducedMotion])

  const handleDeclinePressOut = useCallback(() => {
    if (reducedMotion) return
    declineScale.value = withSpring(1, { damping: 20, stiffness: 400 })
  }, [reducedMotion])

  const acceptBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: acceptScale.value }],
  }))

  const declineBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: declineScale.value }],
  }))

  return (
    <Animated.View
      style={[styles.card, cardEnterStyle]}
      accessibilityRole="alert"
      accessibilityLabel={t('rider.home.requestArrivalAria', {
        pickup: offeredJob.pickup.label,
        dropoff: offeredJob.dropoff.label ?? offeredJob.dropoff.area ?? '',
        payout: offeredJob.payout,
        cod: offeredJob.isCod
          ? t('rider.home.requestCod', { amount: offeredJob.codAmount.toLocaleString('en-IN') })
          : '',
        items: itemCount,
        seconds: secondsLeft,
      })}
    >
      {/* Header: title + countdown ring */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <CountdownRing
          secondsLeft={secondsLeft}
          total={COUNTDOWN_SECONDS}
        />
      </View>

      {/* Route hero: pickup → drop-off */}
      <View style={styles.routeHero}>
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, styles.routeDotPickup]} />
          <View style={styles.routeText}>
            <Text style={styles.routeLabel}>{t('rider.home.requestPickup')}</Text>
            <Text style={styles.routeName} numberOfLines={1}>
              {offeredJob.pickup.label}
            </Text>
            {offeredJob.pickup.area && (
              <Text style={styles.routeArea} numberOfLines={1}>
                {offeredJob.pickup.area}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.routeConnector} />

        <View style={styles.routePoint}>
          <View style={[styles.routeDot, styles.routeDotDropoff]} />
          <View style={styles.routeText}>
            <Text style={styles.routeLabel}>{t('rider.home.requestDropoff')}</Text>
            <Text style={styles.routeName} numberOfLines={1}>
              {offeredJob.dropoff.label ?? offeredJob.dropoff.area}
            </Text>
            {offeredJob.dropoff.area && (
              <Text style={styles.routeArea} numberOfLines={1}>
                {offeredJob.dropoff.area}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Stats row: distance + payout + COD + items */}
      <View style={styles.statsRow}>
        <Stat icon={<Navigation size={14} color={colors.textMuted} />} value={t('rider.home.requestDistance', { km: tripKm })} />
        <Stat
          icon={<Banknote size={14} color={colors.success} />}
          value={formatNPR(offeredJob.payout)}
          label={t('rider.home.requestPayout')}
          bold
        />
        <Stat icon={<Package size={14} color={colors.textMuted} />} value={t('rider.home.requestItems', { count: itemCount })} />
      </View>

      {/* COD pill (if applicable) */}
      {offeredJob.isCod && offeredJob.codAmount > 0 && (
        <View style={styles.codPill}>
          <Banknote size={14} color={colors.gold} />
          <Text style={styles.codText}>
            {t('rider.home.requestCod', { amount: offeredJob.codAmount.toLocaleString('en-IN') })}
          </Text>
        </View>
      )}

      {/* Actions: Accept (primary, full-width) + Decline (quiet secondary) */}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('rider.home.requestAcceptAria', { payout: offeredJob.payout })}
          onPress={handleAccept}
          onPressIn={handleAcceptPressIn}
          onPressOut={handleAcceptPressOut}
          disabled={isBusy}
        >
          <Animated.View
            style={[
              styles.acceptBtn,
              { minHeight: minTouchTarget },
              isAccepting && styles.btnDisabled,
              acceptBtnStyle,
            ]}
          >
            {isAccepting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.acceptText}>{t('rider.home.requestAccept')}</Text>
            )}
          </Animated.View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('rider.home.requestDeclineAria')}
          onPress={handleDecline}
          onPressIn={handleDeclinePressIn}
          onPressOut={handleDeclinePressOut}
          disabled={isBusy}
        >
          <Animated.View
            style={[
              styles.declineBtn,
              { minHeight: minTouchTarget },
              isDeclining && styles.btnDisabled,
              declineBtnStyle,
            ]}
          >
            {isDeclining ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <Text style={styles.declineText}>{t('rider.home.requestDecline')}</Text>
            )}
          </Animated.View>
        </Pressable>
      </View>
    </Animated.View>
  )
}

// ---------------------------------------------------------------------------
// Countdown ring — SVG circle that depletes, color shifts as time runs low
// ---------------------------------------------------------------------------

function CountdownRing({
  secondsLeft,
  total,
}: {
  secondsLeft: number
  total: number
}) {
  const { t } = useTranslation()
  const size = 44
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? secondsLeft / total : 0
  const dashOffset = circumference * (1 - progress)

  // Color shifts: green → gold → red as time runs low (never alarmist).
  const ringColor = secondsLeft <= 5 ? colors.error : secondsLeft <= 10 ? colors.gold : colors.success
  const textColor = secondsLeft <= 5 ? colors.error : secondsLeft <= 10 ? colors.gold : colors.text

  return (
    <View style={styles.ringWrap} accessibilityRole="timer">
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.borderLight}
          strokeWidth={stroke}
        />
        {/* Progress — depletes each second as secondsLeft ticks down */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringTextWrap}>
        <Text style={[styles.ringText, { color: textColor }]}>
          {secondsLeft <= 5
            ? t('rider.home.requestCountdownLow', { seconds: secondsLeft })
            : secondsLeft}
        </Text>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Quiet state — online, no offers, encourages hotspots (subtle pulse)
// ---------------------------------------------------------------------------

function QuietState({
  title,
  sub,
  hotspotsLabel,
  hotspotsAria,
  ariaLabel,
  onHotspots,
  minTouchTarget,
  reducedMotion,
}: {
  title: string
  sub: string
  hotspotsLabel: string
  hotspotsAria: string
  ariaLabel: string
  onHotspots: () => void
  minTouchTarget: number
  reducedMotion: boolean
}) {
  // Subtle pulse on the dot — battery-aware (disabled in reduced-motion).
  const pulseOpacity = useSharedValue(reducedMotion ? 1 : 0.4)
  const pulseScale = useSharedValue(reducedMotion ? 1 : 1)

  useEffect(() => {
    if (reducedMotion) return
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: duration.slower, easing: Easing.bezier(...easing.easeInOut) }),
        withTiming(1, { duration: duration.slower, easing: Easing.bezier(...easing.easeInOut) }),
      ),
      -1,
      false,
    )
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: duration.slower, easing: Easing.bezier(...easing.easeInOut) }),
        withTiming(1, { duration: duration.slower, easing: Easing.bezier(...easing.easeInOut) }),
      ),
      -1,
      false,
    )
  }, [reducedMotion])

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }))

  return (
    <View style={styles.quietCard} accessibilityRole="text" accessibilityLabel={ariaLabel}>
      <View style={styles.quietPulse}>
        <Animated.View style={[styles.quietDot, dotStyle]} />
      </View>
      <View style={styles.quietBody}>
        <Text style={styles.quietTitle}>{title}</Text>
        <Text style={styles.quietSub}>{sub}</Text>
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={hotspotsAria}
        style={[styles.quietLink, { minHeight: minTouchTarget }]}
        onPress={onHotspots}
      >
        <Text style={styles.quietLinkText}>{hotspotsLabel}</Text>
        <ChevronRight size={16} color={colors.primary} />
      </Pressable>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Info state (expired / taken / accept-error)
// ---------------------------------------------------------------------------

function InfoState({
  icon,
  title,
  sub,
  onDismiss,
  dismissLabel,
  dismissAria,
  minTouchTarget,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  onDismiss?: () => void
  dismissLabel?: string
  dismissAria?: string
  minTouchTarget?: number
}) {
  return (
    <View style={styles.infoCard} accessibilityRole="alert">
      <View style={styles.infoIcon}>{icon}</View>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoSub}>{sub}</Text>
      {onDismiss && dismissLabel && minTouchTarget && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dismissAria ?? dismissLabel}
          style={[styles.dismissBtn, { minHeight: minTouchTarget }]}
          onPress={onDismiss}
        >
          <Text style={styles.dismissText}>{dismissLabel}</Text>
        </Pressable>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Stat
// ---------------------------------------------------------------------------

function Stat({
  icon,
  value,
  label,
  bold,
}: {
  icon: React.ReactNode
  value: string
  label?: string
  bold?: boolean
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={[styles.statValue, bold && styles.statValueBold]} numberOfLines={1}>
        {value}
      </Text>
      {label && <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getJobItemCount(job: RiderJob): number {
  const items = (job as unknown as { items?: unknown[] }).items
  return items?.length ?? 1
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[4],
    borderWidth: 1.5,
    borderColor: colors.primary,
    ...shadow('lg'),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  cardTitle: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansBold[0],
  },
  // Route hero
  routeHero: {
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: spacing[3],
    marginBottom: spacing[3],
    gap: spacing[1],
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    marginTop: 4,
  },
  routeDotPickup: {
    backgroundColor: colors.primary,
  },
  routeDotDropoff: {
    backgroundColor: colors.success,
  },
  routeText: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: fontFamily.sans[0],
  },
  routeName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
    marginTop: 1,
  },
  routeArea: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    marginTop: 1,
  },
  routeConnector: {
    marginLeft: 4,
    height: 16,
    width: 2,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  // Stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[0.5],
  },
  statIcon: {
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
    fontVariant: ['tabular-nums'],
  },
  statValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
    fontFamily: fontFamily.sansBold[0],
  },
  statLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },
  // COD pill
  codPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: 'rgba(224, 169, 59, 0.12)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    marginBottom: spacing[3],
    alignSelf: 'flex-start',
  },
  codText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gold,
    fontFamily: fontFamily.sansSemiBold[0],
    fontVariant: ['tabular-nums'],
  },
  // Actions
  actions: {
    gap: spacing[2],
  },
  acceptBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3.5],
  },
  acceptText: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  declineBtn: {
    backgroundColor: 'transparent',
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
  },
  declineText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  btnDisabled: {
    opacity: 0.6,
  },
  // Countdown ring
  ringWrap: {
    position: 'relative',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTextWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  // Quiet state (listening, no offers)
  quietCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  quietPulse: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quietDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.success,
  },
  quietBody: {
    flex: 1,
  },
  quietTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  quietSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
    fontFamily: fontFamily.sans[0],
  },
  quietLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
  },
  quietLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Info state (expired / taken / accept-error)
  infoCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing[2],
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  infoTitle: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  infoSub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  dismissBtn: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    marginTop: spacing[2],
  },
  dismissText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})

// Re-export the OfflineBell for the offline state body on Home.
export function OfflineBell({ label }: { label: string }) {
  return (
    <View style={styles.infoCard} accessibilityRole="image">
      <View style={styles.infoIcon}>
        <MapPin size={24} color={colors.textTertiary} />
      </View>
      <Text style={styles.infoSub}>{label}</Text>
    </View>
  )
}
