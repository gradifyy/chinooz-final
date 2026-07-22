import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { SafeImage } from '@chinooz/ui'
import { formatNPR } from '@chinooz/utils'
import { useWishlistStore, useUIStore } from '@chinooz/state'
import { colors as lightColors, spacing, fontSz, radii, springs } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import Icon from './Icon'
import { useAppTheme } from './ThemeProvider'
import type { Product } from '@chinooz/types'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

const RAIL_WIDTH = 150
const RAIL_IMAGE_HEIGHT = 132
// Reserve exactly two lines for the name so the price + footer line up across
// every card in a row regardless of how long the product name is.
const NAME_LINE_HEIGHT = 18
const NAME_HEIGHT = NAME_LINE_HEIGHT * 2

export interface HomeProductCardProps {
  product: Product
  layout?: 'rail' | 'grid'
  width?: number
  onPress?: (product: Product) => void
  onAddToCart?: (product: Product) => void
  onLongPress?: (product: Product) => void
}

/**
 * The canonical Home product card. Fixed-height name keeps every card aligned;
 * pressing zooms the image, the heart pops with a ring burst, the discount
 * badge sweeps a shine, and the quick-add button morphs +→✓ with haptics.
 */
function HomeProductCardInner({
  product,
  layout = 'grid',
  width,
  onPress,
  onAddToCart,
  onLongPress,
}: HomeProductCardProps) {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const reduced = useReducedMotion()
  const isRail = layout === 'rail'
  const { t } = useTranslation()
  const addToast = useUIStore(s => s.addToast)
  const wishlisted = useWishlistStore(s => s.entries.some(e => e.productId === product.id))
  const toggleWishlist = useWishlistStore(s => s.toggle)
  const [added, setAdded] = useState(false)
  const revertRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isOOS = product.stock === 'out_of_stock'
  const isLow = product.stock === 'low_stock'
  const hasDiscount = !!product.compareAtPrice && product.compareAtPrice > product.price
  const discountPct = hasDiscount
    ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
    : 0

  const cardScale = useSharedValue(1)
  const imageScale = useSharedValue(1)
  const heartScale = useSharedValue(1)
  const ring = useSharedValue(0)
  const addScale = useSharedValue(1)
  const shine = useSharedValue(0)

  useEffect(() => {
    if (reduced || !hasDiscount) return
    // Single shine sweep on mount — no perpetual loop (each card ran withRepeat
    // forever, saturating the UI thread with 20+ worklets on Home).
    shine.value = withDelay(
      Math.round(400 + Math.random() * 600),
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
    )
  }, [reduced, hasDiscount, shine])

  useEffect(() => () => { if (revertRef.current) clearTimeout(revertRef.current) }, [])

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }))
  const imageStyle = useAnimatedStyle(() => ({ transform: [{ scale: imageScale.value }] }))
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }))
  const addStyle = useAnimatedStyle(() => ({ transform: [{ scale: addScale.value }] }))
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value === 0 ? 0 : 1 - ring.value,
    transform: [{ scale: 0.5 + ring.value * 1.7 }],
  }))
  const shineStyle = useAnimatedStyle(() => ({
    opacity: shine.value < 0.5 ? shine.value * 1.2 : (1 - shine.value) * 1.2,
    transform: [{ translateX: -22 + shine.value * 70 }, { rotate: '20deg' }],
  }))

  const handlePressIn = useCallback(() => {
    cardScale.value = withSpring(0.97, springs.press)
    if (!reduced) imageScale.value = withTiming(1.07, { duration: 260, easing: Easing.out(Easing.cubic) })
  }, [cardScale, imageScale, reduced])

  const handlePressOut = useCallback(() => {
    cardScale.value = withSpring(1, springs.press)
    if (!reduced) imageScale.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })
  }, [cardScale, imageScale, reduced])

  const handleWishlist = useCallback(() => {
    const turningOn = !wishlisted
    heartScale.value = withSequence(
      withSpring(1.32, springs.pop),
      withSpring(1, springs.press),
    )
    if (turningOn && !reduced) {
      ring.value = 0
      ring.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    toggleWishlist(product.id)
    addToast({ message: turningOn ? t('home.savedToWishlist') : t('home.removedFromWishlist'), variant: 'success' })
  }, [wishlisted, heartScale, ring, reduced, toggleWishlist, product.id, addToast, t])

  const handleAdd = useCallback(() => {
    addScale.value = withSequence(
      withSpring(1.22, springs.pop),
      withSpring(1, springs.press),
    )
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    onAddToCart?.(product)
    addToast({ message: t('product.addedToCart'), variant: 'success' })
    setAdded(true)
    if (revertRef.current) clearTimeout(revertRef.current)
    revertRef.current = setTimeout(() => setAdded(false), 1300)
  }, [addScale, onAddToCart, product, addToast, t])

  const imageUri = product.images?.[0]?.uri

  return (
    <AnimatedTouchable
      onPress={() => onPress?.(product)}
      onLongPress={() => onLongPress?.(product)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.92}
      delayLongPress={400}
      style={[isRail ? { width: width ?? RAIL_WIDTH } : { width: width ?? '100%' }, cardStyle]}
      accessibilityRole="button"
      accessibilityLabel={product.name}
    >
      <View style={[styles.imageWrap, isRail ? { height: RAIL_IMAGE_HEIGHT } : styles.gridImage]}>
        <Animated.View style={[StyleSheet.absoluteFill, imageStyle]}>
          <SafeImage
            source={imageUri}
            style={[styles.image, isOOS && styles.imageDimmed]}
            accessibilityLabel={product.name}
          />
        </Animated.View>

        {hasDiscount && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>-{discountPct}%</Text>
            <Animated.View style={[styles.shine, shineStyle]} pointerEvents="none" />
          </View>
        )}

        {isLow && !isOOS && (
          <View style={styles.sellingFast}>
            <Icon name="flame" size={10} color={colors.white} />
            <Text style={styles.sellingFastText}>Selling fast</Text>
          </View>
        )}

        <Animated.View style={[styles.ring, ringStyle]} pointerEvents="none" />
        <AnimatedTouchable
          onPress={handleWishlist}
          style={[styles.heart, heartStyle]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={wishlisted ? t('a11y.wishlistRemove') : t('a11y.wishlistAdd')}
        >
          <Icon name={wishlisted ? 'heart' : 'heart-outline'} size={15} color={colors.primary} />
        </AnimatedTouchable>
      </View>

      <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatNPR(product.price)}</Text>
        {hasDiscount && <Text style={styles.original}>{formatNPR(product.compareAtPrice!)}</Text>}
      </View>

      <View style={styles.footer}>
        <View style={styles.rating}>
          <Icon name="star" size={10} color={colors.gold} />
          <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
        </View>
        {!isOOS && (
          <AnimatedTouchable
            onPress={handleAdd}
            style={[styles.add, added && styles.addDone, addStyle]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={`Add ${product.name} to cart`}
          >
            <Icon name={added ? 'checkmark' : 'add'} size={added ? 17 : 19} color={colors.white} />
          </AnimatedTouchable>
        )}
      </View>
    </AnimatedTouchable>
  )
}

