import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import type { Product } from '@chinooz/types'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

export interface FilterState {
  priceMin: number
  priceMax: number
  minRating: number
  brands: Set<string>
  inStock: boolean
  onSale: boolean
}

interface FilterSheetProps {
  visible: boolean
  onClose: () => void
  products: Product[]
  filters: FilterState
  onApply: (filters: FilterState) => void
  onReset: () => void
}

const RATING_OPTIONS = [4, 3, 2, 1]

export default function FilterSheet({
  visible,
  onClose,
  products,
  filters,
  onApply,
  onReset,
}: FilterSheetProps) {
  const { t } = useTranslation()

  const [local, setLocal] = useState<FilterState>(filters)

  const brands = useMemo(() => {
    const set = new Set(products.map(p => p.sellerName))
    return Array.from(set).sort()
  }, [products])

  const priceRange = useMemo(() => {
    if (!products.length) return { min: 0, max: 10000 }
    const prices = products.map(p => p.price)
    return { min: Math.min(...prices), max: Math.max(...prices) }
  }, [products])

  const filteredCount = useMemo(() => {
    return products.filter(p => {
      if (local.inStock && p.stock === 'out_of_stock') return false
      if (local.onSale && (!p.compareAtPrice || p.compareAtPrice <= p.price)) return false
      if (local.minRating > 0 && p.rating < local.minRating) return false
      if (local.brands.size > 0 && !local.brands.has(p.sellerName)) return false
      if (p.price < local.priceMin || p.price > local.priceMax) return false
      return true
    }).length
  }, [products, local])

  const toggleBrand = useCallback((brand: string) => {
    setLocal(prev => {
      const next = new Set(prev.brands)
      if (next.has(brand)) next.delete(brand)
      else next.add(brand)
      return { ...prev, brands: next }
    })
  }, [])

  const checkScale = useSharedValue(1)
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }))

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('categories.filters')}</Text>
            <TouchableOpacity onPress={onReset}>
              <Text style={styles.resetText}>{t('categories.reset')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Price range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('categories.priceRange')}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{formatNPR(local.priceMin)}</Text>
                <Text style={styles.priceSep}>—</Text>
                <Text style={styles.priceLabel}>{formatNPR(local.priceMax)}</Text>
              </View>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${((local.priceMax - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%` }]} />
                <View style={[styles.sliderThumb, { left: `${((local.priceMin - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%` }]} />
                <View style={[styles.sliderThumb, { left: `${((local.priceMax - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%` }]} />
              </View>
              <View style={styles.priceButtons}>
                {[
                  { label: 'Under 500', min: 0, max: 500 },
                  { label: '500–2000', min: 500, max: 2000 },
                  { label: '2000–5000', min: 2000, max: 5000 },
                  { label: '5000+', min: 5000, max: 999999 },
                ].map(range => (
                  <TouchableOpacity
                    key={range.label}
                    onPress={() => setLocal(prev => ({ ...prev, priceMin: range.min, priceMax: range.max }))}
                    style={[styles.priceChip, local.priceMin === range.min && local.priceMax === range.max && styles.priceChipActive]}
                  >
                    <Text style={[styles.priceChipText, local.priceMin === range.min && local.priceMax === range.max && styles.priceChipTextActive]}>
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Rating */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('categories.rating')}</Text>
              <View style={styles.optionGrid}>
                {RATING_OPTIONS.map(r => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setLocal(prev => ({ ...prev, minRating: prev.minRating === r ? 0 : r }))}
                    style={[styles.ratingChip, local.minRating === r && styles.ratingChipActive]}
                  >
                    <Text style={[styles.ratingText, local.minRating === r && styles.ratingTextActive]}>
                      {'★'.repeat(r)}{'☆'.repeat(5 - r)}+
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Brand/Seller */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('categories.brand')}</Text>
              {brands.map(brand => (
                <TouchableOpacity
                  key={brand}
                  onPress={() => toggleBrand(brand)}
                  style={styles.checkboxRow}
                >
                  <View style={[styles.checkbox, local.brands.has(brand) && styles.checkboxActive]}>
                    {local.brands.has(brand) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>{brand}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.divider} />

            {/* Availability + On Sale */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('categories.availability')}</Text>
              <TouchableOpacity
                onPress={() => setLocal(prev => ({ ...prev, inStock: !prev.inStock }))}
                style={styles.checkboxRow}
              >
                <View style={[styles.checkbox, local.inStock && styles.checkboxActive]}>
                  {local.inStock && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>{t('categories.inStock')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLocal(prev => ({ ...prev, onSale: !prev.onSale }))}
                style={styles.checkboxRow}
              >
                <View style={[styles.checkbox, local.onSale && styles.checkboxActive]}>
                  {local.onSale && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>{t('categories.onSale')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.applyButton} activeOpacity={0.85}>
              <Text style={styles.applyText}>{t('categories.filterResults', { count: filteredCount })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  overlayTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  body: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  section: {
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[1],
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  priceSep: {
    fontSize: 14,
    color: colors.textMuted,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginVertical: spacing[2],
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    top: -10,
    marginLeft: -12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  priceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  priceChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  priceChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  priceChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  priceChipTextActive: {
    color: colors.primary,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  ratingChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ratingChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  ratingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  ratingTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkmark: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingBottom: spacing[6],
  },
  applyButton: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
})
