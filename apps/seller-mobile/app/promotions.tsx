import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  SlidersHorizontal,
  Plus,
  X,
  Tag,
  ChevronDown,
  Check,
  TrendingUp,
  Clock,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize, fontFamily } from '@chinooz/theme'
import { SegmentedControl, BottomSheet, EmptyState } from '@chinooz/ui'
import { useA11y } from '../components/A11yProvider'
import {
  getPromotions,
  getPromotionCounts,
  PROMOTION_TYPES,
  type Promotion,
  type PromotionStatus,
  type PromotionType,
  type PromotionSort,
} from '@chinooz/mock-data'
import { analytics } from '@chinooz/analytics'

const STATUS_KEYS: PromotionStatus[] = ['active', 'scheduled', 'expired', 'draft']
const SORT_KEYS: PromotionSort[] = ['newest', 'ending_soon', 'performance']

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtNPR(n: number): string {
  return n.toLocaleString()
}

function typeLabel(t: (k: string) => string, type: PromotionType): string {
  const map: Record<PromotionType, string> = {
    percentage: t('seller.promotions.typePercentage'),
    fixed: t('seller.promotions.typeFixed'),
    flash_sale: t('seller.promotions.typeFlashSale'),
    bogo: t('seller.promotions.typeBogo'),
    free_shipping: t('seller.promotions.typeFreeShipping'),
  }
  return map[type]
}

function sortLabel(t: (k: string) => string, s: PromotionSort): string {
  if (s === 'newest') return t('seller.promotions.sortNewest')
  if (s === 'ending_soon') return t('seller.promotions.sortEndingSoon')
  return t('seller.promotions.sortPerformance')
}

const statusStyle: Record<PromotionStatus, { bg: string; text: string }> = {
  active: { bg: colors.successLight, text: colors.success },
  scheduled: { bg: colors.infoLight, text: colors.info },
  expired: { bg: colors.border, text: colors.textSecondary },
  draft: { bg: colors.warningLight, text: '#92400E' },
}

function discountText(p: Promotion): string {
  if (p.type === 'percentage' || p.type === 'flash_sale') return `${p.discountValue}%`
  if (p.type === 'fixed') return `NPR ${p.discountValue}`
  if (p.type === 'bogo') return 'BOGO'
  return ''
}

