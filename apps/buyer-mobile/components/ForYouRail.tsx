import React, { memo, useCallback } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import Animated, { FadeInRight } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useRecommendedProducts, usePrefetchProduct } from '@chinooz/hooks'
import { useCartStore, useRecentlyViewedStore } from '@chinooz/state'
import { duration } from '@chinooz/theme'
import { ProductCard, ProductCardSkeleton } from '@chinooz/ui'
import { SectionHeader } from './SectionHeader'
import type { Product } from '@chinooz/types'

function ForYouRailInner() {
  const { t } = useTranslation()
  const router = useRouter()
  const { data: products, isLoading } = useRecommendedProducts()
  const addItem = useCartStore(s => s.addItem)
  const addViewed = useRecentlyViewedStore(s => s.addViewed)
  const prefetchProduct = usePrefetchProduct()

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

  if (isLoading) {
    return (
      <View>
        <SectionHeader title={t('home.forYou')} icon="person" subtitle={t('home.forYouSubtitle')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} variant="compact" />
          ))}
        </ScrollView>
      </View>
    )
  }

  if (!products || products.length === 0) return null

  const displayProducts = products.slice(0, 10)

  return (
    <View style={styles.container}>
      <SectionHeader
        title={t('home.forYou')}
        icon="person"
        subtitle={t('home.forYouSubtitle')}
        actionLabel={t('common.seeAll')}
        onAction={() => router.push('/search?sort=recommended')}
        accent
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {displayProducts.map((product, i) => (
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
  container: {
    borderRadius: 16,
    paddingVertical: 4,
  },
  scrollContent: {
    gap: 12,
    paddingRight: 16,
  },
})

export const ForYouRail = memo(ForYouRailInner)
export default ForYouRail
