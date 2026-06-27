import React, { useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { useProducts, useCategories } from '@chinooz/hooks'
import { EmptyState, ProductCard } from '@chinooz/ui'
import { useCartStore } from '@chinooz/state'
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
  { key: 'popular', labelKey: 'categories.mostPopular' },
  { key: 'priceLow', labelKey: 'categories.priceLowHigh' },
  { key: 'priceHigh', labelKey: 'categories.priceHighLow' },
]

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

  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState('popular')
  const [showSort, setShowSort] = useState(false)

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
    if (activeFilters.has('onSale')) items = items.filter(p => p.compareAtPrice && p.compareAtPrice > p.price)
    if (activeFilters.has('topRated')) items = items.filter(p => p.rating >= 4)
    if (sortBy === 'priceLow') items.sort((a, b) => a.price - b.price)
    if (sortBy === 'priceHigh') items.sort((a, b) => b.price - a.price)
    if (sortBy === 'popular') items.sort((a, b) => b.reviewCount - a.reviewCount)
    return items
  }, [products, activeFilters, sortBy])

  const toggleFilter = (key: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: spacing[1] }}>
          {t('categories.results', { count: filteredProducts.length })}
        </Text>
      </View>

      {/* Sticky filter/sort bar */}
      <Animated.View style={[styles.stickyBar, stickyStyle]}>
        <View style={{ flexDirection: 'row', gap: spacing[2], alignItems: 'center' }}>
          {/* Filter button */}
          <TouchableOpacity
            style={[styles.chip, activeFilters.size > 0 && styles.chipActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, activeFilters.size > 0 && styles.chipTextActive]}>
              🔧 {t('categories.filters')}
            </Text>
            {activeFilters.size > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeFilters.size}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Sort button */}
          <TouchableOpacity
            onPress={() => setShowSort(!showSort)}
            style={styles.chip}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>
              ↕ {t('categories.sortBy')}: {t(SORT_OPTIONS.find(o => o.key === sortBy)?.labelKey || 'categories.mostPopular')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sort dropdown */}
        {showSort && (
          <View style={styles.sortDropdown}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => { setSortBy(opt.key); setShowSort(false) }}
                style={[styles.sortOption, sortBy === opt.key && styles.sortOptionActive]}
              >
                <Text style={[styles.sortOptionText, sortBy === opt.key && styles.sortOptionTextActive]}>
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Quick-filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing[2], paddingHorizontal: EDGE_PADDING, paddingVertical: spacing[2] }}
      >
        {QUICK_FILTERS.map(f => {
          const active = activeFilters.has(f.key)
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => toggleFilter(f.key)}
              style={[styles.quickChip, active && styles.quickChipActive]}
              activeOpacity={0.7}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>
                {t(f.labelKey)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Product grid */}
      <ScrollView
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
      </ScrollView>
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
  quickChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 36,
    justifyContent: 'center' as const,
  },
  quickChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.text,
  },
  quickChipTextActive: {
    color: colors.white,
  },
}
