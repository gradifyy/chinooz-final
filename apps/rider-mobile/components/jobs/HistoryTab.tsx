import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  AccessibilityInfo,
  ActivityIndicator,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  Search,
  X,
  ChevronRight,
  Banknote,
  Star,
  SlidersHorizontal,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { useRiderTripLedger } from '@chinooz/hooks'
import type { TripLedgerEntry } from '@chinooz/mock-data'
import { formatNpr, formatNprTabular } from './format'
import { ErrorStateView, NoResultsView, HistoryEmptyView, ShimmerBlock } from './JobStateViews'

/** Translate with an inline English fallback. */
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

type DateRangeFilter = 'all' | 'today' | '7d' | '30d'
type EarningsFilter = 'all' | '100' | '150' | '200'

const DATE_RANGE_OPTIONS: { key: DateRangeFilter; label: string; fallback: string }[] = [
  { key: 'all', label: 'rider.jobs.history.filterAll', fallback: 'All' },
  { key: 'today', label: 'rider.jobs.history.filterToday', fallback: 'Today' },
  { key: '7d', label: 'rider.jobs.history.filter7d', fallback: '7 days' },
  { key: '30d', label: 'rider.jobs.history.filter30d', fallback: '30 days' },
]

const EARNINGS_OPTIONS: { key: EarningsFilter; label: string; fallback: string }[] = [
  { key: 'all', label: 'rider.jobs.history.filterAll', fallback: 'All' },
  { key: '100', label: 'rider.jobs.history.filterMin100', fallback: 'Rs 100+' },
  { key: '150', label: 'rider.jobs.history.filterMin150', fallback: 'Rs 150+' },
  { key: '200', label: 'rider.jobs.history.filterMin200', fallback: 'Rs 200+' },
]

const PAGE_SIZE = 8

/** Synthetic page entries for infinite scroll (deterministic). */
function generateSyntheticPage(pageNum: number): TripLedgerEntry[] {
  const baseDate = new Date('2025-06-25')
  baseDate.setDate(baseDate.getDate() - (pageNum - 1) * 2)
  const areas = ['Thamel', 'Patan', 'Baneshwor', 'Boudha', 'Koteshwor', 'Kalanki', 'Chabahil', 'Naxal']
  const entries: TripLedgerEntry[] = []
  for (let i = 0; i < PAGE_SIZE; i++) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - Math.floor(i / 3))
    const dateStr = d.toISOString().slice(0, 10)
    const completedAt = `${dateStr}T${10 + (i % 10)}:${(i * 7) % 60}:00`
    const netEarning = 80 + ((i * 37 + pageNum * 13) % 130)
    const pickup = areas[(i + pageNum) % areas.length]
    const dropoff = areas[(i + pageNum + 3) % areas.length]
    const isCod = (i + pageNum) % 3 === 0
    const codAmount = isCod ? 200 + ((i * 53) % 2000) : 0
    const basePay = 60 + (netEarning % 50)
    const distPay = netEarning - basePay - 18
    entries.push({
      id: `synth-${pageNum}-${i}`,
      orderRef: `CHZ-${2030 - pageNum * 10 - i}`,
      date: dateStr,
      completedAt,
      pickupArea: pickup,
      dropoffArea: dropoff,
      distanceKm: Math.round((1 + (i % 5) + (pageNum % 3)) * 10) / 10,
      netEarning,
      isCod,
      codAmount,
      hasIncentive: (i + pageNum) % 4 === 0,
      rating: 3 + ((i + pageNum) % 3),
      lines: [
        { id: `s${pageNum}${i}l1`, kind: 'trip', label: 'Base pay', amount: basePay },
        { id: `s${pageNum}${i}l2`, kind: 'trip', label: 'Distance pay', amount: Math.max(0, distPay) },
        { id: `s${pageNum}${i}l3`, kind: 'adjustment', label: 'Platform fee', amount: -18 },
      ],
    })
  }
  return entries
}

type FlatItem =
  | { type: 'header'; date: string; label: string; dayTotal: number; tripCount: number }
  | { type: 'trip'; entry: TripLedgerEntry; dayDate: string }

interface HistoryTabProps {
  onView?: (entry: TripLedgerEntry) => void
}

