import React, { useState, useCallback, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { useCartStore, useUIStore } from '@chinooz/state'
import { EmptyState } from '@chinooz/ui'
import EmptyCart from '../components/EmptyCart'
import type { CartItem } from '@chinooz/types'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

function getInitials(name: string): string {
  return name.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2)
}

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
  const items = useCartStore(s => s.items)
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const removeItem = useCartStore(s => s.removeItem)

  const [selected, setSelected] = useState<Set<string>>(new Set(items.map(i => i.id)))
  const [expandedSellers, setExpandedSellers] = useState<Set<string>>(new Set())

  const sellerGroups = useMemo(() => groupBySeller(items), [items])
  const count = items.reduce((sum, i) => sum + i.quantity, 0)
  const selectedItems = items.filter(i => selected.has(i.id))
  const selectedTotal = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const allSelected = items.length > 0 && items.every(i => selected.has(i.id))

  const toggleItem = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [])

  const toggleAll = useCallback(() => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(items.map(i => i.id)))
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
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
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [])

  const handleCheckout = useCallback(() => {
    if (selectedItems.length === 0) return
    router.push('/checkout')
  }, [selectedItems, router])

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.surface }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t('cart.title')}</Text>
        </View>
        <EmptyCart />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ fontSize: 18, color: colors.primary, fontWeight: '600' }}>←</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t('cart.title')}</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>({count})</Text>
          </View>
          <TouchableOpacity onPress={toggleAll} activeOpacity={0.7}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: allSelected ? colors.primary : colors.textMuted }}>
              {allSelected ? '✓ ' : ''}{t('cart.selectAll')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[4], paddingVertical: spacing[2], backgroundColor: colors.background }}>
                <TouchableOpacity
                  onPress={() => toggleSeller(sellerItems)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    borderWidth: 1.5,
                    borderColor: allSellerSelected ? colors.primary : colors.border,
                    backgroundColor: allSellerSelected ? colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  accessibilityLabel={t('cart.selectFromSeller', { seller })}
                >
                  {allSellerSelected && <Text style={{ color: colors.white, fontSize: 12, fontWeight: '700' }}>✓</Text>}
                </TouchableOpacity>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>{getInitials(seller)}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{seller}</Text>
              </View>

              {/* Items */}
              {sellerItems.map((item, i) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInDown.delay(i * 50).duration(250)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
                >
                  <TouchableOpacity
                    onPress={() => toggleItem(item.id)}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 1.5,
                      borderColor: selected.has(item.id) ? colors.primary : colors.border,
                      backgroundColor: selected.has(item.id) ? colors.primary : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    accessibilityLabel={t('cart.selectItem', { name: item.name })}
                  >
                    {selected.has(item.id) && <Text style={{ color: colors.white, fontSize: 12, fontWeight: '700' }}>✓</Text>}
                  </TouchableOpacity>

                  <View style={{ width: 64, height: 64, borderRadius: radii.md, backgroundColor: colors.border, overflow: 'hidden' }}>
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 24 }}>📦</Text>
                    </View>
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }} numberOfLines={2}>{item.name}</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>{formatNPR(item.price)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: item.quantity <= 1 ? 0.4 : 1 }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>−</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, minWidth: 24, textAlign: 'center' }}>{item.quantity}</Text>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.maxQuantity}
                        style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: item.quantity >= item.maxQuantity ? 0.4 : 1 }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeItem(item.id)} style={{ marginLeft: 'auto' }}>
                        <Text style={{ fontSize: 12, color: colors.error, fontWeight: '500' }}>{t('cart.remove')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          )
        })}
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] }}>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>{t('cart.selectedCount', { count: selectedItems.length })}</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>{formatNPR(selectedTotal)}</Text>
        </View>
        <TouchableOpacity
          onPress={handleCheckout}
          disabled={selectedItems.length === 0}
          style={{
            backgroundColor: selectedItems.length === 0 ? colors.border : colors.primary,
            height: 48,
            borderRadius: radii.lg,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: selectedItems.length === 0 ? 0.5 : 1,
          }}
          activeOpacity={0.85}
          accessibilityLabel={t('cart.checkout')}
          accessibilityState={{ disabled: selectedItems.length === 0 }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: selectedItems.length === 0 ? colors.textMuted : colors.white }}>
            {selectedItems.length === 0 ? t('cart.selectAtLeastOne') : t('cart.checkout')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
