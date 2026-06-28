import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  LayoutChangeEvent,
} from 'react-native'
import { useRouter, Redirect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated'
import { ChevronDown, Search, SlidersHorizontal, X, ArrowUpDown, PackageSearch, RotateCw } from 'lucide-react-native'
import { colors, radii, spacing, fontFamily } from '@chinooz/theme'
import { SafeImage, BottomSheet, EmptyState, InventoryRow, BulkBar, BulkConfirmSheet, useReducedMotion } from '@chinooz/ui'
import { useSellerInventory, useSellerCategories, useUpdateStock, useBulkUpdateStock, useExportStockCsv, useImportStockCsv } from '@chinooz/hooks'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import type { SellerInventoryProduct, SellerInventoryVariant, StockStatus, BulkStockAction, StockEditReason, CsvStockRow } from '@chinooz/types'
import { LOW_STOCK_THRESHOLD, type InventorySort } from '@chinooz/mock-data'

type TabKey = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'all', labelKey: 'seller.inventory.tabAll' },
  { key: 'in_stock', labelKey: 'seller.inventory.tabInStock' },
  { key: 'low_stock', labelKey: 'seller.inventory.tabLowStock' },
  { key: 'out_of_stock', labelKey: 'seller.inventory.tabOutStock' },
]

const SORT_OPTIONS: { key: InventorySort; labelKey: string }[] = [
  { key: 'best_selling', labelKey: 'seller.inventory.sortBestSelling' },
  { key: 'stock_desc', labelKey: 'seller.inventory.sortStockDesc' },
  { key: 'stock_asc', labelKey: 'seller.inventory.sortStockAsc' },
  { key: 'name', labelKey: 'seller.inventory.sortName' },
]

