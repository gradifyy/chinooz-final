import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  RefreshControl,
  Pressable,
} from 'react-native'
import { useRouter, Redirect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { BottomSheet, Button, EmptyState, SafeImage, FadeIn } from '@chinooz/ui'
import { useSellerProducts, useSellerCategories } from '@chinooz/hooks'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import { formatNPR } from '@chinooz/utils'
import type { SellerProduct, SellerProductStatus, StockStatus } from '@chinooz/types'
import type { SellerProductFilter } from '@chinooz/mock-data'
import { useA11y } from '../components/A11yProvider'

type StatusTab = SellerProductStatus | 'all'
type SortKey = NonNullable<SellerProductFilter['sort']>

const STOCK_LABEL: Record<StockStatus, string> = {
  in_stock: 'seller.products.stockInStock',
  low_stock: 'seller.products.stockLowStock',
  out_of_stock: 'seller.products.stockOutOfStock',
}

const STOCK_COLOR: Record<StockStatus, { bg: string; text: string; dot: string }> = {
  in_stock: { bg: 'rgba(22,163,74,0.12)', text: colors.success, dot: colors.success },
  low_stock: { bg: 'rgba(245,158,11,0.15)', text: '#92400E', dot: colors.warning },
  out_of_stock: { bg: 'rgba(220,38,38,0.12)', text: colors.error, dot: colors.error },
}

const STATUS_LABEL: Record<SellerProductStatus, string> = {
  active: 'seller.products.statusActive',
  draft: 'seller.products.statusDraft',
  out_of_stock: 'seller.products.statusOutOfStock',
  archived: 'seller.products.statusArchived',
}

const STATUS_COLOR: Record<SellerProductStatus, { bg: string; text: string }> = {
  active: { bg: 'rgba(22,163,74,0.12)', text: colors.success },
  draft: { bg: 'rgba(37,99,235,0.12)', text: colors.info },
  out_of_stock: { bg: 'rgba(220,38,38,0.12)', text: colors.error },
  archived: { bg: colors.border, text: colors.textSecondary },
}

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export default function ProductsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { reducedMotion } = useA11y()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)

  const [status, setStatus] = useState<StatusTab>('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 250)
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [stockLevel, setStockLevel] = useState<StockStatus | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('newest')

  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [listKey, setListKey] = useState(0)

  const [draftCategory, setDraftCategory] = useState<string | undefined>(undefined)
  const [draftPriceMin, setDraftPriceMin] = useState('')
  const [draftPriceMax, setDraftPriceMax] = useState('')
  const [draftStock, setDraftStock] = useState<StockStatus | 'all'>('all')

  useEffect(() => {
    analytics.screen({ name: 'seller-products' })
  }, [])

  if (!isLoggedIn) return <Redirect href="/onboarding" />

  const filter: SellerProductFilter = useMemo(
    () => ({
      status,
      search: debouncedSearch,
      categoryId,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      stockLevel,
      sort,
    }),
    [status, debouncedSearch, categoryId, priceMin, priceMax, stockLevel, sort],
  )

  const { data, isLoading, isFetching, refetch } = useSellerProducts(filter)
  const { data: sellerCats } = useSellerCategories()

  const counts = data?.counts
  const items = data?.items ?? []

  const statusTabs: { key: StatusTab; label: string; count: number }[] = [
    { key: 'all', label: t('seller.products.statusAll'), count: counts?.all ?? 0 },
    { key: 'active', label: t('seller.products.statusActive'), count: counts?.active ?? 0 },
    { key: 'draft', label: t('seller.products.statusDraft'), count: counts?.draft ?? 0 },
    { key: 'out_of_stock', label: t('seller.products.statusOutOfStock'), count: counts?.out_of_stock ?? 0 },
    { key: 'archived', label: t('seller.products.statusArchived'), count: counts?.archived ?? 0 },
  ]

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'newest', label: t('seller.products.sortNewest') },
    { key: 'best_selling', label: t('seller.products.sortBestSelling') },
    { key: 'price_asc', label: t('seller.products.sortPriceAsc') },
    { key: 'price_desc', label: t('seller.products.sortPriceDesc') },
    { key: 'stock', label: t('seller.products.sortStock') },
  ]

  const activeFilters: { key: string; label: string; onClear: () => void }[] = []
  if (categoryId) {
    const cat = sellerCats?.find(c => c.id === categoryId)
    activeFilters.push({ key: 'cat', label: cat?.name ?? categoryId, onClear: () => setCategoryId(undefined) })
  }
  if (priceMin) activeFilters.push({ key: 'pmin', label: `${t('seller.products.filterPriceMin')}: ${formatNPR(Number(priceMin))}`, onClear: () => setPriceMin('') })
  if (priceMax) activeFilters.push({ key: 'pmax', label: `${t('seller.products.filterPriceMax')}: ${formatNPR(Number(priceMax))}`, onClear: () => setPriceMax('') })
  if (stockLevel !== 'all') activeFilters.push({ key: 'stock', label: t(STOCK_LABEL[stockLevel as StockStatus]), onClear: () => setStockLevel('all') })

  const hasActiveFilters = activeFilters.length > 0
  const isFiltered = hasActiveFilters || debouncedSearch.length > 0 || status !== 'all'

  const clearAll = () => {
    setCategoryId(undefined)
    setPriceMin('')
    setPriceMax('')
    setStockLevel('all')
  }

  const onTabPress = (key: StatusTab) => {
    if (key !== status) {
      try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
      setStatus(key)
      setListKey(k => k + 1)
    }
  }

  const openFilterSheet = () => {
    setDraftCategory(categoryId)
    setDraftPriceMin(priceMin)
    setDraftPriceMax(priceMax)
    setDraftStock(stockLevel)
    setFilterOpen(true)
  }

  const applyFilters = () => {
    setCategoryId(draftCategory)
    setPriceMin(draftPriceMin)
    setPriceMax(draftPriceMax)
    setStockLevel(draftStock)
    setFilterOpen(false)
  }

  const resetFilters = () => {
    setDraftCategory(undefined)
    setDraftPriceMin('')
    setDraftPriceMax('')
    setDraftStock('all')
  }

  const onRefresh = async () => {
    setRefreshing(true)
    try { await refetch() } finally { setRefreshing(false) }
  }

  const onAdd = () => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    analytics.track({ name: 'seller_add_product_tapped' })
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('seller.home')}
          onPress={() => router.replace('/home')}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text accessibilityRole="header" style={styles.headerTitle}>{t('seller.products.title')}</Text>
        <Button variant="primary" size="sm" onPress={onAdd} leftIcon={<Text style={styles.plusIcon}>+</Text>} testID="add-product-btn">
          {t('seller.products.addProduct')}
        </Button>
      </View>

      <View style={styles.stickyBar}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('seller.products.search')}
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            inputMode="search"
            accessibilityLabel={t('seller.products.searchAria')}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.toolRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('seller.products.filterAria')}
            onPress={openFilterSheet}
            style={[styles.toolBtn, hasActiveFilters && styles.toolBtnActive]}
          >
            <Text style={styles.toolIcon}>⚙</Text>
            <Text style={[styles.toolText, hasActiveFilters && styles.toolTextActive]}>{t('seller.products.filter')}</Text>
            {hasActiveFilters && <View style={styles.toolDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('seller.products.sortAria')}
            onPress={() => setSortOpen(true)}
            style={styles.toolBtn}
          >
            <Text style={styles.toolIcon}>↕</Text>
            <Text style={styles.toolText}>{sortOptions.find(s => s.key === sort)?.label}</Text>
          </TouchableOpacity>

          <Text style={styles.countText}>{t('seller.products.count', { count: data?.total ?? 0 })}</Text>
        </View>

        {hasActiveFilters && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsContent}>
            {activeFilters.map(f => (
              <View key={f.key} style={styles.chipActive}>
                <Text style={styles.chipActiveText}>{f.label}</Text>
                <TouchableOpacity onPress={f.onClear} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={styles.chipClear}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={clearAll} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={styles.clearAllText}>{t('seller.products.clearAll')}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          <View style={styles.tabsTrack}>
            {statusTabs.map(tab => {
              const isActive = tab.key === status
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => onTabPress(tab.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  style={[styles.tab, isActive && styles.tabActive]}
                >
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                      {tab.count > 99 ? '99+' : tab.count}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </ScrollView>
      </View>

      <FlatList
        key={listKey}
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>{t('seller.products.loading')}</Text>
            </View>
          ) : (
            <EmptyState
              icon={<Text style={styles.emptyIcon}>📦</Text>}
              title={isFiltered ? t('seller.products.emptyFilteredTitle') : t('seller.products.emptyTitle')}
              subtitle={isFiltered ? t('seller.products.emptyFilteredSubtitle') : t('seller.products.emptySubtitle')}
              action={
                !isFiltered
                  ? { label: t('seller.products.addProduct'), onPress: onAdd }
                  : { label: t('seller.products.clearAll'), onPress: () => { clearAll(); setSearch(''); setStatus('all') } }
              }
            />
          )
        }
        ListFooterComponent={isFetching && items.length > 0 ? <Text style={styles.fetchingText}>…</Text> : null}
        renderItem={({ item, index }) => <ProductCard product={item} index={index} reduced={reducedMotion} />}
      />

      <BottomSheet visible={filterOpen} onClose={() => setFilterOpen(false)} title={t('seller.products.filterSheetTitle')}>
        <Text style={styles.sheetLabel}>{t('seller.products.filterCategory')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sheetChipsRow} contentContainerStyle={styles.sheetChipsContent}>
          <FilterChip label={t('seller.products.statusAll')} active={!draftCategory} onPress={() => setDraftCategory(undefined)} />
          {sellerCats?.map(c => (
            <FilterChip key={c.id} label={c.name} active={draftCategory === c.id} onPress={() => setDraftCategory(c.id)} />
          ))}
        </ScrollView>

        <Text style={styles.sheetLabel}>{t('seller.products.filterPriceRange')}</Text>
        <View style={styles.priceRow}>
          <TextInput
            style={styles.priceInput}
            value={draftPriceMin}
            onChangeText={setDraftPriceMin}
            placeholder={t('seller.products.filterPriceMin')}
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            inputMode="numeric"
            accessibilityLabel={t('seller.products.filterPriceMin')}
          />
          <Text style={styles.priceDash}>—</Text>
          <TextInput
            style={styles.priceInput}
            value={draftPriceMax}
            onChangeText={setDraftPriceMax}
            placeholder={t('seller.products.filterPriceMax')}
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            inputMode="numeric"
            accessibilityLabel={t('seller.products.filterPriceMax')}
          />
        </View>

        <Text style={styles.sheetLabel}>{t('seller.products.filterStockLevel')}</Text>
        <View style={styles.stockRow}>
          <FilterChip label={t('seller.products.filterStockLevel')} active={draftStock === 'all'} onPress={() => setDraftStock('all')} />
          <FilterChip label={t('seller.products.stockInStock')} active={draftStock === 'in_stock'} onPress={() => setDraftStock('in_stock')} />
          <FilterChip label={t('seller.products.stockLowStock')} active={draftStock === 'low_stock'} onPress={() => setDraftStock('low_stock')} />
          <FilterChip label={t('seller.products.stockOutOfStock')} active={draftStock === 'out_of_stock'} onPress={() => setDraftStock('out_of_stock')} />
        </View>

        <View style={styles.sheetActions}>
          <TouchableOpacity onPress={resetFilters} style={styles.resetBtn}>
            <Text style={styles.resetText}>{t('seller.products.filterReset')}</Text>
          </TouchableOpacity>
          <Button variant="primary" onPress={applyFilters} testID="apply-filters-btn">
            {t('seller.products.filterApply')}
          </Button>
        </View>
      </BottomSheet>

      <BottomSheet visible={sortOpen} onClose={() => setSortOpen(false)} title={t('seller.products.sort')}>
        {sortOptions.map(opt => {
          const isActive = opt.key === sort
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => {
                setSort(opt.key)
                setSortOpen(false)
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={styles.sortRow}
            >
              <Text style={[styles.sortLabel, isActive && styles.sortLabelActive]}>{opt.label}</Text>
              {isActive && <Text style={styles.sortDot}>•</Text>}
            </TouchableOpacity>
          )
        })}
      </BottomSheet>
    </View>
  )
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function ProductCard({ product, index, reduced }: { product: SellerProduct; index: number; reduced: boolean }) {
  const { t } = useTranslation()
  const stockCfg = STOCK_COLOR[product.stock]
  const statusCfg = STATUS_COLOR[product.status]
  return (
    <FadeIn delay={Math.min(index * 60, 240)} style={styles.card}>
      <View style={styles.cardInner}>
        <SafeImage source={product.image} alt={product.name} style={styles.cardImage} />
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardName} numberOfLines={1}>{product.name}</Text>
            <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.statusPillText, { color: statusCfg.text }]}>{t(STATUS_LABEL[product.status])}</Text>
            </View>
          </View>
          <Text style={styles.cardSku} numberOfLines={1}>{t('seller.products.sku')}: {product.sku}</Text>
          <View style={styles.cardBottomRow}>
            <Text style={styles.cardPrice}>{formatNPR(product.price)}</Text>
            <View style={[styles.stockPill, { backgroundColor: stockCfg.bg }]}>
              <View style={[styles.stockDot, { backgroundColor: stockCfg.dot }]} />
              <Text style={[styles.stockPillText, { color: stockCfg.text }]}>
                {t(STOCK_LABEL[product.stock])} · {product.stockCount}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </FadeIn>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.white, fontSize: 26, fontWeight: '400', marginTop: -4 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.white },
  plusIcon: { color: colors.white, fontSize: 16, fontWeight: '700' },

  stickyBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 16, color: colors.textMuted, marginRight: spacing[2] },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, height: '100%', padding: 0 },
  clearIcon: { fontSize: 14, color: colors.textMuted, paddingLeft: spacing[2] },

  toolRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[2] },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    height: 32,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  toolBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  toolIcon: { fontSize: 13, color: colors.textMuted },
  toolText: { fontSize: 13, fontWeight: '600', color: colors.text },
  toolTextActive: { color: colors.primary },
  toolDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  countText: { flex: 1, textAlign: 'right', fontSize: 12, color: colors.textMuted },

  chipsRow: { marginTop: spacing[2], flexGrow: 0 },
  chipsContent: { gap: spacing[2], paddingRight: spacing[4] },
  chipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingLeft: spacing[3],
    paddingRight: spacing[1.5],
    paddingVertical: spacing[1.5],
    minHeight: 30,
  },
  chipActiveText: { fontSize: 13, fontWeight: '500', color: colors.white },
  chipClear: { fontSize: 11, color: colors.white, opacity: 0.85, paddingHorizontal: spacing[1] },
  clearAllText: { fontSize: 13, fontWeight: '600', color: colors.primary, paddingHorizontal: spacing[2] },

  tabsContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tabsContent: { flexGrow: 1 },
  tabsTrack: { flexDirection: 'row', gap: spacing[1.5] },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    height: 36,
    paddingHorizontal: spacing[3],
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabLabelActive: { color: colors.white },
  tabBadge: {
    backgroundColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing[1.5],
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  tabBadgeTextActive: { color: colors.white },

  listContent: { padding: spacing[4], gap: spacing[3] },
  loadingWrap: { paddingVertical: spacing[10], alignItems: 'center' },
  loadingText: { fontSize: 14, color: colors.textMuted },
  fetchingText: { textAlign: 'center', color: colors.textTertiary, fontSize: 12, paddingVertical: spacing[3] },

  card: { backgroundColor: 'transparent' },
  cardInner: {
    flexDirection: 'row',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardImage: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.borderLight },
  cardBody: { flex: 1, minWidth: 0 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  cardName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  statusPill: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.full },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  cardSku: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing[2], gap: spacing[2] },
  cardPrice: { fontSize: 15, fontWeight: '700', color: colors.text },
  stockPill: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radii.full },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockPillText: { fontSize: 12, fontWeight: '500' },

  emptyIcon: { fontSize: 40 },

  sheetLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: spacing[4], marginBottom: spacing[2], paddingHorizontal: spacing[4] },
  sheetChipsRow: { flexGrow: 0 },
  sheetChipsContent: { paddingHorizontal: spacing[4], gap: spacing[2] },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minHeight: 32,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '500', color: colors.text },
  filterChipTextActive: { color: colors.white },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[4] },
  priceInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
  },
  priceDash: { color: colors.textTertiary, fontSize: 14 },

  stockRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], paddingHorizontal: spacing[4] },

  sheetActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], marginTop: spacing[6], gap: spacing[3] },
  resetBtn: { paddingVertical: spacing[2], paddingHorizontal: spacing[2] },
  resetText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },

  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sortLabel: { fontSize: 15, color: colors.text },
  sortLabelActive: { color: colors.primary, fontWeight: '600' },
  sortDot: { color: colors.primary, fontSize: 20 },
})