export default function HistoryTab({ onView }: HistoryTabProps) {
  const tt = useTt()
  const reduced = useReducedMotion()
  const { data: ledger, isLoading, isError, refetch } = useRiderTripLedger()

  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all')
  const [earningsFilter, setEarningsFilter] = useState<EarningsFilter>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const synthEntries = useRef<TripLedgerEntry[]>([])

  const tick = useCallback(() => {
    try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [reduced])

  useEffect(() => {
    setPage(1)
    synthEntries.current = []
    setHasMore(true)
  }, [search, dateRange, earningsFilter])

  const allEntries = useMemo(() => {
    const base = ledger?.days.flatMap(d => d.entries) ?? []
    return [...base, ...synthEntries.current]
  }, [ledger])

  const filteredEntries = useMemo(() => {
    let list = allEntries
    if (dateRange !== 'all') {
      const now = new Date()
      const cutoff = new Date()
      if (dateRange === 'today') cutoff.setHours(0, 0, 0, 0)
      else if (dateRange === '7d') cutoff.setDate(now.getDate() - 7)
      else if (dateRange === '30d') cutoff.setDate(now.getDate() - 30)
      const cutoffMs = cutoff.getTime()
      list = list.filter(e => new Date(e.completedAt).getTime() >= cutoffMs)
    }
    if (earningsFilter !== 'all') {
      const min = parseInt(earningsFilter, 10)
      list = list.filter(e => e.netEarning >= min)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(e =>
        e.orderRef.toLowerCase().includes(q) ||
        e.pickupArea.toLowerCase().includes(q) ||
        e.dropoffArea.toLowerCase().includes(q),
      )
    }
    return list
  }, [allEntries, dateRange, earningsFilter, search])

  const visibleEntries = useMemo(() => filteredEntries.slice(0, page * PAGE_SIZE), [filteredEntries, page])

  const flatItems = useMemo(() => {
    const byDate = new Map<string, TripLedgerEntry[]>()
    for (const e of visibleEntries) {
      if (!byDate.has(e.date)) byDate.set(e.date, [])
      byDate.get(e.date)!.push(e)
    }
    const sortedDates = Array.from(byDate.keys()).sort((a, b) => (a < b ? 1 : -1))
    const items: FlatItem[] = []
    for (const date of sortedDates) {
      const entries = byDate.get(date)!
      const dayTotal = entries.reduce((s, e) => s + e.netEarning, 0)
      const dayLabel = formatDayLabel(date, tt)
      items.push({ type: 'header', date, label: dayLabel, dayTotal, tripCount: entries.length })
      for (const e of entries) {
        items.push({ type: 'trip', entry: e, dayDate: date })
      }
    }
    return items
  }, [visibleEntries])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    AccessibilityInfo.announceForAccessibility(tt('rider.jobs.history.loadingMore', undefined, 'Loading more trips…'))
    setTimeout(() => {
      const nextPage = Math.ceil(synthEntries.current.length / PAGE_SIZE) + 1
      if (nextPage > 5) {
        setHasMore(false)
        setLoadingMore(false)
        return
      }
      synthEntries.current = [...synthEntries.current, ...generateSyntheticPage(nextPage)]
      setPage(p => p + 1)
      setLoadingMore(false)
    }, 600)
  }, [loadingMore, hasMore, tt])

  const handleEntryPress = useCallback((entry: TripLedgerEntry) => {
    tick()
    onView?.(entry)
  }, [onView, tick])

  const hasActiveFilters = dateRange !== 'all' || earningsFilter !== 'all' || search.trim() !== ''

  const clearFilters = useCallback(() => {
    setSearch('')
    setDateRange('all')
    setEarningsFilter('all')
  }, [])

  // -- Loading state --
  if (isLoading && !ledger) {
    return (
      <View
        style={styles.list}
        testID="jobs-history-loading"
        accessibilityRole="progressbar"
        accessibilityLabel={tt('rider.jobs.states.loadingAria', undefined, 'Loading delivery history, please wait')}
        accessibilityState={{ busy: true }}
        accessible
      >
        <ShimmerBlock height={44} style={{ borderRadius: radii.lg }} />
        <ShimmerBlock height={36} width={100} style={{ borderRadius: radii.full }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <ShimmerBlock key={i} height={72} style={{ borderRadius: radii.md }} />
        ))}
      </View>
    )
  }

  // -- Error state --
  if (isError && !ledger) {
    return (
      <ErrorStateView
        testID="jobs-history-error"
        onRetry={() => refetch()}
        title={tt('rider.jobs.states.errorTitle', undefined, 'Could not load history')}
        subtitle={tt('rider.jobs.states.errorSubtitle', undefined, 'Something went wrong. Please try again.')}
      />
    )
  }

  // -- Empty state (no entries at all) --
  if (allEntries.length === 0) {
    return <HistoryEmptyView testID="jobs-history-empty" />
  }

  // -- No results from filters --
  if (filteredEntries.length === 0) {
    return (
      <View style={styles.list}>
        <SearchBar search={search} onSearch={setSearch} onClear={() => setSearch('')} tt={tt} />
        <FilterChips
          dateRange={dateRange}
          earningsFilter={earningsFilter}
          onDateRangeChange={setDateRange}
          onEarningsChange={setEarningsFilter}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(v => !v)}
          hasActiveFilters={hasActiveFilters}
          tt={tt}
        />
        <NoResultsView
          testID="jobs-history-no-results"
          onClearFilters={clearFilters}
          hasFilters={hasActiveFilters}
        />
      </View>
    )
  }

  const renderItem = ({ item }: { item: FlatItem }) => {
    if (item.type === 'header') {
      return (
        <View
          style={styles.dayHeader}
          accessibilityRole="header"
          accessibilityLabel={`${item.label}, ${item.tripCount} ${tt('rider.jobs.history.trips', undefined, 'trips')}, ${formatNpr(item.dayTotal)}`}
          testID={`jobs-history-day-${item.date}`}
        >
          <Text style={styles.dayHeaderText}>{item.label}</Text>
          <View style={styles.dayHeaderMeta}>
            <Text style={styles.dayHeaderCount}>{item.tripCount} {tt('rider.jobs.history.trips', undefined, 'trips')}</Text>
            <Text style={styles.dayHeaderTotal}>{formatNpr(item.dayTotal)}</Text>
          </View>
        </View>
      )
    }
    return <HistoryRow entry={item.entry} onPress={() => handleEntryPress(item.entry)} tt={tt} />
  }

  const ListFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoading} accessibilityRole="progressbar" accessibilityLabel={tt('rider.jobs.history.loadingMore', undefined, 'Loading more trips…')}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.footerText}>{tt('rider.jobs.history.loadingMore', undefined, 'Loading more trips…')}</Text>
        </View>
      )
    }
    if (!hasMore && filteredEntries.length > PAGE_SIZE) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>{tt('rider.jobs.history.endOfList', undefined, 'No more trips')}</Text>
        </View>
      )
    }
    return null
  }

  return (
    <View style={styles.list} testID="jobs-history-list">
      <SearchBar search={search} onSearch={setSearch} onClear={() => setSearch('')} tt={tt} />
      <FilterChips
        dateRange={dateRange}
        earningsFilter={earningsFilter}
        onDateRangeChange={setDateRange}
        onEarningsChange={setEarningsFilter}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(v => !v)}
        hasActiveFilters={hasActiveFilters}
        tt={tt}
      />
      <Text style={styles.resultsCount}>
        {filteredEntries.length === 1
          ? tt('rider.jobs.history.resultsOne', undefined, '1 trip')
          : tt('rider.jobs.history.results', { count: filteredEntries.length }, `${filteredEntries.length} trips`)}
      </Text>
      <FlatList
        data={flatItems}
        keyExtractor={(item, idx) => item.type === 'header' ? `h-${item.date}` : `t-${item.entry.id}-${idx}`}
        renderItem={renderItem}
        ListFooterComponent={ListFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={10}
        removeClippedSubviews={true}
        testID="jobs-history-flatlist"
      />
    </View>
  )
}