const STATUS_META: Record<StockStatus, { bg: string; text: string; dot: string; labelKey: string }> = {
  in_stock: { bg: colors.successLight, text: colors.success, dot: colors.success, labelKey: 'seller.inventory.inStock' },
  low_stock: { bg: colors.warningLight, text: colors.warning, dot: colors.warning, labelKey: 'seller.inventory.lowStock' },
  out_of_stock: { bg: colors.errorLight, text: colors.error, dot: colors.error, labelKey: 'seller.inventory.outOfStock' },
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

function StatusPill({ status }: { status: StockStatus }) {
  const { t } = useTranslation()
  const m = STATUS_META[status]
  return (
    <View style={[styles.statusPill, { backgroundColor: m.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: m.dot }]} />
      <Text style={[styles.statusPillText, { color: m.text }]}>{t(m.labelKey)}</Text>
    </View>
  )
}

function SegmentTabs({
  active,
  onChange,
  counts,
}: {
  active: TabKey
  onChange: (k: TabKey) => void
  counts: Record<TabKey, number>
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const containerRef = useRef<View>(null)
  const [segWidth, setSegWidth] = useState(0)
  const indicatorX = useSharedValue(0)

  useEffect(() => {
    const idx = TABS.findIndex(tb => tb.key === active)
    indicatorX.value = reduced ? idx * segWidth : withSpring(idx * segWidth, { damping: 22, stiffness: 320, mass: 0.7 })
  }, [active, segWidth, reduced])

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: indicatorX.value }] }))

  return (
    <View
      ref={containerRef}
      style={styles.tabsTrack}
      accessibilityRole="tablist"
      onLayout={e => setSegWidth(e.nativeEvent.layout.width / TABS.length)}
    >
      <Animated.View style={[styles.tabsIndicator, { width: segWidth || '100%' }, indicatorStyle]} />
      {TABS.map(tab => {
        const isActive = tab.key === active
        const count = counts[tab.key]
        return (
          <TouchableOpacity
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            activeOpacity={0.7}
            style={styles.tabBtn}
            onPress={() => {
              try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
              onChange(tab.key)
            }}
          >
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{t(tab.labelKey)}</Text>
            {count > 0 && (
              <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                  {count > 99 ? '99+' : count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function Collapsible({ open, reduced, children }: { open: boolean; reduced: boolean; children: React.ReactNode }) {
  const height = useSharedValue(0)
  const measured = useRef(0)
  const opacity = useSharedValue(open ? 1 : 0)

  useEffect(() => {
    if (reduced) {
      height.value = open ? measured.current : 0
      opacity.value = open ? 1 : 0
    } else {
      height.value = open ? withTiming(measured.current, { duration: 200, easing: Easing.out(Easing.ease) }) : withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) })
      opacity.value = open ? withTiming(1, { duration: 120 }) : withTiming(0, { duration: 120 })
    }
  }, [open, reduced])

  const wrapStyle = useAnimatedStyle(() => ({ height: height.value, opacity: opacity.value }))

  return (
    <Animated.View style={[styles.collapsibleWrap, wrapStyle]}>
      <View
        onLayout={(e: LayoutChangeEvent) => {
          measured.current = e.nativeEvent.layout.height
          if (open && height.value === 0) height.value = e.nativeEvent.layout.height
        }}
        pointerEvents={open ? 'auto' : 'none'}
      >
        {children}
      </View>
    </Animated.View>
  )
}

function VariantRowCard({ v, onStockChange, editState, selected, onToggleSelect }: {
  v: SellerInventoryVariant
  onStockChange: (newStock: number, mode: 'set' | 'adjust', reason?: 'restock' | 'correction' | 'damage' | 'loss' | 'return' | 'other') => void
  editState: 'idle' | 'saving' | 'saved' | 'error'
  selected?: boolean
  onToggleSelect?: (id: string) => void
}) {
  return (
    <InventoryRow
      variant={v}
      lowStockThreshold={LOW_STOCK_THRESHOLD}
      layout="compact"
      editable
      onStockChange={onStockChange}
      editState={editState}
      selected={selected}
      onToggleSelect={onToggleSelect}
    />
  )
}

function ProductGroupCard({
  product,
  expanded,
  onToggle,
  reduced,
  onStockChange,
  variantEditState,
  selected,
  onToggleSelect,
}: {
  product: SellerInventoryProduct
  expanded: boolean
  onToggle: () => void
  reduced: boolean
  onStockChange: (variantId: string, productId: string, newStock: number, mode: 'set' | 'adjust', reason?: 'restock' | 'correction' | 'damage' | 'loss' | 'return' | 'other') => void
  variantEditState: (variantId: string) => 'idle' | 'saving' | 'saved' | 'error'
  selected: Set<string>
  onToggleSelect: (id: string) => void
}) {
  const { t } = useTranslation()
  const chevron = useSharedValue(expanded ? 1 : 0)
  useEffect(() => {
    chevron.value = reduced ? (expanded ? 1 : 0) : withTiming(expanded ? 1 : 0, { duration: 150 })
  }, [expanded, reduced])
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${chevron.value * 180}deg` }] }))

  return (
    <View style={styles.groupCard}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        activeOpacity={0.7}
        onPress={onToggle}
        style={styles.groupHeader}
      >
        <SafeImage source={product.image} style={styles.groupThumb} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.groupName} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.groupSub} numberOfLines={1}>
            {product.variantCount > 1
              ? t('seller.inventory.variants', { count: product.variantCount })
              : t('seller.inventory.variant', { count: product.variantCount })}
            {' · '}
            {product.categoryName}
          </Text>
        </View>
        <View style={styles.groupRight}>
          <Text style={styles.groupStock}>{product.aggregateStock}</Text>
          <StatusPill status={product.stock} />
        </View>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={18} color={colors.textMuted} />
        </Animated.View>
      </TouchableOpacity>

      <Collapsible open={expanded} reduced={reduced}>
        <View style={styles.variantsList}>
          {product.variants.map(v => (
            <VariantRowCard
              key={v.id}
              v={v}
              onStockChange={(ns, m, r) => onStockChange(v.id, product.id, ns, m, r)}
              editState={variantEditState(v.id)}
              selected={selected.has(v.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </View>
      </Collapsible>
    </View>
  )
}

export default function InventoryScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)

  const [tab, setTab] = useState<TabKey>('all')
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query, 250)
  const [sort, setSort] = useState<InventorySort>('best_selling')
  const [category, setCategory] = useState<string | null>(null)
  const [stockMin, setStockMin] = useState<number | null>(null)
  const [stockMax, setStockMax] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<BulkStockAction | null>(null)
  const [snackbar, setSnackbar] = useState<{ msg: string; variant: 'success' | 'error' } | null>(null)
  const snackbarTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => { analytics.screen({ name: 'seller-inventory' }) }, [])

  const catsQ = useSellerCategories()
  const invQ = useSellerInventory({
    status: tab,
    search: debounced,
    categoryId: category ?? undefined,
    stockMin: stockMin ?? undefined,
    stockMax: stockMax ?? undefined,
    sort,
  })
  const stockMutation = useUpdateStock()
  const bulkMutation = useBulkUpdateStock()
  const exportMutation = useExportStockCsv()
  const importMutation = useImportStockCsv()

  const handleStockChange = (variantId: string, productId: string, newStock: number, mode: 'set' | 'adjust', reason?: 'restock' | 'correction' | 'damage' | 'loss' | 'return' | 'other') => {
    stockMutation.mutate({ productId, variantId, newCount: newStock, mode, reason: reason ?? 'restock' })
  }
  const variantEditState = (variantId: string): 'idle' | 'saving' | 'saved' | 'error' => {
    if (stockMutation.isPending && stockMutation.variables?.variantId === variantId) return 'saving'
    if (stockMutation.isError && stockMutation.variables?.variantId === variantId) return 'error'
    if (stockMutation.isSuccess && stockMutation.variables?.variantId === variantId) return 'saved'
    return 'idle'
  }

  const showSnackbar = (msg: string, variant: 'success' | 'error') => {
    setSnackbar({ msg, variant })
    clearTimeout(snackbarTimer.current)
    snackbarTimer.current = setTimeout(() => setSnackbar(null), 3000)
  }

  const allVisibleVariants = useMemo(() => {
    return (invQ.data?.products ?? []).flatMap(p => p.variants.map(v => ({ id: v.id, productId: p.id })))
  }, [invQ.data])

  const allSelected = allVisibleVariants.length > 0 && allVisibleVariants.every(v => selected.has(v.id))
  const someSelected = selected.size > 0 && !allSelected

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }
  const toggleSelectAll = () => {
    if (allSelected) { setSelected(new Set()) }
    else { setSelected(new Set(allVisibleVariants.map(v => v.id))) }
  }
  const clearSelection = () => setSelected(new Set())

  const handleBulkConfirm = (value: number | undefined, reason: StockEditReason) => {
    if (!bulkAction) return
    bulkMutation.mutate(
      { variantIds: [...selected], action: bulkAction, value, reason },
      {
        onSuccess: (data) => {
          showSnackbar(
            data.failed > 0
              ? t('seller.inventory.bulkResultFailed', { count: data.failed, total: data.updated + data.failed })
              : t('seller.inventory.bulkResult', { count: data.updated }),
            data.failed > 0 ? 'error' : 'success',
          )
          clearSelection()
        },
        onError: () => showSnackbar(t('seller.inventory.bulkError'), 'error'),
      },
    )
    setBulkAction(null)
  }

  const handleExport = () => {
    exportMutation.mutate(undefined as never, {
      onSuccess: () => showSnackbar(t('seller.inventory.exportReady'), 'success'),
      onError: () => showSnackbar(t('seller.inventory.bulkError'), 'error'),
    })
  }

  const handleImport = (rows: CsvStockRow[]) => {
    importMutation.mutate(rows, {
      onSuccess: (data) => {
        showSnackbar(t('seller.inventory.bulkResult', { count: data.updated }), 'success')
      },
      onError: () => showSnackbar(t('seller.inventory.bulkError'), 'error'),
    })
  }

  const counts = useMemo<Record<TabKey, number>>(() => {
    const c = invQ.data?.counts
    return {
      all: c?.all ?? 0,
      in_stock: c?.in_stock ?? 0,
      low_stock: c?.low_stock ?? 0,
      out_of_stock: c?.out_of_stock ?? 0,
    }
  }, [invQ.data])

  const categoryName = useMemo(
    () => catsQ.data?.find(c => c.id === category)?.name,
    [catsQ.data, category],
  )

  const toggleGroup = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const resetFilters = () => {
    setCategory(null)
    setStockMin(null)
    setStockMax(null)
  }

  const hasActiveFilters = Boolean(category) || stockMin != null || stockMax != null
  const activeFilterCount = (category ? 1 : 0) + (stockMin != null || stockMax != null ? 1 : 0)
  const products = invQ.data?.products ?? []
  const isLoading = invQ.isLoading
  const isError = invQ.isError

  if (!isLoggedIn) return <Redirect href="/onboarding" />

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={styles.headerTitle}>{t('seller.inventory.title')}</Text>
            <Text style={styles.headerSub}>{t('seller.inventory.subtitle')}</Text>
          </View>
        </View>
      </View>

      {/* Sticky controls */}
      <View style={styles.stickyControls}>
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Search size={18} color={colors.textMuted} style={{ position: 'absolute', left: 12 }} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('seller.inventory.search')}
              accessibilityLabel={t('seller.inventory.searchAria')}
              inputMode="search"
              returnKeyType="search"
              style={styles.searchInput}
              placeholderTextColor={colors.textTertiary}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear" style={styles.searchClear}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('seller.inventory.sort')}
            onPress={() => setSortOpen(true)}
            style={styles.iconBtn}
          >
            <ArrowUpDown size={18} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('seller.inventory.filterAria')}
            onPress={() => setFilterOpen(true)}
            style={styles.iconBtn}
          >
            <SlidersHorizontal size={18} color={colors.text} />
            {activeFilterCount > 0 && <View style={styles.iconBadge}><Text style={styles.iconBadgeText}>{activeFilterCount}</Text></View>}
          </TouchableOpacity>
        </View>

        <SegmentTabs active={tab} onChange={setTab} counts={counts} />

        {hasActiveFilters && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={{ gap: spacing[2] }}>
            {category && (
              <TouchableOpacity
                style={styles.chipActive}
                onPress={() => setCategory(null)}
                accessibilityRole="button"
              >
                <Text style={styles.chipActiveText}>{categoryName ?? category}</Text>
                <X size={13} color={colors.white} />
              </TouchableOpacity>
            )}
            {(stockMin != null || stockMax != null) && (
              <TouchableOpacity
                style={styles.chipActive}
                onPress={() => { setStockMin(null); setStockMax(null) }}
                accessibilityRole="button"
              >
                <Text style={styles.chipActiveText}>
                  {t('seller.inventory.stockRange')}: {[stockMin ?? '', stockMax ?? ''].filter(Boolean).join('–')}
                </Text>
                <X size={13} color={colors.white} />
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>

      {/* Body */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[6] }}
        keyboardShouldPersistTaps="handled"
      >
        {isLoading && (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>{t('seller.inventory.loading')}</Text>
          </View>
        )}

        {isError && !isLoading && (
          <EmptyState
            icon={<RotateCw size={32} color={colors.textMuted} />}
            title={t('seller.inventory.error')}
            action={{ label: t('seller.inventory.retry'), onPress: () => invQ.refetch() }}
          />
        )}

        {!isLoading && !isError && products.length === 0 && (
          <EmptyState
            icon={<PackageSearch size={32} color={colors.textMuted} />}
            title={query ? t('seller.inventory.emptySearch', { query }) : t('seller.inventory.empty')}
          />
        )}

        {!isLoading && !isError && products.length > 0 && (
          <View style={{ gap: spacing[2.5] }}>
            {products.map(p => (
              <ProductGroupCard
                key={p.id}
                product={p}
                expanded={expanded.has(p.id)}
                onToggle={() => toggleGroup(p.id)}
                reduced={reduced}
                onStockChange={handleStockChange}
                variantEditState={variantEditState}
                selected={selected}
                onToggleSelect={toggleSelect}
              />
            ))}
            <Text style={styles.countText}>
              {t('seller.inventory.count', { count: invQ.data?.totalVariants ?? 0 })}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Filter sheet */}
      <BottomSheet visible={filterOpen} onClose={() => setFilterOpen(false)} title={t('seller.inventory.filterTitle')}>
        <FilterSheetContent
          categories={catsQ.data ?? []}
          category={category}
          onCategory={setCategory}
          stockMin={stockMin}
          stockMax={stockMax}
          onStock={(mn, mx) => { setStockMin(mn); setStockMax(mx) }}
          onReset={resetFilters}
          onApply={() => setFilterOpen(false)}
        />
      </BottomSheet>

      {/* Sort sheet */}
      <BottomSheet visible={sortOpen} onClose={() => setSortOpen(false)} title={t('seller.inventory.sort')}>
        <View style={{ gap: spacing[1] }}>
          {SORT_OPTIONS.map(opt => {
            const isActive = opt.key === sort
            return (
              <TouchableOpacity
                key={opt.key}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => { setSort(opt.key); setSortOpen(false) }}
                style={[styles.sortOption, isActive && styles.sortOptionActive]}
              >
                <Text style={[styles.sortOptionText, isActive && styles.sortOptionTextActive]}>
                  {t(opt.labelKey)}
                </Text>
                {isActive && <View style={styles.sortOptionDot} />}
              </TouchableOpacity>
            )
          })}
        </View>
      </BottomSheet>

      {/* Bulk bar — slides up from bottom */}
      {selected.size > 0 && (
        <View style={[styles.bulkBarWrap, { paddingBottom: insets.bottom + spacing[2] }]}>
          <BulkBar
            selectedCount={selected.size}
            onAction={(a) => setBulkAction(a)}
            onClear={clearSelection}
            onExport={handleExport}
            onImport={() => {
              const mockRows: CsvStockRow[] = (invQ.data?.products ?? [])
                .flatMap(p => p.variants)
                .slice(0, 5)
                .map(v => ({ sku: v.sku, stockCount: v.stockCount, lowStockThreshold: v.lowStockThreshold ?? LOW_STOCK_THRESHOLD }))
              handleImport(mockRows)
            }}
          />
        </View>
      )}

      {/* Bulk confirm sheet */}
      <BulkConfirmSheet
        visible={bulkAction !== null}
        action={bulkAction ?? 'set'}
        count={selected.size}
        onConfirm={handleBulkConfirm}
        onCancel={() => setBulkAction(null)}
      />

      {/* Snackbar */}
      {snackbar && (
        <View
          style={[styles.snackbar, { bottom: insets.bottom + (selected.size > 0 ? 90 : 24), backgroundColor: snackbar.variant === 'success' ? colors.success : colors.error }]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.snackbarText}>{snackbar.msg}</Text>
        </View>
      )}
    </View>
  )
}

function FilterSheetContent({
  categories,
  category,
  onCategory,
  stockMin,
  stockMax,
  onStock,
  onReset,
  onApply,
}: {
  categories: { id: string; name: string }[]
  category: string | null
  onCategory: (id: string | null) => void
  stockMin: number | null
  stockMax: number | null
  onStock: (min: number | null, max: number | null) => void
  onReset: () => void
  onApply: () => void
}) {
  const { t } = useTranslation()
  const [min, setMin] = useState(stockMin?.toString() ?? '')
  const [max, setMax] = useState(stockMax?.toString() ?? '')

  useEffect(() => {
    setMin(stockMin?.toString() ?? '')
    setMax(stockMax?.toString() ?? '')
  }, [stockMin, stockMax])

  return (
    <View style={{ gap: spacing[4] }}>
      <View>
        <Text style={styles.sheetLabel}>{t('seller.inventory.category')}</Text>
        <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => onCategory(null)}
            style={[styles.catOption, !category && styles.catOptionActive]}
          >
            <Text style={[styles.catOptionText, !category && styles.catOptionTextActive]}>
              {t('seller.inventory.categoryAll')}
            </Text>
          </TouchableOpacity>
          {categories.map(c => (
            <TouchableOpacity
              key={c.id}
              onPress={() => onCategory(c.id)}
              style={[styles.catOption, category === c.id && styles.catOptionActive]}
            >
              <Text style={[styles.catOptionText, category === c.id && styles.catOptionTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View>
        <Text style={styles.sheetLabel}>{t('seller.inventory.stockRange')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <TextInput
            value={min}
            onChangeText={v => setMin(v.replace(/[^0-9]/g, ''))}
            placeholder={t('seller.inventory.stockMin')}
            inputMode="numeric"
            style={styles.rangeInput}
            placeholderTextColor={colors.textTertiary}
          />
          <Text style={{ color: colors.textTertiary }}>-</Text>
          <TextInput
            value={max}
            onChangeText={v => setMax(v.replace(/[^0-9]/g, ''))}
            placeholder={t('seller.inventory.stockMax')}
            inputMode="numeric"
            style={styles.rangeInput}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing[3] }}>
        <TouchableOpacity onPress={onReset} style={styles.sheetBtnSecondary}>
          <Text style={styles.sheetBtnSecondaryText}>{t('seller.inventory.reset')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { onStock(min ? Number(min) : null, max ? Number(max) : null); onApply() }}
          style={styles.sheetBtnPrimary}
        >
          <Text style={styles.sheetBtnPrimaryText}>{t('seller.inventory.apply')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const TAB_HEIGHT = 40

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { backgroundColor: colors.primary, paddingHorizontal: spacing[4] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingBottom: spacing[3] },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: colors.white, lineHeight: 30, marginTop: -4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
  headerSub: { fontSize: 13, color: colors.primary50, marginTop: 2 },
  stickyControls: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing[3],
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
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
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeText: { color: colors.white, fontSize: 10, fontWeight: '600', fontFamily: fontFamily.sansSemiBold[0] },
  tabsTrack: {
    flexDirection: 'row',
    height: TAB_HEIGHT,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    position: 'relative',
  },
  tabsIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: TAB_HEIGHT,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[1], height: TAB_HEIGHT },
  tabLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted, fontFamily: fontFamily.sansSemiBold[0] },
  tabLabelActive: { color: colors.white },
  tabBadge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { fontSize: 12, fontWeight: '600', color: colors.primary, fontFamily: fontFamily.sansSemiBold[0] },
  tabBadgeTextActive: { color: colors.white },
  chipsRow: { flexGrow: 0 },
  chipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  chipActiveText: { color: colors.white, fontSize: 12, fontWeight: '600', fontFamily: fontFamily.sansSemiBold[0] },
  stateWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12], gap: spacing[3] },
  stateText: { fontSize: 14, color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[3] },
  groupThumb: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.borderLight },
  groupName: { fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0] },
  groupSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontFamily: fontFamily.sans[0] },
  groupRight: { alignItems: 'flex-end', gap: spacing[1] },
  groupStock: { fontSize: 14, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  collapsibleWrap: { overflow: 'hidden' },
  variantsList: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing[3],
    paddingTop: spacing[1],
    paddingBottom: spacing[2],
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2.5],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  variantName: { fontSize: 14, color: colors.textSecondary, fontFamily: fontFamily.sans[0] },
  variantSku: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontFamily: fontFamily.sans[0], fontVariant: ['tabular-nums'] },
  variantPrice: { fontSize: 14, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansSemiBold[0] },
  variantRight: { alignItems: 'flex-end', gap: spacing[1], minWidth: 84 },
  variantStock: { fontSize: 14, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.full },
  statusDot: { width: 6, height: 6, borderRadius: radii.full },
  statusPillText: { fontSize: 11, fontWeight: '600', fontFamily: fontFamily.sansSemiBold[0] },
  countText: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: spacing[2], fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },
  sheetLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: spacing[2], fontFamily: fontFamily.sansSemiBold[0] },
  catOption: { paddingVertical: spacing[3], paddingHorizontal: spacing[3], borderRadius: radii.md },
  catOptionActive: { backgroundColor: colors.primary50 },
  catOptionText: { fontSize: 14, color: colors.text, fontFamily: fontFamily.sans[0] },
  catOptionTextActive: { color: colors.primary, fontWeight: '600', fontFamily: fontFamily.sansSemiBold[0] },
  rangeInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    fontSize: 14,
    color: colors.text,
    fontFamily: fontFamily.sans[0],
    fontVariant: ['tabular-nums'],
  },
  sheetBtnSecondary: { flex: 1, height: 44, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  sheetBtnSecondaryText: { fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  sheetBtnPrimary: { flex: 1, height: 44, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sheetBtnPrimaryText: { fontSize: 14, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
  },
  sortOptionActive: { backgroundColor: colors.primary50 },
  sortOptionText: { fontSize: 15, color: colors.text, fontFamily: fontFamily.sans[0] },
  sortOptionTextActive: { color: colors.primary, fontWeight: '700', fontFamily: fontFamily.sansBold[0] },
  sortOptionDot: { width: 8, height: 8, borderRadius: radii.full, backgroundColor: colors.primary },
  bulkBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  snackbar: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    borderRadius: radii.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  snackbarText: { fontSize: 14, fontWeight: '600', color: colors.white, fontFamily: fontFamily.sansSemiBold[0] },
})
