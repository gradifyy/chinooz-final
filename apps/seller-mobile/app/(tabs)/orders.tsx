import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native'
import { useRouter, Redirect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { Search, SlidersHorizontal, X, AlertTriangle, ChevronDown, Inbox, RotateCcw, Package } from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { useA11y } from '../components/A11yProvider'
import { useSellerSessionStore } from '@chinooz/state'
import { useSellerOrders } from '@chinooz/hooks'
import { SellerOrderCard, SellerOrderCardSkeleton } from '@chinooz/ui'
import MobileBulkActionBar from '../../components/MobileBulkActionBar'
import { analytics } from '@chinooz/analytics'
import { formatNPR } from '@chinooz/utils'
import type {
  SellerSubOrder,
  SellerOrderStatusKey,
  SellerPaymentType,
  SellerShippingMethod,
  SellerOrderSortKey,
} from '@chinooz/types'

type TabKey = SellerOrderStatusKey

const TABS: { key: TabKey; labelKey: string; isNew?: boolean }[] = [
  { key: 'new', labelKey: 'seller.orders.tabNew', isNew: true },
  { key: 'to_pack', labelKey: 'seller.orders.tabToPack' },
  { key: 'to_ship', labelKey: 'seller.orders.tabToShip' },
  { key: 'shipped', labelKey: 'seller.orders.tabShipped' },
  { key: 'completed', labelKey: 'seller.orders.tabCompleted' },
  { key: 'cancelled_returned', labelKey: 'seller.orders.tabCancelledReturned' },
  { key: 'action_needed', labelKey: 'seller.orders.tabActionNeeded' },
]

type DateRangeKey = 'all' | '7d' | '30d' | 'custom'
type PaymentFilter = 'all' | SellerPaymentType
type ShippingFilter = 'all' | SellerShippingMethod

interface FilterState {
  dateRange: DateRangeKey
  dateFrom: string
  dateTo: string
  payment: PaymentFilter
  shipping: ShippingFilter
}

const DEFAULT_FILTERS: FilterState = {
  dateRange: 'all',
  dateFrom: '',
  dateTo: '',
  payment: 'all',
  shipping: 'all',
}

const STATUS_PILL: Record<SellerOrderStatusKey, { bg: string; text: string; dot: string }> = {
  new: { bg: colors.infoLight, text: colors.info, dot: colors.info },
  to_pack: { bg: colors.warningLight, text: colors.warning, dot: colors.warning },
  to_ship: { bg: colors.warningLight, text: colors.warning, dot: colors.warning },
  shipped: { bg: colors.infoLight, text: colors.info, dot: colors.info },
  completed: { bg: colors.successLight, text: colors.success, dot: colors.success },
  cancelled_returned: { bg: colors.errorLight, text: colors.error, dot: colors.error },
  action_needed: { bg: colors.errorLight, text: colors.error, dot: colors.error },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function matchesTab(o: SellerSubOrder, tab: TabKey): boolean {
  if (tab === 'action_needed') return o.actionNeeded
  if (tab === 'cancelled_returned') return o.statusKey === 'cancelled_returned'
  return o.statusKey === tab && !o.actionNeeded
}

function applyFilters(
  orders: SellerSubOrder[],
  tab: TabKey,
  search: string,
  filters: FilterState,
  sort: SellerOrderSortKey,
): SellerSubOrder[] {
  let list = orders.filter(o => matchesTab(o, tab))

  if (search.trim()) {
    const q = search.trim().toLowerCase()
    list = list.filter(
      o =>
        o.orderId.toLowerCase().includes(q) ||
        o.subOrderId.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.items.some(it => it.name.toLowerCase().includes(q)),
    )
  }

  const now = Date.now()
  if (filters.dateRange === '7d') {
    const cut = now - 7 * 86400000
    list = list.filter(o => new Date(o.createdAt).getTime() >= cut)
  } else if (filters.dateRange === '30d') {
    const cut = now - 30 * 86400000
    list = list.filter(o => new Date(o.createdAt).getTime() >= cut)
  } else if (filters.dateRange === 'custom') {
    const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : -Infinity
    const to = filters.dateTo ? new Date(filters.dateTo).getTime() + 86400000 : Infinity
    list = list.filter(o => {
      const t = new Date(o.createdAt).getTime()
      return t >= from && t <= to
    })
  }

  if (filters.payment !== 'all') list = list.filter(o => o.paymentType === filters.payment)
  if (filters.shipping !== 'all') list = list.filter(o => o.shippingMethod === filters.shipping)

  const sorted = [...list]
  if (sort === 'newest') sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  else if (sort === 'oldest') sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  else if (sort === 'value') sorted.sort((a, b) => b.total - a.total)
  return sorted
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

export default function SellerOrdersScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { reducedMotion, minTouchTarget } = useA11y()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const sellerId = useSellerSessionStore(s => s.sellerId)

  const [activeTab, setActiveTab] = useState<TabKey>('new')
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 250)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<SellerOrderSortKey>('newest')
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const listFade = useRef(new Animated.Value(1)).current

  useEffect(() => {
    analytics.screen({ name: 'seller-orders' })
  }, [])

  const { data: allOrders = [], isLoading, isError, refetch } = useSellerOrders(sellerId ?? null)

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      new: 0,
      to_pack: 0,
      to_ship: 0,
      shipped: 0,
      completed: 0,
      cancelled_returned: 0,
      action_needed: 0,
    }
    for (const o of allOrders) {
      if (o.actionNeeded) c.action_needed++
      if (o.statusKey === 'cancelled_returned') {
        c.cancelled_returned++
        continue
      }
      if (o.statusKey === 'new' && !o.actionNeeded) c.new++
      else if (o.statusKey === 'to_pack' && !o.actionNeeded) c.to_pack++
      else if (o.statusKey === 'to_ship' && !o.actionNeeded) c.to_ship++
      else if (o.statusKey === 'shipped') c.shipped++
      else if (o.statusKey === 'completed') c.completed++
    }
    return c
  }, [allOrders])

  const visibleOrders = useMemo(
    () => applyFilters(allOrders, activeTab, debouncedSearch, filters, sort),
    [allOrders, activeTab, debouncedSearch, filters, sort],
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (filters.dateRange !== 'all') n++
    if (filters.payment !== 'all') n++
    if (filters.shipping !== 'all') n++
    return n
  }, [filters])

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectedOrders = useMemo(
    () => allOrders.filter(o => selectedIds.has(o.subOrderId)),
    [allOrders, selectedIds],
  )

  const switchTab = useCallback(
    (key: TabKey) => {
      if (key === activeTab) return
      try {
        if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
      Animated.timing(listFade, {
        toValue: 0,
        duration: reducedMotion ? 0 : 120,
        useNativeDriver: true,
      }).start(() => {
        setActiveTab(key)
        setSelectedIds(new Set())
        Animated.timing(listFade, {
          toValue: 1,
          duration: reducedMotion ? 0 : 220,
          useNativeDriver: true,
        }).start()
      })
    },
    [activeTab, reducedMotion, listFade],
  )

  const removeFilter = useCallback((field: keyof FilterState) => {
    setFilters(prev => {
      const next = { ...prev }
      if (field === 'dateRange') {
        next.dateRange = 'all'
        next.dateFrom = ''
        next.dateTo = ''
      } else if (field === 'payment') next.payment = 'all'
      else if (field === 'shipping') next.shipping = 'all'
      return next
    })
  }, [])

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [])

  if (!isLoggedIn) return <Redirect href="/onboarding" />

  const activeChips: { field: keyof FilterState; label: string }[] = []
  if (filters.dateRange === '7d') activeChips.push({ field: 'dateRange', label: t('seller.orders.date7d') })
  else if (filters.dateRange === '30d') activeChips.push({ field: 'dateRange', label: t('seller.orders.date30d') })
  else if (filters.dateRange === 'custom')
    activeChips.push({ field: 'dateRange', label: `${filters.dateFrom || '…'} → ${filters.dateTo || '…'}` })
  if (filters.payment === 'cod') activeChips.push({ field: 'payment', label: t('seller.orders.paymentCod') })
  else if (filters.payment === 'prepaid') activeChips.push({ field: 'payment', label: t('seller.orders.paymentPrepaid') })
  if (filters.shipping === 'standard') activeChips.push({ field: 'shipping', label: t('seller.orders.shippingStandard') })
  else if (filters.shipping === 'express') activeChips.push({ field: 'shipping', label: t('seller.orders.shippingExpress') })
  else if (filters.shipping === 'sameday') activeChips.push({ field: 'shipping', label: t('seller.orders.shippingSameday') })
  else if (filters.shipping === 'pickup') activeChips.push({ field: 'shipping', label: t('seller.orders.shippingPickup') })

  return (
    <View style={styles.container}>
      {/* Sticky header: title + status tabs + search/filter */}
      <View style={styles.stickyHeader}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={() => router.push('/home')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('seller.orders.back')}
            style={[styles.backBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.titleText}>
            <Text accessibilityRole="header" style={styles.title}>
              🧾 {t('seller.orders.title')}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {t('seller.orders.subtitle')}
            </Text>
          </View>
        </View>

        {/* Status segmented control — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="tablist"
          accessibilityLabel={t('seller.orders.title')}
          contentContainerStyle={styles.tabScrollContent}
        >
          <View style={styles.tabTrack}>
            {TABS.map(tab => {
              const active = tab.key === activeTab
              const count = counts[tab.key]
              const isNewTab = tab.key === 'new'
              const isActionTab = tab.key === 'action_needed'
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => switchTab(tab.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[styles.tabSegment, active && styles.tabSegmentActive]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t(tab.labelKey)}</Text>
                  {count > 0 && (
                    <View
                      style={[
                        styles.tabBadge,
                        {
                          backgroundColor: active
                            ? colors.white
                            : isNewTab
                              ? colors.error
                              : isActionTab
                                ? colors.warning
                                : colors.primary50,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabBadgeText,
                          {
                            color: active
                              ? colors.primary
                              : isNewTab
                                ? colors.white
                                : isActionTab
                                  ? colors.white
                                  : colors.primary,
                          },
                        ]}
                      >
                        {count > 99 ? '99+' : count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </ScrollView>

        {/* Search + filter + sort */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder={t('seller.orders.searchPlaceholder')}
              accessibilityLabel={t('seller.orders.searchAria')}
              inputMode="search"
              returnKeyType="search"
              style={styles.searchInput}
              placeholderTextColor={colors.textTertiary}
            />
            {searchInput.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchInput('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('seller.orders.clearSearch')}
                style={styles.clearBtn}
              >
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
      )}

      {selectedOrders.length > 0 && (
        <MobileBulkActionBar
          selectedOrders={selectedOrders}
          onClear={() => setSelectedIds(new Set())}
          onRefetch={refetch}
          t={t}
        />
      )}
    </View>

          <TouchableOpacity
            onPress={() => setFilterSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('seller.orders.filterAria')}
            style={[
              styles.iconActionBtn,
              { minWidth: minTouchTarget, minHeight: minTouchTarget },
              (activeFilterCount > 0 || filterSheetOpen) && styles.iconActionBtnActive,
            ]}
          >
            <SlidersHorizontal size={18} color={activeFilterCount > 0 ? colors.primary : colors.textSecondary} />
            {activeFilterCount > 0 && (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Sort row */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>{t('seller.orders.sort')}</Text>
          <SortSelector value={sort} onChange={setSort} t={t} reducedMotion={reducedMotion} />
        </View>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            accessibilityLabel={t('seller.orders.activeFilters')}
          >
            {activeChips.map(ch => (
              <View key={ch.field} style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {ch.label}
                </Text>
                <TouchableOpacity
                  onPress={() => removeFilter(ch.field)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('seller.orders.removeFilter')}
                >
                  <X size={12} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              onPress={clearFilters}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('seller.orders.clearFiltersAria')}
            >
              <Text style={styles.clearAllText}>{t('seller.orders.clearFilters')}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Live region for new count */}
      <Text style={styles.srOnly} accessibilityLiveRegion="polite">
        {t('seller.orders.newCountAria', { count: counts.new })}
      </Text>

      {/* List */}
      {isLoading ? (
        <FlatList
          data={[0, 1, 2, 3]}
          keyExtractor={i => String(i)}
          renderItem={() => <SellerOrderCardSkeleton />}
          ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : isError ? (
        <View style={styles.centerWrap}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{t('seller.orders.errorTitle')}</Text>
          <Text style={styles.errorSubtitle}>{t('seller.orders.errorSubtitle')}</Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={styles.retryBtn}
            accessibilityRole="button"
            accessibilityLabel={t('seller.orders.retry')}
          >
            <Text style={styles.retryText}>{t('seller.orders.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : visibleOrders.length === 0 ? (
        <EmptyState tab={activeTab} t={t} />
      ) : (
        <Animated.View style={{ flex: 1, opacity: listFade }}>
          <FlatList
            data={visibleOrders}
            keyExtractor={item => item.subOrderId}
            renderItem={({ item, index }) => (
              <SellerOrderCard
                order={item}
                index={index}
                selected={selectedIds.has(item.subOrderId)}
                onToggleSelect={toggleSelect}
                onPress={() => router.push(`/orders/${item.subOrderId}` as any)}
                onAction={() => router.push(`/orders/${item.subOrderId}` as any)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}

      {filterSheetOpen && (
        <FilterSheet
          filters={filters}
          sort={sort}
          onClose={() => setFilterSheetOpen(false)}
          onApply={(f, s) => {
            setFilters(f)
            setSort(s)
            setFilterSheetOpen(false)
          }}
          onClear={() => {
            setFilters(DEFAULT_FILTERS)
            setFilterSheetOpen(false)
          }}
          t={t}
        />
      )}
    </View>
  )
}

function SortSelector({
  value,
  onChange,
  t,
  reducedMotion,
}: {
  value: SellerOrderSortKey
  onChange: (s: SellerOrderSortKey) => void
  t: (k: string) => string
  reducedMotion: boolean
}) {
  const [open, setOpen] = useState(false)
  const options: { key: SellerOrderSortKey; label: string }[] = [
    { key: 'newest', label: t('seller.orders.sortNewest') },
    { key: 'oldest', label: t('seller.orders.sortOldest') },
    { key: 'value', label: t('seller.orders.sortValue') },
  ]
  const current = options.find(o => o.key === value) ?? options[0]
  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(v => !v)}
        accessibilityRole="button"
        accessibilityLabel={t('seller.orders.sortAria')}
        style={styles.sortSelect}
        activeOpacity={0.8}
      >
        <Text style={styles.sortSelectText}>{current.label}</Text>
        <ChevronDown size={14} color={colors.textMuted} />
      </TouchableOpacity>
      {open && (
        <View style={styles.sortMenu}>
          {options.map(opt => {
            const active = opt.key === value
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => {
                  onChange(opt.key)
                  setOpen(false)
                }}
                style={[styles.sortMenuItem, active && styles.sortMenuItemActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.sortMenuText, active && styles.sortMenuTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}
    </View>
  )
}

function EmptyState({ tab, t }: { tab: TabKey; t: (k: string) => string }) {
  const isAction = tab === 'action_needed'
  const Icon = isAction ? Package : tab === 'cancelled_returned' ? RotateCcw : Inbox
  return (
    <View style={styles.centerWrap}>
      <View style={styles.emptyIconWrap}>
        <Icon size={32} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>
        {isAction ? t('seller.orders.emptyActionNeeded') : t('seller.orders.emptyTitle')}
      </Text>
      <Text style={styles.emptySubtitle}>
        {isAction ? t('seller.orders.emptyActionNeededSubtitle') : t('seller.orders.emptySubtitle')}
      </Text>
    </View>
  )
}

function FilterSheet({
  filters,
  sort,
  onClose,
  onApply,
  onClear,
  t,
}: {
  filters: FilterState
  sort: SellerOrderSortKey
  onClose: () => void
  onApply: (f: FilterState, s: SellerOrderSortKey) => void
  onClear: () => void
  t: (k: string) => string
}) {
  const [local, setLocal] = useState<FilterState>(filters)
  const [localSort, setLocalSort] = useState<SellerOrderSortKey>(sort)
  const set = (patch: Partial<FilterState>) => setLocal(prev => ({ ...prev, ...patch }))

  const dateOptions: { key: DateRangeKey; label: string }[] = [
    { key: 'all', label: t('seller.orders.dateAll') },
    { key: '7d', label: t('seller.orders.date7d') },
    { key: '30d', label: t('seller.orders.date30d') },
    { key: 'custom', label: t('seller.orders.dateCustom') },
  ]
  const paymentOptions: { key: PaymentFilter; label: string }[] = [
    { key: 'all', label: t('seller.orders.paymentAll') },
    { key: 'cod', label: t('seller.orders.paymentCod') },
    { key: 'prepaid', label: t('seller.orders.paymentPrepaid') },
  ]
  const shippingOptions: { key: ShippingFilter; label: string }[] = [
    { key: 'all', label: t('seller.orders.shippingAll') },
    { key: 'standard', label: t('seller.orders.shippingStandard') },
    { key: 'express', label: t('seller.orders.shippingExpress') },
    { key: 'sameday', label: t('seller.orders.shippingSameday') },
    { key: 'pickup', label: t('seller.orders.shippingPickup') },
  ]
  const sortOptions: { key: SellerOrderSortKey; label: string }[] = [
    { key: 'newest', label: t('seller.orders.sortNewest') },
    { key: 'oldest', label: t('seller.orders.sortOldest') },
    { key: 'value', label: t('seller.orders.sortValue') },
  ]

  return (
    <View style={styles.sheetOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('seller.orders.filterAria')} />
      <View style={styles.sheetCard}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text accessibilityRole="header" style={styles.sheetTitle}>
            {t('seller.orders.filter')}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('seller.orders.filterAria')}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
          <Text style={styles.sheetSectionLabel}>{t('seller.orders.dateRange')}</Text>
          <View style={styles.sheetOptionRow}>
            {dateOptions.map(opt => {
              const active = local.dateRange === opt.key
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => set({ dateRange: opt.key })}
                  style={[styles.sheetPill, active && styles.sheetPillActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.sheetPillText, active && styles.sheetPillTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
          {local.dateRange === 'custom' && (
            <View style={styles.sheetDateRow}>
              <View style={styles.sheetDateField}>
                <Text style={styles.sheetDateLabel}>{t('seller.orders.dateFrom')}</Text>
                <TextInput
                  value={local.dateFrom}
                  onChangeText={v => set({ dateFrom: v })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.sheetDateInput}
                  accessibilityLabel={t('seller.orders.dateFrom')}
                />
              </View>
              <View style={styles.sheetDateField}>
                <Text style={styles.sheetDateLabel}>{t('seller.orders.dateTo')}</Text>
                <TextInput
                  value={local.dateTo}
                  onChangeText={v => set({ dateTo: v })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.sheetDateInput}
                  accessibilityLabel={t('seller.orders.dateTo')}
                />
              </View>
            </View>
          )}

          <Text style={styles.sheetSectionLabel}>{t('seller.orders.paymentType')}</Text>
          <View style={styles.sheetOptionRow}>
            {paymentOptions.map(opt => {
              const active = local.payment === opt.key
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => set({ payment: opt.key })}
                  style={[styles.sheetPill, active && styles.sheetPillActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.sheetPillText, active && styles.sheetPillTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={styles.sheetSectionLabel}>{t('seller.orders.shippingMethod')}</Text>
          <View style={styles.sheetOptionRow}>
            {shippingOptions.map(opt => {
              const active = local.shipping === opt.key
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => set({ shipping: opt.key })}
                  style={[styles.sheetPill, active && styles.sheetPillActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.sheetPillText, active && styles.sheetPillTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={styles.sheetSectionLabel}>{t('seller.orders.sort')}</Text>
          <View style={styles.sheetOptionRow}>
            {sortOptions.map(opt => {
              const active = localSort === opt.key
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setLocalSort(opt.key)}
                  style={[styles.sheetPill, active && styles.sheetPillActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.sheetPillText, active && styles.sheetPillTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </ScrollView>

        <View style={styles.sheetActions}>
          <TouchableOpacity
            onPress={onClear}
            style={styles.sheetClearBtn}
            accessibilityRole="button"
            accessibilityLabel={t('seller.orders.clearFiltersAria')}
          >
            <Text style={styles.sheetClearText}>{t('seller.orders.clearFilters')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onApply(local, localSort)}
            style={styles.sheetApplyBtn}
            accessibilityRole="button"
            accessibilityLabel={t('seller.orders.applyFilters')}
          >
            <Text style={styles.sheetApplyText}>{t('seller.orders.applyFilters')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  stickyHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[3],
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  backBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.full },
  backIcon: { fontSize: 22, color: colors.text },
  titleText: { flex: 1 },
  title: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  tabScrollContent: { paddingRight: spacing[4] },
  tabTrack: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radii.full,
    padding: spacing[0.5],
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 2,
  },
  tabSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3.5],
    height: 40,
    borderRadius: radii.full,
  },
  tabSegmentActive: { backgroundColor: colors.primary },
  tabLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabLabelActive: { color: colors.white },
  tabBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: { fontSize: 12, fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
  },
  searchIcon: { marginRight: spacing[2] },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
  clearBtn: { padding: spacing[1] },
  iconActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconActionBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  filterCountBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: { color: colors.white, fontSize: 11, fontWeight: '600' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  sortLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  sortSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    height: 36,
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sortSelectText: { fontSize: 13, fontWeight: '600', color: colors.text },
  sortMenu: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 30,
    elevation: 4,
  },
  sortMenuItem: { paddingVertical: spacing[2.5], paddingHorizontal: spacing[3] },
  sortMenuItemActive: { backgroundColor: colors.primary50 },
  sortMenuText: { fontSize: 13, color: colors.text },
  sortMenuTextActive: { color: colors.primary, fontWeight: '600' },
  chipsRow: { alignItems: 'center', gap: spacing[2], paddingRight: spacing[4] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary50,
    borderRadius: radii.full,
    paddingLeft: spacing[3],
    paddingRight: spacing[1.5],
    paddingVertical: spacing[1],
  },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.primary, maxWidth: 160 },
  clearAllText: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textDecorationLine: 'underline' },
  listContent: { padding: spacing[4], gap: spacing[3] },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] },
  loadingText: { fontSize: 14, color: colors.textMuted },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6], gap: 6 },
  errorIcon: { fontSize: 40, marginBottom: spacing[2] },
  errorTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  errorSubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  retryBtn: {
    marginTop: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2.5],
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  retryText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2.5],
    overflow: 'hidden',
  },
  cardNew: { backgroundColor: colors.primary50, borderColor: colors.primary + '33' },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardOrderId: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1, marginRight: spacing[2] },
  cardStatusPill: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radii.full },
  cardStatusDot: { width: 6, height: 6, borderRadius: radii.full },
  cardStatusText: { fontSize: 11, fontWeight: '600' },
  cardActionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.errorLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1.5],
  },
  cardActionText: { fontSize: 12, fontWeight: '600', color: colors.error, flex: 1 },
  cardProductRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  cardThumb: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.shimmer },
  cardProductBody: { flex: 1 },
  cardProductName: { fontSize: 14, color: colors.text },
  cardExtra: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMetaLeft: { fontSize: 12, color: colors.textMuted, flex: 1, marginRight: spacing[2] },
  cardMetaRight: { fontSize: 12, color: colors.textMuted },
  cardDivider: { height: 1, backgroundColor: colors.borderLight },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardPayPill: { paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radii.full },
  cardPayText: { fontSize: 11, fontWeight: '600' },
  cardTotal: { fontSize: 16, fontWeight: '700', color: colors.primary },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  sheetOverlay: { position: 'absolute', inset: 0, backgroundColor: colors.overlay, justifyContent: 'flex-end', zIndex: 40 },
  sheetCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing[2],
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  sheetBody: { paddingHorizontal: spacing[5], paddingBottom: spacing[3], gap: spacing[2] },
  sheetSectionLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: spacing[2] },
  sheetOptionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[1] },
  sheetPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  sheetPillActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  sheetPillText: { fontSize: 13, color: colors.textSecondary },
  sheetPillTextActive: { color: colors.primary, fontWeight: '600' },
  sheetDateRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  sheetDateField: { flex: 1, gap: 4 },
  sheetDateLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  sheetDateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontSize: 14,
    color: colors.text,
  },
  sheetActions: { flexDirection: 'row', gap: spacing[3], padding: spacing[5], paddingTop: spacing[3] },
  sheetClearBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sheetClearText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  sheetApplyBtn: { flex: 1, paddingVertical: spacing[3], borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center' },
  sheetApplyText: { color: colors.white, fontWeight: '700', fontSize: 14 },
})
