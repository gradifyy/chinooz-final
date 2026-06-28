import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import {
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  MapPin,
  Navigation,
  Clock,
  Star,
  Banknote,
  Flame,
  ListChecks,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import {
  getRiderTripLedger,
  formatRiderNPRAmount,
  type TripLedger,
  type TripLedgerDay,
  type TripLedgerEntry,
  type TripLedgerKind,
} from '@chinooz/mock-data'

type EarningFilter = 'all' | 'trips' | 'incentives' | 'tips'
type DateRange = 'all' | '7d' | '30d'

const EARNING_FILTERS: { key: EarningFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'rider.earnings.ledger.trips.filterAll' },
  { key: 'trips', labelKey: 'rider.earnings.ledger.trips.filterTrips' },
  { key: 'incentives', labelKey: 'rider.earnings.ledger.trips.filterIncentives' },
  { key: 'tips', labelKey: 'rider.earnings.ledger.trips.filterTips' },
]

const DATE_RANGES: { key: DateRange; labelKey: string; days: number }[] = [
  { key: 'all', labelKey: 'rider.earnings.ledger.trips.dateRangeAll', days: 0 },
  { key: '7d', labelKey: 'rider.earnings.ledger.trips.dateRange7d', days: 7 },
  { key: '30d', labelKey: 'rider.earnings.ledger.trips.dateRange30d', days: 30 },
]

const AnimatedPress = Animated.createAnimatedComponent(Pressable)

