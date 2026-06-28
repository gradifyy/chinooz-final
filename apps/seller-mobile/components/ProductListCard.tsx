import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Pressable,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { colors, spacing, radii } from '@chinooz/theme'
import { BottomSheet, SafeImage, FadeIn } from '@chinooz/ui'
import { formatNPR } from '@chinooz/utils'
import type { SellerProduct, SellerProductStatus } from '@chinooz/types'
import { useA11y } from './A11yProvider'

export const LOW_STOCK_THRESHOLD = 10

export interface ProductListCardProps {
  product: SellerProduct
  index: number
  selected?: boolean
  selectable?: boolean
  onSelectChange?: (id: string, selected: boolean) => void
  onEdit?: (product: SellerProduct) => void
  onDuplicate?: (product: SellerProduct) => void
  onToggleActive?: (product: SellerProduct) => void
  onDelete?: (product: SellerProduct) => void
  onStockChange?: (product: SellerProduct, stock: number) => void
  threshold?: number
}

// ---- Status config (spec colors) ----

const STATUS_CFG: Record<SellerProductStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'seller.products.statusActive', color: colors.success, bg: 'rgba(22,163,74,0.10)' },
  draft: { label: 'seller.products.statusDraft', color: colors.textMuted, bg: 'rgba(107,114,128,0.10)' },
  out_of_stock: { label: 'seller.products.statusOutOfStock', color: colors.error, bg: 'rgba(220,38,38,0.10)' },
  archived: { label: 'seller.products.statusArchived', color: colors.warning, bg: 'rgba(245,158,11,0.10)' },
}

type StockLevel = 'in_stock' | 'low' | 'out'

function stockLevel(count: number, threshold: number): StockLevel {
  if (count <= 0) return 'out'
  if (count <= threshold) return 'low'
  return 'in_stock'
}

const STOCK_CFG: Record<StockLevel, { label: string; color: string; bg: string; icon: string }> = {
  in_stock: { label: 'seller.products.stockInStock', color: colors.success, bg: 'rgba(22,163,74,0.10)', icon: '✓' },
  low: { label: 'seller.products.stockLowStock', color: colors.warning, bg: 'rgba(245,158,11,0.10)', icon: '⚠' },
  out: { label: 'seller.products.stockOutOfStock', color: colors.error, bg: 'rgba(220,38,38,0.10)', icon: '✕' },
}

