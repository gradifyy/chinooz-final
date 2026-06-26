import React, { useCallback, useRef, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native'
import Animated, {
  FadeIn,
  FadeInRight,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { colors, spacing } from '@chinooz/theme'
import { useCartStore } from '@chinooz/state'
import { usePrefetchProduct } from '@chinooz/hooks'
import { ProductCard, ProductCardSkeleton } from '@chinooz/ui'
import type { Product } from '@chinooz/types'

const CARD_WIDTH = 160
const CARD_GAP = 12

interface ProductRailProps {
  titleKey: string
  seeAllHref: string
  products: Product[] | undefined
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
}

export default function ProductRail({
  titleKey,
  seeAllHref,
  products,
  isLoading,
  isError,
  onRetry,
}: ProductRailProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const addItem = useCartStore(s => s.addItem)
  const prefetchProduct = usePrefetchProduct()
  const scrollRef = useRef<ScrollView>(null)

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

  const handleSeeAll = useCallback(() => {
    router.push(seeAllHref as any)
  }, [router, seeAllHref])

  if (isLoading) {
    return (
      <View>
        <View style={styles.header}>
          <View style={styles.skeletonTitle} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} variant="compact" />
          ))}
        </ScrollView>
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  if (!products || products.length === 0) return null

  return (
    <View>
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <Text style={styles.title}>{t(titleKey)}</Text>
        <TouchableOpacity onPress={handleSeeAll} style={styles.seeAll} activeOpacity={0.7}>
          <Text style={styles.seeAllText}>{t('common.seeAll')}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_GAP}
        snapToAlignment="start"
        bounces={false}
      >
        {products.map((product, i) => (
          <Animated.View
            key={product.id}
            entering={FadeInRight.duration(250).delay(Math.min(i, 7) * 40).springify().damping(18)}
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

const styles = {
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: spacing[3],
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  skeletonTitle: {
    width: 120,
    height: 18,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  seeAll: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  chevron: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.primary,
    marginTop: 1,
  },
  scrollContent: {
    gap: CARD_GAP,
    paddingRight: 16,
  },
  center: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: spacing[8],
    gap: spacing[3],
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 12,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.white,
  },
}
