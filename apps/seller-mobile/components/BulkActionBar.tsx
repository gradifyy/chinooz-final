import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { colors, spacing, radii } from '@chinooz/theme'
import { BottomSheet, Button } from '@chinooz/ui'
import { formatNPR } from '@chinooz/utils'
import type { SellerProduct } from '@chinooz/types'
import { useA11y } from './A11yProvider'

export type BulkAction =
  | 'activate'
  | 'deactivate'
  | 'delete'
  | 'setCategory'
  | 'adjustPrice'
  | 'updateStock'

export interface BulkActionParams {
  categoryId?: string
  priceMode?: 'percent' | 'amount'
  priceValue?: number
  stockValue?: number
}

export interface BulkActionBarProps {
  selectedCount: number
  totalCount: number
  allSelected: boolean
  indeterminate: boolean
  onSelectAll: () => void
  onClearSelection: () => void
  onApply: (action: BulkAction, params?: BulkActionParams) => Promise<boolean>
  categories?: { id: string; name: string }[]
}

const SPRING_CONFIG = { damping: 25, stiffness: 300, mass: 0.8 }

const ACTION_ICONS: Record<BulkAction, string> = {
  activate: '▶',
  deactivate: '⏸',
  delete: '🗑',
  setCategory: '🏷',
  adjustPrice: '₨',
  updateStock: '📦',
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  allSelected,
  indeterminate,
  onSelectAll,
  onClearSelection,
  onApply,
  categories,
}: BulkActionBarProps) {
  const { t } = useTranslation()
  const { reducedMotion } = useA11y()
  const [actionSheetOpen, setActionSheetOpen] = useState(false)
  const [activeDialog, setActiveDialog] = useState<BulkAction | null>(null)
  const [snackbar, setSnackbar] = useState<{ message: string; isError: boolean } | null>(null)
  const [applying, setApplying] = useState(false)

  const slideY = useSharedValue(100)
  const snackbarOpacity = useSharedValue(0)
  const snackbarTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (selectedCount > 0) {
      slideY.value = reducedMotion ? 0 : withSpring(0, SPRING_CONFIG)
    } else {
      slideY.value = reducedMotion ? 100 : withTiming(100, { duration: 250 })
    }
  }, [selectedCount, reducedMotion])

  useEffect(() => {
    return () => { if (snackbarTimer.current) clearTimeout(snackbarTimer.current) }
  }, [])

  const showSnackbar = (message: string, isError = false) => {
    setSnackbar({ message, isError })
    snackbarOpacity.value = reducedMotion ? 1 : withTiming(1, { duration: 200 })
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current)
    snackbarTimer.current = setTimeout(() => {
      setSnackbar(null)
      snackbarOpacity.value = reducedMotion ? 0 : withTiming(0, { duration: 200 })
    }, 3000)
  }

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
    opacity: slideY.value === 0 ? 1 : slideY.value < 50 ? 0.5 : 0,
  }))

  const snackbarStyle = useAnimatedStyle(() => ({
    opacity: snackbarOpacity.value,
    transform: [{ translateY: snackbarOpacity.value === 1 ? 0 : 20 }],
  }))

  const handleApply = async (action: BulkAction, params?: BulkActionParams) => {
    setApplying(true)
    try {
      const ok = await onApply(action, params)
      const resultKey =
        action === 'delete' ? 'seller.products.bulkResultDeleted'
        : action === 'activate' ? 'seller.products.bulkResultActivated'
        : action === 'deactivate' ? 'seller.products.bulkResultDeactivated'
        : 'seller.products.bulkResultUpdated'
      if (ok) {
        try { if (!reducedMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
        showSnackbar(t(resultKey, { count: selectedCount }))
      } else {
        try { if (!reducedMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error) } catch {}
        showSnackbar(t('seller.products.bulkError'), true)
      }
      setActiveDialog(null)
      setActionSheetOpen(false)
    } finally {
      setApplying(false)
    }
  }

  const openActions = () => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    setActionSheetOpen(true)
  }

  const openDialog = (action: BulkAction) => {
    setActionSheetOpen(false)
    setActiveDialog(action)
  }

  const actions: { key: BulkAction; label: string; ariaLabel: string; danger?: boolean }[] = [
    { key: 'activate', label: t('seller.products.bulkActivate'), ariaLabel: t('seller.products.bulkActivateAria') },
    { key: 'deactivate', label: t('seller.products.bulkDeactivate'), ariaLabel: t('seller.products.bulkDeactivateAria') },
    { key: 'setCategory', label: t('seller.products.bulkSetCategory'), ariaLabel: t('seller.products.bulkSetCategoryAria') },
    { key: 'adjustPrice', label: t('seller.products.bulkAdjustPrice'), ariaLabel: t('seller.products.bulkAdjustPriceAria') },
    { key: 'updateStock', label: t('seller.products.bulkUpdateStock'), ariaLabel: t('seller.products.bulkUpdateStockAria') },
    { key: 'delete', label: t('seller.products.bulkDelete'), ariaLabel: t('seller.products.bulkDeleteAria'), danger: true },
  ]

  return (
    <>
      {/* Bulk action bar — slides up from bottom */}
      <Animated.View style={[styles.barContainer, barStyle]} pointerEvents={selectedCount > 0 ? 'auto' : 'none'}>
        <View
          role="toolbar"
          accessibilityLabel={t('seller.products.bulkBarAria', { count: selectedCount })}
          style={styles.bar}
        >
          {/* Select-all checkbox */}
          <Pressable
            onPress={onSelectAll}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: allSelected }}
            accessibilityLabel={indeterminate ? t('seller.products.selectAllAria') : t('seller.products.selectAllAria')}
            style={styles.selectAllBtn}
          >
            <View style={[styles.checkbox, allSelected && styles.checkboxChecked, indeterminate && styles.checkboxIndeterminate]}>
              {allSelected && <Text style={styles.checkboxTick}>✓</Text>}
              {indeterminate && <View style={styles.checkboxDash} />}
            </View>
            <Text style={styles.selectAllText}>{t('seller.products.selectAll')}</Text>
          </Pressable>

          <Text style={styles.selectedCount}>
            {t('seller.products.bulkSelected', { count: selectedCount })}
          </Text>

          <TouchableOpacity
            onPress={openActions}
            accessibilityRole="button"
            accessibilityLabel={t('seller.products.actionSheetTitle')}
            style={styles.actionsBtn}
          >
            <Text style={styles.actionsBtnText}>{t('seller.products.bulkApply')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClearSelection}
            accessibilityRole="button"
            accessibilityLabel={t('seller.products.clearSelectionAria')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.clearBtn}
          >
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Action selection sheet */}
      <BottomSheet visible={actionSheetOpen} onClose={() => setActionSheetOpen(false)} title={t('seller.products.actionSheetTitle')}>
        {actions.map(a => (
          <TouchableOpacity
            key={a.key}
            onPress={() => openDialog(a.key)}
            accessibilityRole="button"
            accessibilityLabel={a.ariaLabel}
            style={styles.actionRow}
          >
            <Text style={[styles.actionIcon, a.danger && styles.actionIconDanger]}>{ACTION_ICONS[a.key]}</Text>
            <Text style={[styles.actionLabel, a.danger && styles.actionLabelDanger]}>{a.label}</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </BottomSheet>

      {/* Confirm / input dialogs */}
      <BulkDialogMobile
        action={activeDialog}
        count={selectedCount}
        categories={categories}
        applying={applying}
        onApply={(params) => activeDialog && handleApply(activeDialog, params)}
        onCancel={() => setActiveDialog(null)}
      />

      {/* Snackbar */}
      {snackbar && (
        <Animated.View style={[styles.snackbarWrap, snackbarStyle]} pointerEvents="none">
          <View style={[styles.snackbar, snackbar.isError && styles.snackbarError]}>
            <Text style={[styles.snackbarText, snackbar.isError && styles.snackbarTextError]}>
              {snackbar.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </>
  )
}

// ---- Mobile dialog (BottomSheet-based) ----

function BulkDialogMobile({
  action,
  count,
  categories,
  applying,
  onApply,
  onCancel,
}: {
  action: BulkAction | null
  count: number
  categories?: { id: string; name: string }[]
  applying: boolean
  onApply: (params?: BulkActionParams) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [categoryId, setCategoryId] = useState('')
  const [priceMode, setPriceMode] = useState<'percent' | 'amount'>('percent')
  const [priceValue, setPriceValue] = useState('')
  const [stockValue, setStockValue] = useState('')

  useEffect(() => {
    if (action) {
      setCategoryId('')
      setPriceMode('percent')
      setPriceValue('')
      setStockValue('')
    }
  }, [action])

  if (!action) return null

  const isDelete = action === 'delete'
  const isConfirm = action === 'activate' || action === 'deactivate' || action === 'delete'
  const isInput = action === 'setCategory' || action === 'adjustPrice' || action === 'updateStock'

  const title =
    action === 'delete' ? t('seller.products.bulkDeleteConfirm', { count })
    : action === 'activate' ? t('seller.products.bulkActivateConfirm', { count })
    : action === 'deactivate' ? t('seller.products.bulkDeactivateConfirm', { count })
    : action === 'setCategory' ? t('seller.products.bulkSetCategory')
    : action === 'adjustPrice' ? t('seller.products.bulkAdjustPrice')
    : t('seller.products.bulkUpdateStock')

  const body =
    action === 'delete' ? t('seller.products.bulkDeleteConfirmBody', { count })
    : action === 'deactivate' ? t('seller.products.bulkDeactivateConfirmBody')
    : ''

  const canApply = (() => {
    if (action === 'setCategory') return !!categoryId
    if (action === 'adjustPrice') return priceValue !== '' && !isNaN(Number(priceValue))
    if (action === 'updateStock') return stockValue !== '' && !isNaN(Number(stockValue))
    return true
  })()

  const handleApply = () => {
    if (!canApply) return
    const params: BulkActionParams = {}
    if (action === 'setCategory') params.categoryId = categoryId
    if (action === 'adjustPrice') { params.priceMode = priceMode; params.priceValue = Number(priceValue) }
    if (action === 'updateStock') params.stockValue = Math.max(0, Math.floor(Number(stockValue)))
    onApply(isConfirm ? undefined : params)
  }

  const confirmLabel =
    action === 'delete' ? t('seller.products.bulkDeleteConfirmBtn', { count })
    : t('seller.products.bulkApply')

  return (
    <BottomSheet visible={!!action} onClose={onCancel} title={title}>
      {body ? <Text style={styles.dialogBody}>{body}</Text> : null}

      {action === 'setCategory' && (
        <ScrollView style={styles.dialogCategoryList}>
          {categories?.map(c => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: categoryId === c.id }}
              style={[styles.categoryRow, categoryId === c.id && styles.categoryRowActive]}
            >
              <Text style={[styles.categoryLabel, categoryId === c.id && styles.categoryLabelActive]}>{c.name}</Text>
              {categoryId === c.id && <Text style={styles.categoryCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {action === 'adjustPrice' && (
        <View style={styles.dialogSection}>
          <Text style={styles.dialogLabel}>{t('seller.products.bulkPriceMode')}</Text>
          <View style={styles.priceModeRow}>
            <TouchableOpacity
              onPress={() => setPriceMode('percent')}
              accessibilityRole="radio"
              accessibilityState={{ selected: priceMode === 'percent' }}
              style={[styles.priceModeBtn, priceMode === 'percent' && styles.priceModeBtnActive]}
            >
              <Text style={[styles.priceModeText, priceMode === 'percent' && styles.priceModeTextActive]}>
                {t('seller.products.bulkPricePercent')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPriceMode('amount')}
              accessibilityRole="radio"
              accessibilityState={{ selected: priceMode === 'amount' }}
              style={[styles.priceModeBtn, priceMode === 'amount' && styles.priceModeBtnActive]}
            >
              <Text style={[styles.priceModeText, priceMode === 'amount' && styles.priceModeTextActive]}>
                {t('seller.products.bulkPriceAmount')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.dialogLabel}>{t('seller.products.bulkPriceValue')}</Text>
          <TextInput
            style={styles.dialogInput}
            value={priceValue}
            onChangeText={setPriceValue}
            placeholder={priceMode === 'percent' ? '10' : '100'}
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            inputMode="numeric"
            accessibilityLabel={t('seller.products.bulkPriceValue')}
          />
          <Text style={styles.dialogHint}>
            {priceMode === 'percent' ? t('seller.products.bulkPricePercentHint') : t('seller.products.bulkPriceAmountHint')}
          </Text>
        </View>
      )}

      {action === 'updateStock' && (
        <View style={styles.dialogSection}>
          <Text style={styles.dialogLabel}>{t('seller.products.bulkStockValue')}</Text>
          <TextInput
            style={styles.dialogInput}
            value={stockValue}
            onChangeText={setStockValue}
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            inputMode="numeric"
            accessibilityLabel={t('seller.products.bulkStockValue')}
          />
        </View>
      )}

      <View style={styles.dialogActions}>
        <TouchableOpacity onPress={onCancel} style={styles.dialogCancelBtn} disabled={applying}>
          <Text style={styles.dialogCancelText}>{t('seller.products.bulkCancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleApply}
          disabled={applying || !canApply}
          style={[styles.dialogConfirmBtn, isDelete ? styles.dialogDeleteBtn : styles.dialogApplyBtn, (applying || !canApply) && styles.dialogBtnDisabled]}
        >
          <Text style={styles.dialogConfirmText}>
            {applying ? '…' : confirmLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  barContainer: {
    position: 'absolute',
    bottom: spacing[4],
    left: spacing[4],
    right: spacing[4],
    zIndex: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxIndeterminate: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxTick: { color: colors.white, fontSize: 12, fontWeight: '700' },
  checkboxDash: { width: 10, height: 2, backgroundColor: colors.white, borderRadius: 1 },
  selectAllText: { fontSize: 13, fontWeight: '600', color: colors.text },
  selectedCount: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center' },
  actionsBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  clearBtn: { padding: spacing[1] },
  clearIcon: { fontSize: 16, color: colors.textMuted },

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
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.text },
  actionLabelDanger: { color: colors.error },
  actionChevron: { fontSize: 18, color: colors.textTertiary },

  dialogBody: { fontSize: 14, color: colors.textMuted, lineHeight: 20, paddingHorizontal: spacing[4], marginBottom: spacing[3] },
  dialogSection: { paddingHorizontal: spacing[4], marginBottom: spacing[3] },
  dialogLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: spacing[3], marginBottom: spacing[2] },
  dialogHint: { fontSize: 12, color: colors.textMuted, marginTop: spacing[1.5] },
  dialogInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  priceModeRow: { flexDirection: 'row', gap: spacing[2] },
  priceModeBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceModeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  priceModeText: { fontSize: 14, fontWeight: '600', color: colors.text },
  priceModeTextActive: { color: colors.primary },

  dialogCategoryList: { maxHeight: 300 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  categoryRowActive: { backgroundColor: colors.primary50 },
  categoryLabel: { fontSize: 15, color: colors.text },
  categoryLabelActive: { color: colors.primary, fontWeight: '600' },
  categoryCheck: { color: colors.primary, fontSize: 16, fontWeight: '700' },

  dialogActions: { flexDirection: 'row', gap: spacing[3], paddingHorizontal: spacing[4], marginTop: spacing[5] },
  dialogCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogCancelText: { fontSize: 14, fontWeight: '600', color: colors.text },
  dialogConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogApplyBtn: { backgroundColor: colors.primary },
  dialogDeleteBtn: { backgroundColor: colors.error },
  dialogBtnDisabled: { opacity: 0.5 },
  dialogConfirmText: { fontSize: 14, fontWeight: '700', color: colors.white },

  snackbarWrap: {
    position: 'absolute',
    bottom: spacing[20],
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  snackbar: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  snackbarError: { backgroundColor: colors.error, borderColor: colors.error },
  snackbarText: { fontSize: 14, fontWeight: '600', color: colors.text },
  snackbarTextError: { color: colors.white },
})
