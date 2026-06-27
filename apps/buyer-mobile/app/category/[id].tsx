import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  FadeInDown,
} from 'react-native-reanimated'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { useProducts, useCategories } from '@chinooz/hooks'
import { EmptyState, ProductCard } from '@chinooz/ui'
import { useCartStore } from '@chinooz/state'
import FilterSheet, { type FilterState } from '../../components/FilterSheet'
import SortSheet from '../../components/SortSheet'
import type { Product } from '@chinooz/types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const EDGE_PADDING = 16
const GAP = 12

const QUICK_FILTERS = [
  { key: 'onSale', labelKey: 'categories.onSale' },
  { key: 'freeDelivery', labelKey: 'categories.freeDelivery' },
  { key: 'topRated', labelKey: 'categories.topRated' },
  { key: 'newArrivals', labelKey: 'categories.newArrivals' },
]

const SORT_OPTIONS = [
  { key: 'relevance', labelKey: 'categories.relevance' },
  { key: 'priceLow', labelKey: 'categories.priceLowHigh' },
  { key: 'priceHigh', labelKey: 'categories.priceHighLow' },
  { key: 'rating', labelKey: 'categories.rating' },
  { key: 'newest', labelKey: 'categories.newest' },
  { key: 'popular', labelKey: 'categories.mostPopular' },
]

const DEFAULT_FILTERS: FilterState = {
  priceMin: 0,
  priceMax: 999999,
  minRating: 0,
  brands: new Set(),
  inStock: false,
  onSale: false,
}

function getColumns() {
  const w = SCREEN_WIDTH - EDGE_PADDING * 2
  if (w >= 768) return 3
  return 2
}

function getColumnWidth(columns: number) {
  return (SCREEN_WIDTH - EDGE_PADDING * 2 - GAP * (columns - 1)) / columns
}

