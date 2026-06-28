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
import { useRouter } from 'expo-router'
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
  Clock,
  Banknote,
  AlertTriangle,
  ListChecks,
  Receipt,
  MapPin,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import {
  getCodCollections,
  formatRiderNPRAmount,
  type CodCollectionLedger,
  type CodCollectionDay,
  type CodCollectionRow,
} from '@chinooz/mock-data'

type DateRangeKey = 'all' | 'today' | '7d' | '30d'
type StatusFilter = 'all' | 'collected' | 'flagged'

const DATE_RANGES: { key: DateRangeKey; labelKey: string; days: number }[] = [
  { key: 'all', labelKey: 'rider.wallet.ledger.dateRangeAll', days: 0 },
  { key: 'today', labelKey: 'rider.wallet.ledger.dateRangeToday', days: 1 },
  { key: '7d', labelKey: 'rider.wallet.ledger.dateRange7d', days: 7 },
  { key: '30d', labelKey: 'rider.wallet.ledger.dateRange30d', days: 30 },
]

const STATUS_FILTERS: { key: StatusFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'rider.wallet.ledger.filterStatusAll' },
  { key: 'collected', labelKey: 'rider.wallet.ledger.filterStatusCollected' },
  { key: 'flagged', labelKey: 'rider.wallet.ledger.filterStatusFlagged' },
]

const AnimatedPress = Animated.createAnimatedComponent(Pressable)

function collectionClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function CodCollectionLedgerScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const { connectivity } = useAppState()
  const isOffline = connectivity === 'offline'

  const [ledger, setLedger] = useState<CodCollectionLedger | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [dateRange, setDateRange] = useState<DateRangeKey>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    analytics.screen({ name: 'rider-cod-collection-ledger' })
  }, [])

  const load = useCallback(async () => {
    setError(false)
    try {
      const r = await getCodCollections()
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
    if (!ledger) return [] as CodCollectionDay[]
    const now = Date.now()
    const rangeDays = DATE_RANGES.find(r => r.key === dateRange)?.days ?? 0
    const cutoff = rangeDays > 0 ? now - rangeDays * 24 * 60 * 60 * 1000 : 0
    const today = new Date().toISOString().slice(0, 10)
    const q = query.trim().toLowerCase()
    return ledger.days
      .map(day => {
        let entries = day.entries
        if (dateRange === 'today' && day.date !== today) entries = []
        if (cutoff > 0 && dateRange !== 'today') {
          const dayMs = new Date(day.date + 'T00:00:00').getTime()
          if (dayMs < cutoff) entries = []
        }
        if (statusFilter === 'collected') entries = entries.filter(e => !e.flagged)
        if (statusFilter === 'flagged') entries = entries.filter(e => e.flagged)
        if (q) {
          entries = entries.filter(
            e =>
              e.orderId.toLowerCase().includes(q) ||
              e.jobRef.toLowerCase().includes(q),
          )
        }
        const dailyTotal = entries.reduce((s, e) => s + e.amount, 0)
        const flaggedCount = entries.filter(e => e.flagged).length
        return { ...day, entries, dailyTotal, count: entries.length, flaggedCount }
      })
      .filter(day => day.entries.length > 0)
  }, [ledger, dateRange, statusFilter, query])

  const totalShown = useMemo(
    () => filteredDays.reduce((s, d) => s + d.dailyTotal, 0),
    [filteredDays],
  )
  const countShown = useMemo(
    () => filteredDays.reduce((s, d) => s + d.count, 0),
    [filteredDays],
  )

  const onRowTap = (row: CodCollectionRow) => {
    try {
      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    router.push({ pathname: '/trip-detail', params: { id: row.jobRef } } as never)
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.wallet.ledger.back')}
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              {t('rider.wallet.ledger.title')}
            </Text>
            <Text style={styles.headerSub}>{t('rider.wallet.ledger.subtitle')}</Text>
          </View>
        </View>
      </View>

      {/* Sticky controls: search + date range + status filter */}
      <View style={styles.stickyControls}>
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Search size={18} color={colors.textMuted} style={{ position: 'absolute', left: 12 }} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('rider.wallet.ledger.searchPlaceholder')}
              accessibilityLabel={t('rider.wallet.ledger.searchAria')}
              inputMode="search"
              returnKeyType="search"
              style={styles.searchInput}
              placeholderTextColor={colors.textTertiary}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery('')}
                accessibilityLabel={t('rider.wallet.ledger.searchClear')}
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
          accessibilityLabel={t('rider.wallet.ledger.dateRangeAria')}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {DATE_RANGES.map(r => {
            const active = r.key === dateRange
            const label = t(r.labelKey)
            return (
              <TouchableOpacity
                key={r.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t('rider.wallet.ledger.dateRangeTabAria', { range: label })}
                onPress={() => setDateRange(r.key)}
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
          accessibilityLabel={t('rider.wallet.ledger.filterStatusAria')}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {STATUS_FILTERS.map(f => {
            const active = f.key === statusFilter
            const label = t(f.labelKey)
            return (
              <TouchableOpacity
                key={f.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t('rider.wallet.ledger.filterStatusTabAria', { status: label })}
                onPress={() => setStatusFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
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
        {/* Offline banner — cached ledger */}
        {isOffline && !loading && !error && (
          <OfflineBanner
            title={t('rider.wallet.states.offlineTitle')}
            body={t('rider.wallet.states.offlineBody')}
            ariaLabel={t('rider.wallet.states.offlineAria')}
          />
        )}

        {/* Dispute banner — if flagged collections exist */}
        {ledger && ledger.flaggedCount > 0 && !loading && !error && (
          <DisputeBanner
            title={t('rider.wallet.states.disputeWarningTitle')}
            body={t('rider.wallet.states.disputeWarningBody', {
              amount: formatRiderNPRAmount(
                ledger.days
                  .flatMap(d => d.rows)
                  .filter(r => r.flagged)
                  .reduce((s, r) => s + r.amount, 0),
              ),
              orderId: ledger.days
                .flatMap(d => d.rows)
                .find(r => r.flagged)?.orderId ?? '—',
            })}
            ariaLabel={t('rider.wallet.states.disputeWarningAria', {
              amount: formatRiderNPRAmount(ledger.flaggedCount),
              orderId: '—',
            })}
          />
        )}

        {loading ? (
          <LedgerSkeleton ariaLabel={t('rider.wallet.ledger.skeletonAria')} />
        ) : error ? (
          <ErrorState
            title={t('rider.wallet.ledger.errorTitle')}
            subtitle={t('rider.wallet.ledger.errorSubtitle')}
            retry={t('rider.wallet.ledger.retry')}
            onRetry={onRefresh}
          />
        ) : filteredDays.length === 0 ? (
          <EmptyState
            title={ledger && ledger.totalCount > 0 ? t('rider.wallet.ledger.emptyFilteredTitle') : t('rider.wallet.ledger.emptyTitle')}
            subtitle={ledger && ledger.totalCount > 0 ? t('rider.wallet.ledger.emptyFilteredSubtitle') : t('rider.wallet.ledger.emptySubtitle')}
          />
        ) : (
          <View style={styles.body}>
            {/* Grand total summary */}
            <View
              style={styles.summaryRow}
              accessibilityRole="summary"
              accessibilityLabel={t('rider.wallet.ledger.grandTotal') + ': NPR ' + formatRiderNPRAmount(totalShown) + ', ' + countShown + ' collections'}
            >
              <Text style={styles.summaryLabel}>{t('rider.wallet.ledger.grandTotal')}</Text>
              <Text style={styles.summaryValue}>
                NPR {formatRiderNPRAmount(totalShown)}
              </Text>
              <Text style={styles.summaryCount}>
                {countShown === 1
                  ? t('rider.wallet.ledger.grandTotalTrips_one', { count: countShown })
                  : t('rider.wallet.ledger.grandTotalTrips_other', { count: countShown })}
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
  day: CodCollectionDay
  reduced: boolean
  onRowTap: (e: CodCollectionRow) => void
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const flaggedAria =
    day.flaggedCount > 0
      ? ', ' + day.flaggedCount + ' flagged'
      : ''
  const dayAria = t('rider.wallet.ledger.dayAria', {
    label: day.label,
    count: day.count,
    subtotal: formatRiderNPRAmount(day.dailyTotal),
  }) + flaggedAria

  return (
    <View style={styles.dayGroup}>
      <View style={styles.dayHeader} accessibilityRole="header" accessible accessibilityLabel={dayAria}>
        <View style={styles.dayHeaderLeft}>
          <Text style={styles.dayLabel}>{day.label}</Text>
          <Text style={styles.dayCount}>
            {day.count === 1
              ? t('rider.wallet.ledger.dailyCollectionsOne', { count: day.count })
              : t('rider.wallet.ledger.dailyCollectionsOther', { count: day.count })}
          </Text>
          {day.flaggedCount > 0 && (
            <View style={styles.dayFlagChip}>
              <AlertTriangle size={10} color={colors.warning} />
              <Text style={styles.dayFlagText}>{day.flaggedCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.dayHeaderRight}>
          <Text style={styles.daySubtotalLabel}>{t('rider.wallet.ledger.dailySubtotal')}</Text>
          <Text style={styles.dayTotal}>
            NPR {formatRiderNPRAmount(day.dailyTotal)}
          </Text>
        </View>
      </View>

      {day.entries.map(entry => (
        <CollectionRow
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

function CollectionRow({
  entry,
  reduced,
  onPress,
  t,
}: {
  entry: CodCollectionRow
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

  const statusLabel =
    entry.status === 'collected'
      ? t('rider.wallet.ledger.statusCollected')
      : entry.status === 'partial'
        ? t('rider.wallet.ledger.statusPartial')
        : t('rider.wallet.ledger.statusDisputed')

  const aria = t('rider.wallet.ledger.rowAria', {
    amount: formatRiderNPRAmount(entry.amount),
    ref: entry.orderId,
    time: collectionClock(entry.collectedAt),
    area: entry.buyerArea,
    status: statusLabel,
    running: formatRiderNPRAmount(entry.runningCashInHand),
  })

  return (
    <AnimatedPress
      accessibilityRole="button"
      accessibilityLabel={aria}
      accessibilityHint={t('rider.wallet.ledger.viewReceiptAria', { ref: entry.orderId })}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.row, scaleStyle, entry.flagged && styles.rowFlagged]}
    >
      <View style={styles.rowTop}>
        <View style={styles.rowLeft}>
          <View style={styles.rowIconWrap}>
            <Banknote size={14} color={entry.flagged ? colors.warning : colors.primary} />
          </View>
          <View style={styles.rowMeta}>
            <Text style={styles.rowAmount}>
              NPR {formatRiderNPRAmount(entry.amount)}
            </Text>
            <Text style={styles.rowRef} numberOfLines={1}>{entry.orderId}</Text>
          </View>
        </View>
        {entry.flagged ? (
          <View style={styles.flagBadge}>
            <AlertTriangle size={11} color={colors.warning} />
            <Text style={styles.flagText}>
              {entry.status === 'partial'
                ? t('rider.wallet.ledger.flagPartial')
                : t('rider.wallet.ledger.flagDisputed')}
            </Text>
          </View>
        ) : (
          <View style={styles.collectedBadge}>
            <Text style={styles.collectedText}>{statusLabel}</Text>
          </View>
        )}
      </View>

      <View style={styles.rowBottom}>
        <View style={styles.rowMetaRow}>
          <MapPin size={12} color={colors.textTertiary} />
          <Text style={styles.rowArea} numberOfLines={1}>{entry.buyerArea}</Text>
          <Text style={styles.rowDot}>·</Text>
          <Clock size={12} color={colors.textTertiary} />
          <Text style={styles.rowTime}>{collectionClock(entry.collectedAt)}</Text>
        </View>
        <View style={styles.runningWrap}>
          <Text style={styles.runningLabel}>{t('rider.wallet.ledger.runningLabel')}</Text>
          <Text style={styles.runningValue}>
            NPR {formatRiderNPRAmount(entry.runningCashInHand)}
          </Text>
        </View>
      </View>

      <View style={styles.rowFooter}>
        <View style={styles.receiptLink}>
          <Receipt size={12} color={colors.primary} />
          <Text style={styles.receiptText}>{t('rider.wallet.ledger.viewReceipt')}</Text>
        </View>
        <Animated.View style={[styles.chevronWrap, chevronStyle]}>
          <ChevronRight size={16} color={colors.textTertiary} />
        </Animated.View>
      </View>
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
  summaryCount: { fontSize: 12, color: colors.textTertiary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },

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
  dayCount: { fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },
  dayFlagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[0.5],
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  dayFlagText: { fontSize: 10, fontWeight: '700', color: colors.warning, fontFamily: fontFamily.sansSemiBold[0] },
  dayHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  daySubtotalLabel: { fontSize: 11, fontWeight: '600', color: colors.textTertiary, fontFamily: fontFamily.sansSemiBold[0] },
  dayTotal: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },

  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3.5],
    gap: spacing[2.5],
    position: 'relative',
    ...shadow('sm'),
  },
  rowFlagged: { borderColor: colors.warning, borderWidth: 1 },

  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5], flex: 1, minWidth: 0 },
  rowIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMeta: { flex: 1, minWidth: 0, gap: 1 },
  rowAmount: { fontSize: 16, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  rowRef: { fontSize: 11, color: colors.textTertiary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },

  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  flagText: { fontSize: 10, fontWeight: '700', color: colors.warning, fontFamily: fontFamily.sansSemiBold[0] },
  collectedBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  collectedText: { fontSize: 10, fontWeight: '700', color: colors.success, fontFamily: fontFamily.sansSemiBold[0] },

  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  rowMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], flex: 1, minWidth: 0 },
  rowArea: { fontSize: 11, color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  rowDot: { fontSize: 11, color: colors.textTertiary },
  rowTime: { fontSize: 11, color: colors.textMuted, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },
  runningWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  runningLabel: { fontSize: 10, fontWeight: '500', color: colors.textTertiary, fontFamily: fontFamily.sans[0] },
  runningValue: { fontSize: 11, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },

  rowFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing[1.5], borderTopWidth: 1, borderTopColor: colors.borderLight },
  receiptLink: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  receiptText: { fontSize: 11, fontWeight: '600', color: colors.primary, fontFamily: fontFamily.sansSemiBold[0] },
  chevronWrap: {},

  skeletonWrap: { padding: spacing[4], gap: spacing[3] },
  skeletonBlock: { height: 56, borderRadius: radii.lg, backgroundColor: colors.shimmer },
  skeletonGroup: { gap: spacing[2] },
  skeletonDayHeader: { height: 24, width: 140, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  skeletonRow: { height: 96, borderRadius: radii.lg, backgroundColor: colors.shimmer },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[6], gap: spacing[2] },
  emptyTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },

  errorWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[6], gap: spacing[2] },
  errorTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  errorSubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },
  retryBtn: { marginTop: spacing[3], paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radii.lg, backgroundColor: colors.primary },
  retryText: { fontSize: 14, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
})
