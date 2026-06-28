import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { Check, Minus, Plus, AlertTriangle, PackageX, Boxes, Pencil, X, AlertCircle } from 'lucide-react-native'
import { colors, radii, spacing, fontFamily } from '@chinooz/theme'
import SafeImage from './SafeImage'
import Skeleton from './Skeleton'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { InventoryRowProps } from '@chinooz/types/components'
import type { StockStatus, StockEditMode, StockEditReason } from '@chinooz/types'

const DEFAULT_THRESHOLD = 10
const LARGE_CHANGE_ABS = 100
const LARGE_CHANGE_PCT = 50

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

const STATUS_META: Record<
  StockStatus,
  { bg: string; text: string; dot: string; Icon: React.ComponentType<{ size?: number; color?: string }>; labelKey: string }
> = {
  in_stock: { bg: colors.successLight, text: colors.success, dot: colors.success, Icon: Boxes, labelKey: 'seller.inventory.inStock' },
  low_stock: { bg: colors.warningLight, text: colors.warning, dot: colors.warning, Icon: AlertTriangle, labelKey: 'seller.inventory.lowStock' },
  out_of_stock: { bg: colors.errorLight, text: colors.error, dot: colors.error, Icon: PackageX, labelKey: 'seller.inventory.outOfStock' },
}

const STOCK_COLOR: Record<StockStatus, string> = {
  in_stock: colors.text,
  low_stock: colors.warning,
  out_of_stock: colors.error,
}

const REASONS: StockEditReason[] = ['restock', 'correction', 'damage', 'loss', 'return', 'other']
const REASON_LABELS: Record<StockEditReason, string> = {
  restock: 'seller.inventory.reasonRestock',
  correction: 'seller.inventory.reasonCorrection',
  damage: 'seller.inventory.reasonDamage',
  loss: 'seller.inventory.reasonLoss',
  return: 'seller.inventory.reasonReturn',
  other: 'seller.inventory.reasonOther',
}

function StatusPill({ status }: { status: StockStatus }) {
  const { t } = useTranslation()
  const m = STATUS_META[status]
  const Icon = m.Icon
  return (
    <View style={[styles.statusPill, { backgroundColor: m.bg }]}>
      <Icon size={11} color={m.text} />
      <Text style={[styles.statusPillText, { color: m.text }]}>{t(m.labelKey)}</Text>
    </View>
  )
}

function VariantLabel({ attributes, name }: { attributes: Record<string, string>; name: string }) {
  const parts = Object.values(attributes)
  const label = parts.length > 0 ? parts.join(' / ') : name
  return (
    <View style={styles.variantChip}>
      <Text style={styles.variantChipText} numberOfLines={1}>{label}</Text>
    </View>
  )
}

function StepperButton({ onPress, disabled, ariaLabel, children }: {
  onPress: () => void; disabled?: boolean; ariaLabel: string; children: React.ReactNode
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      style={[styles.stepperBtn, disabled && styles.stepperBtnDisabled]}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      {children}
    </TouchableOpacity>
  )
}

function QuickStockControl({ value, onCommit }: { value: number; onCommit?: (v: number) => void }) {
  const [local, setLocal] = useState(value)
  const [focused, setFocused] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => { if (!focused) setLocal(value) }, [value, focused])
  const clamp = (v: number) => Math.max(0, isNaN(v) ? 0 : v)
  const schedule = (v: number) => { setLocal(v); if (!onCommit) return; clearTimeout(timer.current); timer.current = setTimeout(() => onCommit(v), 600) }
  const commitNow = () => { clearTimeout(timer.current); if (onCommit) onCommit(local) }

  return (
    <View style={styles.stockControl}>
      <StepperButton onPress={() => { const v = clamp(local - 1); schedule(v); onCommit?.(v) }} disabled={local <= 0} ariaLabel="Decrease stock">
        <Minus size={15} color={colors.text} />
      </StepperButton>
      <TextInput
        value={String(local)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); commitNow() }}
        onChangeText={t => schedule(clamp(Number(t.replace(/[^0-9]/g, ''))))}
        onSubmitEditing={commitNow}
        inputMode="numeric"
        returnKeyType="done"
        accessibilityLabel="Stock on hand"
        style={styles.stockInput}
      />
      <StepperButton onPress={() => { const v = clamp(local + 1); schedule(v); onCommit?.(v) }} ariaLabel="Increase stock">
        <Plus size={15} color={colors.text} />
      </StepperButton>
    </View>
  )
}

