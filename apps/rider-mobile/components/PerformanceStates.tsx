import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import {
  CloudOff,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Star,
  MessageSquareOff,
  TrendingUp,
} from 'lucide-react-native'
import { Skeleton } from '@chinooz/ui'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'

/**
 * RP1/RP3/RP2 — Shared loading, empty, error, and offline state components
 * for the Performance & Ratings suite.
 *
 * Design principles:
 * - Loading = shimmer skeletons (never spinners), aria-busy on the container.
 * - Empty states are encouraging (new-rider) or honest (no-ratings, no-comments),
 *   announced via role=status.
 * - Errors are calm + actionable, announced via role=alert, with Retry.
 * - Offline shows cached data + timestamp, role=status.
 * - Threshold-change note is a supportive inline banner, role=status.
 * - Report-rating failure preserves input and offers retry, role=alert.
 */

/* ────────────────────────────────────────────────────────────────────
 * Skeletons — shimmer blocks, not spinners
 * ──────────────────────────────────────────────────────────────────── */

/** Scorecard skeleton: rating hero + 4 metric tiles + tier card + entries. */
export function ScorecardSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      {/* Rating hero */}
      <View style={[styles.skeletonCard, { height: 110 }]}>
        <View style={styles.skeletonRow}>
          <Skeleton width={120} height={12} />
          <Skeleton width={50} height={20} borderRadius={radii.full} />
        </View>
        <View style={styles.skeletonRow}>
          <View style={styles.skeletonStars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} width={18} height={18} borderRadius={radii.full} />
            ))}
          </View>
          <Skeleton width={60} height={28} />
        </View>
        <Skeleton width="70%" height={12} />
      </View>

      {/* Metric tiles — 2x2 grid */}
      <View style={styles.skeletonTileGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.skeletonTile}>
            <View style={styles.skeletonRow}>
              <Skeleton width={80} height={12} />
              <Skeleton width={8} height={8} borderRadius={radii.full} />
            </View>
            <Skeleton width={70} height={22} />
            <Skeleton width={50} height={11} />
          </View>
        ))}
      </View>

      {/* Tier card */}
      <View style={[styles.skeletonCard, { height: 84 }]}>
        <View style={styles.skeletonRow}>
          <Skeleton width={40} height={40} borderRadius={radii.full} />
          <View style={{ flex: 1, gap: spacing[1] }}>
            <Skeleton width={50} height={11} />
            <Skeleton width={80} height={16} />
          </View>
          <Skeleton width={50} height={24} borderRadius={radii.full} />
        </View>
      </View>

      {/* Entries card */}
      <View style={[styles.skeletonCard, { height: 132 }]}>
        {Array.from({ length: 3 }).map((_, i) => (
          <React.Fragment key={i}>
            <View style={styles.skeletonRow}>
              <Skeleton width={36} height={36} borderRadius={radii.full} />
              <View style={{ flex: 1, gap: spacing[1] }}>
                <Skeleton width={120} height={14} />
                <Skeleton width={90} height={11} />
              </View>
            </View>
            {i < 2 && <View style={styles.skeletonDivider} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  )
}

/** Metrics detail skeleton: definition + current-vs-target + chart + breakdown. */
export function MetricsDetailSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      {/* Definition */}
      <Skeleton width="100%" height={48} borderRadius={radii.lg} />
      {/* Current vs target */}
      <View style={[styles.skeletonCard, { height: 110 }]}>
        <View style={styles.skeletonRow}>
          <View style={{ flex: 1, gap: spacing[1] }}>
            <Skeleton width={60} height={11} />
            <Skeleton width={70} height={24} />
          </View>
          <View style={{ flex: 1, gap: spacing[1] }}>
            <Skeleton width={60} height={11} />
            <Skeleton width={70} height={24} />
          </View>
        </View>
        <Skeleton width="80%" height={12} />
      </View>
      {/* Chart */}
      <View style={[styles.skeletonCard, { height: 200 }]}>
        <Skeleton width={100} height={12} />
        <Skeleton width="100%" height={160} borderRadius={radii.md} />
      </View>
      {/* Breakdown */}
      <View style={[styles.skeletonCard, { height: 140 }]}>
        <Skeleton width={100} height={12} />
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={styles.skeletonRow}>
            <Skeleton width={120} height={8} borderRadius={radii.full} />
            <Skeleton width={80} height={11} />
          </View>
        ))}
      </View>
    </View>
  )
}