// ---- Component ----

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function ProductListCard({
  product,
  index,
  selected = false,
  selectable = false,
  onSelectChange,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
  onStockChange,
  threshold = LOW_STOCK_THRESHOLD,
}: ProductListCardProps) {
  const { t } = useTranslation()
  const { reducedMotion } = useA11y()
  const [actionOpen, setActionOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [stockEditOpen, setStockEditOpen] = useState(false)
  const [stockValue, setStockValue] = useState(String(product.stockCount))

  const scale = useSharedValue(1)

  const sLevel = stockLevel(product.stockCount, threshold)
  const sCfg = STOCK_CFG[sLevel]
  const stCfg = STATUS_CFG[product.status]

  const pressAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const onPressIn = () => {
    if (!reducedMotion) scale.value = withSpring(0.98, { damping: 15, stiffness: 400 })
  }
  const onPressOut = () => {
    if (!reducedMotion) scale.value = withSpring(1, { damping: 15, stiffness: 400 })
  }

  const rowAria = t('seller.products.rowAria', {
    name: product.name,
    price: formatNPR(product.price),
    stockLabel: t(sCfg.label),
    count: product.stockCount,
    status: t(stCfg.label),
  })

  const handleCardPress = () => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    onEdit?.(product)
  }

  const handleKebabPress = () => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    setActionOpen(true)
  }

  const handleCheckboxPress = () => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    onSelectChange?.(product.id, !selected)
  }

  const handleStockSave = () => {
    const n = Math.max(0, Math.floor(Number(stockValue) || 0))
    onStockChange?.(product, n)
    setStockEditOpen(false)
    setActionOpen(false)
  }

  const handleDeleteConfirm = () => {
    setConfirmOpen(false)
    setActionOpen(false)
    onDelete?.(product)
  }

  const isActive = product.status === 'active'
  const toggleLabel = isActive ? 'seller.products.actionDeactivate' : 'seller.products.actionActivate'

  return (
    <FadeIn delay={Math.min(index * 60, 240)} style={styles.card}>
      <AnimatedPressable
        onPress={handleCardPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={rowAria}
        style={pressAnim}
      >
        <View style={[styles.cardInner, selected && styles.cardInnerSelected]}>
          {/* Selection checkbox */}
          {selectable && (
            <Pressable
              onPress={handleCheckboxPress}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={t('seller.products.selectProductAria', { name: product.name })}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.checkboxWrap}
            >
              <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                {selected && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
            </Pressable>
          )}

          {/* Thumbnail */}
          <SafeImage source={product.image} alt={product.name} style={styles.cardImage} />

          {/* Body */}
          <View style={styles.cardBody}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardName} numberOfLines={1}>{product.name}</Text>
              <Text style={[styles.statusPill, { backgroundColor: stCfg.bg, color: stCfg.color }]}>
                {t(stCfg.label)}
              </Text>
            </View>

            <Text style={styles.cardSku} numberOfLines={1}>{product.sku}</Text>
            <Text style={styles.cardCategory} numberOfLines={1}>{product.categoryName}</Text>

            <View style={styles.cardBottomRow}>
              <Text style={styles.cardPrice}>{formatNPR(product.price)}</Text>
              <View style={[styles.stockPill, { backgroundColor: sCfg.bg }]}>
                <Text style={[styles.stockIcon, { color: sCfg.color }]}>{sCfg.icon}</Text>
                <Text style={[styles.stockPillText, { color: sCfg.color }]}>
                  {t(sCfg.label)} · <Text style={styles.stockCount}>{product.stockCount}</Text>
                </Text>
              </View>
            </View>

            <Text style={styles.cardUnitsSold}>
              {t('seller.products.unitsSold', { count: product.salesCount })}
            </Text>
          </View>

          {/* Kebab button */}
          <Pressable
            onPress={handleKebabPress}
            accessibilityRole="button"
            accessibilityLabel={t('seller.products.actionSheetTitle')}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            style={styles.kebabBtn}
          >
            <Text style={styles.kebabIcon}>⋯</Text>
          </Pressable>
        </View>
      </AnimatedPressable>

      {/* Action sheet */}
      <BottomSheet visible={actionOpen} onClose={() => setActionOpen(false)} title={t('seller.products.actionSheetTitle')}>
        <ActionRow icon="✎" label={t('seller.products.actionEdit')} ariaLabel={t('seller.products.actionEditAria')} onPress={() => { setActionOpen(false); onEdit?.(product) }} />
        <ActionRow icon="⧉" label={t('seller.products.actionDuplicate')} ariaLabel={t('seller.products.actionDuplicateAria')} onPress={() => { setActionOpen(false); onDuplicate?.(product) }} />
        <ActionRow icon={isActive ? '⏸' : '▶'} label={t(toggleLabel)} ariaLabel={isActive ? t('seller.products.actionDeactivateAria') : t('seller.products.actionActivateAria')} onPress={() => { setActionOpen(false); onToggleActive?.(product) }} />
        <ActionRow icon="📦" label={t('seller.products.actionQuickStock')} ariaLabel={t('seller.products.actionQuickStockAria')} onPress={() => { setStockValue(String(product.stockCount)); setStockEditOpen(true) }} />
        <ActionRow icon="🗑" label={t('seller.products.actionDelete')} ariaLabel={t('seller.products.actionDeleteAria')} danger onPress={() => { setStockEditOpen(false); setConfirmOpen(true) }} />
      </BottomSheet>

      {/* Delete confirm */}
      <BottomSheet visible={confirmOpen} onClose={() => setConfirmOpen(false)} title={t('seller.products.actionDeleteConfirm')}>
        <Text style={styles.confirmBody}>{t('seller.products.actionDeleteConfirmBody', { name: product.name })}</Text>
        <View style={styles.confirmActions}>
          <TouchableOpacity onPress={() => setConfirmOpen(false)} style={styles.confirmCancelBtn}>
            <Text style={styles.confirmCancelText}>{t('seller.products.actionCancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteConfirm} style={styles.confirmDeleteBtn}>
            <Text style={styles.confirmDeleteText}>{t('seller.products.actionDeleteConfirmBtn')}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Quick stock edit */}
      <BottomSheet visible={stockEditOpen} onClose={() => setStockEditOpen(false)} title={t('seller.products.stockEditTitle')}>
        <Text style={styles.stockEditLabel}>{t('seller.products.stockEditLabel')}</Text>
        <View style={styles.stockEditRow}>
          <TouchableOpacity
            onPress={() => setStockValue(String(Math.max(0, Math.floor(Number(stockValue) || 0) - 1)))}
            accessibilityLabel="Decrease stock"
            style={styles.stepperBtn}
          >
            <Text style={styles.stepperIcon}>−</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.stockEditInput}
            value={stockValue}
            onChangeText={setStockValue}
            keyboardType="numeric"
            inputMode="numeric"
            accessibilityLabel={t('seller.products.stockEditLabel')}
            selectTextOnFocus
          />
          <TouchableOpacity
            onPress={() => setStockValue(String(Math.floor(Number(stockValue) || 0) + 1))}
            accessibilityLabel="Increase stock"
            style={styles.stepperBtn}
          >
            <Text style={styles.stepperIcon}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.stockEditHint}>{t('seller.products.stockEditHint')}</Text>
        <View style={styles.stockEditActions}>
          <TouchableOpacity onPress={() => setStockEditOpen(false)} style={styles.confirmCancelBtn}>
            <Text style={styles.confirmCancelText}>{t('seller.products.actionCancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleStockSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{t('seller.products.stockEditSave')}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </FadeIn>
  )
}

