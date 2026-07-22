import React, { memo, useCallback, useMemo } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import Animated, { FadeInRight } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useRecentlyViewedStore, useCartStore } from '@chinooz/state'
import { useProductsByIds, usePrefetchProduct } from '@chinooz/hooks'
import { duration } from '@chinooz/theme'
import { ProductCard, ProductCardSkeleton } from '@chinooz/ui'
import { SectionHeader } from './SectionHeader'
import type { Product } from '@chinooz/types'

function RecentlyViewedRailInner() {
  const { t } = useTranslation()
  const router = useRouter()
  const entries = useRecentlyViewedStore(s => s.entries)
  const addItem = useCartStore(s => s.addItem)
  const addViewed = useRecentlyViewedStore(s => s.addViewed)
  const prefetchProduct = usePrefetchProduct()

  const ids = useMemo(() => entries.slice(0, 10).map(e => e.productId), [entries])
  const { data: products, isLoading } = useProductsByIds(ids)

  const productList = useMemo(() => {
    if (!products) return []
    return ids
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => p !== undefined)
  }, [products, ids])

  const handlePress = useCallback((product: Product) => {
    addViewed(product.id)
    router.push({ pathname: '/product/[id]', params: { id: product.id } })
  }, [router, addViewed])

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

  if (!entries.length && !isLoading) return null

  if (isLoading) {
    return (
      <View>
        <SectionHeader title={t('home.recentlyViewed')} icon="time" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} variant="compact" />
          ))}
        </ScrollView>
      </View>
    )
  }

  if (!productList.length) return null

  return (
    <View>
      <SectionHeader
        title={t('home.recentlyViewed')}
        icon="time"
        actionLabel={t('common.seeAll')}
        onAction={() => router.push('/search?sort=recent')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {productList.map((product, i) => (
          <Animated.View
            key={product.id}
            entering={FadeInRight.duration(duration.normal).delay(Math.min(i, 7) * 40).springify().damping(18)}
          >
            <ProductCard
              product={product}
              variant="compact"
              onPress={handlePress}
              onAddToCart={handleAddToCart}
              onLongPress={handleLongPress}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 12,
    paddingRight: 16,
  },
})

export const RecentlyViewedRail = memo(RecentlyViewedRailInner)
export default RecentlyViewedRail
