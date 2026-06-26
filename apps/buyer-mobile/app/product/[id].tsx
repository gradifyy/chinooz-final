import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { useProductById, useReviews, useProducts, usePrefetchProduct } from '@chinooz/hooks'
import { useCartStore } from '@chinooz/state'
import { Skeleton, ProductCard, QuantityStepper } from '@chinooz/ui'
import ImageGallery from '../../components/ImageGallery'
import ProductInfo from '../../components/ProductInfo'
import VariantSelector from '../../components/VariantSelector'
import Snackbar from '../../components/Snackbar'
import type { Product } from '@chinooz/types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const IMAGE_HEIGHT = SCREEN_WIDTH
const MAX_QTY = 10

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const scrollY = useSharedValue(0)
  const addItem = useCartStore(s => s.addItem)
  const removeItem = useCartStore(s => s.removeItem)
  const prefetchProduct = usePrefetchProduct()

  const { data: product, isLoading } = useProductById(id || '')
  const { data: reviews } = useReviews(id || '')
  const { data: related } = useProducts({ limit: 6 })

  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [imageIndex, setImageIndex] = useState(0)
  const [promptError, setPromptError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [snackVisible, setSnackVisible] = useState(false)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const cartScale = useSharedValue(1)
  const btnScale = useSharedValue(1)

  const activeVariant = product?.variants.find(v => v.id === selectedVariant)
  const displayPrice = activeVariant?.price ?? product?.price ?? 0
  const displayCompare = activeVariant?.compareAtPrice ?? product?.compareAtPrice
  const stockStatus = activeVariant?.stock ?? product?.stock ?? 'in_stock'
  const isOOS = stockStatus === 'out_of_stock'
  const needsVariant = product && product.variants.length > 0 && !selectedVariant
  const maxQty = Math.min(MAX_QTY, 10)

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
    if (needsVariant) {
      setPromptError(t('product.selectFirst', { variant: Object.keys(product.variants[0]?.attributes || {})[0] || 'option' }))
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning) } catch {}
      return
    }
    setPromptError(null)
    btnScale.value = withSequence(
      withSpring(0.97, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    )
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
    const itemId = `ci-${product.id}-${selectedVariant || 'default'}`
    setLastAddedId(itemId)
    addItem({
      id: itemId,
      productId: product.id,
      variantId: selectedVariant || undefined,
      name: activeVariant ? `${product.name} — ${activeVariant.name}` : product.name,
      image: product.images?.[0]?.uri ?? '',
      price: displayPrice,
      quantity,
      maxQuantity: maxQty,
    })
    setSnackVisible(true)
    setQuantity(1)
  }, [product, selectedVariant, activeVariant, displayPrice, quantity, addItem, needsVariant, t, maxQty])

  const handleBuyNow = useCallback(() => {
    if (!product) return
    if (needsVariant) {
      setPromptError(t('product.selectFirst', { variant: Object.keys(product.variants[0]?.attributes || {})[0] || 'option' }))
      return
    }
    setPromptError(null)
    const itemId = `ci-${product.id}-${selectedVariant || 'default'}`
    addItem({
      id: itemId,
      productId: product.id,
      variantId: selectedVariant || undefined,
      name: activeVariant ? `${product.name} — ${activeVariant.name}` : product.name,
      image: product.images?.[0]?.uri ?? '',
      price: displayPrice,
      quantity,
      maxQuantity: maxQty,
    })
    router.push('/cart')
  }, [product, selectedVariant, activeVariant, displayPrice, quantity, addItem, needsVariant, t, maxQty, router])

  const handleUndo = useCallback(() => {
    if (lastAddedId) {
      removeItem(lastAddedId)
      setLastAddedId(null)
    }
    setSnackVisible(false)
  }, [lastAddedId, removeItem])

  const handleRelatedPress = useCallback((p: Product) => {
    prefetchProduct(p.id)
    router.push({ pathname: '/product/[id]', params: { id: p.id } })
  }, [router, prefetchProduct])

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }))

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

      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        >
          <ImageGallery images={product.images} onIndexChange={setImageIndex} />

          <ProductInfo
            product={product}
            displayPrice={displayPrice}
            displayCompare={displayCompare}
            onPressReviews={() => {}}
            onPressSeller={() => {}}
          />

          {/* Variants */}
          {product.variants.length > 0 && (
            <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[4] }}>
              <VariantSelector
                variants={product.variants}
                selectedId={selectedVariant || product.variants[0]?.id}
                onSelect={(id) => { setSelectedVariant(id); setPromptError(null) }}
                promptError={promptError}
              />
            </View>
          )}

          {/* Description */}
          <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[4], gap: spacing[2] }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('product.description')}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}>{product.description}</Text>
          </View>

          {/* Reviews */}
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
      </GestureHandlerRootView>

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
          flexDirection: 'column',
          gap: spacing[2],
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        {/* Quantity + Price row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>{t('product.addToCart')}</Text>
            <Text
              style={{ fontSize: 20, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}
              accessibilityLabel={`${formatNPR(displayPrice)}, add to cart`}
            >
              {formatNPR(displayPrice * quantity)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <QuantityStepper
              value={quantity}
              min={1}
              max={maxQty}
              onChange={setQuantity}
              disabled={isOOS}
            />
            {quantity >= maxQty && (
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textMuted }}>{t('product.maxReached')}</Text>
            )}
          </View>
        </View>

        {/* Buttons row */}
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <AnimatedTouchable
            onPress={handleAddToCart}
            disabled={isOOS}
            style={[
              {
                flex: 1,
                backgroundColor: isOOS ? colors.border : colors.primary,
                paddingVertical: 13,
                borderRadius: radii.lg,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isOOS ? 0.5 : 1,
              },
              btnAnimStyle,
            ]}
            activeOpacity={0.85}
            accessibilityLabel={t('product.addToCart')}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white }}>{t('product.addToCart')}</Text>
          </AnimatedTouchable>
          <TouchableOpacity
            onPress={handleBuyNow}
            disabled={isOOS}
            style={{
              flex: 1,
              backgroundColor: isOOS ? colors.border : colors.gold,
              paddingVertical: 13,
              borderRadius: radii.lg,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isOOS ? 0.5 : 1,
            }}
            activeOpacity={0.85}
            accessibilityLabel={t('product.buyNow')}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white }}>{t('product.buyNow')}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Snackbar */}
      <Snackbar
        visible={snackVisible}
        message={t('product.addedToCart')}
        actionLabel={t('product.undo')}
        onAction={handleUndo}
        onDismiss={() => setSnackVisible(false)}
      />
    </View>
  )
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)