// ---- Skeleton ----

export function ProductListCardSkeleton() {
  return (
    <View style={styles.skeletonCard} aria-busy={true}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonBody}>
        <View style={[styles.skeletonLine, { width: '70%', height: 14 }]} />
        <View style={[styles.skeletonLine, { width: '40%', height: 12, marginTop: 6 }]} />
        <View style={[styles.skeletonLine, { width: '50%', height: 12, marginTop: 4 }]} />
        <View style={[styles.skeletonLine, { width: '30%', height: 14, marginTop: 8 }]} />
      </View>
    </View>
  )
}

// ---- Helpers ----

function ActionRow({
  icon,
  label,
  ariaLabel,
  onPress,
  danger,
}: {
  icon: string
  label: string
  ariaLabel: string
  onPress: () => void
  danger?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      style={styles.actionRow}
    >
      <Text style={[styles.actionIcon, danger && styles.actionIconDanger]}>{icon}</Text>
      <Text style={[styles.actionLabel, danger && styles.actionLabelDanger]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'transparent' },
  cardInner: {
    flexDirection: 'row',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    alignItems: 'flex-start',
  },
  cardInnerSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  checkboxWrap: { paddingTop: spacing[1] },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxTick: { color: colors.white, fontSize: 13, fontWeight: '700' },

  cardImage: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.borderLight },
  cardBody: { flex: 1, minWidth: 0 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  cardName: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  statusPill: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radii.full,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  cardSku: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  cardCategory: { fontSize: 12, fontWeight: '400', color: colors.textMuted, marginTop: 1 },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[2],
    gap: spacing[2],
  },
  cardPrice: { fontSize: 14, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  stockIcon: { fontSize: 11, fontWeight: '700' },
  stockPillText: { fontSize: 12, fontWeight: '600' },
  stockCount: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  cardUnitsSold: { fontSize: 12, fontWeight: '400', color: colors.textMuted, marginTop: spacing[1] },

  kebabBtn: { padding: spacing[1], marginTop: 2 },
  kebabIcon: { fontSize: 20, color: colors.textMuted, fontWeight: '700' },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  actionIcon: { fontSize: 18, color: colors.textMuted, width: 24, textAlign: 'center' },
  actionIconDanger: { color: colors.error },
  actionLabel: { fontSize: 15, color: colors.text, fontWeight: '500' },
  actionLabelDanger: { color: colors.error },

  confirmBody: { fontSize: 14, color: colors.textMuted, lineHeight: 20, paddingHorizontal: spacing[4], marginTop: spacing[2] },
  confirmActions: { flexDirection: 'row', gap: spacing[3], paddingHorizontal: spacing[4], marginTop: spacing[5] },
  confirmCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: colors.text },
  confirmDeleteBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteText: { fontSize: 14, fontWeight: '700', color: colors.white },

  stockEditLabel: { fontSize: 14, fontWeight: '600', color: colors.text, paddingHorizontal: spacing[4], marginTop: spacing[2], marginBottom: spacing[2] },
  stockEditRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4] },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperIcon: { fontSize: 22, color: colors.text, fontWeight: '400' },
  stockEditInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.surface,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  stockEditHint: { fontSize: 12, color: colors.textMuted, paddingHorizontal: spacing[4], marginTop: spacing[2] },
  stockEditActions: { flexDirection: 'row', gap: spacing[3], paddingHorizontal: spacing[4], marginTop: spacing[5] },
  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },

  skeletonCard: {
    flexDirection: 'row',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
  },
  skeletonImage: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.shimmer },
  skeletonBody: { flex: 1 },
  skeletonLine: { backgroundColor: colors.shimmer, borderRadius: radii.sm },
})
