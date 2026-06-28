import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { Check, Minus, Plus, AlertTriangle, PackageX, Boxes } from 'lucide-react-native'
import { colors, radii, spacing, fontFamily } from '@chinooz/theme'
import SafeImage from './SafeImage'
import Skeleton from './Skeleton'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { InventoryRowProps } from '@chinooz/types/components'
import type { StockStatus } from '@chinooz/types'

const DEFAULT_THRESHOLD = 10

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

function StepperButton({
  onPress,
  disabled,
  ariaLabel,
  children,
}: {
  onPress: () => void
  disabled?: boolean
  ariaLabel: string
  children: React.ReactNode
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

function StockControl({
  value,
  onCommit,
}: {
  value: number
  onCommit?: (v: number) => void
}) {
  const [local, setLocal] = useState(value)
  const [focused, setFocused] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => { if (!focused) setLocal(value) }, [value, focused])

  const clamp = (v: number) => Math.max(0, isNaN(v) ? 0 : v)

  const schedule = (v: number) => {
    setLocal(v)
    if (!onCommit) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onCommit(v), 600)
  }

  const commitNow = () => {
    clearTimeout(timer.current)
    if (onCommit) onCommit(local)
  }

  return (
    <View style={styles.stockControl}>
      <StepperButton
        onPress={() => { const v = clamp(local - 1); schedule(v); onCommit?.(v) }}
        disabled={local <= 0}
        ariaLabel="Decrease stock"
      >
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
      <StepperButton
        onPress={() => { const v = clamp(local + 1); schedule(v); onCommit?.(v) }}
        ariaLabel="Increase stock"
      >
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

export default function InventoryRow({
  variant,
  lowStockThreshold = DEFAULT_THRESHOLD,
  onStockChange,
  selected = false,
  onToggleSelect,
  loading = false,
  layout = 'compact',
  testID,
}: InventoryRowProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  const scale = useSharedValue(1)
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const pressIn = useCallback(() => {
    if (reduced) return
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 })
  }, [reduced])
  const pressOut = useCallback(() => {
    if (reduced) return
    scale.value = withSpring(1, { damping: 15, stiffness: 300 })
  }, [reduced])

  if (loading) return <InventoryRowSkeleton />

  const threshold = variant.lowStockThreshold ?? lowStockThreshold
  const stockColor = STOCK_COLOR[variant.stock]
  const statusMeta = STATUS_META[variant.stock]
  const ariaLabel = `${variant.productName ?? variant.name}, ${variant.sku}, ${variant.stockCount} units, ${t(statusMeta.labelKey)}`

  const content = (
    <>
      {onToggleSelect && (
        <Checkbox checked={selected} onChange={() => onToggleSelect(variant.id)} ariaLabel="Select variant" />
      )}
      <SafeImage source={variant.image} style={styles.thumb} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.name} numberOfLines={1}>{variant.productName ?? variant.name}</Text>
        <View style={styles.metaRow}>
          <VariantLabel attributes={variant.attributes} name={variant.name} />
          <Text style={styles.sku} numberOfLines={1}>{variant.sku}</Text>
        </View>
      </View>

      {/* Stock + threshold */}
      <View style={styles.stockCol}>
        <Text style={[styles.stockFig, { color: stockColor }]}>{variant.stockCount}</Text>
        <Text style={styles.threshold}>min {threshold}</Text>
      </View>

      {/* Quick stock control */}
      <StockControl value={variant.stockCount} onCommit={onStockChange} />

      <View style={styles.statusCol}>
        <StatusPill status={variant.stock} />
      </View>
    </>
  )

  if (layout === 'table') {
    return (
      <View
        testID={testID}
        accessibilityRole="summary"
        accessibilityLabel={ariaLabel}
        style={styles.tableRow}
      >
        {content}
      </View>
    )
  }

  return (
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
  stockFig: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansSemiBold[0],
  },
  threshold: { fontSize: 12, fontWeight: '400', color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  stockControl: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.4 },
  stockInput: {
    width: 44,
    height: 32,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansSemiBold[0],
    paddingVertical: 0,
    paddingHorizontal: spacing[1],
  },
  statusCol: { width: 92, alignItems: 'flex-end' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  statusPillText: { fontSize: 12, fontWeight: '600', fontFamily: fontFamily.sansSemiBold[0] },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
})