export default function PromotionsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { reducedMotion, minTouchTarget } = useA11y()

  const [status, setStatus] = useState<PromotionStatus>('active')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 250)
  const [type, setType] = useState<PromotionType | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState<PromotionSort>('newest')
  const [filterSheet, setFilterSheet] = useState(false)
  const [sortSheet, setSortSheet] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const counts = useMemo(() => getPromotionCounts(), [])

  useEffect(() => {
    analytics.screen({ name: 'seller-promotions' })
  }, [])

  const segments = useMemo(
    () =>
      STATUS_KEYS.map(key => ({
        key,
        label: t(`seller.promotions.status${key.charAt(0).toUpperCase()}${key.slice(1)}`),
        badge: counts[key],
      })),
    [counts, t],
  )

  const activeFilterCount = (type !== 'all' ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['promotions-mobile', status, debouncedSearch, type, dateFrom, dateTo, sort],
    queryFn: () =>
      getPromotions({
        status,
        search: debouncedSearch || undefined,
        type,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sort,
      }),
  })

  const items = data ?? []
  const hasFilters = type !== 'all' || !!dateFrom || !!dateTo || !!search

  const haptic = useCallback(() => {
    if (reducedMotion) return
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
  }, [reducedMotion])

  const onChangeStatus = useCallback(
    (key: string) => {
      haptic()
      setStatus(key as PromotionStatus)
    },
    [haptic],
  )

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    refetch().finally(() => setRefreshing(false))
  }, [refetch])

  const resetFilters = useCallback(() => {
    setType('all')
    setDateFrom('')
    setDateTo('')
  }, [])

  const applyFilters = useCallback(() => {
    setFilterSheet(false)
  }, [])

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerBrand}>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              hitSlop={8}
              style={[styles.iconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
            >
              <ChevronDown size={22} color={colors.white} style={{ transform: [{ rotate: '90deg' }] }} />
            </TouchableOpacity>
            <View>
              <Text accessibilityRole="header" style={styles.headerTitle}>
                {t('seller.promotions.title')}
              </Text>
              <Text style={styles.headerSubtitle}>{t('seller.promotions.subtitle')}</Text>
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('seller.promotions.createAria')}
            onPress={haptic}
            style={[styles.createBtn, { minHeight: minTouchTarget }]}
          >
            <Plus size={16} color={colors.white} />
            <Text style={styles.createBtnText}>{t('seller.promotions.create')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sticky controls */}
      <View style={styles.controlsWrap}>
        <SegmentedControl
          segments={segments}
          activeKey={status}
          onChange={onChangeStatus}
          testID="promotions-status-tabs"
        />
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={16} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('seller.promotions.search')}
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel={t('seller.promotions.searchAria')}
              inputMode="search"
              returnKeyType="search"
              style={styles.searchInput}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8} accessibilityLabel={t('seller.promotions.clearAll')}>
                <X size={15} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('seller.promotions.filterAria')}
            onPress={() => setFilterSheet(true)}
            style={[styles.controlBtn, { minHeight: minTouchTarget }]}
          >
            <SlidersHorizontal size={16} color={colors.text} />
            {activeFilterCount > 0 && <View style={styles.filterDot} />}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('seller.promotions.sortAria')}
            onPress={() => setSortSheet(true)}
            style={[styles.controlBtn, styles.sortBtn, { minHeight: minTouchTarget }]}
          >
            <Text style={styles.sortBtnText} numberOfLines={1}>{sortLabel(t, sort)}</Text>
            <ChevronDown size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {activeFilterCount > 0 && (
          <View style={styles.chipsRow}>
            {type !== 'all' && (
              <FilterChip
                label={typeLabel(t, type)}
                removeLabel={t('seller.promotions.clearAll')}
                onRemove={() => setType('all')}
              />
            )}
            {dateFrom !== '' && (
              <FilterChip
                label={`${t('seller.promotions.dateFrom')} ${formatDate(dateFrom)}`}
                removeLabel={t('seller.promotions.clearAll')}
                onRemove={() => setDateFrom('')}
              />
            )}
            {dateTo !== '' && (
              <FilterChip
                label={`${t('seller.promotions.dateTo')} ${formatDate(dateTo)}`}
                removeLabel={t('seller.promotions.clearAll')}
                onRemove={() => setDateTo('')}
              />
            )}
            <TouchableOpacity onPress={resetFilters} hitSlop={8}>
              <Text style={styles.clearAllText}>{t('seller.promotions.clearAll')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading ? (
          <Text style={styles.loadingText}>{t('seller.promotions.loading')}</Text>
        ) : isError ? (
          <EmptyState
            title={t('seller.promotions.error')}
            action={{ label: t('seller.promotions.retry'), onPress: () => refetch() }}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title={hasFilters ? t('seller.promotions.emptyFilteredTitle') : t('seller.promotions.emptyTitle')}
            subtitle={
              hasFilters
                ? t('seller.promotions.emptyFilteredSubtitle')
                : t('seller.promotions.emptySubtitle')
            }
            action={
              !hasFilters
                ? { label: t('seller.promotions.emptyAction'), onPress: haptic }
                : undefined
            }
          />
        ) : (
          <>
            <Text style={styles.countText}>
              {t('seller.promotions.count', { count: items.length })}
            </Text>
            {items.map(p => (
              <PromotionCard key={p.id} promo={p} t={t} />
            ))}
          </>
        )}
        <View style={{ height: spacing[8] }} />
      </ScrollView>

      {/* Filter sheet */}
      <BottomSheet
        visible={filterSheet}
        onClose={() => setFilterSheet(false)}
        title={t('seller.promotions.filterSheetTitle')}
        testID="promotions-filter-sheet"
      >
        <View style={styles.sheetBody}>
          <Text style={styles.sheetSection}>{t('seller.promotions.filterType')}</Text>
          <View style={styles.sheetChips}>
            <SheetChip
              label={t('seller.promotions.typeAll')}
              active={type === 'all'}
              onPress={() => setType('all')}
            />
            {PROMOTION_TYPES.map(tt => (
              <SheetChip
                key={tt.key}
                label={typeLabel(t, tt.key)}
                active={type === tt.key}
                onPress={() => setType(tt.key)}
              />
            ))}
          </View>

          <Text style={[styles.sheetSection, { marginTop: spacing[5] }]}>
            {t('seller.promotions.filterDateRange')}
          </Text>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>{t('seller.promotions.dateFrom')}</Text>
              <TextInput
                value={dateFrom}
                onChangeText={setDateFrom}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel={t('seller.promotions.dateFrom')}
                style={styles.dateInput}
              />
            </View>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>{t('seller.promotions.dateTo')}</Text>
              <TextInput
                value={dateTo}
                onChangeText={setDateTo}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel={t('seller.promotions.dateTo')}
                style={styles.dateInput}
              />
            </View>
          </View>

          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.resetBtn} onPress={resetFilters} accessibilityRole="button">
              <Text style={styles.resetText}>{t('seller.promotions.filterReset')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters} accessibilityRole="button">
              <Text style={styles.applyText}>{t('seller.promotions.filterApply')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>

      {/* Sort sheet */}
      <BottomSheet
        visible={sortSheet}
        onClose={() => setSortSheet(false)}
        title={t('seller.promotions.sortAria')}
        testID="promotions-sort-sheet"
      >
        <View style={styles.sheetBody}>
          {SORT_KEYS.map(k => {
            const active = sort === k
            const Icon = k === 'performance' ? TrendingUp : k === 'ending_soon' ? Clock : Check
            return (
              <TouchableOpacity
                key={k}
                onPress={() => {
                  haptic()
                  setSort(k)
                  setSortSheet(false)
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={styles.sortRow}
              >
                <Icon size={18} color={active ? colors.primary : colors.textMuted} />
                <Text style={[styles.sortRowText, active && styles.sortRowTextActive]}>
                  {sortLabel(t, k)}
                </Text>
                {active && <Check size={18} color={colors.primary} />}
              </TouchableOpacity>
            )
          })}
        </View>
      </BottomSheet>
    </View>
  )
}

type T = (key: string, opts?: Record<string, unknown>) => string

function PromotionCard({ promo, t }: { promo: Promotion; t: T }) {
  const sb = statusStyle[promo.status]
  const isSale = promo.type === 'flash_sale' || promo.type === 'percentage'
  const scheduleKey =
    promo.status === 'expired' ? 'endedOn' : promo.status === 'scheduled' ? 'startsOn' : 'endsIn'
  const scheduleDate =
    promo.status === 'expired'
      ? promo.endsAt
      : promo.status === 'scheduled'
        ? promo.startsAt
        : promo.endsAt
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardBrand}>
          <View style={styles.cardIcon}>
            <Tag size={18} color={colors.primary} />
          </View>
          <View style={styles.cardTitleWrap}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>{promo.name}</Text>
              {isSale && promo.status === 'active' && (
                <View style={styles.saleBadge}>
                  <Text style={styles.saleBadgeText}>{t('seller.promotions.saleBadge')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardCode}>{promo.code}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: sb.bg }]}>
          <Text style={[styles.statusBadgeText, { color: sb.text }]}>
            {t(`seller.promotions.status${promo.status.charAt(0).toUpperCase()}${promo.status.slice(1)}`)}
          </Text>
        </View>
      </View>

      <View style={styles.cardMetrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>{t('seller.promotions.colDiscount')}</Text>
          <Text style={styles.discountValue}>{discountText(promo)}</Text>
        </View>
        <View style={styles.metricRight}>
          <Text style={styles.metricLabel}>{t('seller.promotions.colRevenue')}</Text>
          <Text style={styles.revenueValue}>
            {t('seller.promotions.revenue', { amount: fmtNPR(promo.revenue) })}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerSchedule}>
          {t(`seller.promotions.${scheduleKey}`, { date: formatDate(scheduleDate) })}
        </Text>
        <Text style={styles.footerRedemptions}>
          {t('seller.promotions.redemptions', { count: promo.redemptions })}
        </Text>
      </View>
    </View>
  )
}

