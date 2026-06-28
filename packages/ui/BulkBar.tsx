import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { X, Layers, SlidersHorizontal, PackageX, Upload, Download } from 'lucide-react-native'
import { colors, radii, spacing, fontFamily } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { BulkStockAction } from '@chinooz/types'

const AnimatedView = Animated.createAnimatedComponent(View)

export interface BulkBarProps {
  selectedCount: number
  onAction: (action: BulkStockAction) => void
  onClear: () => void
  onExport?: () => void
  onImport?: () => void
}

export default function BulkBar({ selectedCount, onAction, onClear, onExport, onImport }: BulkBarProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const translateY = useSharedValue(selectedCount > 0 ? 0 : 100)
  const opacity = useSharedValue(selectedCount > 0 ? 1 : 0)

  React.useEffect(() => {
    if (reduced) {
      translateY.value = selectedCount > 0 ? 0 : 100
      opacity.value = selectedCount > 0 ? 1 : 0
    } else {
      translateY.value = withSpring(selectedCount > 0 ? 0 : 100, { damping: 25, stiffness: 300, mass: 0.8 })
      opacity.value = withSpring(selectedCount > 0 ? 1 : 0, { damping: 25, stiffness: 300 })
    }
  }, [selectedCount, reduced])

  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }], opacity: opacity.value }))

  if (selectedCount === 0) return null

  const actions: { key: BulkStockAction; labelKey: string; Icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
    { key: 'set', labelKey: 'seller.inventory.bulkSet', Icon: SlidersHorizontal },
    { key: 'adjust', labelKey: 'seller.inventory.bulkAdjust', Icon: Layers },
    { key: 'threshold', labelKey: 'seller.inventory.bulkThreshold', Icon: SlidersHorizontal },
    { key: 'mark_out', labelKey: 'seller.inventory.bulkMarkOut', Icon: PackageX },
  ]

  return (
    <AnimatedView
      style={[styles.container, animStyle]}
      accessibilityRole="toolbar"
      accessibilityLabel={t('seller.inventory.selected', { count: selectedCount })}
    >
      <View style={styles.header}>
        <Text style={styles.count}>{t('seller.inventory.selected', { count: selectedCount })}</Text>
        <TouchableOpacity onPress={onClear} accessibilityLabel={t('seller.inventory.clearAria')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
        {actions.map(({ key, labelKey, Icon }) => (
          <TouchableOpacity
            key={key}
            onPress={() => onAction(key)}
            accessibilityRole="button"
            accessibilityLabel={t(labelKey)}
            style={[styles.actionBtn, key === 'mark_out' && styles.actionBtnDestructive]}
          >
            <Icon size={14} color={key === 'mark_out' ? colors.error : colors.text} />
            <Text style={[styles.actionBtnText, key === 'mark_out' && styles.actionBtnTextDestructive]}>
              {t(labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
        {onImport && (
          <TouchableOpacity onPress={onImport} accessibilityRole="button" accessibilityLabel={t('seller.inventory.import')} style={styles.actionBtn}>
            <Upload size={14} color={colors.textMuted} />
            <Text style={styles.actionBtnText}>{t('seller.inventory.import')}</Text>
          </TouchableOpacity>
        )}
        {onExport && (
          <TouchableOpacity onPress={onExport} accessibilityRole="button" accessibilityLabel={t('seller.inventory.export')} style={styles.actionBtn}>
            <Download size={14} color={colors.textMuted} />
            <Text style={styles.actionBtnText}>{t('seller.inventory.export')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </AnimatedView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    gap: spacing[2],
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontSize: 14, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1.5],
    paddingHorizontal: spacing[3], height: 36, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  actionBtnDestructive: { borderColor: colors.error + '40' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  actionBtnTextDestructive: { color: colors.error },
})
