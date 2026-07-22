import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type TextStyle,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  MessageSquare,
  CheckCircle2,
  Flag,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily } from '../lib/theme'
import type {
  SellerReviewStatus,
} from '@chinooz/mock-data'
import EmptyState from '@chinooz/ui/EmptyState'

export function CountUpText({ value, display, dur, reduced, style, accessibilityLabel }: { value: number; display: (v: number) => string; dur: number; reduced: boolean; style?: StyleProp<TextStyle>; accessibilityLabel?: string }) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)

  useEffect(() => {
    if (reduced) {
      setDisplayed(value)
      return
    }
    const start = Date.now()
    const animate = () => {
      const t = Math.min((Date.now() - start) / dur, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayed(value * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, dur, reduced])

  return <Text style={style} accessibilityLabel={accessibilityLabel}>{display(displayed)}</Text>
}

export function SummarySkeleton() {
  const { t } = useTranslation()
  return (
    <View accessibilityState={{ busy: true }} accessibilityLabel={t('seller.reviews.loadingSummary')} style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <View style={styles.summaryLeft}>
          <View style={skeletonStyles.bigNum} />
          <View style={skeletonStyles.starsRow}>
            {Array.from({ length: 5 }).map((_, i) => (<View key={i} style={skeletonStyles.starDot} />))}
          </View>
          <View style={skeletonStyles.smallLine} />
        </View>
        <View style={styles.trendCol}>
          <View style={skeletonStyles.smallLine} />
          <View style={skeletonStyles.smallLine} />
        </View>
      </View>
      <View style={styles.distribution}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.distRow}>
            <View style={skeletonStyles.tinySquare} />
            <View style={skeletonStyles.barTrack} />
            <View style={skeletonStyles.tinyRect} />
            <View style={skeletonStyles.tinyRect} />
          </View>
        ))}
      </View>
    </View>
  )
}

export function ReviewsEmptyState({ status, hasActiveFilters, onClearFilters }: { status: SellerReviewStatus; hasActiveFilters: boolean; onClearFilters: () => void }) {
  const { t } = useTranslation()
  if (hasActiveFilters) {
    return (<EmptyState icon={<MessageSquare size={40} color={colors.textTertiary} />} title={t('seller.reviews.noResultsTitle')} subtitle={t('seller.reviews.noResultsSubtitle')} action={{ label: t('seller.reviews.noResultsClearFilters'), onPress: onClearFilters }} />)
  }
  if (status === 'needs_response') {
    return (<EmptyState icon={<CheckCircle2 size={40} color={colors.success} />} title={t('seller.reviews.allCaughtUpTitle')} subtitle={t('seller.reviews.allCaughtUpSubtitle')} />)
  }
  if (status === 'responded') {
    return (<EmptyState icon={<CheckCircle2 size={40} color={colors.success} />} title={t('seller.reviews.allCaughtUpRespondedTitle')} subtitle={t('seller.reviews.allCaughtUpRespondedSubtitle')} />)
  }
  if (status === 'flagged') {
    return (<EmptyState icon={<Flag size={40} color={colors.textTertiary} />} title={t('seller.reviews.allCaughtUpFlaggedTitle')} subtitle={t('seller.reviews.allCaughtUpFlaggedSubtitle')} />)
  }
  return (<EmptyState icon={<MessageSquare size={40} color={colors.textTertiary} />} title={t('seller.reviews.noReviewsTitle')} subtitle={t('seller.reviews.noReviewsSubtitle')} />)
}

export function FilterChip({
  label,
  pressed,
  onPress,
  icon,
}: {
  label: string
  pressed: boolean
  onPress: () => void
  icon?: React.ReactNode
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: pressed }}
      onPress={onPress}
      style={[styles.chip, pressed && styles.chipActive]}
      activeOpacity={0.8}
    >
      {icon}
      <Text style={[styles.chipText, pressed && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const skeletonStyles = StyleSheet.create({
  bigNum: { width: 80, height: 32, borderRadius: radii.md, backgroundColor: colors.shimmer },
  starsRow: { flexDirection: 'row', gap: 2 },
  starDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.shimmer },
  smallLine: { width: 100, height: 12, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  tinySquare: { width: 16, height: 12, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  barTrack: { flex: 1, height: 8, borderRadius: radii.full, backgroundColor: colors.shimmer },
  tinyRect: { width: 36, height: 12, borderRadius: radii.sm, backgroundColor: colors.shimmer },
})

export const offlineStyles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.warningLight, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5] },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning },
  text: { flex: 1, fontSize: 13, color: colors.warningText },
})

