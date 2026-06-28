import React, { useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, AccessibilityInfo } from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  AlertTriangle,
  RefreshCw,
  WifiOff,
  Flame,
  ChevronRight,
  PackageCheck,
  History as HistoryIcon,
  Search,
  Inbox,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'

/** Translate with an inline English fallback. */
function useTt() {
  const { t } = useTranslation()
  return useCallback(
    (key: string, vars?: Record<string, string | number>, fallback?: string) => {
      const raw = t(key, vars ?? {})
      if (raw === key || raw === undefined) return fallback ?? key
      return raw
    },
    [t],
  )
}

/* ----------------------------- shimmer block ----------------------------- */

/** A single shimmer placeholder block. */
export function ShimmerBlock({ height, width, style }: { height: number; width?: number | string; style?: any }) {
  return (
    <View
      style={[
        styles.shimmer,
        { height, width: width ?? '100%' },
        style,
      ]}
    />
  )
}

/** A skeleton list of N shimmer rows. */
export function SkeletonList({ count = 3, rowHeight = 120, testID }: { count?: number; rowHeight?: number; testID?: string }) {
  const tt = useTt()
  return (
    <View
      testID={testID}
      style={styles.skeletonList}
      accessibilityRole="progressbar"
      accessibilityLabel={tt('rider.jobs.states.loadingAria', undefined, 'Loading, please wait')}
      accessibilityState={{ busy: true }}
      accessible
    >
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerBlock key={i} height={rowHeight} style={styles.skeletonRow} />
      ))}
    </View>
  )
}

/* ----------------------------- error state ----------------------------- */

interface ErrorStateProps {
  testID?: string
  onRetry?: () => void
  title?: string
  subtitle?: string
}

