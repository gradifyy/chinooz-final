import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors as lightColors, spacing, radii, fontSz } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import type { Product } from '@chinooz/types'
import { BottomSheet, Button } from '@chinooz/ui'
import { useAppTheme } from './ThemeProvider'
import Icon from './Icon'

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
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

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

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('categories.filters')}>
      <View style={styles.sheetInner}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onReset}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('categories.reset')}
            style={styles.resetHit}
          >
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
              <View
                style={[
                  styles.sliderFill,
                  {
                    width: `${((local.priceMax - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%`,
                  },
                ]}
              />
              <View
                style={[
                  styles.sliderThumb,
                  {
                    left: `${((local.priceMin - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%`,
                  },
                ]}
              />
              <View
                style={[
                  styles.sliderThumb,
                  {
                    left: `${((local.priceMax - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%`,
                  },
                ]}
              />
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
                  onPress={() =>
                    setLocal(prev => ({ ...prev, priceMin: range.min, priceMax: range.max }))
                  }
                  style={[
                    styles.priceChip,
                    local.priceMin === range.min &&
                      local.priceMax === range.max &&
                      styles.priceChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.priceChipText,
                      local.priceMin === range.min &&
                        local.priceMax === range.max &&
                        styles.priceChipTextActive,
                    ]}
                  >
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
                  onPress={() =>
                    setLocal(prev => ({ ...prev, minRating: prev.minRating === r ? 0 : r }))
                  }
                  style={[styles.ratingChip, local.minRating === r && styles.ratingChipActive]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Icon
                        key={i}
                        name={i <= r ? 'star' : 'star-outline'}
                        size={14}
                        color={colors.gold}
                      />
                    ))}
                    <Text
                      style={[styles.ratingText, local.minRating === r && styles.ratingTextActive]}
                    >
                      +
                    </Text>
                  </View>
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
                accessibilityRole="checkbox"
                accessibilityState={{ checked: local.brands.has(brand) }}
              >
                <View style={[styles.checkbox, local.brands.has(brand) && styles.checkboxActive]}>
                  {local.brands.has(brand) && (
                    <Icon name="checkmark" size={12} color={colors.white} />
                  )}
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
              accessibilityRole="checkbox"
              accessibilityState={{ checked: local.inStock }}
            >
              <View style={[styles.checkbox, local.inStock && styles.checkboxActive]}>
                {local.inStock && <Icon name="checkmark" size={12} color={colors.white} />}
              </View>
              <Text style={styles.checkboxLabel}>{t('categories.inStock')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setLocal(prev => ({ ...prev, onSale: !prev.onSale }))}
              style={styles.checkboxRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: local.onSale }}
            >
              <View style={[styles.checkbox, local.onSale && styles.checkboxActive]}>
                {local.onSale && <Icon name="checkmark" size={12} color={colors.white} />}
              </View>
              <Text style={styles.checkboxLabel}>{t('categories.onSale')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            haptic="light"
            onPress={() => onApply(local)}
            accessibilityLabel={t('categories.filterResults', { count: filteredCount })}
          >
            {t('categories.filterResults', { count: filteredCount })}
          </Button>
        </View>
      </View>
    </BottomSheet>
  )
}

const makeStyles = (c: typeof lightColors) =>
  StyleSheet.create({
    sheetInner: {
      maxHeight: 560,
    },
    resetHit: {
      minHeight: 44,
      justifyContent: 'center',
      alignSelf: 'flex-end',
      paddingHorizontal: spacing[4],
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderLight,
    },
    resetText: {
      fontSize: fontSz('base')[0],
      fontWeight: '500',
      color: c.primary,
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
      fontSize: fontSz('md')[0],
      fontWeight: '600',
      color: c.text,
      marginBottom: spacing[1],
    },
    divider: {
      height: 1,
      backgroundColor: c.borderLight,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    priceLabel: {
      fontSize: fontSz('base')[0],
      fontWeight: '600',
      color: c.text,
      fontVariant: ['tabular-nums'],
    },
    priceSep: {
      fontSize: fontSz('base')[0],
      color: c.textMuted,
    },
    sliderTrack: {
      height: 4,
      backgroundColor: c.border,
      borderRadius: radii.sm,
      marginVertical: spacing[2],
      position: 'relative',
    },
    sliderFill: {
      position: 'absolute',
      height: 4,
      backgroundColor: c.primary,
      borderRadius: radii.sm,
    },
    sliderThumb: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderRadius: radii.lg,
      backgroundColor: c.white,
      borderWidth: 2,
      borderColor: c.primary,
      top: -10,
      marginLeft: -12,
      shadowColor: c.black,
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
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    priceChipActive: {
      borderColor: c.primary,
      backgroundColor: c.primary50,
    },
    priceChipText: {
      fontSize: fontSz('sm')[0],
      fontWeight: '500',
      color: c.text,
    },
    priceChipTextActive: {
      color: c.primary,
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
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    ratingChipActive: {
      borderColor: c.primary,
      backgroundColor: c.primary50,
    },
    ratingText: {
      fontSize: fontSz('sm')[0],
      color: c.textMuted,
    },
    ratingTextActive: {
      color: c.primary,
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
      borderRadius: radii.sm,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxActive: {
      borderColor: c.primary,
      backgroundColor: c.primary,
    },
    checkmark: {
      fontSize: fontSz('sm')[0],
      fontWeight: '700',
      color: c.white,
    },
    checkboxLabel: {
      fontSize: fontSz('base')[0],
      color: c.text,
    },
    footer: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
    },
  })
