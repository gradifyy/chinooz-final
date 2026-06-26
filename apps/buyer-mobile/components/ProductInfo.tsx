import React, { useCallback, useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import type { Product } from '@chinooz/types'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

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

function DiscountBadge({ price, compare }: { price: number; compare: number }) {
  const scale = useSharedValue(1)

  useEffect(() => {
    const pulse = () => {
      scale.value = withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      )
    }
    pulse()
    const interval = setInterval(pulse, 2000)
    return () => clearInterval(interval)
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const pct = Math.round((1 - price / compare) * 100)

  return (
    <Animated.View style={[{
      backgroundColor: colors.gold,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.full,
    }, animStyle]}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.white }}>
        -{pct}%
      </Text>
    </Animated.View>
  )
}

interface ProductInfoProps {
  product: Product
  displayPrice: number
  displayCompare?: number
  wishlisted?: boolean
  onToggleWishlist?: () => void
  onPressReviews?: () => void
  onPressSeller?: () => void
}

export default function ProductInfo({
  product,
  displayPrice,
  displayCompare,
  wishlisted = false,
  onToggleWishlist,
  onPressReviews,
  onPressSeller,
}: ProductInfoProps) {
  const { t } = useTranslation()
  const heartScale = useSharedValue(1)
  const isOOS = product.stock === 'out_of_stock'
  const isLow = product.stock === 'low_stock'
  const hasDiscount = displayCompare && displayCompare > displayPrice

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }))

  const handleWishlist = useCallback(() => {
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 10, stiffness: 500 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    )
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    onToggleWishlist?.()
  }, [onToggleWishlist])

  return (
    <View style={{ padding: spacing[4], gap: spacing[3] }}>
      {/* Title row with wishlist */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: spacing[3] }}>
          <Text
            style={{ fontSize: 28, fontWeight: '700', color: colors.text, lineHeight: 34 }}
            numberOfLines={2}
          >
            {product.name}
          </Text>
        </View>
        <AnimatedTouchable
          onPress={handleWishlist}
          style={[{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: wishlisted ? colors.errorLight : colors.background,
            alignItems: 'center',
            justifyContent: 'center',
          }, heartStyle]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Text style={{ fontSize: 22, color: wishlisted ? colors.error : colors.textMuted }}>
            {wishlisted ? '♥' : '♡'}
          </Text>
        </AnimatedTouchable>
      </View>

      {/* Rating + Stock */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' }}>
        <TouchableOpacity
          onPress={onPressReviews}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}
          activeOpacity={0.7}
          accessibilityLabel={`${product.rating} stars, ${product.reviewCount} reviews, tap to see reviews`}
        >
          <StarRating rating={product.rating} size={16} />
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500' }}>
            {product.rating.toFixed(1)}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            ({product.reviewCount})
          </Text>
        </TouchableOpacity>

        {isOOS && (
          <View style={{ backgroundColor: colors.errorLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.error }}>{t('product.outOfStock')}</Text>
          </View>
        )}
        {isLow && (
          <View style={{ backgroundColor: colors.warningLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400E' }}>{t('product.onlyAFewLeft')}</Text>
          </View>
        )}
      </View>

      {/* Price */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[2] }}>
        <Text
          style={{ fontSize: 24, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}
          accessibilityLabel={`${formatNPR(displayPrice)}${hasDiscount ? `, was ${formatNPR(displayCompare!)}` : ''}`}
        >
          {formatNPR(displayPrice)}
        </Text>
        {hasDiscount && (
          <>
            <Text style={{ fontSize: 16, color: colors.textMuted, textDecorationLine: 'line-through' }}>
              {formatNPR(displayCompare!)}
            </Text>
            <DiscountBadge price={displayPrice} compare={displayCompare!} />
          </>
        )}
      </View>

      {/* Seller row */}
      <TouchableOpacity
        onPress={onPressSeller}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
          paddingVertical: spacing[2],
          paddingHorizontal: spacing[3],
          backgroundColor: colors.background,
          borderRadius: radii.lg,
        }}
        activeOpacity={0.7}
      >
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.primary50,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
            {product.sellerName.charAt(0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>
              {product.sellerName}
            </Text>
            <View style={{
              backgroundColor: colors.gold,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: radii.full,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
            }}>
              <Text style={{ fontSize: 9, color: colors.white, fontWeight: '700' }}>✓</Text>
              <Text style={{ fontSize: 9, color: colors.white, fontWeight: '600' }}>{t('product.verified')}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{t('product.soldBy')} seller</Text>
        </View>
        <Text style={{ fontSize: 16, color: colors.textTertiary }}>›</Text>
      </TouchableOpacity>
    </View>
  )
}