export default function CategoryListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const addItem = useCartStore(s => s.addItem)

  const { data: categories } = useCategories()
  const { data: products, isLoading } = useProducts({ categoryId: id, limit: 50 })

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [sortBy, setSortBy] = useState('relevance')
  const [showSortSheet, setShowSortSheet] = useState(false)
  const [showFilterSheet, setShowFilterSheet] = useState(false)

  const scrollY = useSharedValue(0)

  const category = useMemo(() => {
    if (!categories || !id) return null
    return categories.find(c => c.id === id)
  }, [categories, id])

  const breadcrumb = useMemo(() => {
    if (!categories || !id) return []
    const path: { id: string; name: string }[] = []
    let current = categories.find(c => c.id === id)
    while (current) {
      path.unshift({ id: current.id, name: current.name })
      current = current.parentId ? categories.find(c => c.id === current!.parentId) : undefined
    }
    return path
  }, [categories, id])

  const filteredProducts = useMemo(() => {
    if (!products?.items) return []
    let items = [...products.items]
    if (filters.inStock) items = items.filter(p => p.stock !== 'out_of_stock')
    if (filters.onSale) items = items.filter(p => p.compareAtPrice && p.compareAtPrice > p.price)
    if (filters.minRating > 0) items = items.filter(p => p.rating >= filters.minRating)
    if (filters.brands.size > 0) items = items.filter(p => filters.brands.has(p.sellerName))
    items = items.filter(p => p.price >= filters.priceMin && p.price <= filters.priceMax)
    if (sortBy === 'priceLow') items.sort((a, b) => a.price - b.price)
    if (sortBy === 'priceHigh') items.sort((a, b) => b.price - a.price)
    if (sortBy === 'popular') items.sort((a, b) => b.reviewCount - a.reviewCount)
    return items
  }, [products, filters, sortBy])

  const activeChipCount = useMemo(() => {
    let count = 0
    if (filters.inStock) count++
    if (filters.onSale) count++
    if (filters.minRating > 0) count++
    if (filters.brands.size > 0) count += filters.brands.size
    if (filters.priceMin > 0 || filters.priceMax < 999999) count++
    return count
  }, [filters])

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = []
    if (filters.onSale) chips.push({ key: 'onSale', label: t('categories.onSale') })
    if (filters.inStock) chips.push({ key: 'inStock', label: t('categories.inStock') })
    if (filters.minRating > 0) chips.push({ key: 'rating', label: `${filters.minRating}★+` })
    filters.brands.forEach(b => chips.push({ key: `brand-${b}`, label: b }))
    if (filters.priceMin > 0 || filters.priceMax < 999999) {
      chips.push({ key: 'price', label: `${filters.priceMin}–${filters.priceMax}` })
    }
    return chips
  }, [filters, t])

  const removeChip = useCallback((key: string) => {
    if (key === 'onSale') setFilters(f => ({ ...f, onSale: false }))
    else if (key === 'inStock') setFilters(f => ({ ...f, inStock: false }))
    else if (key === 'rating') setFilters(f => ({ ...f, minRating: 0 }))
    else if (key.startsWith('brand-')) {
      const brand = key.replace('brand-', '')
      setFilters(f => {
        const next = new Set(f.brands)
        next.delete(brand)
        return { ...f, brands: next }
      })
    } else if (key === 'price') setFilters(f => ({ ...f, priceMin: 0, priceMax: 999999 }))
  }, [])

  const clearAll = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const columns = getColumns()
  const cardWidth = getColumnWidth(columns)

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y },
  })

  const stickyStyle = useAnimatedStyle(() => ({
    shadowOpacity: scrollY.value > 20 ? 0.08 : 0,
    shadowRadius: scrollY.value > 20 ? 8 : 0,
    elevation: scrollY.value > 20 ? 3 : 0,
  }))

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: EDGE_PADDING, paddingTop: spacing[4], paddingBottom: spacing[2] }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: spacing[2] }}>
          <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '600' }}>← {t('common.back')}</Text>
        </TouchableOpacity>

        {/* Breadcrumb */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[1] }}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/categories')}>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{t('categories.allCategories')}</Text>
          </TouchableOpacity>
          {breadcrumb.map((crumb, i) => (
            <View key={crumb.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>›</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/categories' })}>
                <Text style={{
                  fontSize: 12,
                  color: i === breadcrumb.length - 1 ? colors.primary : colors.textMuted,
                  fontWeight: i === breadcrumb.length - 1 ? '600' : '400',
                }}>
                  {crumb.name}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <Text style={{ fontSize: 22, fontWeight: '600', color: colors.text, marginTop: spacing[2] }}>
          {category?.name || t('categories.allCategories')}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: spacing[1] }} accessibilityLiveRegion="polite">
          {t('categories.results', { count: filteredProducts.length })}
        </Text>
      </View>

      {/* Sticky filter/sort bar */}
      <Animated.View style={[styles.stickyBar, stickyStyle]}>
        <View style={{ flexDirection: 'row', gap: spacing[2], alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setShowFilterSheet(true)}
            style={[styles.chip, activeChipCount > 0 && styles.chipActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, activeChipCount > 0 && styles.chipTextActive]}>
              🔧 {t('categories.filters')}
            </Text>
            {activeChipCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeChipCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowSortSheet(true)}
            style={styles.chip}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>
              ↕ {t('categories.sortBy')}: {t(SORT_OPTIONS.find(o => o.key === sortBy)?.labelKey || 'categories.relevance')}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <View style={styles.activeChipsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
            {activeChips.map(chip => (
              <TouchableOpacity
                key={chip.key}
                onPress={() => removeChip(chip.key)}
                style={styles.activeChip}
                activeOpacity={0.7}
              >
                <Text style={styles.activeChipText}>{chip.label}</Text>
                <Text style={styles.activeChipX}>✕</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={clearAll} style={{ marginLeft: spacing[2] }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>{t('categories.clearAll')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Product grid */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: EDGE_PADDING,
          paddingTop: spacing[2],
          paddingBottom: insets.bottom + spacing[6],
        }}
      >
        {filteredProducts.length === 0 && !isLoading ? (
          <EmptyState
            icon={<Text style={{ fontSize: 48 }}>🔍</Text>}
            title={t('common.noResults')}
            subtitle={t('emptyState.noItemsSubtitle')}
          />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
            {filteredProducts.map((product, i) => (
              <Animated.View
                key={product.id}
                entering={FadeInDown.duration(250).delay(Math.min(i, 9) * 50).springify().damping(18)}
                style={{ width: cardWidth }}
              >
                <ProductCard
                  product={product}
                  onPress={(p) => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
                  onAddToCart={(p) => addItem({
                    id: `ci-${p.id}`,
                    productId: p.id,
                    name: p.name,
                    image: p.images?.[0]?.uri ?? '',
                    price: p.price,
                    quantity: 1,
                    maxQuantity: 10,
                  })}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </Animated.ScrollView>

      {/* Filter sheet */}
      <FilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        products={products?.items ?? []}
        filters={filters}
        onApply={(f) => { setFilters(f); setShowFilterSheet(false) }}
        onReset={() => { setFilters(DEFAULT_FILTERS); setShowFilterSheet(false) }}
      />

      {/* Sort sheet */}
      <SortSheet
        visible={showSortSheet}
        onClose={() => setShowSortSheet(false)}
        options={SORT_OPTIONS}
        activeKey={sortBy}
        onSelect={(key) => setSortBy(key)}
      />
    </View>
  )
}

const styles = {
  stickyBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: EDGE_PADDING,
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  chip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing[1],
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.text,
  },
  chipTextActive: {
    color: colors.primary,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: colors.white,
  },
  sortDropdown: {
    marginTop: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden' as const,
  },
  sortOption: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sortOptionActive: {
    backgroundColor: colors.primary50,
  },
  sortOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  sortOptionTextActive: {
    color: colors.primary,
    fontWeight: '600' as const,
  },
  activeChipsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: EDGE_PADDING,
    paddingVertical: spacing[2],
  },
  activeChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    gap: spacing[1],
  },
  activeChipText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.primary,
  },
  activeChipX: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600' as const,
  },
}
