import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { formatNPR } from '@chinooz/utils'
import { spacing, radii, fontSz } from '@chinooz/theme'
import { useAppTheme } from './ThemeProvider'
import { useCartStore } from '@chinooz/state'
import { useFrequentlyBoughtTogether } from '@chinooz/hooks'
import SafeImage from '@chinooz/ui/SafeImage'
import Icon from './Icon'
import type { Product } from '@chinooz/types'

export default function FrequentlyBoughtTogether({ productId }: { productId: string }) {
  const { colors } = useAppTheme()
  const { t } = useTranslation()
  const { data } = useFrequentlyBoughtTogether(productId)
  const addItem = useCartStore(s => s.addItem)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [added, setAdded] = useState(false)

  // anchor (always selected) + companions
  const bundle = useMemo<Product[]>(() => (data ? [data.anchor, ...data.companions] : []), [data])

  // Default-select the whole bundle once it loads.
  useEffect(() => {
    if (bundle.length > 0) setSelected(new Set(bundle.map(p => p.id)))
  }, [bundle])

  const toggle = useCallback((id: string, isAnchor: boolean) => {
    if (isAnchor) return // anchor stays selected
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const total = useMemo(
    () => bundle.filter(p => selected.has(p.id)).reduce((sum, p) => sum + p.price, 0),
    [bundle, selected],
  )
  const selectedCount = bundle.filter(p => selected.has(p.id)).length

  const handleAddBundle = useCallback(() => {
    for (const p of bundle) {
      if (!selected.has(p.id)) continue
      addItem({
        id: `ci-${p.id}`,
        productId: p.id,
        name: p.name,
        image: p.images?.[0]?.uri ?? '',
        price: p.price,
        quantity: 1,
        maxQuantity: 10,
      })
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }, [bundle, selected, addItem])

  if (!data || data.companions.length === 0) return null

  return (
    <View style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[3] }}>
      <Text style={{ fontSize: fontSz('lg')[0], fontWeight: '600', color: colors.text }}>{t('product.fbt.title')}</Text>

      {/* Item row with + separators */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', gap: spacing[2] }}>
        {bundle.map((p, i) => {
          const isAnchor = i === 0
          const isSelected = selected.has(p.id)
          return (
            <React.Fragment key={p.id}>
              {i > 0 && <Text style={{ fontSize: fontSz('xl')[0], color: colors.textMuted }}>+</Text>}
              <TouchableOpacity
                onPress={() => toggle(p.id, isAnchor)}
                activeOpacity={isAnchor ? 1 : 0.7}
                style={{
                  width: 110,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? colors.primary50 : colors.surface,
                  padding: spacing[2],
                  opacity: isSelected ? 1 : 0.6,
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={p.name}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: spacing[1],
                    left: spacing[1],
                    zIndex: 10,
                    width: 20,
                    height: 20,
                    borderRadius: radii.sm,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected && <Icon name="checkmark" size={12} color={colors.white} />}
                </View>
                <View style={{ width: '100%', height: 90, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.border, marginBottom: spacing[1] }}>
                  {p.images?.[0]?.uri ? (
                    <SafeImage source={p.images[0].uri} style={{ width: '100%', height: 90 }} resizeMode="cover" />
                  ) : null}
                </View>
                <Text numberOfLines={2} style={{ fontSize: fontSz('xs')[0], color: colors.text, minHeight: 28, lineHeight: 14 }}>{p.name}</Text>
                <Text style={{ fontSize: fontSz('sm')[0], fontWeight: '700', color: colors.text, marginTop: 2 }}>{formatNPR(p.price)}</Text>
                {isAnchor && <Text style={{ fontSize: fontSz('xs')[0], fontWeight: '600', color: colors.primary }}>{t('product.fbt.thisItem')}</Text>}
              </TouchableOpacity>
            </React.Fragment>
          )
        })}
      </ScrollView>

      {/* Total + CTA */}
      <View style={{ gap: spacing[1] }}>
        <Text style={{ fontSize: fontSz('xs')[0], color: colors.textMuted }}>{t('product.fbt.totalFor', { count: selectedCount })}</Text>
        <Text style={{ fontSize: fontSz('xl')[0], fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>{formatNPR(total)}</Text>
        <TouchableOpacity
          onPress={handleAddBundle}
          disabled={selectedCount === 0}
          style={{
            marginTop: spacing[1],
            height: 44,
            borderRadius: radii.lg,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: selectedCount === 0 ? 0.5 : 1,
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('product.fbt.addBundle', { count: selectedCount })}
        >
          {added ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="checkmark" size={14} color={colors.white} />
              <Text style={{ fontSize: fontSz('sm')[0], fontWeight: '700', color: colors.white }}>{t('product.addedToCart')}</Text>
            </View>
          ) : (
            <Text style={{ fontSize: fontSz('sm')[0], fontWeight: '700', color: colors.white }}>{t('product.fbt.addBundle', { count: selectedCount })}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}
