import React, { useState, useCallback, memo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  FadeOut,
  SlideOutLeft,
  Layout,
} from 'react-native-reanimated'
import { Swipeable } from 'react-native-gesture-handler'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import SafeImage from './SafeImage'
import QuantityStepper from './QuantityStepper'
import type { CartItem as CartItemType, StockStatus } from '@chinooz/types'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

interface CartItemProps {
  item: CartItemType
  selected?: boolean
  stock?: StockStatus
  originalPrice?: number
  onQuantityChange?: (id: string, quantity: number) => void
  onRemove?: (id: string) => void
  onSaveForLater?: (id: string) => void
  onSelect?: (id: string) => void
}

const CartItem = memo(function CartItem({
  item,
  selected = true,
  stock = 'in_stock',
  originalPrice,
  onQuantityChange,
  onRemove,
  onSaveForLater,
  onSelect,
}: CartItemProps) {
  const { t } = useTranslation()
  const lineTotal = item.price * item.quantity
  const isOOS = stock === 'out_of_stock'
  const isLow = stock === 'low_stock'
  const priceChanged = originalPrice && originalPrice !== item.price

  const cardScale = useSharedValue(1)
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }))

  const handlePressIn = useCallback(() => {
    cardScale.value = withSpring(0.98, { damping: 15, stiffness: 400 })
  }, [])

  const handlePressOut = useCallback(() => {
    cardScale.value = withSpring(1, { damping: 15, stiffness: 300 })
  }, [])

  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      {onSaveForLater && (
        <TouchableOpacity
          onPress={() => onSaveForLater(item.id)}
          style={[styles.swipeAction, styles.swipeActionSave]}
          accessibilityLabel={t('cart.saveForLater')}
        >
          <Text style={styles.swipeActionText}>♡</Text>
        </TouchableOpacity>
      )}
      {onRemove && (
        <TouchableOpacity
          onPress={() => {
            try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning) } catch {}
            onRemove(item.id)
          }}
          style={[styles.swipeAction, styles.swipeActionRemove]}
          accessibilityLabel={t('cart.remove')}
        >
          <Text style={[styles.swipeActionText, { color: colors.white }]}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  return (
    <Animated.View
      exiting={FadeOut.duration(200).springify().damping(18)}
      layout={Layout.springify().damping(18)}
    >
      <Swipeable
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
        <AnimatedTouchable
          onPress={() => onSelect?.(item.id)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          style={[styles.card, cardStyle]}
          accessibilityLabel={`${item.name}, ${formatNPR(lineTotal)}`}
        >
          {/* Checkbox */}
          {onSelect && (
            <TouchableOpacity
              onPress={() => onSelect(item.id)}
              style={[
                styles.checkbox,
                selected ? styles.checkboxSelected : styles.checkboxUnselected,
              ]}
              accessibilityLabel={`Select item: ${item.name}`}
            >
              {selected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          )}

          {/* Image */}
          <View style={styles.imageWrap}>
            <SafeImage
              source={item.image}
              style={[styles.image, isOOS && styles.imageDimmed]}
              accessibilityLabel={item.name}
            />
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
            {item.variantId && (
              <Text style={styles.variant}>Variant selected</Text>
            )}

            {/* Price */}
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatNPR(item.price)}</Text>
              {priceChanged && (
                <Text style={styles.originalPrice}>{formatNPR(originalPrice!)}</Text>
              )}
            </View>

            {/* Warnings */}
            {isLow && (
              <Text style={styles.warningText}>{t('cart.onlyAFew')}</Text>
            )}
            {isOOS && (
              <Text style={styles.errorText}>{t('product.outOfStock')}</Text>
            )}
            {priceChanged && (
              <Text style={styles.warningText}>
                {t('cart.priceChanged', { oldPrice: formatNPR(originalPrice!), newPrice: formatNPR(item.price) })}
              </Text>
            )}

            {/* Quantity + Line total */}
            <View style={styles.bottomRow}>
              <QuantityStepper
                value={item.quantity}
                min={1}
                max={item.maxQuantity}
                onChange={(qty) => onQuantityChange?.(item.id, qty)}
                disabled={isOOS}
              />
              <Text style={styles.lineTotal}>{formatNPR(lineTotal)}</Text>
            </View>
          </View>
        </AnimatedTouchable>
      </Swipeable>
    </Animated.View>
  )
})

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkboxUnselected: {
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  checkmark: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  imageWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.shimmer,
  },
  image: {
    width: 64,
    height: 64,
  },
  imageDimmed: {
    opacity: 0.5,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 20,
  },
  variant: {
    fontSize: 12,
    fontWeight: '500',
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
  originalPrice: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  warningText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[1],
  },
  lineTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing[2],
    gap: spacing[2],
  },
  swipeAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeActionSave: {
    backgroundColor: colors.primary50,
  },
  swipeActionRemove: {
    backgroundColor: colors.error,
  },
  swipeActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
})

export default CartItem