function Checkbox({ checked, onChange, ariaLabel }: { checked: boolean; onChange: () => void; ariaLabel: string }) {
  return (
    <TouchableOpacity
      onPress={onChange}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={ariaLabel}
      style={[styles.checkbox, checked && styles.checkboxChecked]}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {checked && <Check size={14} color={colors.white} strokeWidth={3} />}
    </TouchableOpacity>
  )
}

function InventoryRowSkeleton() {
  return (
    <View style={styles.skeletonRow} accessibilityLiveRegion="polite" accessibilityRole="progressbar">
      <Skeleton width={36} height={36} borderRadius={radii.md} />
      <View style={{ flex: 1, gap: spacing[1.5] }}>
        <Skeleton width="70%" height={14} />
        <Skeleton width="40%" height={10} />
      </View>
      <Skeleton width={80} height={32} borderRadius={radii.sm} />
      <Skeleton width={48} height={16} />
      <Skeleton width={72} height={20} borderRadius={radii.full} />
    </View>
  )
}

/** Mobile edit sheet — set/adjust toggle + value + reason + note. */
function EditSheet({
  visible,
  variant,
  onConfirm,
  onClose,
}: {
  visible: boolean
  variant: { id: string; name: string; sku: string; stockCount: number; productName?: string }
  onConfirm: (newStock: number, mode: StockEditMode, reason: StockEditReason, note?: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<StockEditMode>('set')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState<StockEditReason>('restock')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (visible) { setMode('set'); setValue(''); setReason('restock'); setNote('') }
  }, [visible])

  const numValue = Number(value.replace(/[^0-9-]/g, '')) || 0
  const computedStock = mode === 'adjust' ? Math.max(0, variant.stockCount + numValue) : Math.max(0, numValue)
  const canSave = mode === 'adjust' ? numValue !== 0 : value !== '' && numValue >= 0

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContent} accessibilityRole="alert">
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{t('seller.inventory.edit')}</Text>
                <TouchableOpacity onPress={onClose} accessibilityLabel={t('seller.inventory.cancel')}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Mode toggle */}
              <View style={styles.modeToggle} accessibilityRole="tablist">
                {(['set', 'adjust'] as StockEditMode[]).map(m => (
                  <TouchableOpacity
                    key={m}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: mode === m }}
                    onPress={() => { setMode(m); setValue('') }}
                    style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                  >
                    <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                      {t(m === 'set' ? 'seller.inventory.modeSet' : 'seller.inventory.modeAdjust')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Value input */}
              <TextInput
                value={value}
                onChangeText={v => setValue(v.replace(/[^0-9-]/g, ''))}
                onSubmitEditing={() => canSave && onConfirm(computedStock, mode, reason, note || undefined)}
                placeholder={mode === 'set' ? t('seller.inventory.setPlaceholder') : t('seller.inventory.adjustPlaceholder')}
                inputMode="numeric"
                accessibilityLabel={mode === 'set' ? t('seller.inventory.setPlaceholder') : t('seller.inventory.adjustPlaceholder')}
                style={styles.sheetInput}
                placeholderTextColor={colors.textTertiary}
                autoFocus
              />
              <Text style={styles.preview}>
                {mode === 'adjust' ? `${variant.stockCount} → ${computedStock}` : `${t('seller.inventory.colStock')}: ${variant.stockCount}`}
              </Text>

              {/* Reason chips */}
              <Text style={styles.sheetLabel}>{t('seller.inventory.reason')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
                {REASONS.map(r => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setReason(r)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: reason === r }}
                    accessibilityLabel={t(REASON_LABELS[r])}
                    style={[styles.reasonChip, reason === r && styles.reasonChipActive]}
                  >
                    <Text style={[styles.reasonChipText, reason === r && styles.reasonChipTextActive]}>
                      {t(REASON_LABELS[r])}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Note */}
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t('seller.inventory.notePlaceholder')}
                accessibilityLabel={t('seller.inventory.note')}
                style={styles.sheetInput}
                placeholderTextColor={colors.textTertiary}
              />

              <View style={styles.sheetActions}>
                <TouchableOpacity onPress={onClose} style={styles.sheetBtnSecondary}>
                  <Text style={styles.sheetBtnSecondaryText}>{t('seller.inventory.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => canSave && onConfirm(computedStock, mode, reason, note || undefined)}
                  disabled={!canSave}
                  style={[styles.sheetBtnPrimary, !canSave && styles.sheetBtnDisabled]}
                >
                  <Text style={styles.sheetBtnPrimaryText}>{t('seller.inventory.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

/** Mobile confirm sheet for large changes. */
function ConfirmSheet({
  visible,
  from,
  to,
  onConfirm,
  onCancel,
}: {
  visible: boolean
  from: number
  to: number
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const delta = to - from
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.confirmContent} accessibilityRole="alert">
              <View style={styles.confirmHeader}>
                <AlertTriangle size={20} color={colors.warning} />
                <Text style={styles.confirmTitle}>{t('seller.inventory.confirmTitle')}</Text>
              </View>
              <Text style={styles.confirmBody}>
                {t('seller.inventory.confirmBody', { from, to, delta: delta > 0 ? `+${delta}` : delta })}
              </Text>
              <View style={styles.sheetActions}>
                <TouchableOpacity onPress={onCancel} style={styles.sheetBtnSecondary}>
                  <Text style={styles.sheetBtnSecondaryText}>{t('seller.inventory.confirmCancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onConfirm} style={styles.sheetBtnPrimary}>
                  <Text style={styles.sheetBtnPrimaryText}>{t('seller.inventory.confirmConfirm')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

export default function InventoryRow({
  variant,
  lowStockThreshold = DEFAULT_THRESHOLD,
  onStockChange,
  selected = false,
  onToggleSelect,
  loading = false,
  layout = 'compact',
  editable = false,
  editState = 'idle',
  largeChangeThreshold = LARGE_CHANGE_ABS,
  largeChangePercent = LARGE_CHANGE_PCT,
  testID,
}: InventoryRowProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  const scale = useSharedValue(1)
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const [editOpen, setEditOpen] = useState(false)
  const [confirmData, setConfirmData] = useState<{ newStock: number; mode: StockEditMode; reason: StockEditReason; note?: string } | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const pressIn = useCallback(() => {
    if (reduced) return
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 })
  }, [reduced])
  const pressOut = useCallback(() => {
    if (reduced) return
    scale.value = withSpring(1, { damping: 15, stiffness: 300 })
  }, [reduced])

  useEffect(() => {
    if (editState === 'saved') {
      setSavedFlash(true)
      clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSavedFlash(false), 1500)
    }
    if (editState === 'saving') setSavedFlash(false)
  }, [editState])

  if (loading) return <InventoryRowSkeleton />

  const threshold = variant.lowStockThreshold ?? lowStockThreshold
  const stockColor = STOCK_COLOR[variant.stock]
  const statusMeta = STATUS_META[variant.stock]
  const ariaLabel = `${variant.productName ?? variant.name}, ${variant.sku}, ${variant.stockCount} units, ${t(statusMeta.labelKey)}`

  const isLargeChange = (newStock: number) => {
    const delta = Math.abs(newStock - variant.stockCount)
    if (delta > largeChangeThreshold) return true
    if (variant.stockCount > 0) {
      const pct = (delta / variant.stockCount) * 100
      if (pct > largeChangePercent) return true
    }
    return false
  }

  const handleCommit = (newStock: number, mode: StockEditMode = 'set', reason: StockEditReason = 'restock', note?: string) => {
    if (newStock < 0) return
    if (isLargeChange(newStock)) { setConfirmData({ newStock, mode, reason, note }); return }
    onStockChange?.(newStock, mode, reason)
  }
  const handleQuickCommit = (v: number) => handleCommit(v, 'set', 'restock')
  const handleConfirm = () => {
    if (confirmData) onStockChange?.(confirmData.newStock, confirmData.mode, confirmData.reason)
    setConfirmData(null)
  }

  const content = (
    <>
      {onToggleSelect && <Checkbox checked={selected} onChange={() => onToggleSelect(variant.id)} ariaLabel="Select variant" />}
      <SafeImage source={variant.image} style={styles.thumb} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.name} numberOfLines={1}>{variant.productName ?? variant.name}</Text>
        <View style={styles.metaRow}>
          <VariantLabel attributes={variant.attributes} name={variant.name} />
          <Text style={styles.sku} numberOfLines={1}>{variant.sku}</Text>
        </View>
      </View>

      <View style={styles.stockCol}>
        <Text style={[styles.stockFig, { color: stockColor }]}>{variant.stockCount}</Text>
        <Text style={styles.threshold}>min {threshold}</Text>
      </View>

      <QuickStockControl value={variant.stockCount} onCommit={handleQuickCommit} />

      {editable && (
        <TouchableOpacity
          onPress={() => setEditOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('seller.inventory.editAria', { name: variant.productName ?? variant.name })}
          style={styles.editBtn}
        >
          <Pencil size={14} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      <View style={styles.statusCol}>
        {savedFlash && editState === 'saved' && (
          <View style={styles.savedCheck} accessibilityRole="text" accessibilityLiveRegion="polite">
            <Check size={11} color={colors.success} strokeWidth={3} />
          </View>
        )}
        {editState === 'error' && (
          <View style={styles.errorAlert} accessibilityRole="alert">
            <AlertCircle size={11} color={colors.error} />
          </View>
        )}
        <StatusPill status={variant.stock} />
      </View>
    </>
  )

  const row = layout === 'table' ? (
    <View testID={testID} accessibilityRole="summary" accessibilityLabel={ariaLabel} style={styles.tableRow}>
      {content}
    </View>
  ) : (
    <AnimatedTouchable
      testID={testID}
      accessibilityRole="summary"
      accessibilityLabel={ariaLabel}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={0.9}
      style={[styles.compactRow, cardStyle]}
    >
      {content}
    </AnimatedTouchable>
  )

  return (
    <>
      {row}
      {editable && (
        <EditSheet
          visible={editOpen}
          variant={variant}
          onConfirm={(ns, m, r, n) => { handleCommit(ns, m, r, n); setEditOpen(false) }}
          onClose={() => setEditOpen(false)}
        />
      )}
      <ConfirmSheet
        visible={!!confirmData}
        from={variant.stockCount}
        to={confirmData?.newStock ?? 0}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmData(null)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[3],
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  thumb: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.borderLight },
  name: { fontSize: 16, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[1] },
  variantChip: {
    backgroundColor: colors.background,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  variantChipText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary, fontFamily: fontFamily.sans[0] },
  sku: { fontSize: 12, fontWeight: '400', color: colors.textMuted, fontFamily: 'monospace', flex: 1 },
  stockCol: { alignItems: 'flex-end', gap: 1, width: 56 },
  stockFig: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansSemiBold[0] },
  threshold: { fontSize: 12, fontWeight: '400', color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  stockControl: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  stepperBtn: {
    width: 32, height: 32, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.4 },
  stockInput: {
    width: 44, height: 32, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    backgroundColor: colors.surface, textAlign: 'center', fontSize: 14, fontWeight: '600',
    color: colors.text, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansSemiBold[0],
    paddingVertical: 0, paddingHorizontal: spacing[1],
  },
  editBtn: {
    width: 32, height: 32, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  statusCol: { width: 92, alignItems: 'flex-end', flexDirection: 'row', gap: spacing[1], justifyContent: 'flex-end' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1],
    paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radii.full,
  },
  statusPillText: { fontSize: 12, fontWeight: '600', fontFamily: fontFamily.sansSemiBold[0] },
  savedCheck: { alignItems: 'center', justifyContent: 'center' },
  errorAlert: { alignItems: 'center', justifyContent: 'center' },
  checkbox: {
    width: 20, height: 20, borderRadius: radii.sm, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  skeletonRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
  },
  // Edit sheet
  sheetOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheetContent: {
    backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'],
    padding: spacing[5], paddingBottom: spacing[8], maxHeight: '85%',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0] },
  modeToggle: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: radii.md, padding: 2, marginBottom: spacing[3] },
  modeBtn: { flex: 1, height: 36, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  modeBtnActive: { backgroundColor: colors.primary },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: colors.textMuted, fontFamily: fontFamily.sansSemiBold[0] },
  modeBtnTextActive: { color: colors.white },
  sheetInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], fontSize: 15, color: colors.text,
    fontFamily: fontFamily.sans[0], marginBottom: spacing[2], fontVariant: ['tabular-nums'],
  },
  preview: { fontSize: 12, color: colors.textMuted, marginBottom: spacing[3], fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },
  sheetLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: spacing[2], fontFamily: fontFamily.sansSemiBold[0] },
  reasonChip: {
    paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.full,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  reasonChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  reasonChipText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary, fontFamily: fontFamily.sans[0] },
  reasonChipTextActive: { color: colors.white },
  sheetActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] },
  sheetBtnSecondary: {
    flex: 1, height: 44, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetBtnSecondaryText: { fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  sheetBtnPrimary: { flex: 1, height: 44, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sheetBtnPrimaryText: { fontSize: 14, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
  sheetBtnDisabled: { opacity: 0.4 },
  // Confirm sheet
  confirmContent: {
    backgroundColor: colors.surface, borderRadius: radii['2xl'], padding: spacing[5],
    marginHorizontal: spacing[4], maxWidth: 380, alignSelf: 'center',
  },
  confirmHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] },
  confirmTitle: { fontSize: 16, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0] },
  confirmBody: { fontSize: 14, color: colors.textMuted, marginBottom: spacing[4], fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },
})