function tripClock(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function RiderLedgerScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const params = useLocalSearchParams<{ date?: string }>()

  const [ledger, setLedger] = useState<TripLedger | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [dateFilter, setDateFilter] = useState<string | null>(params.date ?? null)
  const [earningFilter, setEarningFilter] = useState<EarningFilter>('all')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    analytics.screen({ name: 'rider-earnings-ledger' })
  }, [])

  const load = useCallback(async () => {
    setError(false)
    try {
      const r = await getRiderTripLedger()
      setLedger(r)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const filteredDays = useMemo(() => {
    if (!ledger) return []
    const now = Date.now()
    const rangeDays = DATE_RANGES.find(r => r.key === dateRange)?.days ?? 0
    const cutoff = rangeDays > 0 ? now - rangeDays * 24 * 60 * 60 * 1000 : 0
    const q = query.trim().toLowerCase()
    return ledger.days
      .map(day => {
        let entries = day.entries
        // Date filter from chart deep-link
        if (dateFilter) entries = entries.filter(() => day.date === dateFilter)
        // Date range filter
        if (cutoff > 0) {
          const dayMs = new Date(day.date + 'T00:00:00').getTime()
          if (dayMs < cutoff) entries = []
        }
        // Earning type filter
        if (earningFilter !== 'all') {
          entries = entries.filter(e => {
            if (earningFilter === 'incentives') return e.hasIncentive
            if (earningFilter === 'tips') return e.lines.some(l => l.kind === 'tip')
            if (earningFilter === 'trips') return e.lines.some(l => l.kind === 'trip')
            return true
          })
        }
        // Search by order/job ref
        if (q) {
          entries = entries.filter(
            e =>
              e.orderRef.toLowerCase().includes(q) ||
              e.id.toLowerCase().includes(q),
          )
        }
        const dailyTotal = entries.reduce((s, e) => s + e.netEarning, 0)
        const tripCount = entries.length
        const incentiveTotal = entries.reduce(
          (s, e) => s + e.lines.filter(l => l.kind === 'incentive').reduce((ls, l) => ls + l.amount, 0),
          0,
        )
        return { ...day, entries, dailyTotal, tripCount, incentiveTotal }
      })
      .filter(day => day.entries.length > 0)
  }, [ledger, dateFilter, earningFilter, dateRange, query])

  const totalShown = useMemo(
    () => filteredDays.reduce((s, d) => s + d.dailyTotal, 0),
    [filteredDays],
  )
  const tripsShown = useMemo(
    () => filteredDays.reduce((s, d) => s + d.tripCount, 0),
    [filteredDays],
  )

  const onRowTap = (entry: TripLedgerEntry) => {
    try {
      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    router.push({ pathname: '/trip-detail', params: { id: entry.id } })
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.earnings.ledger.trips.back') || t('rider.earnings.ledger.back')}
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              {t('rider.earnings.ledger.trips.title')}
            </Text>
            <Text style={styles.headerSub}>{t('rider.earnings.ledger.trips.subtitle')}</Text>
          </View>
        </View>
      </View>

      {/* Sticky controls: search + date range + earning type */}
      <View style={styles.stickyControls}>
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Search size={18} color={colors.textMuted} style={{ position: 'absolute', left: 12 }} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('rider.earnings.ledger.trips.searchPlaceholder')}
              accessibilityLabel={t('rider.earnings.ledger.trips.searchAria')}
              inputMode="search"
              returnKeyType="search"
              style={styles.searchInput}
              placeholderTextColor={colors.textTertiary}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery('')}
                accessibilityLabel={t('rider.earnings.ledger.trips.searchClear')}
                style={styles.searchClear}
              >
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="tablist"
          accessibilityLabel={t('rider.earnings.ledger.trips.dateRangeAria')}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {DATE_RANGES.map(r => {
            const active = r.key === dateRange && !dateFilter
            const label = t(r.labelKey)
            return (
              <TouchableOpacity
                key={r.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t('rider.earnings.ledger.trips.dateRangeTabAria', { range: label })}
                onPress={() => {
                  setDateFilter(null)
                  setDateRange(r.key)
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="tablist"
          accessibilityLabel={t('rider.earnings.ledger.trips.filterAria')}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {EARNING_FILTERS.map(f => {
            const active = f.key === earningFilter
            const label = t(f.labelKey)
            return (
              <TouchableOpacity
                key={f.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t('rider.earnings.ledger.trips.filterTabAria', { type: label })}
                onPress={() => setEarningFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {dateFilter && (
          <View style={styles.filterBanner}>
            <Text style={styles.filterBannerText}>
              {t('rider.earnings.ledger.dayFiltered', { date: dateFilter })}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.earnings.ledger.clearDateAria')}
              onPress={() => setDateFilter(null)}
              style={styles.filterClearBtn}
            >
              <X size={14} color={colors.primary} />
              <Text style={styles.filterClearText}>{t('rider.earnings.ledger.clearDate')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8] }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {loading ? (
          <LedgerSkeleton ariaLabel={t('rider.earnings.ledger.skeletonAria')} />
        ) : error ? (
          <ErrorState
            title={t('rider.earnings.ledger.errorTitle')}
            subtitle={t('rider.earnings.ledger.errorSubtitle')}
            retry={t('rider.earnings.ledger.retry')}
            onRetry={onRefresh}
          />
        ) : filteredDays.length === 0 ? (
          <EmptyState
            title={t('rider.earnings.ledger.trips.emptyFiltered')}
            subtitle={t('rider.earnings.ledger.trips.emptyFilteredSubtitle')}
          />
        ) : (
          <View style={styles.body}>
            {/* Grand total summary */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('rider.earnings.ledger.trips.grandTotal')}</Text>
              <Text style={styles.summaryValue}>
                NPR {formatRiderNPRAmount(totalShown)}
              </Text>
              <Text style={styles.summaryTrips}>
                {tripsShown === 1
                  ? t('rider.earnings.ledger.trips.totalTripsOne', { count: tripsShown })
                  : t('rider.earnings.ledger.trips.totalTripsOther', { count: tripsShown })}
              </Text>
            </View>

            {/* Day groups */}
            {filteredDays.map(day => (
              <DayGroup
                key={day.date}
                day={day}
                reduced={reduced}
                onRowTap={onRowTap}
                t={t}
              />
            ))}
            <View style={{ height: spacing[4] }} />
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function DayGroup({
  day,
  reduced,
  onRowTap,
  t,
}: {
  day: TripLedgerDay
  reduced: boolean
  onRowTap: (e: TripLedgerEntry) => void
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const incentiveAria =
    day.incentiveTotal > 0
      ? ' ' + t('rider.earnings.ledger.trips.rowIncentiveAria', { amount: formatRiderNPRAmount(day.incentiveTotal) })
      : ''
  const dayAria = t('rider.earnings.ledger.trips.dayAria', {
    label: day.label,
    trips: day.tripCount,
    total: formatRiderNPRAmount(day.dailyTotal),
    incentive: incentiveAria,
  })

  return (
    <View style={styles.dayGroup}>
      <View style={styles.dayHeader} accessibilityRole="header" accessible accessibilityLabel={dayAria}>
        <View style={styles.dayHeaderLeft}>
          <Text style={styles.dayLabel}>{day.label}</Text>
          <Text style={styles.dayTrips}>
            {day.tripCount === 1
              ? t('rider.earnings.ledger.trips.dailyTripsOne', { count: day.tripCount })
              : t('rider.earnings.ledger.trips.dailyTripsOther', { count: day.tripCount })}
          </Text>
        </View>
        <View style={styles.dayHeaderRight}>
          {day.incentiveTotal > 0 && (
            <View style={styles.dayIncentiveChip}>
              <Star size={11} color={colors.warning} />
              <Text style={styles.dayIncentiveText}>
                {t('rider.earnings.ledger.trips.dailyIncentive', {
                  amount: formatRiderNPRAmount(day.incentiveTotal),
                })}
              </Text>
            </View>
          )}
          <Text style={styles.dayTotal}>
            NPR {formatRiderNPRAmount(day.dailyTotal)}
          </Text>
        </View>
      </View>

      {day.entries.map(entry => (
        <TripRow
          key={entry.id}
          entry={entry}
          reduced={reduced}
          onPress={() => onRowTap(entry)}
          t={t}
        />
      ))}
    </View>
  )
}

function TripRow({
  entry,
  reduced,
  onPress,
  t,
}: {
  entry: TripLedgerEntry
  reduced: boolean
  onPress: () => void
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const scale = useSharedValue(1)
  const chevronX = useSharedValue(0)

  const handlePressIn = () => {
    if (reduced) return
    scale.value = withSpring(0.98, { damping: 14, stiffness: 400, mass: 0.6 })
    chevronX.value = withTiming(3, { duration: 120, easing: Easing.out(Easing.ease) })
  }
  const handlePressOut = () => {
    if (reduced) return
    scale.value = withSpring(1, { damping: 14, stiffness: 400, mass: 0.6 })
    chevronX.value = withTiming(0, { duration: 120, easing: Easing.out(Easing.ease) })
  }

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ translateX: chevronX.value }] }))

  const incentiveAmount = entry.lines
    .filter(l => l.kind === 'incentive')
    .reduce((s, l) => s + l.amount, 0)
  const incentiveAria =
    incentiveAmount > 0
      ? ' ' + t('rider.earnings.ledger.trips.rowIncentiveAria', { amount: formatRiderNPRAmount(incentiveAmount) })
      : ''
  const aria = t('rider.earnings.ledger.trips.rowAria', {
    time: tripClock(entry.completedAt),
    pickup: entry.pickupArea,
    dropoff: entry.dropoffArea,
    km: entry.distanceKm,
    amount: formatRiderNPRAmount(entry.netEarning),
    incentive: incentiveAria,
  })

  return (
    <AnimatedPress
      accessibilityRole="button"
      accessibilityLabel={aria}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.tripRow, scaleStyle]}
    >
      <View style={styles.tripRowTop}>
        <View style={styles.routeWrap}>
          <View style={styles.routeLine}>
            <MapPin size={13} color={colors.textTertiary} />
            <Text style={styles.routeText} numberOfLines={1}>{entry.pickupArea}</Text>
          </View>
          <View style={styles.routeConnector} />
          <View style={styles.routeLine}>
            <Navigation size={13} color={colors.textTertiary} />
            <Text style={styles.routeText} numberOfLines={1}>{entry.dropoffArea}</Text>
          </View>
        </View>
        <Text style={styles.tripAmount} numberOfLines={1}>
          NPR {formatRiderNPRAmount(entry.netEarning)}
        </Text>
      </View>

      <View style={styles.tripRowBottom}>
        <View style={styles.tripMetaRow}>
          <Clock size={12} color={colors.textTertiary} />
          <Text style={styles.tripMetaText}>
            {t('rider.earnings.ledger.trips.rowTime', { time: tripClock(entry.completedAt) })}
          </Text>
          <Text style={styles.tripMetaDot}>·</Text>
          <Text style={styles.tripMetaText}>
            {t('rider.earnings.ledger.trips.rowDistance', { km: entry.distanceKm })}
          </Text>
          <Text style={styles.tripMetaDot}>·</Text>
          <Text style={styles.tripRef} numberOfLines={1}>{entry.orderRef}</Text>
        </View>

        <View style={styles.tripBadges}>
          {entry.hasIncentive && (
            <View style={styles.incentiveMarker}>
              <Star size={11} color={colors.warning} />
              <Text style={styles.incentiveMarkerText}>
                {t('rider.earnings.ledger.trips.incentiveMarker')}
              </Text>
            </View>
          )}
          {entry.isCod ? (
            <View style={styles.codBadge}>
              <Banknote size={11} color={colors.warning} />
              <Text style={styles.codBadgeText}>COD</Text>
            </View>
          ) : (
            <View style={styles.prepaidBadge}>
              <Text style={styles.prepaidBadgeText}>
                {t('rider.earnings.ledger.trips.prepaidBadge')}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Animated.View style={[styles.chevronWrap, chevronStyle]}>
        <ChevronRight size={16} color={colors.textTertiary} />
      </Animated.View>
    </AnimatedPress>
  )
}

function LedgerSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      <View style={styles.skeletonBlock} />
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={styles.skeletonGroup}>
          <View style={styles.skeletonDayHeader} />
          {Array.from({ length: 2 }).map((_, j) => (
            <View key={j} style={styles.skeletonRow} />
          ))}
        </View>
      ))}
    </View>
  )
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.emptyWrap}>
      <ListChecks size={32} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingBottom: spacing[3] },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.xl[0], fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
  headerSub: { fontSize: 13, color: colors.primary50, marginTop: 2, fontFamily: fontFamily.sans[0] },

  stickyControls: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing[2.5],
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[2.5],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontFamily: fontFamily.sans[0],
    paddingLeft: 28,
    paddingVertical: 0,
  },
  searchClear: { padding: spacing[1] },
  chipsScroll: { flexGrow: 0 },
  chipsContent: { flexDirection: 'row', gap: spacing[1.5] },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 30,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, fontFamily: fontFamily.sansSemiBold[0] },
  chipLabelActive: { color: colors.white },

  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    backgroundColor: colors.primary50,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
  },
  filterBannerText: { fontSize: 12, fontWeight: '600', color: colors.primary, fontFamily: fontFamily.sansSemiBold[0] },
  filterClearBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  filterClearText: { fontSize: 11, fontWeight: '600', color: colors.primary, fontFamily: fontFamily.sansSemiBold[0] },

  body: { padding: spacing[4], gap: spacing[3] },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    ...shadow('sm'),
  },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, fontFamily: fontFamily.sansSemiBold[0] },
  summaryValue: { fontSize: 18, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  summaryTrips: { fontSize: 12, color: colors.textTertiary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },

  dayGroup: { gap: spacing[1.5] },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[1],
    paddingVertical: spacing[1.5],
  },
  dayHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  dayLabel: { fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0] },
  dayTrips: { fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },
  dayHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  dayIncentiveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  dayIncentiveText: { fontSize: 11, fontWeight: '600', color: colors.warning, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansSemiBold[0] },
  dayTotal: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },

  tripRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3.5],
    gap: spacing[2.5],
    position: 'relative',
    ...shadow('sm'),
  },
  tripRowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[2] },
  routeWrap: { flex: 1, minWidth: 0, gap: spacing[0.5] },
  routeLine: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  routeText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  routeConnector: { marginLeft: 6, width: 2, height: 8, backgroundColor: colors.border },
  tripAmount: { fontSize: 16, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },

  tripRowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  tripMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], flex: 1, minWidth: 0 },
  tripMetaText: { fontSize: 11, color: colors.textMuted, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },
  tripMetaDot: { fontSize: 11, color: colors.textTertiary },
  tripRef: { fontSize: 11, color: colors.textTertiary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },

  tripBadges: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  incentiveMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  incentiveMarkerText: { fontSize: 10, fontWeight: '700', color: colors.warning, fontFamily: fontFamily.sansSemiBold[0] },
  codBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  codBadgeText: { fontSize: 10, fontWeight: '700', color: colors.warning, fontFamily: fontFamily.sansSemiBold[0] },
  prepaidBadge: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  prepaidBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textMuted, fontFamily: fontFamily.sansSemiBold[0] },

  chevronWrap: { position: 'absolute', right: spacing[2.5], top: spacing[3.5] },

  skeletonWrap: { padding: spacing[4], gap: spacing[3] },
  skeletonBlock: { height: 56, borderRadius: radii.lg, backgroundColor: colors.shimmer },
  skeletonGroup: { gap: spacing[2] },
  skeletonDayHeader: { height: 24, width: 140, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  skeletonRow: { height: 80, borderRadius: radii.lg, backgroundColor: colors.shimmer },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[6], gap: spacing[2] },
  emptyTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },

  errorWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[6], gap: spacing[2] },
  errorTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  errorSubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },
  retryBtn: { marginTop: spacing[3], paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radii.lg, backgroundColor: colors.primary },
  retryText: { fontSize: 14, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
})
