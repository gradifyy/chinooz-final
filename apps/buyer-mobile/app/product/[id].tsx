import React, { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native'
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
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { spacing, radii, fontSz, duration, springs } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { useProductById, useReviews } from '@chinooz/hooks'
import {
  useCartStore,
  useRecentlyViewedStore,
  useWishlistStore,
  useUIStore,
  useCheckoutStore,
} from '@chinooz/state'
import { QuantityStepper, EmptyState, Button } from '@chinooz/ui'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { useAppTheme } from '../../components/ThemeProvider'
import Icon from '../../components/Icon'
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
import ProductQA from '../../components/ProductQA'
import FrequentlyBoughtTogether from '../../components/FrequentlyBoughtTogether'
import ProductDetailSkeleton from '../../components/ProductDetailSkeleton'
import SectionReveal from '../../components/SectionReveal'
import OfflineBanner from '../../components/OfflineBanner'
import Snackbar from '../../components/Snackbar'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const IMAGE_HEIGHT = SCREEN_WIDTH
const MAX_QTY = 10

export default function ProductDetailScreen() {
  const { colors } = useAppTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const scrollY = useSharedValue(0)
  const addItem = useCartStore(s => s.addItem)
  const removeItem = useCartStore(s => s.removeItem)
  const wished = useWishlistStore(s => s.entries.some(e => e.productId === (id || '')))
  const toggleWishlist = useWishlistStore(s => s.toggle)
  const addToast = useUIStore(s => s.addToast)
  const setSelectedIds = useCheckoutStore(s => s.setSelectedIds)
  const setCheckoutStep = useCheckoutStore(s => s.setStep)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scrollRef = useRef<any>(null)
  const reviewsY = useRef(0)

  const { data: product, isLoading, isError } = useProductById(id || '')
  const { data: reviews } = useReviews(id || '')
  const addViewed = useRecentlyViewedStore(s => s.addViewed)

  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [, setImageIndex] = useState(0)
  const [promptError, setPromptError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [snackVisible, setSnackVisible] = useState(false)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const [writeReviewVisible, setWriteReviewVisible] = useState(false)
  const heartScale = useSharedValue(1)
  const stickyBarY = useSharedValue(100)
  const reduced = useReducedMotion()
  const heroScale = useSharedValue(reduced ? 1 : 0.92)
  const heroOpacity = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    if (id) addViewed(id)
  }, [id, addViewed])

  // Default to the first variant once the product loads so the highlighted option
  // matches the actually-selected one (and the variant's price is shown, not base).
  useEffect(() => {
    if (product && product.variants.length > 0 && !selectedVariant) {
      setSelectedVariant(product.variants[0].id)
    }
  }, [product, selectedVariant])

  useEffect(() => {
    stickyBarY.value = withSpring(0, {
      damping: reduced ? 100 : 20,
      stiffness: reduced ? 1000 : 300,
      mass: 0.8,
    })
    if (!reduced) {
      heroScale.value = withTiming(1, { duration: duration.slow, easing: Easing.out(Easing.cubic) })
      heroOpacity.value = withTiming(1, { duration: duration.normal })
    }
  }, [heroOpacity, heroScale, reduced, stickyBarY])

  const activeVariant = product?.variants.find(v => v.id === selectedVariant)
  const displayPrice = activeVariant?.price ?? product?.price ?? 0
  const displayCompare = activeVariant?.compareAtPrice ?? product?.compareAtPrice
  const stockStatus = activeVariant?.stock ?? product?.stock ?? 'in_stock'
  const isOOS = stockStatus === 'out_of_stock'
  const needsVariant = product && product.variants.length > 0 && !selectedVariant
  const maxQty = Math.min(MAX_QTY, 10)

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y
    },
  })

  const headerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, IMAGE_HEIGHT - 60], [0, 1], Extrapolation.CLAMP)
    const shadow = interpolate(
      scrollY.value,
      [0, IMAGE_HEIGHT - 60],
      [0, 0.08],
      Extrapolation.CLAMP,
    )
    return {
      // Semi-transparent surface scrim (theme surface hex + alpha via progress)
      backgroundColor: colors.surface,
      // When not scrolled, keep chrome buttons readable via solid icon pills;
      // full-bleed bar opacity is applied only through elevation/shadow.
      borderBottomWidth: opacity > 0.85 ? StyleSheet.hairlineWidth : 0,
      borderBottomColor: colors.border,
      opacity: 1,
      shadowOpacity: shadow,
      shadowRadius: 8,
      elevation: shadow > 0 ? 3 : 0,
    }
  })

  const handleAddToCart = useCallback(() => {
    if (!product) return
    if (needsVariant) {
      setPromptError(
        t('product.selectFirst', {
          variant: Object.keys(product.variants[0]?.attributes || {})[0] || 'option',
        }),
      )
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
      return
    }
    setPromptError(null)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
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
  }, [
    product,
    selectedVariant,
    activeVariant,
    displayPrice,
    quantity,
    addItem,
    needsVariant,
    t,
    maxQty,
  ])

  const handleBuyNow = useCallback(() => {
    if (!product) return
    if (needsVariant) {
      setPromptError(
        t('product.selectFirst', {
          variant: Object.keys(product.variants[0]?.attributes || {})[0] || 'option',
        }),
      )
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
      return
    }
    setPromptError(null)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
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
    // Buy Now → express checkout for just this item (not the whole cart).
    setSelectedIds([itemId])
    setCheckoutStep('address')
    router.push('/checkout')
  }, [
    product,
    selectedVariant,
    activeVariant,
    displayPrice,
    quantity,
    addItem,
    needsVariant,
    t,
    maxQty,
    router,
    setSelectedIds,
    setCheckoutStep,
  ])

  const handleUndo = useCallback(() => {
    if (lastAddedId) {
      removeItem(lastAddedId)
      setLastAddedId(null)
    }
    setSnackVisible(false)
  }, [lastAddedId, removeItem])

  const handleWishlist = useCallback(() => {
    if (!product) return
    const turningOn = !wished
    if (!reduced) {
      heartScale.value = withSequence(withSpring(1.3, springs.pop), withSpring(1, springs.press))
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    toggleWishlist(product.id)
    addToast({
      message: turningOn ? t('home.savedToWishlist') : t('home.removedFromWishlist'),
      variant: 'success',
    })
  }, [product, wished, reduced, heartScale, toggleWishlist, addToast, t])

  const handleScrollToReviews = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, reviewsY.current - 60), animated: !reduced })
  }, [reduced])

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }))

  const stickyBarStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: stickyBarY.value }],
  }))

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
    opacity: heroOpacity.value,
  }))

  if (isLoading) {
    return <ProductDetailSkeleton />
  }

  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <OfflineBanner />
        <EmptyState
          icon={<Icon name="sad-outline" size={48} color={colors.textMuted} />}
          title={t('common.error')}
          subtitle={t('product.errorLoading')}
          action={{
            label: t('common.retry'),
            onPress: () => router.replace({ pathname: '/product/[id]', params: { id: id || '' } }),
          }}
        />
      </View>
    )
  }

  if (!product) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <EmptyState
          icon={<Icon name="file-tray-outline" size={48} color={colors.textMuted} />}
          title={t('product.productUnavailable')}
          subtitle={t('product.productUnavailableSubtitle')}
          action={{ label: t('product.browseSimilar'), onPress: () => router.push('/search') }}
        />
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          style={{ alignItems: 'center', paddingVertical: spacing[3] }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: fontSz('base')[0], fontWeight: '600', color: colors.primary }}>
            {t('product.backToHome')}
          </Text>
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
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: 44,
            height: 44,
            borderRadius: radii['2xl'],
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          <Icon name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <AnimatedTouchable
            onPress={handleWishlist}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              {
                width: 44,
                height: 44,
                borderRadius: radii['2xl'],
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              },
              heartStyle,
            ]}
            accessibilityLabel={wished ? t('a11y.wishlistRemove') : t('a11y.wishlistAdd')}
            accessibilityRole="button"
          >
            <Icon
              name={wished ? 'heart' : 'heart-outline'}
              size={19}
              color={wished ? colors.primary : colors.text}
            />
          </AnimatedTouchable>
          <TouchableOpacity
            onPress={() => router.push('/search')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 44,
              height: 44,
              borderRadius: radii['2xl'],
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel={t('common.search')}
            accessibilityRole="button"
          >
            <Icon name="search" size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/cart')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 44,
              height: 44,
              borderRadius: radii['2xl'],
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel={t('nav.cart')}
            accessibilityRole="button"
          >
            <Icon name="cart" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        <Animated.View style={heroStyle}>
          <ImageGallery images={product.images} onIndexChange={setImageIndex} />
        </Animated.View>

        <SectionReveal delay={0}>
          <ProductInfo
            product={product}
            displayPrice={displayPrice}
            displayCompare={displayCompare}
            onPressReviews={handleScrollToReviews}
            onPressSeller={() =>
              router.push({ pathname: '/seller/[id]', params: { id: product.sellerId } })
            }
          />
        </SectionReveal>

        {/* Variants */}
        {product.variants.length > 0 && (
          <SectionReveal delay={50}>
            <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[4] }}>
              <VariantSelector
                variants={product.variants}
                selectedId={selectedVariant || product.variants[0]?.id}
                onSelect={id => {
                  setSelectedVariant(id)
                  setPromptError(null)
                }}
                promptError={promptError}
              />
            </View>
          </SectionReveal>
        )}

        {/* Description */}
        <SectionReveal delay={100}>
          <Accordion title={t('product.description')} defaultOpen>
            <DescriptionSection description={product.description} />
          </Accordion>
        </SectionReveal>

        {/* Specifications */}
        <SectionReveal delay={120}>
          <Accordion title={t('product.specifications')}>
            <SpecsTable product={product} />
          </Accordion>
        </SectionReveal>

        {/* Delivery & Returns */}
        <SectionReveal delay={140}>
          <View style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2] }}>
            <DeliverySection stock={product.stock} />
          </View>
        </SectionReveal>

        {/* Reviews */}
        <View
          onLayout={e => {
            reviewsY.current = e.nativeEvent.layout.y
          }}
        >
          <SectionReveal delay={160}>
            <ReviewsSection reviews={reviews} onWriteReview={() => setWriteReviewVisible(true)} />
          </SectionReveal>
        </View>

        {/* Write Review Sheet */}
        <WriteReviewSheet
          visible={writeReviewVisible}
          productId={product.id}
          onClose={() => setWriteReviewVisible(false)}
          onSuccess={() => {}}
        />

        {/* Product Q&A */}
        <SectionReveal delay={170}>
          <ProductQA productId={product.id} />
        </SectionReveal>

        {/* Frequently bought together */}
        <SectionReveal delay={175}>
          <FrequentlyBoughtTogether productId={product.id} />
        </SectionReveal>

        {/* Related Products */}
        <SectionReveal delay={180}>
          <RelatedProducts categoryId={product.categoryId} productId={product.id} />
        </SectionReveal>
      </Animated.ScrollView>

      {/* Sticky Bottom Bar */}
      <Animated.View
        style={[
          {
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
          },
          stickyBarStyle,
        ]}
      >
        {/* Quantity + Price row */}
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View>
            <Text
              style={{
                fontSize: fontSz('xl')[0],
                fontWeight: '700',
                color: colors.text,
                fontVariant: ['tabular-nums'],
              }}
              accessibilityLabel={formatNPR(displayPrice * quantity)}
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
              <Text
                style={{ fontSize: fontSz('sm')[0], fontWeight: '500', color: colors.textMuted }}
              >
                {t('product.maxReached')}
              </Text>
            )}
          </View>
        </View>

        {/* Buttons row — shared Button so both CTAs share press physics + haptics */}
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              haptic="medium"
              disabled={isOOS}
              onPress={handleAddToCart}
              accessibilityLabel={t('product.addToCart')}
            >
              {t('product.addToCart')}
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              haptic="medium"
              disabled={isOOS}
              onPress={handleBuyNow}
              accessibilityLabel={t('product.buyNow')}
            >
              {t('product.buyNow')}
            </Button>
          </View>
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
