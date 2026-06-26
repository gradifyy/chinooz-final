import React, { useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { useSimilarProducts, useRecommendedProducts, usePrefetchProduct } from '@chinooz/hooks'
import { useCartStore } from '@chinooz/state'
import { ProductCard, ProductCardSkeleton } from '@chinooz/ui'
import type { Product } from '@chinooz/types'

const CARD_WIDTH = 160
const CARD_GAP = 12

function RailSection({
  titleKey,
  seeAllHref,
  products,
  isLoading,
}: {
  titleKey: string
  seeAllHref: string
  products: Product[] | undefined
  isLoading?: boolean
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const addItem = useCartStore(s => s.addItem)
  const prefetchProduct = usePrefetchProduct()

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

  if (isLoading) {
    return (
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
          <View style={{ width: 140, height: 18, borderRadius: 6, backgroundColor: colors.border }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: CARD_GAP }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} variant="compact" />
          ))}
        </ScrollView>
      </View>
    )
  }

  if (!products || products.length === 0) return null

  return (
    <View>
      <Animated.View entering={FadeIn.duration(300)}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t(titleKey)}</Text>
          <TouchableOpacity
            onPress={() => router.push(seeAllHref as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>{t('common.seeAll')}</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary, marginTop: 1 }}>›</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: CARD_GAP }}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_GAP}
        snapToAlignment="start"
        bounces={false}
      >
        {products.map((product, i) => (
          <Animated.View
            key={product.id}
            entering={FadeInRight.duration(250).delay(Math.min(i, 9) * 40).springify().damping(18)}
          >
            <ProductCard
              product={product}
              variant="compact"
              onPress={handlePress}
              onAddToCart={handleAddToCart}
              onLongPress={(p) => prefetchProduct(p.id)}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  )
}

interface RelatedProductsProps {
  categoryId: string
  productId: string
}

export default function RelatedProducts({ categoryId, productId }: RelatedProductsProps) {
  const { t } = useTranslation()
  const similar = useSimilarProducts(categoryId, productId)
  const recommended = useRecommendedProducts()

  return (
    <View style={{ gap: spacing[6], paddingVertical: spacing[4] }}>
      <RailSection
        titleKey="product.similarItems"
        seeAllHref={`/search?category=${categoryId}`}
        products={similar.data}
        isLoading={similar.isLoading}
      />

      <RailSection
        titleKey="product.youMayAlsoLike"
        seeAllHref="/search?sort=recommended"
        products={recommended.data}
        isLoading={recommended.isLoading}
      />
    </View>
  )
}
