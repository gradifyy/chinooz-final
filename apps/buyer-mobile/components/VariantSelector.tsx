import React, { useMemo, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import type { ProductVariant, StockStatus } from '@chinooz/types'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

const COLOR_MAP: Record<string, string> = {
  'ice blue': '#A8D8EA',
  'navy': '#1B3A5C',
  'black': '#1F2937',
  'white': '#F9FAFB',
  'red': '#DC2626',
  'blue': '#2563EB',
  'green': '#16A34A',
  'gold': '#E0A93B',
  'silver': '#9CA3AF',
  'cream': '#FEF3C7',
  'maroon': '#7F1D1D',
  'natural cream': '#FEF3C7',
  'standard red': '#DC2626',
  'standard blue': '#2563EB',
  'midnight black': '#111827',
  'ocean teal': '#0D9488',
}

interface VariantGroup {
  key: string
  label: string
  options: {
    value: string
    variantIds: string[]
    available: boolean
  }[]
}

function parseVariantGroups(variants: ProductVariant[]): VariantGroup[] {
  const groups = new Map<string, Map<string, string[]>>()

  for (const v of variants) {
    for (const [attrKey, attrValue] of Object.entries(v.attributes)) {
      if (!groups.has(attrKey)) groups.set(attrKey, new Map())
      const values = groups.get(attrKey)!
      if (!values.has(attrValue)) values.set(attrValue, [])
      values.get(attrValue)!.push(v.id)
    }
  }

  return Array.from(groups.entries()).map(([key, values]) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    options: Array.from(values.entries()).map(([value, variantIds]) => ({
      value,
      variantIds,
      available: variantIds.some(id => {
        const v = variants.find(v => v.id === id)
        return v && v.stock !== 'out_of_stock'
      }),
    })),
  }))
}

function ColorSwatch({
  value,
  selected,
  disabled,
  onPress,
  label,
}: {
  value: string
  selected: boolean
  disabled: boolean
  onPress: () => void
  label: string
}) {
  const { t } = useTranslation()
  const scale = useSharedValue(1)
  const colorHex = COLOR_MAP[value.toLowerCase()] || colors.border

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePress = useCallback(() => {
    if (disabled) return
    scale.value = withSequence(
      withSpring(1.1, { damping: 12, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    )
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    onPress()
  }, [disabled, onPress])

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      style={styles.swatchWrap}
      accessibilityLabel={`${label}: ${value}${selected ? `, ${t('product.selected')}` : ''}`}
      accessibilityState={{ disabled, selected }}
    >
      <Animated.View
        style={[
          styles.swatchOuter,
          selected && styles.swatchSelected,
          disabled && styles.disabled,
          animStyle,
        ]}
      >
        <View style={[styles.swatchInner, { backgroundColor: colorHex }]} />
      </Animated.View>
      <Text
        style={[styles.swatchLabel, disabled && styles.disabledText]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </TouchableOpacity>
  )
}

function VariantChip({
  value,
  selected,
  disabled,
  onPress,
  label,
}: {
  value: string
  selected: boolean
  disabled: boolean
  onPress: () => void
  label: string
}) {
  const { t } = useTranslation()
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePress = useCallback(() => {
    if (disabled) return
    scale.value = withSequence(
      withSpring(1.05, { damping: 12, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    )
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    onPress()
  }, [disabled, onPress])

  return (
    <AnimatedTouchable
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.chip,
        selected && styles.chipSelected,
        disabled && styles.disabled,
        animStyle,
      ]}
      accessibilityLabel={`${label}: ${value}${selected ? `, ${t('product.selected')}` : ''}`}
      accessibilityState={{ disabled, selected }}
    >
      <Text
        style={[
          styles.chipText,
          selected && styles.chipTextSelected,
          disabled && styles.disabledText,
        ]}
      >
        {value}
      </Text>
    </AnimatedTouchable>
  )
}

interface VariantSelectorProps {
  variants: ProductVariant[]
  selectedId: string
  onSelect: (variantId: string) => void
  promptError?: string | null
}

export default function VariantSelector({
  variants,
  selectedId,
  onSelect,
  promptError,
}: VariantSelectorProps) {
  const { t } = useTranslation()

  const groups = useMemo(() => parseVariantGroups(variants), [variants])

  const selectedVariant = variants.find(v => v.id === selectedId)

  const handleGroupSelect = useCallback((groupKey: string, value: string, variantIds: string[]) => {
    const bestVariant = variantIds.find(id => {
      const v = variants.find(v => v.id === id)
      return v && v.stock !== 'out_of_stock'
    }) || variantIds[0]
    onSelect(bestVariant)
  }, [variants, onSelect])

  if (variants.length === 0) return null

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('product.selectVariant')}</Text>

      {groups.map(group => (
        <View key={group.key} style={styles.group}>
          <Text style={styles.groupLabel}>
            {group.label}
            {selectedVariant?.attributes[group.key] && (
              <Text style={styles.selectedValue}>: {selectedVariant.attributes[group.key]}</Text>
            )}
          </Text>

          {group.key === 'color' ? (
            <View style={styles.swatchRow}>
              {group.options.map(opt => (
                <ColorSwatch
                  key={opt.value}
                  value={opt.value}
                  selected={selectedVariant?.attributes[group.key] === opt.value}
                  disabled={!opt.available}
                  onPress={() => handleGroupSelect(group.key, opt.value, opt.variantIds)}
                  label={group.label}
                />
              ))}
            </View>
          ) : (
            <View style={styles.chipRow}>
              {group.options.map(opt => (
                <VariantChip
                  key={opt.value}
                  value={opt.value}
                  selected={selectedVariant?.attributes[group.key] === opt.value}
                  disabled={!opt.available}
                  onPress={() => handleGroupSelect(group.key, opt.value, opt.variantIds)}
                  label={group.label}
                />
              ))}
            </View>
          )}
        </View>
      ))}

      {promptError && (
        <Text style={styles.promptError}>{promptError}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  group: {
    gap: spacing[2],
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  selectedValue: {
    fontWeight: '600',
    color: colors.primary,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  swatchWrap: {
    alignItems: 'center',
    gap: spacing[1],
    minWidth: 44,
  },
  swatchOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderColor: colors.primary,
  },
  swatchInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  swatchLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    maxWidth: 56,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  promptError: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.error,
    marginTop: spacing[1],
  },
})