export const composeStyles = StyleSheet.create({
  toneHint: {
    backgroundColor: colors.warningLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginBottom: spacing[3],
  },
  toneHintText: {
    fontSize: 12,
    color: colors.warningText,
    lineHeight: 17,
  },
  templatesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing[2],
    paddingHorizontal: spacing[4],
  },
  templatesRow: {
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  templateChip: {
    backgroundColor: colors.background,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  input: {
    minHeight: 80,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing[4],
    marginBottom: spacing[1],
  },
  counterRow: {
    paddingHorizontal: spacing[4],
    alignItems: 'flex-end',
    marginBottom: spacing[2],
  },
  counterText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.successLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
  },
  cancelBtn: {
    paddingHorizontal: spacing[3],
    height: 44,
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    height: 44,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { fontSize: 14, fontWeight: '600', color: colors.white },
})

export const deleteStyles = StyleSheet.create({
  confirmText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 21,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
  },
  cancelBtn: {
    paddingHorizontal: spacing[3],
    height: 44,
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.error,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    height: 44,
  },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteText: { fontSize: 14, fontWeight: '600', color: colors.white },
})

export const flagStyles = StyleSheet.create({
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
    lineHeight: 19,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  reasonRowActive: {
    backgroundColor: colors.primary50,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  reasonLabel: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  reasonLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    marginTop: spacing[3],
  },
  cancelBtn: {
    paddingHorizontal: spacing[3],
    height: 44,
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.warning,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    height: 44,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 14, fontWeight: '600', color: colors.white },
})

