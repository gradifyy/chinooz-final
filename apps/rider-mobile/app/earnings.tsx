import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  ReduceMotion,
  interpolateColor,
} from 'react-native-reanimated'
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  LineChart,
  ListChecks,
  Wallet,
  Info,
  Clock,
  CheckCircle2,
  Target,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import { useRiderEarningsStore, useRiderIncentivesStore } from '@chinooz/state'
import {
  getRiderEarnings,
  getRiderCashWallet,
  formatRiderNPRAmount,
  type RiderEarningsOverview,
  type RiderCashWallet,
  type RiderPeriodSummary,
} from '@chinooz/mock-data'

const AnimatedPress = Animated.createAnimatedComponent(TouchableOpacity)

function useCountUp(target: number, enabled: boolean, durationMs = 900): number {
  const [value, setValue] = useState(0)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    if (!enabled) {
      setValue(target)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, enabled, durationMs])
  return value
}

function periodRangeKey(p: RiderPeriodSummary): string {
  switch (p.range.key) {
    case 'today':
      return 'rider.earnings.periodToday'
    case '7d':
      return 'rider.earnings.periodWeek'
    case 'month':
    case '30d':
      return 'rider.earnings.periodMonth'
    default:
      return 'rider.earnings.periodToday'
  }
}

export default function RiderEarningsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()

  const [overview, setOverview] = useState<RiderEarningsOverview | null>(null)
  const [wallet, setWallet] = useState<RiderCashWallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  const storeBalance = useRiderEarningsStore(s => s.withdrawableBalance)
  const cashoutInFlight = useRiderEarningsStore(s => s.cashoutInFlight)
  const setStoreBalance = useRiderEarningsStore(s => s.setWithdrawableBalance)
  const beginCashout = useRiderEarningsStore(s => s.beginCashout)
  const completeCashout = useRiderEarningsStore(s => s.completeCashout)
  const cancelCashout = useRiderEarningsStore(s => s.cancelCashout)
  const [cashoutDone, setCashoutDone] = useState(false)

  // Incentives earnings this week — read from the shared store so the
  // Earnings overview can surface a live "earned from incentives" figure
  // that ties back to the Incentives hub (RI2). Reachable from here.
  const incentiveThisWeek = useRiderIncentivesStore(s => s.thisWeekNpr)

  useEffect(() => {
    analytics.screen({ name: 'rider-earnings' })
  }, [])

  const load = React.useCallback(async () => {
    setError(false)
    try {
      const [ov, w] = await Promise.all([getRiderEarnings(), getRiderCashWallet()])
      setOverview(ov)
      setWallet(w)
      setStoreBalance(ov.withdrawableBalance)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [setStoreBalance])

  useEffect(() => {
    load()
  }, [load])

  // Hero balance: prefer the store (optimistic on cash-out), fall back to mock.
  const heroBalance = useMemo(() => {
    if (storeBalance !== null) return storeBalance
    return overview?.withdrawableBalance ?? 0
  }, [storeBalance, overview])

  const animatedBalance = useCountUp(heroBalance, !loading && !reduced)
  const displayBalance = loading ? heroBalance : animatedBalance

  const pendingClearance = overview?.pendingClearance ?? 0
  const nextPayoutDate = overview?.nextPayoutDate ?? null
  const periods = overview?.periods ?? []

  const heroAria = t('rider.earnings.heroAria', {
    amount: formatRiderNPRAmount(heroBalance),
  })

  const onCashOut = () => {
    if (cashoutInFlight || heroBalance <= 0) return
    try {
      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {}
    beginCashout()
    // Simulate the RE5 cash-out round-trip.
    setTimeout(() => {
      try {
        if (!reduced) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      completeCashout(heroBalance)
      setCashoutDone(true)
      setTimeout(() => setCashoutDone(false), 2400)
    }, 900)
  }

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const cashOutLabel = cashoutInFlight
    ? t('rider.earnings.cashOutInFlight')
    : cashoutDone
      ? t('rider.earnings.cashOutDone')
      : t('rider.earnings.cashOut')

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.earnings.back')}
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              {t('rider.earnings.title')}
            </Text>
            <Text style={styles.headerSub}>{t('rider.earnings.subtitle')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading ? (
          <EarningsSkeleton ariaLabel={t('rider.earnings.skeletonAria')} />
        ) : error ? (
          <ErrorState
            title={t('rider.earnings.errorTitle')}
            subtitle={t('rider.earnings.errorSubtitle')}
            retry={t('rider.earnings.retry')}
            onRetry={onRefresh}
          />
        ) : (
          <View style={styles.body} nativeID="rider-earnings-overview">
            {/* Hero: withdrawable balance + Cash out */}
            <View
              style={styles.heroCard}
              accessibilityRole="header"
              accessible
              accessibilityLabel={heroAria}
            >
              <View style={styles.heroAccent} />
              <View style={styles.heroBody}>
                <Text style={styles.heroLabel}>{t('rider.earnings.heroLabel')}</Text>
                <Text style={styles.heroAmount} accessibilityElementsHidden>
                  NPR {formatRiderNPRAmount(displayBalance)}
                </Text>
                <Text style={styles.heroCaption}>{t('rider.earnings.heroCaption')}</Text>

                {pendingClearance > 0 && (
                  <View
                    style={styles.pendingChip}
                    accessibilityRole="text"
                    accessible
                    accessibilityLabel={t('rider.earnings.pendingChipAria', {
                      amount: formatRiderNPRAmount(pendingClearance),
                    })}
                  >
                    <Clock size={13} color={colors.warning} />
                    <Text style={styles.pendingChipText}>
                      {t('rider.earnings.pendingChip', {
                        amount: formatRiderNPRAmount(pendingClearance),
                      })}
                    </Text>
                  </View>
                )}

                <CashOutButton
                  label={cashOutLabel}
                  inFlight={cashoutInFlight}
                  done={cashoutDone}
                  disabled={heroBalance <= 0 || cashoutInFlight}
                  onPress={onCashOut}
                  ariaLabel={t('rider.earnings.cashOutAria', {
                    amount: formatRiderNPRAmount(heroBalance),
                  })}
                  reduced={reduced}
                />
                <Text style={styles.cashOutHint}>{t('rider.earnings.cashOutHint')}</Text>

                {nextPayoutDate && (
                  <View style={styles.nextPayoutRow}>
                    <Text style={styles.nextPayoutLabel}>
                      {t('rider.earnings.nextPayout')}
                    </Text>
                    <Text style={styles.nextPayoutValue}>
                      {t('rider.earnings.nextPayoutDate', { date: nextPayoutDate })}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Period summary tiles */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{t('rider.earnings.sectionPeriods')}</Text>
            </View>
            <View style={styles.tilesRow}>
              {periods.map(p => (
                <PeriodTile
                  key={p.range.key}
                  period={p}
                  rangeLabel={t(periodRangeKey(p))}
                  tripsLabel={t('rider.earnings.periodTrips', { count: p.trips })}
                  perTripLabel={t('rider.earnings.periodPerTrip', {
                    amount: formatRiderNPRAmount(p.perTrip),
                  })}
                  ariaLabel={t('rider.earnings.tileAria', {
                    range: t(periodRangeKey(p)),
                    earned: formatRiderNPRAmount(p.earned),
                    trips: p.trips,
                  })}
                />
              ))}
            </View>

            {/* Earnings explainer (one-line) */}
            <View
              style={styles.explainer}
              accessibilityRole="text"
              accessible
              accessibilityLabel={t('rider.earnings.explainerAria')}
            >
              <Info size={14} color={colors.textMuted} />
              <Text style={styles.explainerText}>{t('rider.earnings.explainer')}</Text>
            </View>

            {/* Explore: chart + ledger */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{t('rider.earnings.sectionExplore')}</Text>
            </View>
            <View style={styles.entriesCard}>
              <EntryRow
                icon={<LineChart size={18} color={colors.primary} />}
                iconBg={colors.primary50}
                title={t('rider.earnings.entryChart')}
                sub={t('rider.earnings.entryChartSub')}
                ariaLabel={t('rider.earnings.entryChartAria')}
                onPress={() => {}}
                reduced={reduced}
              />
              <View style={styles.entryDivider} />
              <EntryRow
                icon={<ListChecks size={18} color={colors.primary} />}
                iconBg={colors.primary50}
                title={t('rider.earnings.entryLedger')}
                sub={t('rider.earnings.entryLedgerSub')}
                ariaLabel={t('rider.earnings.entryLedgerAria')}
                onPress={() => {}}
                reduced={reduced}
              />
              <View style={styles.entryDivider} />
              <EntryRow
                icon={<Target size={18} color={colors.gold} />}
                iconBg={'rgba(224, 169, 59, 0.14)'}
                title={t('rider.incentives.title')}
                sub={
                  incentiveThisWeek !== null
                    ? t('rider.incentives.earnedTotal', {
                        amount: formatRiderNPRAmount(incentiveThisWeek),
                      })
                    : t('rider.incentives.subtitle')
                }
                ariaLabel={t('rider.incentives.entryStreaksAria', {
                  count: 0,
                  tier: '',
                })}
                onPress={() => router.push('/incentives')}
                reduced={reduced}
              />
            </View>

            {/* Cash & COD Wallet — visually distinct (income vs cash owed) */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{t('rider.earnings.sectionWallet')}</Text>
            </View>
            {wallet && (
              <View
                style={styles.walletCard}
                accessibilityRole="summary"
                accessible
                accessibilityLabel={t('rider.earnings.walletAria', {
                  cash: formatRiderNPRAmount(wallet.cashInHand),
                  owed: formatRiderNPRAmount(wallet.owedToChinooz),
                })}
              >
                <View style={styles.walletTop}>
                  <View style={styles.walletIconWrap}>
                    <Wallet size={18} color={colors.warning} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.walletTitle}>
                      {t('rider.earnings.walletTitle')}
                    </Text>
                    <Text style={styles.walletSub} numberOfLines={1}>
                      {t('rider.earnings.walletSub')}
                    </Text>
                  </View>
                </View>

                <View style={styles.walletStats}>
                  <WalletStat
                    label={t('rider.earnings.walletCashInHand')}
                    value={`NPR ${formatRiderNPRAmount(wallet.cashInHand)}`}
                    tone="warning"
                  />
                  <WalletStat
                    label={t('rider.earnings.walletOwed')}
                    value={`NPR ${formatRiderNPRAmount(wallet.owedToChinooz)}`}
                    tone="error"
                  />
                  <WalletStat
                    label={t('rider.earnings.walletCodToday', {
                      count: wallet.codCollectedToday,
                    })}
                    value={t('rider.earnings.walletCodToday', {
                      count: wallet.codCollectedToday,
                    })}
                    tone="muted"
                  />
                </View>

                <Text style={styles.walletHint}>{t('rider.earnings.walletHint')}</Text>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('rider.earnings.walletRemitAria', {
                    amount: formatRiderNPRAmount(wallet.suggestedRemit),
                  })}
                  disabled={wallet.suggestedRemit <= 0}
                  onPress={() => {
                    try {
                      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    } catch {}
                  }}
                  style={[
                    styles.walletRemitBtn,
                    wallet.suggestedRemit <= 0 && styles.walletRemitBtnDisabled,
                  ]}
                >
                  <Text style={styles.walletRemitText}>
                    {t('rider.earnings.walletRemit')}
                  </Text>
                  <ArrowUpRight size={16} color={colors.warning} />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: spacing[4] }} />
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function CashOutButton({
  label,
  inFlight,
  done,
  disabled,
  onPress,
  ariaLabel,
  reduced,
}: {
  label: string
  inFlight: boolean
  done: boolean
  disabled: boolean
  onPress: () => void
  ariaLabel: string
  reduced: boolean
}) {
  const scale = useSharedValue(1)
  const bg = useSharedValue(0) // 0 = plum, 1 = done-green

  useEffect(() => {
    bg.value = reduced
      ? done ? 1 : 0
      : withTiming(done ? 1 : 0, { duration: 240, easing: Easing.out(Easing.ease) })
  }, [done, reduced])

  const handlePressIn = () => {
    if (reduced) return
    scale.value = withSpring(0.97, { damping: 14, stiffness: 400, mass: 0.6 })
  }
  const handlePressOut = () => {
    if (reduced) return
    scale.value = withSpring(1, { damping: 14, stiffness: 400, mass: 0.6 })
  }

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(bg.value, [0, 1], [colors.primary, colors.success]),
  }))

  return (
    <AnimatedPress
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ disabled, busy: inFlight }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.cashOutBtn, scaleStyle, bgStyle, disabled && styles.cashOutBtnDisabled]}
    >
      {inFlight ? (
        <ActivityIndicator size="small" color={colors.white} />
      ) : done ? (
        <CheckCircle2 size={18} color={colors.white} />
      ) : null}
      <Text style={styles.cashOutText}>{label}</Text>
    </AnimatedPress>
  )
}

function PeriodTile({
  period,
  rangeLabel,
  tripsLabel,
  perTripLabel,
  ariaLabel,
}: {
  period: RiderPeriodSummary
  rangeLabel: string
  tripsLabel: string
  perTripLabel: string
  ariaLabel: string
}) {
  return (
    <View
      style={styles.tile}
      accessibilityRole="text"
      accessible
      accessibilityLabel={ariaLabel}
    >
      <Text style={styles.tileLabel}>{rangeLabel}</Text>
      <Text style={styles.tileEarned} numberOfLines={1}>
        NPR {formatRiderNPRAmount(period.earned)}
      </Text>
      <Text style={styles.tileTrips}>{tripsLabel}</Text>
      <Text style={styles.tilePerTrip}>{perTripLabel}</Text>
    </View>
  )
}

function EntryRow({
  icon,
  iconBg,
  title,
  sub,
  ariaLabel,
  onPress,
  reduced,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  sub: string
  ariaLabel: string
  onPress: () => void
  reduced: boolean
}) {
  const chevronX = useSharedValue(0)
  const handlePressIn = () => {
    if (reduced) return
    chevronX.value = withTiming(3, { duration: 120, easing: Easing.out(Easing.ease) })
  }
  const handlePressOut = () => {
    if (reduced) return
    chevronX.value = withTiming(0, { duration: 120, easing: Easing.out(Easing.ease) })
  }
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ translateX: chevronX.value }] }))

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      activeOpacity={0.7}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.entryRow}
    >
      <View style={[styles.entryIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.entryTitle}>{title}</Text>
        <Text style={styles.entrySub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Animated.View style={chevronStyle}>
        <ChevronRight size={18} color={colors.textTertiary} />
      </Animated.View>
    </TouchableOpacity>
  )
}

function WalletStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'warning' | 'error' | 'muted'
}) {
  const valueColor =
    tone === 'warning'
      ? colors.warning
      : tone === 'error'
        ? colors.error
        : colors.text
  return (
    <View style={styles.walletStat}>
      <Text style={styles.walletStatLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.walletStatValue, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

function EarningsSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      <View style={[styles.skeletonBlock, { height: 220 }]} />
      <View style={styles.skeletonTiles}>
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlock} />
      </View>
      <View style={[styles.skeletonBlock, { height: 56 }]} />
      <View style={[styles.skeletonBlock, { height: 132 }]} />
      <View style={[styles.skeletonBlock, { height: 180 }]} />
    </View>
  )
}

function ErrorState({
  title,
  subtitle,
  retry,
  onRetry,
}: {
  title: string
  subtitle: string
  retry: string
  onRetry: () => void
}) {
  return (
    <View style={styles.errorWrap}>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorSubtitle}>{subtitle}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={retry}
        onPress={onRetry}
        style={styles.retryBtn}
      >
        <Text style={styles.retryText}>{retry}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { backgroundColor: colors.primary, paddingHorizontal: spacing[4] },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingBottom: spacing[3],
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: fontSize.xl[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  headerSub: { fontSize: 13, color: colors.primary50, marginTop: 2, fontFamily: fontFamily.sans[0] },

  body: { padding: spacing[4], gap: spacing[3] },

  // Hero
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radii['2xl'],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow('lg'),
  },
  heroAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: colors.gold,
  },
  heroBody: { padding: spacing[5], paddingLeft: spacing[6], gap: spacing[2] },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
    lineHeight: 42,
  },
  heroCaption: { fontSize: 13, color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  pendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    alignSelf: 'flex-start',
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    marginTop: spacing[1],
  },
  pendingChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansSemiBold[0],
  },
  cashOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  cashOutBtnDisabled: { opacity: 0.5 },
  cashOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  cashOutHint: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing[1.5],
    fontFamily: fontFamily.sans[0],
  },
  nextPayoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing[3],
    paddingTop: spacing[3],
  },
  nextPayoutLabel: { fontSize: 13, color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  nextPayoutValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Section heads
  sectionHead: { marginTop: spacing[2], paddingHorizontal: spacing[1] },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Period tiles
  tilesRow: { flexDirection: 'row', gap: spacing[2.5] },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3.5],
    gap: spacing[1],
    ...shadow('sm'),
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  tileEarned: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  tileTrips: {
    fontSize: 12,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sans[0],
  },
  tilePerTrip: {
    fontSize: 11,
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sans[0],
  },

  // Explainer
  explainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  explainerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },

  // Explore entries
  entriesCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadow('sm'),
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
    minHeight: 56,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  entrySub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: fontFamily.sans[0],
  },
  entryDivider: { height: 1, backgroundColor: colors.borderLight, marginLeft: spacing[12] },

  // Wallet card (distinct: warm/amber, not plum)
  walletCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: spacing[4],
    gap: spacing[3],
    ...shadow('sm'),
  },
  walletTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  walletIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  walletSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: fontFamily.sans[0],
  },
  walletStats: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  walletStat: { flex: 1, gap: spacing[1] },
  walletStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  walletStatValue: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  walletHint: {
    fontSize: 11,
    color: colors.warning,
    fontStyle: 'italic',
    fontFamily: fontFamily.sans[0],
  },
  walletRemitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.warning,
    backgroundColor: 'transparent',
  },
  walletRemitBtnDisabled: { opacity: 0.5 },
  walletRemitText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warning,
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Skeleton
  skeletonWrap: { padding: spacing[4], gap: spacing[3] },
  skeletonBlock: {
    flex: 1,
    borderRadius: radii.lg,
    backgroundColor: colors.shimmer,
    minHeight: 120,
  },
  skeletonTiles: { flexDirection: 'row', gap: spacing[2.5], height: 110 },

  // Error
  errorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[6],
    gap: spacing[2],
  },
  errorTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  retryBtn: {
    marginTop: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
})