/** Ratings skeleton: summary card + highlights + feedback rows. */
export function RatingsSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      {/* Summary */}
      <View style={[styles.skeletonCard, { height: 160 }]}>
        <View style={styles.skeletonRow}>
          <View style={{ gap: spacing[1] }}>
            <Skeleton width={80} height={36} />
            <View style={styles.skeletonStars}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} width={16} height={16} borderRadius={radii.full} />
              ))}
            </View>
            <Skeleton width={60} height={12} />
          </View>
          <View style={{ alignItems: 'flex-end', gap: spacing[1] }}>
            <Skeleton width={50} height={14} />
            <Skeleton width={40} height={11} />
          </View>
        </View>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.skeletonRow}>
            <Skeleton width={12} height={12} />
            <Skeleton width={8} height={8} borderRadius={radii.full} />
            <View style={{ flex: 1 }}>
              <Skeleton width="100%" height={8} borderRadius={radii.full} />
            </View>
            <Skeleton width={30} height={11} />
            <Skeleton width={30} height={11} />
          </View>
        ))}
      </View>

      {/* Highlights */}
      <View style={[styles.skeletonCard, { height: 90 }]}>
        <Skeleton width={120} height={12} />
        {Array.from({ length: 2 }).map((_, i) => (
          <View key={i} style={styles.skeletonRow}>
            <Skeleton width={8} height={8} borderRadius={radii.full} />
            <Skeleton width="50%" height={14} />
            <Skeleton width={50} height={11} />
          </View>
        ))}
      </View>

      {/* Feedback rows */}
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={[styles.skeletonCard, { height: 120 }]}>
          <View style={styles.skeletonRow}>
            <Skeleton width={36} height={36} borderRadius={radii.full} />
            <View style={{ flex: 1, gap: spacing[1] }}>
              <Skeleton width={120} height={14} />
              <Skeleton width={80} height={11} />
            </View>
            <View style={styles.skeletonStars}>
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} width={13} height={13} borderRadius={radii.full} />
              ))}
            </View>
          </View>
          <Skeleton width="90%" height={14} />
          <Skeleton width="70%" height={14} />
        </View>
      ))}
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Empty states — encouraging for new-rider, honest for no-data
 * ──────────────────────────────────────────────────────────────────── */

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  body: string
  ariaLabel: string
}

function EmptyCard({ icon, title, body, ariaLabel }: EmptyStateProps) {
  return (
    <View
      style={styles.stateCard}
      accessibilityRole="status"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.stateIconWrap}>{icon}</View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
    </View>
  )
}

/** New-rider empty — encouraging, not a dead-end. */
export function NewRiderEmpty({
  title,
  body,
  ariaLabel,
}: {
  title: string
  body: string
  ariaLabel: string
}) {
  return (
    <EmptyCard
      icon={<Sparkles size={28} color={colors.primary} />}
      title={title}
      body={body}
      ariaLabel={ariaLabel}
    />
  )
}

/** No-ratings yet — honest, explains when data appears. */
export function NoRatingsEmpty({
  title,
  body,
  ariaLabel,
}: {
  title: string
  body: string
  ariaLabel: string
}) {
  return (
    <EmptyCard
      icon={<Star size={28} color={colors.textMuted} />}
      title={title}
      body={body}
      ariaLabel={ariaLabel}
    />
  )
}

