import React, { useState, useCallback, useMemo } from 'react'
import { View, Text, TouchableOpacity, Dimensions, FlatList } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { useInfiniteProducts, usePrefetchProduct } from '@chinooz/hooks'
import { useCartStore } from '@chinooz/state'
import { ProductCard, ProductCardSkeleton } from '@chinooz/ui'
import { EmptyState } from '@chinooz/ui'
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
}

export default function CategoryResults({ categoryId }: CategoryResultsProps) {
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

  const renderGridItem = useCallback((product: Product, index: number) => (
    <Animated.View
      key={product.id}
      entering={FadeInDown.duration(250).delay(Math.min(index, 9) * 50).springify().damping(18)}
      style={{ width: gridItemWidth }}
    >
      <ProductCard
        product={product}
        onPress={handlePress}
        onAddToCart={handleAddToCart}
      />
    </Animated.View>
  ), [gridItemWidth, handlePress, handleAddToCart])

  const renderListItem = useCallback((product: Product, index: number) => (
    <Animated.View
      key={product.id}
      entering={FadeInDown.duration(250).delay(Math.min(index, 9) * 50).springify().damping(18)}
      style={{ marginBottom: GAP }}
    >
      <TouchableOpacity
        onPress={() => handlePress(product)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${formatNPR(product.price)}`}
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
          <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={2}>{product.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
            <Text style={{ fontSize: 11, color: colors.gold }}>★</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>{product.rating}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>({product.reviewCount})</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] }}>
            {formatNPR(product.price)}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  ), [handlePress])

  if (isLoading) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={{ width: gridItemWidth }}>
            <ProductCardSkeleton />
          </View>
        ))}
      </View>
    )
  }

  if (isError) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: spacing[8], gap: spacing[3] }}>
        <Text style={{ fontSize: 32 }}>😕</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted }}>{t('common.error')}</Text>
        <TouchableOpacity onPress={refetch} style={{ backgroundColor: colors.primary, paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radii.lg }}>
          <Text style={{ color: colors.white, fontSize: 13, fontWeight: '600' }}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (allProducts.length === 0) {
    return (
      <EmptyState
        icon={<Text style={{ fontSize: 48 }}>🔍</Text>}
        title={t('home.noProducts')}
        subtitle={t('emptyState.noItemsSubtitle')}
      />
    )
  }

  return (
    <View>
      {/* View toggle */}
      <View style={{ flexDirection: 'row', gap: spacing[1], marginBottom: spacing[3] }}>
        <TouchableOpacity
          onPress={() => setViewMode('grid')}
          style={{
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[1.5],
            borderRadius: radii.full,
            backgroundColor: viewMode === 'grid' ? colors.primary : colors.surface,
            borderWidth: 1,
            borderColor: viewMode === 'grid' ? colors.primary : colors.border,
          }}
          activeOpacity={0.7}
          accessibilityLabel={t('home.gridView')}
          accessibilityState={{ selected: viewMode === 'grid' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: viewMode === 'grid' ? colors.white : colors.text }}>
            ⊞ {t('home.gridView')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('list')}
          style={{
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[1.5],
            borderRadius: radii.full,
            backgroundColor: viewMode === 'list' ? colors.primary : colors.surface,
            borderWidth: 1,
            borderColor: viewMode === 'list' ? colors.primary : colors.border,
          }}
          activeOpacity={0.7}
          accessibilityLabel={t('home.listView')}
          accessibilityState={{ selected: viewMode === 'list' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: viewMode === 'list' ? colors.white : colors.text }}>
            ☰ {t('home.listView')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Grid/List */}
      {viewMode === 'grid' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {allProducts.map((p, i) => renderGridItem(p, i))}
        </View>
      ) : (
        <View>
          {allProducts.map((p, i) => renderListItem(p, i))}
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
