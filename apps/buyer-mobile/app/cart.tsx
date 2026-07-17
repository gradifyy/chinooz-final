import React, { useState, useCallback, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { spacing, radii, fontSz, duration } from '@chinooz/theme'
import { useAppTheme } from '../components/ThemeProvider'
import { formatNPR, calcCartTotals, getInitials } from '@chinooz/utils'
import { useCartStore, useCheckoutStore } from '@chinooz/state'
import { CartSummary, Button } from '@chinooz/ui'
import EmptyCart from '../components/EmptyCart'
import ScreenHeader from '../components/ScreenHeader'
import Icon from '../components/Icon'
import type { CartItem } from '@chinooz/types'

function groupBySeller(items: CartItem[]): Map<string, CartItem[]> {
  const groups = new Map<string, CartItem[]>()
  for (const item of items) {
    const seller = item.name.split('—')[0]?.trim().split(' ')[0] || 'Other'
    const key = seller
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  return groups
}

export default function CartScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const { colors } = useAppTheme()
  const items = useCartStore(s => s.items)
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const removeItem = useCartStore(s => s.removeItem)

  const [selected, setSelected] = useState<Set<string>>(new Set(items.map(i => i.id)))
  // Promo lives in the checkout store so it survives the cart → checkout → order
  // flow and the discount is actually applied to the placed order.
  const promo = useCheckoutStore(s => s.coupon)
  const setPromo = useCheckoutStore(s => s.setCoupon)
  const setSelectedIds = useCheckoutStore(s => s.setSelectedIds)

  const sellerGroups = useMemo(() => groupBySeller(items), [items])
  const count = items.reduce((sum, i) => sum + i.quantity, 0)
  const selectedItems = items.filter(i => selected.has(i.id))
  // Single source of truth for money — same calcCartTotals the checkout review
  // uses, so the cart total never diverges from the checkout grand total.
  const totals = useMemo(() => calcCartTotals(selectedItems, promo), [selectedItems, promo])
  const allSelected = items.length > 0 && items.every(i => selected.has(i.id))

  const toggleItem = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  }, [])

  const toggleAll = useCallback(() => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(items.map(i => i.id)))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  }, [allSelected, items])

  const toggleSeller = useCallback((sellerItems: CartItem[]) => {
    setSelected(prev => {
      const next = new Set(prev)
      const allSellerSelected = sellerItems.every(i => next.has(i.id))
      for (const item of sellerItems) {
        if (allSellerSelected) next.delete(item.id)
        else next.add(item.id)
      }
      return next
    })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  }, [])

  const handleCheckout = useCallback(() => {
    if (selectedItems.length === 0) return
    setSelectedIds(selectedItems.map(i => i.id))
    router.push('/checkout')
  }, [selectedItems, setSelectedIds, router])

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View
          style={{
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ fontSize: fontSz('lg')[0], fontWeight: '600', color: colors.text }}>
            {t('cart.title')}
          </Text>
        </View>
        <EmptyCart />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <ScreenHeader
        title={`${t('cart.title')} (${count})`}
        rightLabel={t('cart.selectAll')}
        onRightPress={toggleAll}
        rightAccessibilityLabel={t('cart.selectAll')}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {Array.from(sellerGroups.entries()).map(([seller, sellerItems]) => {
          const allSellerSelected = sellerItems.every(i => selected.has(i.id))
          return (
            <View key={seller}>
              {/* Seller header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[2],
                  paddingHorizontal: spacing[4],
                  paddingVertical: spacing[2],
                  backgroundColor: colors.background,
                }}
              >
                <TouchableOpacity
                  onPress={() => toggleSeller(sellerItems)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: radii.sm,
                    borderWidth: 1.5,
                    borderColor: allSellerSelected ? colors.primary : colors.border,
                    backgroundColor: allSellerSelected ? colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  accessibilityLabel={t('cart.selectFromSeller', { seller })}
                >
                  {allSellerSelected && <Icon name="checkmark" size={12} color={colors.white} />}
                </TouchableOpacity>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: radii.lg,
                    backgroundColor: colors.primary50,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{ fontSize: fontSz('xs')[0], fontWeight: '700', color: colors.primary }}
                  >
                    {getInitials(seller)}
                  </Text>
                </View>
                <Text style={{ fontSize: fontSz('sm')[0], fontWeight: '600', color: colors.text }}>
                  {seller}
                </Text>
              </View>

              {/* Items */}
              {sellerItems.map((item, i) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInDown.delay(i * 50).duration(duration.normal)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing[3],
                    paddingHorizontal: spacing[4],
                    paddingVertical: spacing[3],
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderLight,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => toggleItem(item.id)}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: radii.sm,
                      borderWidth: 1.5,
                      borderColor: selected.has(item.id) ? colors.primary : colors.border,
                      backgroundColor: selected.has(item.id) ? colors.primary : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    accessibilityLabel={t('cart.selectItem', { name: item.name })}
                  >
                    {selected.has(item.id) && (
                      <Icon name="checkmark" size={12} color={colors.white} />
                    )}
                  </TouchableOpacity>

                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: radii.md,
                      backgroundColor: colors.border,
                      overflow: 'hidden',
                    }}
                  >
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="cube-outline" size={24} color={colors.textMuted} />
                    </View>
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={{ fontSize: fontSz('sm')[0], fontWeight: '500', color: colors.text }}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: fontSz('base')[0],
                        fontWeight: '700',
                        color: colors.text,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {formatNPR(item.price)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: radii.lg,
                          backgroundColor: colors.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: item.quantity <= 1 ? 0.4 : 1,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: fontSz('base')[0],
                            fontWeight: '600',
                            color: colors.text,
                          }}
                        >
                          −
                        </Text>
                      </TouchableOpacity>
                      <Text
                        style={{
                          fontSize: fontSz('base')[0],
                          fontWeight: '600',
                          color: colors.text,
                          minWidth: 24,
                          textAlign: 'center',
                        }}
                      >
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.maxQuantity}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: radii.lg,
                          backgroundColor: colors.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: item.quantity >= item.maxQuantity ? 0.4 : 1,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: fontSz('base')[0],
                            fontWeight: '600',
                            color: colors.text,
                          }}
                        >
                          +
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeItem(item.id)}
                        style={{ marginLeft: 'auto' }}
                      >
                        <Text
                          style={{
                            fontSize: fontSz('sm')[0],
                            color: colors.error,
                            fontWeight: '500',
                          }}
                        >
                          {t('cart.remove')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          )
        })}

        {/* Summary: promo / VAT / free-shipping / seller breakdown / grand total */}
        <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[4] }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              padding: spacing[4],
              borderWidth: 1,
              borderColor: colors.borderLight,
              gap: spacing[2],
            }}
          >
            <Text style={{ fontSize: fontSz('md')[0], fontWeight: '700', color: colors.text }}>
              {t('cart.summary')}
            </Text>
            <CartSummary
              items={selectedItems}
              sellerGroups={sellerGroups}
              promo={promo}
              onPromoChange={setPromo}
            />
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View
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
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: spacing[2],
          }}
        >
          <Text style={{ fontSize: fontSz('sm')[0], color: colors.textMuted }}>
            {t('cart.selectedCount', { count: selectedItems.length })}
          </Text>
          <Text
            style={{
              fontSize: fontSz('xl')[0],
              fontWeight: '700',
              color: colors.text,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatNPR(totals.grandTotal)}
          </Text>
        </View>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          haptic="medium"
          disabled={selectedItems.length === 0}
          onPress={handleCheckout}
          accessibilityLabel={t('cart.checkout')}
        >
          {selectedItems.length === 0 ? t('cart.selectAtLeastOne') : t('cart.checkout')}
        </Button>
      </View>
    </View>
  )
}