/** No comments yet — honest. */
export function NoCommentsEmpty({
  title,
  body,
  ariaLabel,
}: {
  title: string
  body: string
  ariaLabel: string
}) {
  return (
    <EmptyCard
      icon={<MessageSquareOff size={28} color={colors.textMuted} />}
      title={title}
      body={body}
      ariaLabel={ariaLabel}
    />
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Error state — calm + actionable, role=alert, with Retry
 * ──────────────────────────────────────────────────────────────────── */

export function LoadErrorState({
  title,
  subtitle,
  retry,
  retryAria,
  onRetry,
}: {
  title: string
  subtitle: string
  retry: string
  retryAria: string
  onRetry: () => void
}) {
  return (
    <View
      style={styles.stateCard}
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.stateIconWrap}>
        <AlertCircle size={28} color={colors.warning} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{subtitle}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={retryAria}
        onPress={onRetry}
        style={styles.retryBtn}
      >
        <RefreshCw size={16} color={colors.white} />
        <Text style={styles.retryText}>{retry}</Text>
      </TouchableOpacity>
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Offline state — cached data + timestamp, role=status
 * ──────────────────────────────────────────────────────────────────── */

export function OfflineState({
  cachedDate,
  title,
  body,
  ariaLabel,
  retry,
  retryAria,
  onRetry,
}: {
  cachedDate: string
  title: string
  body: string
  ariaLabel: string
  retry: string
  retryAria: string
  onRetry: () => void
}) {
  return (
    <View
      style={styles.offlineBanner}
      accessibilityRole="status"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.offlineLeft}>
        <CloudOff size={20} color={colors.textMuted} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.offlineTitle}>{title}</Text>
          <Text style={styles.offlineBody}>{body}</Text>
        </View>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={retryAria}
        onPress={onRetry}
        style={styles.offlineRetryBtn}
      >
        <RefreshCw size={14} color={colors.primary} />
        <Text style={styles.offlineRetryText}>{retry}</Text>
      </TouchableOpacity>
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Threshold-change note — supportive inline banner, role=status
 * ──────────────────────────────────────────────────────────────────── */

export function ThresholdChangeNote({
  metric,
  status,
  title,
  bodyTemplate,
  ariaLabel,
}: {
  metric: string
  status: string
  title: string
  bodyTemplate: string
  ariaLabel: string
}) {
  const body = bodyTemplate
    .replace('{{metric}}', metric)
    .replace('{{status}}', status)

  return (
    <View
      style={styles.thresholdBanner}
      accessibilityRole="status"
      accessibilityLabel={ariaLabel
        .replace('{{metric}}', metric)
        .replace('{{status}}', status)}
      accessibilityLiveRegion="polite"
    >
      <TrendingUp size={16} color={colors.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.thresholdTitle}>{title}</Text>
        <Text style={styles.thresholdBody}>{body}</Text>
      </View>
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Report-rating failure — preserves input, role=alert, with retry
 * ──────────────────────────────────────────────────────────────────── */

export function ReportFailState({
  title,
  body,
  preservedNote,
  retry,
  retryAria,
  onRetry,
  onCancel,
  cancelLabel,
  cancelAria,
}: {
  title: string
  body: string
  preservedNote: string
  retry: string
  retryAria: string
  onRetry: () => void
  onCancel: () => void
  cancelLabel: string
  cancelAria: string
}) {
  return (
    <View
      style={styles.stateCard}
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${body} ${preservedNote}`}
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.stateIconWrap}>
        <AlertCircle size={28} color={colors.warning} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      <Text style={styles.preservedNote}>{preservedNote}</Text>
      <View style={styles.failBtnRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={cancelAria}
          onPress={onCancel}
          style={styles.failCancelBtn}
        >
          <Text style={styles.failCancelText}>{cancelLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={retryAria}
          onPress={onRetry}
          style={styles.failRetryBtn}
        >
          <RefreshCw size={16} color={colors.white} />
          <Text style={styles.failRetryText}>{retry}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Styles
 * ──────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  // Skeletons.
  skeletonWrap: { padding: spacing[4], gap: spacing[3] },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2.5],
    ...shadow('sm'),
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  skeletonStars: { flexDirection: 'row', gap: 2 },
  skeletonTileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2.5],
  },
  skeletonTile: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3.5],
    gap: spacing[1.5],
  },
  skeletonDivider: { height: 1, backgroundColor: colors.borderLight },

  // Empty + error state card.
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
  },
  stateIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  stateBody: {
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    minHeight: 48,
  },
  retryText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },

  // Offline banner — inline, not full-card.
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
  },
  offlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    flex: 1,
  },
  offlineTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  offlineBody: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  offlineRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
    minHeight: 40,
  },
  offlineRetryText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Threshold-change note — supportive inline banner.
  thresholdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  thresholdTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  thresholdBody: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
  },

  // Report-fail state.
  preservedNote: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    textAlign: 'center',
  },
  failBtnRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  failCancelBtn: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failCancelText: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  failRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    minHeight: 48,
  },
  failRetryText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
})