function FilterChip({ label, removeLabel, onRemove }: { label: string; removeLabel: string; onRemove: () => void }) {
  return (
    <View style={styles.activeChip}>
      <Text style={styles.activeChipText} numberOfLines={1}>{label}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={8} accessibilityLabel={removeLabel}>
        <X size={12} color={colors.white} />
      </TouchableOpacity>
    </View>
  )
}

function SheetChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.sheetChip, active && styles.sheetChipActive]}
      activeOpacity={0.8}
    >
      <Text style={[styles.sheetChipText, active && styles.sheetChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingHorizontal: spacing[4], paddingBottom: spacing[3] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1 },
  iconBtn: { alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.white },
  headerSubtitle: { fontSize: fontSize.sm[0], color: colors.primary50, marginTop: 2 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  createBtnText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.white },

  controlsWrap: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing[2],
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[4], marginTop: spacing[1] },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    height: 40,
  },
  searchInput: { flex: 1, fontSize: fontSize.base[0], color: colors.text, height: '100%', padding: 0 },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    height: 40,
  },
  sortBtn: { maxWidth: 130 },
  sortBtnText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },

  chipsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing[2], paddingHorizontal: spacing[4], paddingTop: spacing[2] },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingLeft: spacing[2.5],
    paddingRight: spacing[1.5],
    paddingVertical: 4,
  },
  activeChipText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.white },
  clearAllText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.primary, marginLeft: spacing[1] },

  listContent: { padding: spacing[4], gap: spacing[3] },
  loadingText: { fontSize: fontSize.base[0], color: colors.textMuted, textAlign: 'center', marginTop: spacing[6] },
  countText: { fontSize: fontSize.sm[0], color: colors.textMuted, marginBottom: spacing[1] },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[2] },
  cardBrand: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5], flex: 1, minWidth: 0 },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleWrap: { flex: 1, minWidth: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  cardTitle: { fontSize: fontSize.md[0], fontWeight: '600', color: colors.text },
  saleBadge: {
    backgroundColor: colors.gold,
    borderRadius: radii.full,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 1,
  },
  saleBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white, letterSpacing: 0.5 },
  cardCode: { fontSize: fontSize.sm[0], color: colors.textMuted, fontFamily: fontFamily.sans[0], marginTop: 2 },

  statusBadge: { borderRadius: radii.full, paddingHorizontal: spacing[2.5], paddingVertical: 4 },
  statusBadgeText: { fontSize: fontSize.sm[0], fontWeight: '600' },

  cardMetrics: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing[3],
  },
  metric: { gap: 2 },
  metricRight: { alignItems: 'flex-end', gap: 2 },
  metricLabel: { fontSize: fontSize.sm[0], color: colors.textMuted },
  discountValue: { fontSize: fontSize.xl[0], fontWeight: '700', color: colors.gold },
  revenueValue: { fontSize: fontSize.md[0], fontWeight: '600', color: colors.text },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerSchedule: { fontSize: fontSize.sm[0], color: colors.textSecondary },
  footerRedemptions: { fontSize: fontSize.sm[0], color: colors.textMuted },

  sheetBody: { paddingHorizontal: spacing[4] },
  sheetSection: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text, marginBottom: spacing[2] },
  sheetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  sheetChip: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    minHeight: 36,
  },
  sheetChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sheetChipText: { fontSize: fontSize.sm[0], fontWeight: '500', color: colors.text },
  sheetChipTextActive: { color: colors.white },

  dateRow: { flexDirection: 'row', gap: spacing[3] },
  dateField: { flex: 1, gap: spacing[1] },
  dateLabel: { fontSize: fontSize.sm[0], color: colors.textMuted },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontSize: fontSize.base[0],
    color: colors.text,
  },

  sheetActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[6] },
  resetBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing[3], borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  resetText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  applyBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing[3], borderRadius: radii.md, backgroundColor: colors.primary },
  applyText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.white },

  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3.5],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sortRowText: { flex: 1, fontSize: fontSize.md[0], color: colors.text },
  sortRowTextActive: { fontWeight: '600', color: colors.primary },
})
