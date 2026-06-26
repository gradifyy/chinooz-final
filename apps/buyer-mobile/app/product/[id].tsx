import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withSpring,
  withSequence,
} from 'react-native-reanimated'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { useProductById, useReviews, useProducts, usePrefetchProduct } from '@chinooz/hooks'
import { useCartStore } from '@chinooz/state'
import { Skeleton, ProductCard } from '@chinooz/ui'
import type { Product } from '@chinooz/types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const IMAGE_HEIGHT = SCREEN_WIDTH

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={{ fontSize: size, color: i < Math.round(rating) ? colors.gold : colors.border }}>
          ★
        </Text>
      ))}
    </View>
  )
}

function StockBadge({ stock }: { stock: string }) {
  const { t } = useTranslation()
  if (stock === 'in_stock') return null
  if (stock === 'low_stock') {
    return (
      <View style={{ backgroundColor: colors.warningLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400E' }}>{t('product.onlyAFewLeft')}</Text>
      </View>
    )
  }
  return (
    <View style={{ backgroundColor: colors.errorLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.error }}>{t('product.outOfStock')}</Text>
    </View>
  )
}

function VariantSelector({ variants, selectedId, onSelect }: { variants: any[]; selectedId: string; onSelect: (id: string) => void }) {
  const { t } = useTranslation()
  if (!variants.length) return null
  return (
    <View style={{ gap: spacing[2] }}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{t('product.selectVariant')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {variants.map(v => {
          const active = v.id === selectedId
          return (
            <TouchableOpacity
              key={v.id}
              onPress={() => onSelect(v.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: radii.full,
                borderWidth: 1.5,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primary50 : colors.surface,
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13, fontWeight: active ? '600' : '400', color: active ? colors.primary : colors.text }}>
                {v.name}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const scrollY = useSharedValue(0)
  const addItem = useCartStore(s => s.addItem)
  const prefetchProduct = usePrefetchProduct()

  const { data: product, isLoading } = useProductById(id || '')
  const { data: reviews } = useReviews(id || '')
  const { data: related } = useProducts({ limit: 6 })

  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [imageIndex, setImageIndex] = useState(0)
  const cartScale = useSharedValue(1)

  const activeVariant = product?.variants.find(v => v.id === selectedVariant)
  const displayPrice = activeVariant?.price ?? product?.price ?? 0
  const displayCompare = activeVariant?.compareAtPrice ?? product?.compareAtPrice
  const isOOS = product?.stock === 'out_of_stock'

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y
    },
  })

  const headerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, IMAGE_HEIGHT - 60], [0, 1], Extrapolation.CLAMP)
    const shadow = interpolate(scrollY.value, [0, IMAGE_HEIGHT - 60], [0, 0.08], Extrapolation.CLAMP)
    return {
      backgroundColor: `rgba(255,255,255,${opacity})`,
      shadowOpacity: shadow,
      shadowRadius: 8,
      elevation: shadow > 0 ? 3 : 0,
    }
  })

  const handleAddToCart = useCallback(() => {
    if (!product) return
    cartScale.value = withSequence(
      withSpring(1.1, { damping: 12, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    )
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
    addItem({
      id: `ci-${product.id}-${selectedVariant || 'default'}`,
      productId: product.id,
      variantId: selectedVariant || undefined,
      name: activeVariant ? `${product.name} — ${activeVariant.name}` : product.name,
      image: product.images?.[0]?.uri ?? '',
      price: displayPrice,
      quantity: 1,
      maxQuantity: 10,
    })
  }, [product, selectedVariant, activeVariant, displayPrice, addItem])

  const handleBuyNow = useCallback(() => {
    handleAddToCart()
    router.push('/cart')
  }, [handleAddToCart, router])

  const handleRelatedPress = useCallback((p: Product) => {
    prefetchProduct(p.id)
    router.push({ pathname: '/product/[id]', params: { id: p.id } })
  }, [router, prefetchProduct])

  if (isLoading || !product) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <Skeleton width="100%" height={IMAGE_HEIGHT} borderRadius={0} />
        <View style={{ padding: spacing[4], gap: spacing[3] }}>
          <Skeleton width="80%" height={22} />
          <Skeleton width="40%" height={16} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="60%" height={14} />
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Translucent App Bar */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            paddingTop: insets.top,
            paddingHorizontal: spacing[4],
            paddingBottom: spacing[2],
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
          headerStyle,
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel="Go back"
        >
          <Text style={{ fontSize: 18, color: colors.text }}>←</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => router.push('/search')}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Search"
          >
            <Text style={{ fontSize: 16 }}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/cart')}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Cart"
          >
            <Text style={{ fontSize: 16 }}>🛒</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Image Gallery */}
        <View style={{ width: SCREEN_WIDTH, height: IMAGE_HEIGHT, backgroundColor: colors.shimmer }}>
          <FlatList
            data={product.images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
              setImageIndex(idx)
            }}
            keyExtractor={(item, i) => i.toString()}
            renderItem={({ item, index }) => (
              <View style={{ width: SCREEN_WIDTH, height: IMAGE_HEIGHT }}>
                <View style={{ flex: 1, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 48 }}>📦</Text>
                </View>
              </View>
            )}
          />
          {product.images.length > 1 && (
            <View style={{ position: 'absolute', bottom: 12, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full }}>
              <Text style={{ color: colors.white, fontSize: 12, fontWeight: '500' }}>
                {t('product.imageCount', { current: imageIndex + 1, total: product.images.length })}
              </Text>
            </View>
          )}
        </View>

        {/* Info Block */}
        <View style={{ padding: spacing[4], gap: spacing[3] }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{product.name}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <StarRating rating={product.rating} size={16} />
            <Text style={{ fontSize: 13, color: colors.textMuted }}>({product.reviewCount})</Text>
            <StockBadge stock={product.stock} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[2] }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>
              {formatNPR(displayPrice)}
            </Text>
            {displayCompare && displayCompare > displayPrice && (
              <>
                <Text style={{ fontSize: 16, color: colors.textMuted, textDecorationLine: 'line-through' }}>
                  {formatNPR(displayCompare)}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.success }}>
                  {Math.round((1 - displayPrice / displayCompare) * 100)}% OFF
                </Text>
              </>
            )}
          </View>

          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            {t('product.soldBy')} <Text style={{ fontWeight: '600', color: colors.text }}>{product.sellerName}</Text>
          </Text>

          {/* Tags */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {product.tags.map(tag => (
              <View key={tag} style={{ backgroundColor: colors.primary50, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Variants */}
        {product.variants.length > 0 && (
          <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[4] }}>
            <VariantSelector
              variants={product.variants}
              selectedId={selectedVariant || product.variants[0]?.id}
              onSelect={setSelectedVariant}
            />
          </View>
        )}

        {/* Description */}
        <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[4], gap: spacing[2] }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('product.description')}</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}>{product.description}</Text>
        </View>

        {/* Reviews placeholder */}
        <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[4], gap: spacing[3] }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
            {t('product.reviews')} ({product.reviewCount})
          </Text>
          {reviews && reviews.length > 0 ? (
            reviews.slice(0, 3).map(review => (
              <View key={review.id} style={{ gap: spacing[2], paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                      {review.userName.split(' ').map(s => s[0]).join('').slice(0, 2)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{review.userName}</Text>
                    <StarRating rating={review.rating} size={10} />
                  </View>
                </View>
                {review.title && <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{review.title}</Text>}
                <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>{review.body}</Text>
              </View>
            ))
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing[6], gap: spacing[2] }}>
              <Text style={{ fontSize: 32 }}>💬</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{t('product.noReviews')}</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>{t('product.noReviewsSubtitle')}</Text>
            </View>
          )}
        </View>

        {/* Related Products */}
        {related && related.items.length > 0 && (
          <View style={{ paddingVertical: spacing[4], gap: spacing[3] }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, paddingHorizontal: spacing[4] }}>
              {t('product.relatedProducts')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: spacing[4] }}>
              {related.items.map(p => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => handleRelatedPress(p)}
                  style={{ width: 160 }}
                  activeOpacity={0.9}
                >
                  <View style={{ backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden' }}>
                    <View style={{ width: 160, height: 160, backgroundColor: colors.border }} />
                    <View style={{ padding: 10, gap: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }} numberOfLines={1}>{p.name}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{formatNPR(p.price)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </Animated.ScrollView>

      {/* Sticky Bottom Bar */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: spacing[4],
          paddingTop: spacing[3],
          paddingBottom: insets.bottom + spacing[3],
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>{t('product.addToCart')}</Text>
          <Text
            style={{ fontSize: 20, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}
            accessibilityLabel={`${formatNPR(displayPrice)}, add to cart`}
          >
            {formatNPR(displayPrice)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleAddToCart}
          disabled={isOOS}
          style={{
            backgroundColor: isOOS ? colors.border : colors.primary,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: radii.lg,
            opacity: isOOS ? 0.5 : 1,
          }}
          activeOpacity={0.85}
          accessibilityLabel={t('product.addToCart')}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.white }}>{t('product.addToCart')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleBuyNow}
          disabled={isOOS}
          style={{
            backgroundColor: isOOS ? colors.border : colors.gold,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: radii.lg,
            opacity: isOOS ? 0.5 : 1,
          }}
          activeOpacity={0.85}
          accessibilityLabel={t('product.buyNow')}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.white }}>{t('product.buyNow')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}
