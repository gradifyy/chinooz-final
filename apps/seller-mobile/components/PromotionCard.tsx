import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Clipboard,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { BottomSheet } from '@chinooz/ui'
import type { Promotion, PromotionStatus, PromotionType } from '@chinooz/mock-data'
import { useA11y } from './A11yProvider'

export interface PromotionCardProps {
  promo: Promotion
  index: number
  selected?: boolean
  selectable?: boolean
  onSelectChange?: (id: string, selected: boolean) => void
  onEdit?: (promo: Promotion) => void
  onDuplicate?: (promo: Promotion) => void
  onToggleActive?: (promo: Promotion) => void
  onEndNow?: (promo: Promotion) => void
  onDelete?: (promo: Promotion) => void
  onCopyCode?: (code: string) => void
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const STATUS_CFG: Record<PromotionStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'seller.promotions.statusActive', color: colors.success, bg: 'rgba(22,163,74,0.10)' },
  scheduled: { label: 'seller.promotions.statusScheduled', color: colors.info, bg: 'rgba(37,99,235,0.10)' },
  expired: { label: 'seller.promotions.statusExpired', color: colors.textMuted, bg: 'rgba(107,114,128,0.10)' },
  draft: { label: 'seller.promotions.statusDraft', color: colors.warning, bg: 'rgba(245,158,11,0.10)' },
}

type TT = (key: string, opts?: Record<string, unknown>) => string

function typeLabel(t: TT, type: PromotionType): string {
  const map: Record<PromotionType, string> = {
    percentage: t('seller.promotions.typePercentage'),
    fixed: t('seller.promotions.typeFixed'),
    flash_sale: t('seller.promotions.typeFlashSale'),
    bogo: t('seller.promotions.typeBogo'),
    free_shipping: t('seller.promotions.typeFreeShipping'),
  }
  return map[type]
}

function discountText(p: Promotion): string {
  if (p.type === 'percentage' || p.type === 'flash_sale') return `${p.discountValue}%`
  if (p.type === 'fixed') return `NPR ${p.discountValue}`
  if (p.type === 'bogo') return 'BOGO'
  return ''
}