const makeStyles = (c: typeof lightColors) => StyleSheet.create({
  imageWrap: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: c.primary50,
  },
  gridImage: {
    aspectRatio: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: c.shimmer,
  },
  imageDimmed: {
    opacity: 0.5,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: c.gold,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  badgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: fontSz('2xs')[0],
    fontWeight: '800',
    color: c.plumInk,
  },
  shine: {
    position: 'absolute',
    top: -6,
    bottom: -6,
    width: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  sellingFast: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(58,10,34,0.82)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  sellingFastText: {
    fontFamily: 'Inter-Bold',
    fontSize: fontSz('2xs')[0],
    fontWeight: '700',
    color: c.white,
  },
  ring: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: c.gold,
  },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: spacing[2],
    height: NAME_HEIGHT,
    fontFamily: 'Inter-SemiBold',
    fontSize: fontSz('sm')[0],
    fontWeight: '600',
    color: c.text,
    lineHeight: NAME_LINE_HEIGHT,
  },
  priceRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    minHeight: 20,
  },
  price: {
    fontFamily: 'Inter-Bold',
    fontSize: fontSz('md')[0],
    fontWeight: '800',
    color: c.text,
    fontVariant: ['tabular-nums'],
  },
  original: {
    fontFamily: 'Inter',
    fontSize: fontSz('xs')[0],
    color: c.textTertiary,
    textDecorationLine: 'line-through',
  },
  footer: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  star: {
    fontSize: fontSz('xs')[0],
    color: c.gold,
  },
  ratingText: {
    fontFamily: 'Inter-Bold',
    fontSize: fontSz('xs')[0],
    fontWeight: '700',
    color: c.textSecondary,
  },
  add: {
    width: 30,
    height: 30,
    borderRadius: radii.md,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  addDone: {
    backgroundColor: c.success,
  },
})

export const HomeProductCard = memo(HomeProductCardInner)
export default HomeProductCard
