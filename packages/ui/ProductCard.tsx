import React, { useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import type { ProductCardProps, Product } from '@chinooz/types'
import SafeImage from './SafeImage'
import Skeleton from './Skeleton'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={{ fontSize: size, color: i < Math.round(rating) ? colors.gold : colors.border }}>
          ★
        </Text>
      ))}
    </View>
  )
}

function StockBadge({ stock }: { stock: string }) {
  if (stock === 'in_stock') return null
  if (stock === 'low_stock') {
    return <Text style={styles.lowStockText}>Only a few left — order soon</Text>
  }
  return (
    <View style={styles.oosBadge}>
      <Text style={styles.oosBadgeText}>Out of stock</Text>
    </View>
  )
}

export default function ProductCard({
  product,
  variant = 'default',
  wishlisted = false,
  onPress,
  onToggleWishlist,
  onAddToCart,
  testID,
}: ProductCardProps) {
  const isCompact = variant === 'compact'
  const isOOS = product.stock === 'out_of_stock'
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price

  const cardScale = useSharedValue(1)
  const heartScale = useSharedValue(1)
  const cartScale = useSharedValue(1)

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }))

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }))

  const cartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cartScale.value }],
  }))

  const handlePressIn = useCallback(() => {
    cardScale.value = withSpring(0.97, { damping: 15, stiffness: 400 })
  }, [])

  const handlePressOut = useCallback(() => {
    cardScale.value = withSpring(1, { damping: 15, stiffness: 300 })
  }, [])

  const handleWishlist = useCallback(() => {
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 10, stiffness: 500 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    )
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    onToggleWishlist?.(product)
  }, [product, onToggleWishlist])

  const handleAddToCart = useCallback(() => {
    cartScale.value = withSequence(
      withSpring(1.15, { damping: 10, stiffness: 500 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    )
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
    onAddToCart?.(product)
  }, [product, onAddToCart])

  const imageUri = product.images?.[0]?.uri

  if (isCompact) {
    return (
      <AnimatedTouchable
        testID={testID}
        onPress={() => onPress?.(product)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={[styles.compactCard, cardStyle]}
        accessibilityLabel={product.name}
        accessibilityRole="button"
      >
        <View style={styles.compactImageWrap}>
          <SafeImage
            source={imageUri}
            style={[styles.compactImage, isOOS && styles.imageDimmed]}
            accessibilityLabel={product.name}
          />
          <StockBadge stock={product.stock} />
        </View>
        <View style={styles.compactBody}>
          <Text style={styles.compactTitle} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.price}>{formatNPR(product.price)}</Text>
        </View>
      </AnimatedTouchable>
    )
  }

  return (
    <AnimatedTouchable
      testID={testID}
      onPress={() => onPress?.(product)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      style={[styles.card, cardStyle]}
      accessibilityLabel={product.name}
      accessibilityRole="button"
    >
      <View style={styles.imageWrap}>
        <SafeImage
          source={imageUri}
          style={[styles.image, isOOS && styles.imageDimmed]}
          accessibilityLabel={product.name}
        />
        <StockBadge stock={product.stock} />
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              -{Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)}%
            </Text>
          </View>
        )}
        <AnimatedTouchable
          onPress={handleWishlist}
          style={[styles.heartButton, heartStyle]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          accessibilityRole="button"
        >
          <Text style={[styles.heartIcon, wishlisted && styles.heartIconActive]}>
            {wishlisted ? '♥' : '♡'}
          </Text>
        </AnimatedTouchable>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{product.name}</Text>

        <View style={styles.ratingRow}>
          <StarRating rating={product.rating} size={12} />
          <Text style={styles.reviewCount}>({product.reviewCount})</Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatNPR(product.price)}</Text>
          {hasDiscount && (
            <Text style={styles.comparePrice}>{formatNPR(product.compareAtPrice!)}</Text>
          )}
        </View>

        {product.stock === 'low_stock' && <StockBadge stock={product.stock} />}

        {!isOOS && (
          <AnimatedTouchable
            onPress={handleAddToCart}
            disabled={isOOS}
            style={[styles.cartButton, isOOS && styles.cartButtonDisabled, cartStyle]}
            activeOpacity={0.85}
            accessibilityLabel="Add to cart"
            accessibilityRole="button"
          >
            <Text style={styles.cartButtonText}>Add to Cart</Text>
          </AnimatedTouchable>
        )}
      </View>
    </AnimatedTouchable>
  )
}

export function ProductCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <View style={styles.compactCard}>
        <Skeleton width={140} height={140} borderRadius={radii.lg} />
        <View style={styles.compactBody}>
          <Skeleton width="80%" height={12} />
          <Skeleton width="50%" height={14} />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <Skeleton width="100%" height={180} borderRadius={0} />
      <View style={styles.body}>
        <Skeleton width="90%" height={14} />
        <Skeleton width="60%" height={12} />
        <Skeleton width="40%" height={16} />
        <Skeleton width="100%" height={40} borderRadius={radii.lg} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  compactCard: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.shimmer,
  },
  compactImageWrap: {
    position: 'relative',
    width: 160,
    height: 160,
  },
  compactImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.shimmer,
  },
  imageDimmed: {
    opacity: 0.5,
  },
  discountBadge: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    backgroundColor: colors.gold,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: radii.full,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  oosBadge: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: colors.textMuted,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  oosBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  heartButton: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  heartIconActive: {
    color: colors.error,
  },
  body: {
    padding: spacing[3],
    gap: spacing[1.5],
  },
  compactBody: {
    padding: spacing[2.5],
    gap: spacing[1],
  },
  title: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 20,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  reviewCount: {
    fontSize: 11,
    color: colors.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[2],
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  comparePrice: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  lowStockText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
  },
  cartButton: {
    backgroundColor: colors.primary,
    height: 40,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[1],
  },
  cartButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  cartButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
})
