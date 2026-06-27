import React, { useState, useCallback, useMemo } from 'react'
import { View, Text, TouchableOpacity, Dimensions } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { useInfiniteProducts, usePrefetchProduct } from '@chinooz/hooks'
import { useCartStore } from '@chinooz/state'
import { ProductCard, ProductCardSkeleton, EmptyState } from '@chinooz/ui'
import type { Product } from '@chinooz/types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const EDGE_PADDING = 16
const GAP = 12

function getGridColumns() {
  const w = SCREEN_WIDTH - EDGE_PADDING * 2
  if (w >= 1024) return 5
  if (w >= 768) return 4
  if (w >= 640) return 3
  return 2
}

function getGridItemWidth(columns: number) {
  return (SCREEN_WIDTH - EDGE_PADDING * 2 - GAP * (columns - 1)) / columns
}

interface CategoryResultsProps {
  categoryId?: string
  onClearFilters?: () => void
}

export default function CategoryResults({ categoryId, onClearFilters }: CategoryResultsProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const addItem = useCartStore(s => s.addItem)
  const prefetchProduct = usePrefetchProduct()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteProducts({ categoryId, limit: 10 })

  const allProducts = useMemo(() => {
    if (!data) return []
    return data.pages.flatMap((page: { items: Product[] }) => page.items)
  }, [data])

  const gridColumns = getGridColumns()
  const gridItemWidth = getGridItemWidth(gridColumns)

  const handlePress = useCallback((product: Product) => {
    prefetchProduct(product.id)
    router.push({ pathname: '/product/[id]', params: { id: product.id } })
  }, [router, prefetchProduct])

  const handleAddToCart = useCallback((product: Product) => {
    addItem({
      id: `ci-${product.id}`,
      productId: product.id,
      name: product.name,
      image: product.images?.[0]?.uri ?? '',
      price: product.price,
      quantity: 1,
      maxQuantity: 10,
    })
  }, [addItem])

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Loading state
  if (isLoading) {
    return (
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}
        accessibilityLabel={t('home.loadingProducts')}
        accessibilityState={{ busy: true }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={{ width: gridItemWidth }}>
            <ProductCardSkeleton />
          </View>
        ))}
      </View>
    )
  }

  // Error state
  if (isError) {
    return (
      <Animated.View
        entering={FadeInDown.duration(250)}
        style={{ alignItems: 'center', paddingVertical: spacing[8], gap: spacing[3] }}
      >
        <Text style={{ fontSize: 40 }}>😕</Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('home.somethingWentWrong')}</Text>
        <TouchableOpacity
          onPress={refetch}
          style={{
            borderWidth: 1.5,
            borderColor: colors.primary,
            borderRadius: radii.md,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[2],
          }}
          activeOpacity={0.7}
          accessibilityLabel={t('common.retry')}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  // Empty state — no products in category
  if (allProducts.length === 0 && !onClearFilters) {
    return (
      <Animated.View
        entering={FadeInDown.duration(250)}
        style={{ alignItems: 'center', paddingVertical: spacing[8], gap: spacing[3] }}
      >
        <Text style={{ fontSize: 40 }}>📭</Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('home.noProductsInCategory')}</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
          {t('home.noProductsInCategorySubtitle')}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/categories')}
          style={{
            borderWidth: 1.5,
            borderColor: colors.primary,
            borderRadius: radii.md,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[2],
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{t('home.backToCategories')}</Text>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  // No results — filters too narrow
  if (allProducts.length === 0 && onClearFilters) {
    return (
      <Animated.View
        entering={FadeInDown.duration(250)}
        style={{ alignItems: 'center', paddingVertical: spacing[8], gap: spacing[3] }}
      >
        <Text style={{ fontSize: 40 }}>🔍</Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('home.noProducts')}</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
          {t('home.noProductsSubtitle')}
        </Text>
        <TouchableOpacity
          onPress={onClearFilters}
          style={{
            borderWidth: 1.5,
            borderColor: colors.primary,
            borderRadius: radii.md,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[2],
          }}
          activeOpacity={0.7}
          accessibilityLabel={t('home.clearFilters')}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{t('home.clearFilters')}</Text>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  return (
    <View>
      {/* Grid/List */}
      {viewMode === 'grid' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {allProducts.map((p, i) => (
            <Animated.View
              key={p.id}
              entering={FadeInDown.duration(250).delay(Math.min(i, 9) * 50).springify().damping(18)}
              style={{ width: gridItemWidth }}
            >
              <ProductCard
                product={p}
                onPress={handlePress}
                onAddToCart={handleAddToCart}
              />
            </Animated.View>
          ))}
        </View>
      ) : (
        <View>
          {allProducts.map((p, i) => (
            <Animated.View
              key={p.id}
              entering={FadeInDown.duration(250).delay(Math.min(i, 9) * 50).springify().damping(18)}
              style={{ marginBottom: GAP }}
            >
              <TouchableOpacity
                onPress={() => handlePress(p)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${p.name}, ${formatNPR(p.price)}`}
                style={{
                  flexDirection: 'row',
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  overflow: 'hidden',
                  shadowColor: colors.black,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View style={{ width: 80, height: 80, backgroundColor: colors.shimmer }}>
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 24 }}>📦</Text>
                  </View>
                </View>
                <View style={{ flex: 1, padding: spacing[2], gap: 4 }}>
                  <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={2}>{p.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                    <Text style={{ fontSize: 11, color: colors.gold }}>★</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>{p.rating}</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>({p.reviewCount})</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] }}>
                    {formatNPR(p.price)}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      )}

      {/* Load more */}
      {hasNextPage && (
        <TouchableOpacity
          onPress={handleEndReached}
          disabled={isFetchingNextPage}
          style={{ paddingVertical: spacing[4], alignItems: 'center' }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
            {isFetchingNextPage ? t('common.loading') : t('home.loadMore')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Loading more skeletons */}
      {isFetchingNextPage && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <View key={`sk-${i}`} style={{ width: gridItemWidth }}>
              <ProductCardSkeleton />
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
