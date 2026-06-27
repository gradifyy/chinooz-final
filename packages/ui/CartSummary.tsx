import React, { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated as RNAnimated } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { applyPromoCode, SHIPPING_CONFIG } from '@chinooz/mock-data'
import type { CartItem } from '@chinooz/types'

interface CartSummaryProps {
  items: CartItem[]
  sellerGroups?: Map<string, CartItem[]>
}

interface PromoState {
  code: string
  discount: number
  type: 'percentage' | 'fixed'
}

export default function CartSummary({ items, sellerGroups }: CartSummaryProps) {
  const { t } = useTranslation()
  const [promoCode, setPromoCode] = useState('')
  const [promo, setPromo] = useState<PromoState | null>(null)
  const [promoError, setPromoError] = useState('')
  const [applying, setApplying] = useState(false)
  const [showSellers, setShowSellers] = useState(false)

  const inputShakeX = useSharedValue(0)
  const checkScale = useSharedValue(0)
  const totalScale = useSharedValue(1)

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const vatIncluded = Math.round(subtotal * SHIPPING_CONFIG.vatRate / (1 + SHIPPING_CONFIG.vatRate))
  const deliveryFee = subtotal >= SHIPPING_CONFIG.freeShippingThreshold ? 0 : SHIPPING_CONFIG.deliveryFee
  const discountAmount = promo
    ? promo.type === 'percentage'
      ? Math.round(subtotal * promo.discount / 100)
      : promo.discount
    : 0
  const grandTotal = subtotal - discountAmount + deliveryFee
  const freeShippingProgress = Math.min(1, subtotal / SHIPPING_CONFIG.freeShippingThreshold)
  const amountToFreeShipping = Math.max(0, SHIPPING_CONFIG.freeShippingThreshold - subtotal)
  const freeShippingUnlocked = subtotal >= SHIPPING_CONFIG.freeShippingThreshold

  const inputShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: inputShakeX.value }],
  }))

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }))

  const totalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: totalScale.value }],
  }))

  useEffect(() => {
    totalScale.value = withSequence(
      withTiming(1.03, { duration: 150, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
    )
  }, [grandTotal])

  const handleApplyPromo = useCallback(async () => {
    if (!promoCode.trim()) return
    setApplying(true)
    setPromoError('')
    try {
      const result = await applyPromoCode(promoCode)
      if (result.success && result.discount && result.type) {
        setPromo({ code: promoCode.toUpperCase(), discount: result.discount, type: result.type })
        setPromoError('')
        checkScale.value = withSpring(1, { damping: 12, stiffness: 400 })
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
      } else {
        setPromoError(result.error || t('cart.invalidCode'))
        inputShakeX.value = withSequence(
          withTiming(-8, { duration: 50 }),
          withTiming(8, { duration: 50 }),
          withTiming(-4, { duration: 50 }),
          withTiming(4, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        )
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning) } catch {}
      }
    } catch {} finally {
      setApplying(false)
    }
  }, [promoCode, t])

  const handleRemovePromo = useCallback(() => {
    setPromo(null)
    setPromoCode('')
    checkScale.value = 0
  }, [])

  return (
    <View style={styles.container}>
      {/* Promo code */}
      <Animated.View style={[styles.promoRow, inputShakeStyle]}>
        <TextInput
          style={styles.promoInput}
          value={promoCode}
          onChangeText={(text) => { setPromoCode(text); setPromoError('') }}
          placeholder={t('cart.promoCode')}
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="characters"
          editable={!promo}
          accessibilityLabel={t('cart.promoCode')}
        />
        {promo ? (
          <TouchableOpacity onPress={handleRemovePromo} style={styles.promoRemove}>
            <Text style={styles.promoRemoveText}>{t('cart.removeCode')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleApplyPromo}
            disabled={!promoCode.trim() || applying}
            style={[styles.promoApply, { opacity: !promoCode.trim() || applying ? 0.5 : 1 }]}
          >
            <Text style={styles.promoApplyText}>{applying ? '...' : t('cart.applyCode')}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {promoError ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <Text style={styles.promoError}>{promoError}</Text>
        </Animated.View>
      ) : null}

      {promo && (
        <Animated.View entering={FadeInDown.duration(250)} style={styles.promoApplied}>
          <Animated.Text style={[styles.promoCheck, checkStyle]}>✓</Animated.Text>
          <Text style={styles.promoAppliedText}>
            {t('cart.codeApplied')} — {promo.type === 'percentage' ? `${promo.discount}% off` : formatNPR(promo.discount)}
          </Text>
        </Animated.View>
      )}

      {/* Free shipping progress */}
      <View style={styles.shippingSection}>
        <View style={styles.shippingHeader}>
          <Text style={styles.shippingLabel}>{t('cart.freeDelivery')}</Text>
          {freeShippingUnlocked && (
            <Text style={styles.shippingUnlocked}>🎉 {t('cart.freeDeliveryUnlocked')}</Text>
          )}
        </View>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${freeShippingProgress * 100}%` as any,
                backgroundColor: freeShippingUnlocked ? colors.gold : colors.primary,
              },
            ]}
          />
        </View>
        {!freeShippingUnlocked && (
          <Text style={styles.shippingHint}>
            {t('cart.addMoreForFree', { amount: formatNPR(amountToFreeShipping) })}
          </Text>
        )}
      </View>

      {/* Breakdown */}
      <View style={styles.breakdown}>
        <SummaryLine label={`${t('cart.subtotal')} (${items.length})`} value={subtotal} />
        <SummaryLine label={t('cart.vatNote')} value={vatIncluded} muted />
        <SummaryLine
          label={t('cart.shipping')}
          value={deliveryFee}
          valueColor={deliveryFee === 0 ? colors.success : undefined}
          valueText={deliveryFee === 0 ? t('cart.freeShipping') : undefined}
        />
        {discountAmount > 0 && (
          <SummaryLine label={t('cart.discount')} value={-discountAmount} valueColor={colors.success} />
        )}

        {/* Seller subtotals accordion */}
        {sellerGroups && sellerGroups.size > 1 && (
          <TouchableOpacity
            onPress={() => setShowSellers(prev => !prev)}
            style={styles.sellerToggle}
            activeOpacity={0.7}
          >
            <Text style={styles.sellerToggleText}>
              {showSellers ? 'Hide' : 'Show'} seller breakdown
            </Text>
          </TouchableOpacity>
        )}
        {showSellers && sellerGroups && (
          <View style={styles.sellerBreakdown}>
            {Array.from(sellerGroups.entries()).map(([seller, sellerItems]) => {
              const sellerSubtotal = sellerItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
              return (
                <SummaryLine
                  key={seller}
                  label={t('cart.sellerSubtotal', { seller })}
                  value={sellerSubtotal}
                  muted
                />
              )
            })}
          </View>
        )}

        <View style={styles.divider} />

        <Animated.View style={[styles.grandTotalRow, totalStyle]}>
          <Text style={styles.grandTotalLabel}>{t('cart.grandTotal')}</Text>
          <Text style={styles.grandTotalValue}>{formatNPR(grandTotal)}</Text>
        </Animated.View>
      </View>
    </View>
  )
}

function SummaryLine({
  label,
  value,
  muted,
  valueColor,
  valueText,
}: {
  label: string
  value: number
  muted?: boolean
  valueColor?: string
  valueText?: string
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, muted && styles.summaryLabelMuted]}>{label}</Text>
      <Text
        style={[styles.summaryValue, valueColor ? { color: valueColor } : null]}
      >
        {valueText || formatNPR(Math.abs(value))}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  promoRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  promoInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    fontSize: 14,
    color: colors.text,
  },
  promoApply: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoApplyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  promoRemove: {
    paddingHorizontal: spacing[3],
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoRemoveText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  promoError: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '500',
  },
  promoApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.successLight,
    borderRadius: radii.lg,
  },
  promoCheck: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '700',
  },
  promoAppliedText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
  shippingSection: {
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  shippingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shippingLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  shippingUnlocked: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gold,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  shippingHint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  breakdown: {
    gap: spacing[2],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.text,
  },
  summaryLabelMuted: {
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  sellerToggle: {
    paddingVertical: spacing[1],
  },
  sellerToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  sellerBreakdown: {
    gap: spacing[1],
    paddingLeft: spacing[3],
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing[2],
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
})