export function ErrorStateView({ testID, onRetry, title, subtitle }: ErrorStateProps) {
  const tt = useTt()
  const reduced = useReducedMotion()
  const tick = useCallback(() => {
    try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [reduced])

  return (
    <View
      testID={testID}
      style={styles.stateWrap}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessible
    >
      <View style={styles.stateIcon}>
        <AlertTriangle size={32} color={colors.error} />
      </View>
      <Text style={styles.stateTitle}>{title ?? tt('rider.jobs.states.errorTitle', undefined, 'Could not load')}</Text>
      <Text style={styles.stateSubtitle}>{subtitle ?? tt('rider.jobs.states.errorSubtitle', undefined, 'Something went wrong. Please try again.')}</Text>
      {onRetry && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={tt('rider.jobs.states.retryAria', undefined, 'Retry loading')}
          onPress={() => { tick(); onRetry() }}
          style={styles.retryBtn}
          activeOpacity={0.85}
        >
          <RefreshCw size={16} color={colors.white} />
          <Text style={styles.retryText}>{tt('common.retry', undefined, 'Retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

/* ----------------------------- offline banner ----------------------------- */

interface OfflineBannerProps {
  testID?: string
  onGoOnline?: () => void
}

export function OfflineBannerView({ testID, onGoOnline }: OfflineBannerProps) {
  const tt = useTt()
  const reduced = useReducedMotion()
  const tick = useCallback(() => {
    try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [reduced])

  return (
    <View
      testID={testID}
      style={styles.offlineBanner}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessible
    >
      <View style={styles.offlineLeft}>
        <View style={styles.offlineIcon}>
          <WifiOff size={16} color={colors.warning} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.offlineTitle}>{tt('rider.jobs.states.offlineTitle', undefined, "You're offline")}</Text>
          <Text style={styles.offlineSub}>{tt('rider.jobs.states.offlineSub', undefined, "Showing cached jobs. You can't accept while offline.")}</Text>
        </View>
      </View>
      {onGoOnline && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={tt('rider.jobs.offlineAction', undefined, 'Go online')}
          onPress={() => { tick(); onGoOnline() }}
          style={styles.offlineCta}
          activeOpacity={0.85}
        >
          <Text style={styles.offlineCtaText}>{tt('rider.jobs.offlineAction', undefined, 'Go online')}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

/* ----------------------------- quiet / empty ----------------------------- */

interface QuietStateProps {
  testID?: string
  title?: string
  subtitle?: string
  actionLabel?: string
  actionAria?: string
  onAction?: () => void
}

export function QuietStateView({ testID, title, subtitle, actionLabel, actionAria, onAction }: QuietStateProps) {
  const tt = useTt()
  const reduced = useReducedMotion()
  const tick = useCallback(() => {
    try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [reduced])

  return (
    <View
      testID={testID}
      style={styles.quietWrap}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessible
    >
      <View style={styles.quietIcon}>
        <Flame size={28} color={colors.primary} />
      </View>
      <Text style={styles.quietTitle}>{title ?? tt('rider.jobs.available.quietTitle', undefined, 'No deliveries nearby right now')}</Text>
      <Text style={styles.quietSubtitle}>{subtitle ?? tt('rider.jobs.available.quietSubtitle', undefined, 'Demand is quiet in your zone. Try moving to a hotspot to get more jobs.')}</Text>
      {onAction && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={actionAria ?? tt('rider.jobs.available.quietActionAria', undefined, 'Open the demand hotspots heatmap')}
          onPress={() => { tick(); onAction() }}
          style={styles.quietAction}
          activeOpacity={0.85}
        >
          <Flame size={15} color={colors.white} />
          <Text style={styles.quietActionText}>{actionLabel ?? tt('rider.jobs.available.quietAction', undefined, 'See hotspots')}</Text>
          <ChevronRight size={15} color={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  )
}

/* ----------------------------- no results ----------------------------- */

interface NoResultsProps {
  testID?: string
  onClearFilters?: () => void
  hasFilters?: boolean
  title?: string
  clearLabel?: string
}

export function NoResultsView({ testID, onClearFilters, hasFilters, title, clearLabel }: NoResultsProps) {
  const tt = useTt()
  const reduced = useReducedMotion()
  const tick = useCallback(() => {
    try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [reduced])

  return (
    <View
      testID={testID}
      style={styles.stateWrap}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessible
    >
      <View style={styles.stateIcon}>
        <Search size={28} color={colors.textTertiary} />
      </View>
      <Text style={styles.stateTitle}>{title ?? tt('rider.jobs.states.noResultsTitle', undefined, 'No trips match your filters')}</Text>
      {hasFilters && onClearFilters && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={clearLabel ?? tt('rider.jobs.states.clearFiltersAria', undefined, 'Clear all filters')}
          onPress={() => { tick(); onClearFilters() }}
          style={styles.clearBtn}
          activeOpacity={0.85}
        >
          <Text style={styles.clearText}>{clearLabel ?? tt('rider.jobs.states.clearFilters', undefined, 'Clear filters')}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

/* ----------------------------- empty: active ----------------------------- */

interface ActiveEmptyProps {
  testID?: string
}

export function ActiveEmptyView({ testID }: ActiveEmptyProps) {
  const tt = useTt()
  return (
    <View
      testID={testID}
      style={styles.stateWrap}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessible
    >
      <View style={styles.stateIcon}>
        <PackageCheck size={32} color={colors.textTertiary} />
      </View>
      <Text style={styles.stateTitle}>{tt('rider.jobs.activeEmpty', undefined, 'No active delivery')}</Text>
      <Text style={styles.stateSubtitle}>{tt('rider.jobs.activeEmptySubtitle', undefined, 'When you accept a job, your in-progress delivery will appear here.')}</Text>
    </View>
  )
}

/* ----------------------------- empty: history ----------------------------- */

interface HistoryEmptyProps {
  testID?: string
}

export function HistoryEmptyView({ testID }: HistoryEmptyProps) {
  const tt = useTt()
  return (
    <View
      testID={testID}
      style={styles.stateWrap}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessible
    >
      <View style={styles.stateIcon}>
        <Inbox size={32} color={colors.textTertiary} />
      </View>
      <Text style={styles.stateTitle}>{tt('rider.jobs.historyEmpty', undefined, 'No deliveries yet')}</Text>
      <Text style={styles.stateSubtitle}>{tt('rider.jobs.historyEmptySubtitle', undefined, 'Your completed and cancelled deliveries will appear here.')}</Text>
    </View>
  )
}

/* ----------------------------- styles ----------------------------- */

const styles = StyleSheet.create({
  // Shimmer
  shimmer: {
    backgroundColor: colors.shimmer,
    borderRadius: radii.md,
  },
  skeletonList: { paddingHorizontal: spacing[4], paddingTop: spacing[3], gap: spacing[3] },
  skeletonRow: { borderRadius: radii.lg },

  // Generic state wrap
  stateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[6],
    gap: spacing[2],
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing[1],
  },
  stateTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, textAlign: 'center', fontFamily: fontFamily.sansSemiBold[0] },
  stateSubtitle: { fontSize: fontSize.sm[0], color: colors.textMuted, textAlign: 'center', lineHeight: 20, fontFamily: fontFamily.sans[0] },

  // Retry button
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    minHeight: 48,
  },
  retryText: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },

  // Clear filters button
  clearBtn: {
    marginTop: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 44,
  },
  clearText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.textSecondary, fontFamily: fontFamily.sansSemiBold[0] },

  // Offline banner
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    backgroundColor: colors.warningLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginHorizontal: spacing[4],
  },
  offlineLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1, minWidth: 0 },
  offlineIcon: { width: 32, height: 32, borderRadius: radii.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  offlineTitle: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.warning, fontFamily: fontFamily.sansBold[0] },
  offlineSub: { fontSize: fontSize.sm[0], color: colors.textSecondary, marginTop: 1, fontFamily: fontFamily.sans[0] },
  offlineCta: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineCtaText: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },

  // Quiet state
  quietWrap: {
    alignItems: 'center',
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  quietIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quietTitle: { fontSize: fontSize.lg[0], fontWeight: '600', color: colors.text, textAlign: 'center', fontFamily: fontFamily.sansSemiBold[0] },
  quietSubtitle: { fontSize: fontSize.sm[0], color: colors.textMuted, textAlign: 'center', lineHeight: 20, fontFamily: fontFamily.sans[0] },
  quietAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    minHeight: 48,
    marginTop: spacing[1],
  },
  quietActionText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.white, fontFamily: fontFamily.sansSemiBold[0] },
})
