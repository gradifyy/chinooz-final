import React, { useCallback, useMemo } from 'react'
import { View, Text, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native'
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useInfiniteProducts, usePrefetchProduct } from '@chinooz/hooks'
import { useCartStore } from '@chinooz/state'
import { colors, spacing, radii } from '@chinooz/theme'
import { ProductCard, ProductCardSkeleton } from '@chinooz/ui'
import type { Product } from '@chinooz/types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const EDGE_PADDING = 16
const GAP = 12

function getColumns() {
  const w = SCREEN_WIDTH - EDGE_PADDING * 2
  if (w < 640) return 2
  return 3
}

function getColumnWidth(columns: number) {
  return (SCREEN_WIDTH - EDGE_PADDING * 2 - GAP * (columns - 1)) / columns
}

export default function RecommendedGrid() {
  const { t } = useTranslation()
  const router = useRouter()
  const addItem = useCartStore(s => s.addItem)
  const prefetchProduct = usePrefetchProduct()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteProducts({ limit: 10 })

  const allProducts = useMemo(() => {
    if (!data) return []
    return data.pages.flatMap((page: { items: Product[] }) => page.items)
  }, [data])

  const columns = getColumns()
  const columnWidth = getColumnWidth(columns)

  const handlePress = useCallback((product: Product) => {
    router.push({ pathname: '/product/[id]', params: { id: product.id } })
  }, [router])

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

  const handleLongPress = useCallback((product: Product) => {
    prefetchProduct(product.id)
  }, [prefetchProduct])

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) {
    return (
      <View>
        <Text style={styles.title}>{t('home.recommended')}</Text>
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ width: columnWidth }}>
              <ProductCardSkeleton />
            </View>
          ))}
        </View>
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!allProducts.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{t('home.noProducts')}</Text>
      </View>
    )
  }

  return (
    <View>
      <Animated.View entering={FadeIn.duration(300)}>
        <Text style={styles.title}>{t('home.recommended')}</Text>
      </Animated.View>

      <View style={styles.grid}>
        {allProducts.map((product, i) => (
          <Animated.View
            key={product.id}
            entering={FadeInDown.duration(250).delay(Math.min(i, 9) * 50).springify().damping(18)}
            style={{ width: columnWidth }}
          >
            <ProductCard
              product={product}
              onPress={handlePress}
              onAddToCart={handleAddToCart}
              onLongPress={handleLongPress}
            />
          </Animated.View>
        ))}
      </View>

      {hasNextPage && (
        <TouchableOpacity
          onPress={handleEndReached}
          disabled={isFetchingNextPage}
          style={styles.loadMore}
          activeOpacity={0.7}
        >
          {isFetchingNextPage ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.loadMoreText}>{t('home.loadMore')}</Text>
          )}
        </TouchableOpacity>
      )}

      {isFetchingNextPage && (
        <View style={styles.grid}>
          {Array.from({ length: 2 }).map((_, i) => (
            <View key={`sk-${i}`} style={{ width: columnWidth }}>
              <ProductCardSkeleton />
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = {
  title: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing[3],
  },
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: GAP,
  },
  center: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: spacing[10],
    gap: spacing[3],
  },
  errorText: {
    fontSize: 15,
    color: colors.error,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.white,
  },
  loadMore: {
    alignItems: 'center' as const,
    paddingVertical: spacing[4],
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
}
