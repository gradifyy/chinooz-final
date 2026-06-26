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
import { useProductById, useReviews, usePrefetchProduct } from '@chinooz/hooks'
import { useCartStore } from '@chinooz/state'
import { Skeleton, ProductCard, QuantityStepper, EmptyState } from '@chinooz/ui'
import ImageGallery from '../../components/ImageGallery'
import ProductInfo from '../../components/ProductInfo'
import VariantSelector from '../../components/VariantSelector'
import Accordion from '../../components/Accordion'
import DescriptionSection from '../../components/DescriptionSection'
import SpecsTable from '../../components/SpecsTable'
import DeliverySection from '../../components/DeliverySection'
import ReviewsSection from '../../components/ReviewsSection'
import WriteReviewSheet from '../../components/WriteReviewSheet'
import RelatedProducts from '../../components/RelatedProducts'
import ProductDetailSkeleton from '../../components/ProductDetailSkeleton'
import OfflineBanner from '../../components/OfflineBanner'
import Snackbar from '../../components/Snackbar'

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

  const { data: product, isLoading, isError } = useProductById(id || '')
  const { data: reviews } = useReviews(id || '')

  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [imageIndex, setImageIndex] = useState(0)
  const [promptError, setPromptError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [snackVisible, setSnackVisible] = useState(false)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const [writeReviewVisible, setWriteReviewVisible] = useState(false)
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

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }))

  if (isLoading) {
    return <ProductDetailSkeleton />
  }

  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <OfflineBanner />
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>😕</Text>}
          title={t('common.error')}
          subtitle="Something went wrong loading this product."
          action={{ label: t('common.retry'), onPress: () => router.replace({ pathname: '/product/[id]', params: { id: id || '' } }) }}
        />
      </View>
    )
  }

  if (!product) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>📭</Text>}
          title={t('product.productUnavailable')}
          subtitle={t('product.productUnavailableSubtitle')}
          action={{ label: t('product.browseSimilar'), onPress: () => router.push('/search') }}
        />
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          style={{ alignItems: 'center', paddingVertical: spacing[3] }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{t('product.backToHome')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBanner />
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
          <Accordion title={t('product.description')} defaultOpen>
            <DescriptionSection description={product.description} />
          </Accordion>

          {/* Specifications */}
          <Accordion title={t('product.specifications')}>
            <SpecsTable product={product} />
          </Accordion>

          {/* Delivery & Returns */}
          <Accordion title={t('product.delivery')}>
            <DeliverySection sellerName={product.sellerName} stock={product.stock} />
          </Accordion>

          {/* Reviews */}
          <ReviewsSection
            reviews={reviews}
            onWriteReview={() => setWriteReviewVisible(true)}
          />

          {/* Write Review Sheet */}
          <WriteReviewSheet
            visible={writeReviewVisible}
            productId={product.id}
            onClose={() => setWriteReviewVisible(false)}
            onSuccess={() => {}}
          />

          {/* Related Products */}
          <RelatedProducts categoryId={product.categoryId} productId={product.id} />
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