function scopeText(t: TT, p: Promotion): string {
  if (p.scope === 'all') return t('seller.promotions.scopeAll')
  if (p.scope === 'category') return t('seller.promotions.scopeCategory', { label: p.scopeLabel ?? '' })
  return t('seller.promotions.scopeProducts', { count: p.productsCount })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtNPR(n: number): string {
  return n.toLocaleString()
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function getTimeRemaining(target: string): { total: number; days: number; hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, new Date(target).getTime() - Date.now())
  const days = Math.floor(total / (1000 * 60 * 60 * 24))
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((total % (1000 * 60)) / 1000)
  return { total, days, hours, minutes, seconds }
}

function countdownStr(r: ReturnType<typeof getTimeRemaining>): string {
  if (r.days > 0) return `${r.days}d ${pad(r.hours)}h ${pad(r.minutes)}m`
  return `${pad(r.hours)}:${pad(r.minutes)}:${pad(r.seconds)}`
}

export function PromotionCard({
  promo,
  index,
  selected = false,
  selectable = false,
  onSelectChange,
  onEdit,
  onDuplicate,
  onToggleActive,
  onEndNow,
  onDelete,
  onCopyCode,
}: PromotionCardProps) {
  const { t } = useTranslation()
  const { reducedMotion } = useA11y()
  const [actionOpen, setActionOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [copied, setCopied] = useState(false)
  const [time, setTime] = useState(() => getTimeRemaining(promo.endsAt))

  const scale = useSharedValue(1)
  const stCfg = STATUS_CFG[promo.status]
  const isActive = promo.status === 'active'
  const isScheduled = promo.status === 'scheduled'
  const showCountdown = (isActive || isScheduled) && time.total > 0
  const countdownTarget = isScheduled ? promo.startsAt : promo.endsAt
  const isEndingSoon = isActive && time.total > 0 && time.total < 24 * 60 * 60 * 1000
  const isSale = promo.type === 'flash_sale' || promo.type === 'percentage'

  const pressAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const onPressIn = () => {
    if (!reducedMotion) scale.value = withSpring(0.98, { damping: 15, stiffness: 400 })
  }
  const onPressOut = () => {
    if (!reducedMotion) scale.value = withSpring(1, { damping: 15, stiffness: 400 })
  }

  useEffect(() => {
    if (!showCountdown) return
    const id = setInterval(() => {
      const r = getTimeRemaining(countdownTarget)
      setTime(r)
      if (r.total <= 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [showCountdown, countdownTarget])

  const haptic = useCallback(() => {
    if (reducedMotion) return
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [reducedMotion])

  const handleCardPress = () => {
    haptic()
    onEdit?.(promo)
  }

  const handleKebabPress = () => {
    haptic()
    setActionOpen(true)
  }

  const handleCheckboxPress = () => {
    haptic()
    onSelectChange?.(promo.id, !selected)
  }

  const handleCopy = useCallback(() => {
    haptic()
    try { Clipboard.setString(promo.code) } catch {}
    setCopied(true)
    onCopyCode?.(promo.code)
    setTimeout(() => setCopied(false), 2000)
  }, [promo.code, onCopyCode, haptic])

  const handleDeleteConfirm = () => {
    setConfirmDelete(false)
    setActionOpen(false)
    onDelete?.(promo)
  }

  const handleEndConfirm = () => {
    setConfirmEnd(false)
    setActionOpen(false)
    onEndNow?.(promo)
  }

  const rowAria = t('seller.promotions.rowAria', {
    name: promo.name,
    type: typeLabel(t, promo.type),
    value: discountText(promo),
    status: t(stCfg.label),
  })

  const countdownAria = showCountdown
    ? t('seller.promotions.countdownAria', {
        time: t(
          isScheduled ? 'seller.promotions.countdownStartsIn' : 'seller.promotions.countdownEndsIn',
          { time: countdownStr(time) },
        ),
      })
    : undefined

  const toggleLabel = isActive ? 'seller.promotions.actionPause' : 'seller.promotions.actionActivate'

  return (
    <View style={styles.cardWrap}>
      <AnimatedPressable
        onPress={handleCardPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={rowAria}
        style={pressAnim}
      >
        <View style={[styles.card, selected && styles.cardSelected]}>
          <View style={styles.cardTop}>
            <View style={styles.cardBrand}>
              {selectable && (
                <Pressable
                  onPress={handleCheckboxPress}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={t('seller.promotions.selectPromotionAria', { name: promo.name })}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.checkboxWrap}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                    {selected && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                </Pressable>
              )}
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>%</Text>
              </View>
              <View style={styles.cardTitleWrap}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{promo.name}</Text>
                  {isSale && isActive && (
                    <View style={styles.saleBadge}>
                      <Text style={styles.saleBadgeText}>{t('seller.promotions.saleBadge')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.typeChip} numberOfLines={1}>{typeLabel(t, promo.type)}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: stCfg.bg }]}>
              <Text style={[styles.statusBadgeText, { color: stCfg.color }]}>
                {t(stCfg.label)}
              </Text>
            </View>
          </View>

          {promo.isCoupon && (
            <TouchableOpacity
              onPress={handleCopy}
              accessibilityRole="button"
              accessibilityLabel={t('seller.promotions.copyCodeAria', { code: promo.code })}
              style={styles.codeChip}
              activeOpacity={0.7}
            >
              <Text style={styles.codeChipText}>{promo.code}</Text>
              <Text style={[styles.codeChipAction, { color: copied ? colors.success : colors.primary }]}>
                {copied ? `✓ ${t('seller.promotions.codeCopied')}` : t('seller.promotions.copyCode')}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.cardMetrics}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>{t('seller.promotions.colDiscount')}</Text>
              <Text style={styles.discountValue}>{discountText(promo)}</Text>
              <Text style={styles.scopeText} numberOfLines={1}>{scopeText(t, promo)}</Text>
            </View>
            <View style={styles.metricRight}>
              <Text style={styles.metricLabel}>{t('seller.promotions.revenueInfluenced')}</Text>
              <Text style={styles.revenueValue}>
                {t('seller.promotions.revenue', { amount: fmtNPR(promo.revenue) })}
              </Text>
              <Text style={styles.usesText}>
                {t('seller.promotions.uses', { count: promo.redemptions })}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.scheduleCol}>
              <Text style={styles.footerSchedule}>
                {formatDate(promo.startsAt)} – {formatDate(promo.endsAt)}
              </Text>
              {showCountdown && (
                <Text
                  style={[styles.countdownText, isEndingSoon && styles.countdownWarning]}
                  accessibilityLabel={countdownAria}
                  accessibilityRole="timer"
                  numberOfLines={1}
                >
                  {isScheduled
                    ? t('seller.promotions.countdownStartsIn', { time: countdownStr(time) })
                    : t('seller.promotions.countdownEndsIn', { time: countdownStr(time) })}
                  {isEndingSoon ? ' ⚠' : ''}
                </Text>
              )}
            </View>
            <Pressable
              onPress={handleKebabPress}
              accessibilityRole="button"
              accessibilityLabel={t('seller.promotions.actionSheetTitle')}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              style={styles.kebabBtn}
            >
              <Text style={styles.kebabIcon}>⋯</Text>
            </Pressable>
          </View>
        </View>
      </AnimatedPressable>

      <BottomSheet visible={actionOpen} onClose={() => setActionOpen(false)} title={t('seller.promotions.actionSheetTitle')}>
        <ActionRow icon="✎" label={t('seller.promotions.actionEdit')} ariaLabel={t('seller.promotions.actionEditAria', { name: promo.name })} onPress={() => { setActionOpen(false); onEdit?.(promo) }} />
        <ActionRow icon="⧉" label={t('seller.promotions.actionDuplicate')} ariaLabel={t('seller.promotions.actionDuplicateAria', { name: promo.name })} onPress={() => { setActionOpen(false); onDuplicate?.(promo) }} />
        <ActionRow icon={isActive ? '⏸' : '▶'} label={t(toggleLabel)} ariaLabel={isActive ? t('seller.promotions.actionPauseAria', { name: promo.name }) : t('seller.promotions.actionActivateAria', { name: promo.name })} onPress={() => { setActionOpen(false); onToggleActive?.(promo) }} />
        {isActive && (
          <ActionRow icon="■" label={t('seller.promotions.actionEndNow')} ariaLabel={t('seller.promotions.actionEndNowAria', { name: promo.name })} onPress={() => { setActionOpen(false); setConfirmEnd(true) }} />
        )}
        <ActionRow icon="🗑" label={t('seller.promotions.actionDelete')} ariaLabel={t('seller.promotions.actionDeleteAria', { name: promo.name })} danger onPress={() => { setConfirmEnd(false); setConfirmDelete(true) }} />
      </BottomSheet>

      <BottomSheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title={t('seller.promotions.actionDeleteConfirm')}>
        <Text style={styles.confirmBody}>{t('seller.promotions.actionDeleteConfirmBody', { name: promo.name })}</Text>
        <View style={styles.confirmActions}>
          <TouchableOpacity onPress={() => setConfirmDelete(false)} style={styles.confirmCancelBtn}>
            <Text style={styles.confirmCancelText}>{t('seller.promotions.actionCancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteConfirm} style={styles.confirmDeleteBtn}>
            <Text style={styles.confirmDeleteText}>{t('seller.promotions.actionDeleteConfirmBtn')}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <BottomSheet visible={confirmEnd} onClose={() => setConfirmEnd(false)} title={t('seller.promotions.actionEndConfirm')}>
        <Text style={styles.confirmBody}>{t('seller.promotions.actionEndConfirmBody', { name: promo.name })}</Text>
        <View style={styles.confirmActions}>
          <TouchableOpacity onPress={() => setConfirmEnd(false)} style={styles.confirmCancelBtn}>
            <Text style={styles.confirmCancelText}>{t('seller.promotions.actionCancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEndConfirm} style={styles.confirmEndBtn}>
            <Text style={styles.confirmDeleteText}>{t('seller.promotions.actionEndConfirmBtn')}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  )
}

export function PromotionCardSkeleton() {
  return (
    <View style={styles.skeletonCard} aria-busy={true}>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonBody}>
          <View style={[styles.skeletonLine, { width: '60%', height: 14 }]} />
          <View style={[styles.skeletonLine, { width: '35%', height: 12, marginTop: 4 }]} />
        </View>
        <View style={styles.skeletonBadge} />
      </View>
      <View style={[styles.skeletonLine, { width: '40%', height: 20, marginTop: 12 }]} />
      <View style={styles.skeletonRow}>
        <View style={[styles.skeletonLine, { width: '30%', height: 18, marginTop: 10 }]} />
        <View style={[styles.skeletonLine, { width: '30%', height: 18, marginTop: 10 }]} />
      </View>
    </View>
  )
}

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
  cardWrap: {},
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[2] },
  cardBrand: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5], flex: 1, minWidth: 0 },
  checkboxWrap: { paddingTop: spacing[0.5] },
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
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  cardTitleWrap: { flex: 1, minWidth: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  saleBadge: {
    backgroundColor: colors.gold,
    borderRadius: radii.full,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 1,
  },
  saleBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white, letterSpacing: 0.5 },
  typeChip: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
  },

  statusBadge: { borderRadius: radii.full, paddingHorizontal: spacing[2.5], paddingVertical: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },

  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginTop: spacing[3],
    alignSelf: 'flex-start',
  },
  codeChipText: { fontSize: 13, fontWeight: '600', color: colors.text, fontFamily: 'monospace' },
  codeChipAction: { fontSize: 12, fontWeight: '600' },

  cardMetrics: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: spacing[3],
  },
  metric: { gap: 2, flex: 1 },
  metricRight: { alignItems: 'flex-end', gap: 2 },
  metricLabel: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  discountValue: { fontSize: 20, fontWeight: '700', color: colors.gold, fontVariant: ['tabular-nums'] },
  scopeText: { fontSize: 12, fontWeight: '400', color: colors.textMuted, marginTop: 2 },
  revenueValue: { fontSize: 15, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  usesText: { fontSize: 12, fontWeight: '400', color: colors.textMuted, fontVariant: ['tabular-nums'] },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  scheduleCol: { flex: 1, gap: 2 },
  footerSchedule: { fontSize: 12, fontWeight: '400', color: colors.textSecondary },
  countdownText: { fontSize: 12, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  countdownWarning: { color: colors.warning },

  kebabBtn: { padding: spacing[1] },
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
  confirmEndBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteText: { fontSize: 14, fontWeight: '700', color: colors.white },

  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
  },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  skeletonIcon: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.shimmer },
  skeletonBody: { flex: 1 },
  skeletonLine: { backgroundColor: colors.shimmer, borderRadius: radii.sm },
  skeletonBadge: { width: 60, height: 24, borderRadius: radii.full, backgroundColor: colors.shimmer },
})