/* --------------------------- sub-components --------------------------- */

function SearchBar({ search, onSearch, onClear, tt }: { search: string; onSearch: (v: string) => void; onClear: () => void; tt: any }) {
  return (
    <View style={styles.searchBar}>
      <Search size={16} color={colors.textTertiary} />
      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={onSearch}
        placeholder={tt('rider.jobs.history.searchPlaceholder', undefined, 'Search by order ref or area')}
        placeholderTextColor={colors.textTertiary}
        accessibilityRole="search"
        accessibilityLabel={tt('rider.jobs.history.searchAria', undefined, 'Search delivery history')}
        testID="jobs-history-search"
      />
      {search.length > 0 && (
        <TouchableOpacity onPress={onClear} accessibilityRole="button" accessibilityLabel={tt('common.clear', undefined, 'Clear')}>
          <X size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  )
}

function FilterChips({ dateRange, earningsFilter, onDateRangeChange, onEarningsChange, showFilters, onToggleFilters, hasActiveFilters, tt }: any) {
  return (
    <View>
      <TouchableOpacity
        onPress={onToggleFilters}
        style={[styles.filterToggle, hasActiveFilters && styles.filterToggleActive]}
        accessibilityRole="button"
        accessibilityLabel={tt('rider.jobs.history.filtersAria', undefined, 'Toggle filters')}
        testID="jobs-history-filter-toggle"
      >
        <SlidersHorizontal size={14} color={hasActiveFilters ? colors.primary : colors.textMuted} />
        <Text style={[styles.filterToggleText, hasActiveFilters && styles.filterToggleTextActive]}>{tt('rider.jobs.history.filters', undefined, 'Filters')}</Text>
        {hasActiveFilters && <View style={styles.filterDot} />}
      </TouchableOpacity>
      {showFilters && (
        <View style={styles.filtersPanel}>
          <Text style={styles.filterLabel}>{tt('rider.jobs.history.dateRange', undefined, 'Date range')}</Text>
          <View style={styles.chipsRow}>
            {DATE_RANGE_OPTIONS.map(opt => (
              <FilterChip key={opt.key} label={tt(opt.label, undefined, opt.fallback)} active={dateRange === opt.key} onPress={() => onDateRangeChange(opt.key)} testID={`jobs-history-filter-date-${opt.key}`} />
            ))}
          </View>
          <Text style={styles.filterLabel}>{tt('rider.jobs.history.minEarnings', undefined, 'Min earnings')}</Text>
          <View style={styles.chipsRow}>
            {EARNINGS_OPTIONS.map(opt => (
              <FilterChip key={opt.key} label={tt(opt.label, undefined, opt.fallback)} active={earningsFilter === opt.key} onPress={() => onEarningsChange(opt.key)} testID={`jobs-history-filter-earn-${opt.key}`} />
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

function FilterChip({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID?: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={label} testID={testID}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function HistoryRow({ entry, onPress, tt }: { entry: TripLedgerEntry; onPress: () => void; tt: any }) {
  const completedClock = new Date(entry.completedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={styles.rowCard}
      accessibilityRole="button"
      accessibilityLabel={tt('rider.jobs.history.rowAria', { ref: entry.orderRef, pickup: entry.pickupArea, dropoff: entry.dropoffArea, amount: formatNpr(entry.netEarning), time: completedClock }, `Trip ${entry.orderRef}. ${entry.pickupArea} to ${entry.dropoffArea}. Earned ${formatNpr(entry.netEarning)}. Completed at ${completedClock}.`)}
      testID={`jobs-history-item-${entry.id}`}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowTime}>{completedClock}</Text>
        <View style={styles.rowRoute}><View style={styles.routeDotSmall} /><Text style={styles.rowArea} numberOfLines={1}>{entry.pickupArea}</Text></View>
        <View style={styles.rowConnector} />
        <View style={styles.rowRoute}><View style={[styles.routeDotSmall, styles.routeDotDropoffSmall]} /><Text style={styles.rowArea} numberOfLines={1}>{entry.dropoffArea}</Text></View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowAmount}>{formatNprTabular(entry.netEarning)}</Text>
        <View style={styles.rowBadges}>
          {entry.isCod && entry.codAmount > 0 && (<View style={styles.rowCodBadge}><Banknote size={10} color={colors.info} /><Text style={styles.rowCodText}>COD</Text></View>)}
          {entry.hasIncentive && (<View style={styles.rowIncentiveBadge}><Star size={10} color={colors.warning} /></View>)}
          {entry.rating > 0 && (<View style={styles.rowRating}><Star size={10} color={colors.gold} fill={colors.gold} /><Text style={styles.rowRatingText}>{entry.rating}</Text></View>)}
        </View>
      </View>
      <ChevronRight size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  )
}

function formatDayLabel(date: string, tt: any): string {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)
  if (date === today) return tt('rider.jobs.history.today', undefined, 'Today')
  if (date === yesterdayStr) return tt('rider.jobs.history.yesterday', undefined, 'Yesterday')
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing[4], paddingTop: spacing[3], gap: spacing[3] },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5] },
  searchInput: { flex: 1, fontSize: fontSize.base[0], color: colors.text, fontFamily: fontFamily.sans[0], paddingVertical: 0 },
  filterToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], alignSelf: 'flex-start', paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radii.full, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface, minHeight: 36 },
  filterToggleActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  filterToggleText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.textMuted, fontFamily: fontFamily.sansSemiBold[0] },
  filterToggleTextActive: { color: colors.primary },
  filterDot: { width: 6, height: 6, borderRadius: radii.full, backgroundColor: colors.primary },
  filtersPanel: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[4], gap: spacing[2] },
  filterLabel: { fontSize: fontSize.xs[0], fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fontFamily.sansSemiBold[0], marginTop: spacing[1] },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.full, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.background, minHeight: 32 },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  chipText: { fontSize: fontSize.sm[0], fontWeight: '500', color: colors.textSecondary, fontFamily: fontFamily.sans[0] },
  chipTextActive: { color: colors.primary, fontWeight: '700', fontFamily: fontFamily.sansSemiBold[0] },
  resultsCount: { fontSize: fontSize.sm[0], color: colors.textMuted, fontWeight: '500', fontFamily: fontFamily.sans[0] },
  flatListContent: { gap: spacing[2], paddingBottom: spacing[4] },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[2], paddingHorizontal: spacing[1], marginTop: spacing[2] },
  dayHeaderText: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0], textTransform: 'uppercase', letterSpacing: 0.3 },
  dayHeaderMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  dayHeaderCount: { fontSize: fontSize.xs[0], color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  dayHeaderTotal: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[3], ...shadow('sm') },
  rowLeft: { flex: 1, minWidth: 0, gap: 2 },
  rowTime: { fontSize: fontSize.xs[0], color: colors.textTertiary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },
  rowRoute: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  routeDotSmall: { width: 6, height: 6, borderRadius: radii.full, backgroundColor: colors.primary },
  routeDotDropoffSmall: { backgroundColor: colors.textTertiary },
  rowArea: { fontSize: fontSize.sm[0], fontWeight: '500', color: colors.text, fontFamily: fontFamily.sans[0], flex: 1, minWidth: 0 },
  rowConnector: { marginLeft: 2.5, width: 1.5, height: 6, backgroundColor: colors.border },
  rowRight: { alignItems: 'flex-end', gap: spacing[1] },
  rowAmount: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  rowBadges: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rowCodBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.infoLight, paddingHorizontal: spacing[1.5], paddingVertical: 2, borderRadius: radii.full },
  rowCodText: { fontSize: 9, fontWeight: '700', color: colors.info, fontFamily: fontFamily.sansBold[0] },
  rowIncentiveBadge: { width: 18, height: 18, borderRadius: radii.full, backgroundColor: colors.warningLight, alignItems: 'center', justifyContent: 'center' },
  rowRating: { flexDirection: 'row', alignItems: 'center', gap: 1, backgroundColor: colors.background, paddingHorizontal: spacing[1.5], paddingVertical: 2, borderRadius: radii.full },
  rowRatingText: { fontSize: 9, fontWeight: '700', color: colors.gold, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  footerLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4] },
  footerText: { fontSize: fontSize.sm[0], color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  footerEnd: { alignItems: 'center', paddingVertical: spacing[4] },
  footerEndText: { fontSize: fontSize.sm[0], color: colors.textTertiary, fontFamily: fontFamily.sans[0] },
})
