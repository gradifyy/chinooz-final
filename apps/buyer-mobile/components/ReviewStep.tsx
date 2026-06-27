import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR, calcCartTotals } from '@chinooz/utils'
import { useCartStore, useCheckoutStore } from '@chinooz/state'
import { placeOrder, SHIPPING_CONFIG } from '@chinooz/mock-data'
import OrderConfirmation from './OrderConfirmation'
import type { CartItem } from '@chinooz/types'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

function groupBySeller(items: CartItem[]): Map<string, CartItem[]> {
  const groups = new Map<string, CartItem[]>()
  for (const item of items) {
    const seller = item.name.split('—')[0]?.trim().split(' ')[0] || 'Other'
    if (!groups.has(seller)) groups.set(seller, [])
    groups.get(seller)!.push(item)
  }
  return groups
}

interface ReviewStepProps {
  onStepChange?: (step: 'address' | 'delivery' | 'payment' | 'review') => void
}

export default function ReviewStep({ onStepChange }: ReviewStepProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const items = useCartStore(s => s.items)
  const clearCart = useCartStore(s => s.clearCart)
  const checkout = useCheckoutStore()
  const reset = useCheckoutStore(s => s.reset)

  const [agreed, setAgreed] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const checkScale = useSharedValue(0)
  const btnScale = useSharedValue(1)

  const [orderIds, setOrderIds] = useState<string[]>([])
  const [subOrders, setSubOrders] = useState<{ sellerName: string; orderId: string; eta: string; total: number; itemCount: number }[]>([])

  const totals = calcCartTotals(items, null, checkout.deliveryMethod === 'sameDay' ? 'sameDay' : checkout.deliveryMethod === 'express' ? 'express' : 'standard', checkout.paymentMethod)
  const { subtotal, vatAmount: vat, deliveryFee, grandTotal } = totals
  const sellerGroups = groupBySeller(items)

  const handlePlaceOrder = useCallback(async () => {
    setPlacing(true)
    setError(null)
    try {
      const result = await placeOrder({
        items: items.map(i => ({ productId: i.productId, variantId: i.variantId, name: i.name, price: i.price, quantity: i.quantity })),
        address: checkout.address!,
        deliveryMethod: checkout.deliveryMethod,
        paymentMethod: checkout.paymentMethod,
      })
      if (result.success) {
        setSuccess(true)
        setOrderIds([result.orderId || `ORD-${Date.now()}`])
        setSubOrders(Array.from(sellerGroups.entries()).map(([seller, sellerItems], i) => ({
          sellerName: seller,
          orderId: `${result.orderId || 'ORD'}-${i + 1}`,
          eta: checkout.deliveryMethod === 'sameDay' ? 'Today' : checkout.deliveryMethod === 'express' ? 'Tomorrow' : '2-4 days',
          total: sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
          itemCount: sellerItems.length,
        })))
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
        clearCart()
        reset()
        setTimeout(() => router.replace('/(tabs)'), 2000)
      } else {
        setError(result.error || t('checkout.paymentFailed'))
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error) } catch {}
      }
    } catch {
      setError(t('checkout.paymentFailed'))
    } finally {
      setPlacing(false)
    }
  }, [items, checkout, clearCart, reset, router, t])

  const handleSwitchToCod = useCallback(() => {
    checkout.setPaymentMethod('cod')
    setError(null)
  }, [checkout])

  if (success) {
    return (
      <OrderConfirmation
        orderIds={orderIds}
        subOrders={subOrders}
        total={grandTotal}
        paymentMethod={checkout.paymentMethod}
        deliveryMethod={checkout.deliveryMethod}
      />
    )
  }

  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t('checkout.reviewOrder')}</Text>

      {/* Items */}
      <AccordionSection title={t('checkout.orderItems')} defaultOpen>
        {items.map(item => (
          <View key={item.id} style={{ flexDirection: 'row', gap: spacing[2], paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <View style={{ width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text>📦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: colors.text }} numberOfLines={1}>{item.name}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>x{item.quantity}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] }}>{formatNPR(item.price * item.quantity)}</Text>
          </View>
        ))}
      </AccordionSection>

      {/* Address */}
      <AccordionSection title={t('checkout.deliveryAddress')} onEdit={() => onStepChange?.('address')}>
        {checkout.address && (
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{checkout.address.fullName}</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>{checkout.address.phone}</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>
              {checkout.address.street}, {checkout.address.area}, {checkout.address.city}
            </Text>
          </View>
        )}
      </AccordionSection>

      {/* Delivery */}
      <AccordionSection title={t('checkout.deliveryMethod')} onEdit={() => onStepChange?.('delivery')}>
        <Text style={{ fontSize: 14, color: colors.text }}>
          {t(`checkout.${checkout.deliveryMethod}Delivery`)} — {formatNPR(deliveryFee)}
        </Text>
      </AccordionSection>

      {/* Payment */}
      <AccordionSection title={t('checkout.paymentMethod')} onEdit={() => onStepChange?.('payment')}>
        <Text style={{ fontSize: 14, color: colors.text }}>
          {t(`checkout.${checkout.paymentMethod}`)}
        </Text>
      </AccordionSection>

      {/* Price breakdown */}
      <View style={{ gap: spacing[2], paddingTop: spacing[2], borderTopWidth: 1, borderTopColor: colors.borderLight }}>
        <SummaryLine label={`${t('cart.subtotal')} (${items.length})`} value={subtotal} />
        <SummaryLine label={t('cart.vatNote')} value={vat} muted />
        <SummaryLine label={t('cart.shipping')} value={deliveryFee} />
        <View style={{ height: 1, backgroundColor: colors.borderLight, marginVertical: spacing[1] }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{t('cart.grandTotal')}</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>{formatNPR(grandTotal)}</Text>
        </View>
      </View>

      {/* Error */}
      {error && (
        <View style={{ backgroundColor: colors.errorLight, padding: spacing[3], borderRadius: radii.lg, gap: spacing[2] }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.error }}>{error}</Text>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            <TouchableOpacity onPress={handlePlaceOrder} style={{ paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.md, borderWidth: 1, borderColor: colors.error }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.error }}>{t('common.retry')}</Text>
            </TouchableOpacity>
            {checkout.paymentMethod !== 'cod' && (
              <TouchableOpacity onPress={handleSwitchToCod} style={{ paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.md, backgroundColor: colors.primary }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.white }}>{t('checkout.switchToCod')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Terms */}
      <TouchableOpacity
        onPress={() => setAgreed(prev => !prev)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        accessibilityLabel={t('checkout.agreeTerms')}
      >
        <View style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: agreed ? colors.primary : colors.border,
          backgroundColor: agreed ? colors.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {agreed && <Text style={{ color: colors.white, fontSize: 12, fontWeight: '700' }}>✓</Text>}
        </View>
        <Text style={{ fontSize: 13, color: colors.textMuted, flex: 1 }}>{t('checkout.agreeTerms')}</Text>
      </TouchableOpacity>

      {/* Place order button */}
      <AnimatedTouchable
        onPress={handlePlaceOrder}
        disabled={!agreed || placing || success}
        style={[styles.placeButton, { opacity: agreed && !placing ? 1 : 0.5 }]}
        activeOpacity={0.85}
        accessibilityLabel={placing ? t('checkout.placingOrder') : t('checkout.placeOrder')}
      >
        {placing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white }}>{t('checkout.placingOrder')}</Text>
          </View>
        ) : (
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white }}>{t('checkout.placeOrder')}</Text>
        )}
      </AnimatedTouchable>
    </View>
  )
}

function AccordionSection({
  title,
  defaultOpen = false,
  onEdit,
  children,
}: {
  title: string
  defaultOpen?: boolean
  onEdit?: () => void
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(defaultOpen)

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.borderLight }}>
      <TouchableOpacity
        onPress={() => setOpen(prev => !prev)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[3] }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{t('checkout.editSection')} ›</Text>
            </TouchableOpacity>
          )}
          <Text style={{ fontSize: 14, color: colors.textMuted, transform: [{ rotate: open ? '90deg' : '0deg' }] }}>›</Text>
        </View>
      </TouchableOpacity>
      {open && <View style={{ paddingBottom: spacing[3] }}>{children}</View>}
    </View>
  )
}

function SummaryLine({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
      <Text style={{ fontSize: 14, color: muted ? colors.textMuted : colors.text }}>{label}</Text>
      <Text style={{ fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] }}>{formatNPR(value)}</Text>
    </View>
  )
}

const styles = {
  placeButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radii.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: spacing[2],
  },
}