export const bulkBarStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    paddingBottom: spacing[5],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  notNeededBtn: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    height: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  notNeededText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  flagBtn: {
    backgroundColor: colors.warning,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    height: 44,
    justifyContent: 'center',
  },
  flagText: { fontSize: 13, fontWeight: '600', color: colors.white },
  doneBtn: {
    paddingHorizontal: spacing[2],
    height: 44,
    justifyContent: 'center',
  },
  doneText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
})

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topBarIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  topBarTitle: { flex: 1, gap: 1 },
  topBarTitleText: { fontSize: 16, fontWeight: '700', color: colors.text },
  topBarSubtitle: { fontSize: 12, color: colors.textMuted },
  scrollContent: { padding: spacing[4], gap: spacing[4] },

  // Summary
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[4],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLeft: { gap: 4 },
  averageText: {
    fontSize: 32,
    lineHeight: 42,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  starRow: { flexDirection: 'row', gap: 2, alignItems: 'center' },
  totalReviewsText: { fontSize: 12, fontWeight: '400', color: colors.textMuted, fontVariant: ['tabular-nums'] },
  trendCol: { alignItems: 'flex-end', gap: 2 },
  trendValue: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  trendLabel: { fontSize: 12, fontWeight: '400', color: colors.textMuted },

  distribution: { gap: spacing[1.5] },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  distStar: { width: 16, fontSize: 13, fontWeight: '600', color: colors.textSecondary, textAlign: 'right', fontVariant: ['tabular-nums'] },
  distTrack: { flex: 1, height: 8, backgroundColor: colors.borderLight, borderRadius: radii.full, overflow: 'hidden' },
  distFill: { height: 8, backgroundColor: colors.gold, borderRadius: radii.full },
  distCount: { width: 36, fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'right', fontVariant: ['tabular-nums'] },
  distPct: { width: 34, fontSize: 12, fontWeight: '400', color: colors.textMuted, textAlign: 'right', fontVariant: ['tabular-nums'] },

  // Filters
  filterSection: { gap: spacing[2] },
  chipRow: { gap: spacing[2], paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.background,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.text },
  chipTextActive: { color: colors.white },
  chipDivider: { width: 1, height: 24, backgroundColor: colors.borderLight, marginHorizontal: spacing[1], alignSelf: 'center' },

  dropdownRow: { flexDirection: 'row', gap: spacing[2] },
  dropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    backgroundColor: colors.background,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
  },
  dropdownLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: colors.text },
  clearAllBtn: { alignSelf: 'flex-start', paddingVertical: spacing[1] },
  clearAllText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  // Tabs
  tabsTrack: {
    flexDirection: 'row',
    gap: spacing[1],
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    height: 40,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    height: 32,
    borderRadius: radii.full,
  },
  tabSegmentActive: { backgroundColor: colors.primary },
  tabLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  tabLabelActive: { color: colors.white },
  tabBadge: {
    minWidth: 18,
    paddingHorizontal: spacing[1],
    height: 18,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: { fontSize: 11, fontWeight: '600' },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -spacing[1],
  },
  resultCount: { fontSize: 13, color: colors.textMuted },
  selectModeBtn: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  selectAllText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  selectedCountText: { fontSize: 13, color: colors.textMuted },

  // List
  list: { gap: spacing[3] },

  // Review card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    gap: spacing[2],
  },
  cardNeedsResponse: { borderLeftWidth: 3, borderLeftColor: colors.warning },
  cardFlagged: { borderLeftWidth: 3, borderLeftColor: colors.error },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  avatar: {
    width: 36,
    height: 44,
    borderRadius: 18,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  cardHeadBody: { flex: 1, gap: 2 },
  cardName: { fontSize: 14, fontWeight: '600', color: colors.text },
  cardStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  cardTime: { fontSize: 12, color: colors.textMuted, marginLeft: 4 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.full,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  statusPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },

  productRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  productThumb: { width: 22, height: 22, borderRadius: radii.sm, backgroundColor: colors.borderLight },
  productName: { flex: 1, fontSize: 12, color: colors.textSecondary },

  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  cardBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

  photosRow: { flexDirection: 'row', gap: spacing[2] },
  photo: { width: 56, height: 56, borderRadius: radii.sm, backgroundColor: colors.borderLight },

  responseBox: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[2],
    gap: 2,
  },
  responseLabel: { fontSize: 12, fontWeight: '600', color: colors.primary },
  responseText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' },
  respondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    height: 32,
  },
  respondBtnText: { fontSize: 13, fontWeight: '600', color: colors.white },
  flagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    height: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flagBtnActive: { backgroundColor: colors.errorLight, borderColor: colors.errorLight },
  flagBtnText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  flagBtnTextActive: { color: colors.error },
  helpfulText: { fontSize: 12, color: colors.textTertiary, marginLeft: 'auto' },

  composeBox: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[2],
    gap: spacing[2],
  },
  composeInput: {
    minHeight: 72,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
    padding: 0,
  },
  composeActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[2] },
  composeCancel: { paddingHorizontal: spacing[2], height: 32, justifyContent: 'center' },
  composeCancelText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  composeSend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    height: 32,
  },
  composeSendDisabled: { opacity: 0.5 },
  composeSendText: { fontSize: 13, fontWeight: '600', color: colors.white },

  // Sheets
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sheetRowLabel: { fontSize: 15, color: colors.text },
  sheetRowLabelActive: { color: colors.primary, fontWeight: '600' },

  // Skeleton
  skeletonWrap: { gap: spacing[3] },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    flexDirection: 'row',
    gap: spacing[2],
  },
  skeletonAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.shimmer },
  skeletonBody: { flex: 1, gap: 6 },
  skeletonLineW30: { height: 12, width: '30%', borderRadius: 6, backgroundColor: colors.shimmer },
  skeletonLineW50: { height: 10, width: '50%', borderRadius: 6, backgroundColor: colors.shimmer },
  skeletonLineW60: { height: 10, width: '60%', borderRadius: 6, backgroundColor: colors.shimmer },
})
