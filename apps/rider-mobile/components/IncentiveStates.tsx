import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native'
import {
  CloudOff,
  AlertCircle,
  RefreshCw,
  Target,
  Zap,
  Sparkles,
  CheckCircle2,
  CircleSlash,
  TrendingUp,
  WifiOff,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import Skeleton from '@chinooz/ui/Skeleton'

/**
 * RI6 — Loading, empty, error, offline, and edge-case states for the
 * Incentives & Quests system (incentives hub, quests list, quest detail,
 * streaks, surge map).
 *
 * All states are calm, actionable, and honest. No fake urgency, no alarming
 * colors. Icons use the muted palette.
 *
 * Accessibility:
 *  - Skeletons: aria-busy / progressbar role + live region.
 *  - Empty states: role=status, encouraging tone, optional CTA.
 *  - Error states: role=alert, Retry with aria-label.
 *  - Offline: role=status, explains what's cached and what's paused.
 *  - Claim failure: role=alert, progress preserved, no double-claim.
 *  - Expired mid-view: role=status, explains what still counts.
 *  - Progress race: role=status, explains completion elsewhere.
 */

/* ---------- Skeletons ---------- */

/** Incentives hub skeleton (shimmer, not spinners). */
export function IncentivesHubSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonRow}>
          <Skeleton width={92} height={48} borderRadius={radii.full} />
          <Skeleton width={88} height={88} borderRadius={radii.full} />
          <Skeleton width={110} height={36} borderRadius={radii.full} />
        </View>
        <Skeleton width="80%" height={20} />
      </View>
      <View style={styles.skeletonSection}>
        <Skeleton width={140} height={20} />
        <View style={{ height: spacing[2] }} />
        <Skeleton width="100%" height={170} borderRadius={radii.xl} />
      </View>
      <View style={styles.skeletonSection}>
        <Skeleton width={140} height={20} />
        <View style={{ height: spacing[2] }} />
        <Skeleton width="100%" height={130} borderRadius={radii.xl} />
        <View style={{ height: spacing[2] }} />
        <Skeleton width="100%" height={130} borderRadius={radii.xl} />
      </View>
      <View style={styles.skeletonSection}>
        <Skeleton width={200} height={20} />
        <View style={{ height: spacing[2] }} />
        <Skeleton width="100%" height={180} borderRadius={radii.xl} />
      </View>
    </View>
  )
}

/** Quests list skeleton (3 shimmer cards). */
export function QuestsListSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      {[0, 1, 2].map(i => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonRow}>
            <Skeleton width={80} height={18} borderRadius={radii.full} />
            <Skeleton width={72} height={22} borderRadius={radii.full} />
          </View>
          <Skeleton width="85%" height={18} borderRadius={radii.sm} />
          <Skeleton width="70%" height={14} borderRadius={radii.sm} />
          <Skeleton width="100%" height={8} borderRadius={radii.full} />
          <View style={styles.skeletonRow}>
            <Skeleton width={120} height={30} borderRadius={radii.full} />
            <Skeleton width={24} height={24} borderRadius={radii.full} />
          </View>
        </View>
      ))}
    </View>
  )
}

/** Quest detail skeleton (shimmer blocks). */
export function QuestDetailSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      <Skeleton width="100%" height={180} borderRadius={radii.lg} />
      <Skeleton width="100%" height={100} borderRadius={radii.lg} />
      <Skeleton width="100%" height={140} borderRadius={radii.lg} />
      <Skeleton width="100%" height={120} borderRadius={radii.lg} />
    </View>
  )
}

/** Streaks skeleton (shimmer blocks). */
export function StreaksSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      <Skeleton width="100%" height={160} borderRadius={radii.lg} />
      <Skeleton width="100%" height={200} borderRadius={radii.lg} />
      <Skeleton width="100%" height={120} borderRadius={radii.lg} />
    </View>
  )
}

/** Surge map skeleton (shimmer blocks). */
export function SurgeSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      <Skeleton width="100%" height={56} borderRadius={radii.lg} />
      <Skeleton width="100%" height={280} borderRadius={radii.xl} />
      <Skeleton width="100%" height={120} borderRadius={radii.lg} />
      <Skeleton width="100%" height={160} borderRadius={radii.lg} />
    </View>
  )
}

/* ---------- Error state ---------- */

export interface ErrorStateProps {
  title: string
  subtitle: string
  retryLabel: string
  retryAria: string
  onRetry: () => void
}

/** Error state: role=alert, calm + actionable, with Retry. */
export function ErrorState({ title, subtitle, retryLabel, retryAria, onRetry }: ErrorStateProps) {
  return (
    <View
      style={styles.stateWrap}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessible
    >
      <View style={styles.stateIconWrap}>
        <AlertCircle size={32} color={colors.textTertiary} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{subtitle}</Text>
      <TouchableOpacity
        onPress={onRetry}
        style={styles.retryBtn}
        accessibilityRole="button"
        accessibilityLabel={retryAria}
      >
        <RefreshCw size={16} color={colors.white} />
        <Text style={styles.retryText}>{retryLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

/* ---------- Offline banner ---------- */

export interface OfflineBannerProps {
  title: string
  body: string
  ariaLabel: string
}

/** Offline banner: role=status, explains what's cached and what's paused. */
export function OfflineBanner({ title, body, ariaLabel }: OfflineBannerProps) {
  return (
    <View
      style={styles.offlineBanner}
      accessibilityRole="status"
      accessibilityLiveRegion="polite"
      accessibilityLabel={ariaLabel}
      accessible
    >
      <WifiOff size={18} color={colors.textMuted} />
      <View style={styles.offlineText}>
        <Text style={styles.offlineTitle}>{title}</Text>
        <Text style={styles.offlineBody}>{body}</Text>
      </View>
    </View>
  )
}

/* ---------- Empty states ---------- */

export interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  body: string
  ariaLabel: string
  ctaLabel?: string
  ctaAria?: string
  onCta?: () => void
}

/** Generic empty state: role=status, encouraging tone, optional CTA. */
export function EmptyState({ icon, title, body, ariaLabel, ctaLabel, ctaAria, onCta }: EmptyStateProps) {
  return (
    <View
      style={styles.stateWrap}
      accessibilityRole="status"
      accessibilityLiveRegion="polite"
      accessibilityLabel={ariaLabel}
      accessible
    >
      <View style={styles.stateIconWrap}>{icon}</View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {ctaLabel && onCta ? (
        <TouchableOpacity
          onPress={onCta}
          style={styles.ctaBtn}
          accessibilityRole="button"
          accessibilityLabel={ctaAria ?? ctaLabel}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

/** No active quests (encouraging, go online or see available). */
export function NoActiveQuestsState({
  title,
  body,
  ariaLabel,
  ctaLabel,
  ctaAria,
  onCta,
}: {
  title: string
  body: string
  ariaLabel: string
  ctaLabel: string
  ctaAria: string
  onCta: () => void
}) {
  return (
    <EmptyState
      icon={<Target size={32} color={colors.textTertiary} />}
      title={title}
      body={body}
      ariaLabel={ariaLabel}
      ctaLabel={ctaLabel}
      ctaAria={ctaAria}
      onCta={onCta}
    />
  )
}

/** No surge right now (next peak hint). */
export function NoSurgeState({
  title,
  body,
  ariaLabel,
}: {
  title: string
  body: string
  ariaLabel: string
}) {
  return (
    <EmptyState
      icon={<Zap size={32} color={colors.textTertiary} />}
      title={title}
      body={body}
      ariaLabel={ariaLabel}
    />
  )
}

/** New rider intro (welcoming, explains how incentives work). */
export function NewRiderState({
  title,
  body,
  ariaLabel,
  ctaLabel,
  ctaAria,
  onCta,
}: {
  title: string
  body: string
  ariaLabel: string
  ctaLabel: string
  ctaAria: string
  onCta: () => void
}) {
  return (
    <EmptyState
      icon={<Sparkles size={32} color={colors.gold} />}
      title={title}
      body={body}
      ariaLabel={ariaLabel}
      ctaLabel={ctaLabel}
      ctaAria={ctaAria}
      onCta={onCta}
    />
  )
}

/* ---------- Edge cases ---------- */

/** Claim failure: role=alert, progress preserved, no double-claim. */
export function ClaimFailState({
  title,
  body,
  ariaLabel,
  retryLabel,
  retryAria,
  onRetry,
}: {
  title: string
  body: string
  ariaLabel: string
  retryLabel: string
  retryAria: string
  onRetry: () => void
}) {
  return (
    <View
      style={styles.edgeBanner}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={ariaLabel}
      accessible
    >
      <View style={styles.edgeLeft}>
        <AlertCircle size={18} color={colors.warning} />
        <View style={styles.edgeText}>
          <Text style={styles.edgeTitle}>{title}</Text>
          <Text style={styles.edgeBody}>{body}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onRetry}
        style={styles.edgeRetryBtn}
        accessibilityRole="button"
        accessibilityLabel={retryAria}
      >
        <Text style={styles.edgeRetryText}>{retryLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

/** Already claimed: role=status, no double-claim. */
export function AlreadyClaimedState({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.edgeBannerDone}
      accessibilityRole="status"
      accessibilityLiveRegion="polite"
      accessibilityLabel={ariaLabel}
      accessible
    >
      <CheckCircle2 size={18} color={colors.success} />
      <Text style={styles.edgeDoneText}>{ariaLabel}</Text>
    </View>
  )
}

/** Expired mid-view: role=status, explains what still counts. */
export function ExpiredMidViewState({
  title,
  body,
  ariaLabel,
}: {
  title: string
  body: string
  ariaLabel: string
}) {
  return (
    <View
      style={styles.edgeBanner}
      accessibilityRole="status"
      accessibilityLiveRegion="polite"
      accessibilityLabel={ariaLabel}
      accessible
    >
      <View style={styles.edgeLeft}>
        <CircleSlash size={18} color={colors.textTertiary} />
        <View style={styles.edgeText}>
          <Text style={styles.edgeTitle}>{title}</Text>
          <Text style={styles.edgeBody}>{body}</Text>
        </View>
      </View>
    </View>
  )
}

/** Progress race (completed elsewhere): role=status. */
export function ProgressRaceState({
  title,
  body,
  ariaLabel,
}: {
  title: string
  body: string
  ariaLabel: string
}) {
  return (
    <View
      style={styles.edgeBanner}
      accessibilityRole="status"
      accessibilityLiveRegion="polite"
      accessibilityLabel={ariaLabel}
      accessible
    >
      <View style={styles.edgeLeft}>
        <TrendingUp size={18} color={colors.info} />
        <View style={styles.edgeText}>
          <Text style={styles.edgeTitle}>{title}</Text>
          <Text style={styles.edgeBody}>{body}</Text>
        </View>
      </View>
    </View>
  )
}

/** Offline claim blocked: role=alert, progress saved. */
export function OfflineClaimBlockedState({
  title,
  body,
  ariaLabel,
}: {
  title: string
  body: string
  ariaLabel: string
}) {
  return (
    <View
      style={styles.edgeBanner}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={ariaLabel}
      accessible
    >
      <View style={styles.edgeLeft}>
        <CloudOff size={18} color={colors.textMuted} />
        <View style={styles.edgeText}>
          <Text style={styles.edgeTitle}>{title}</Text>
          <Text style={styles.edgeBody}>{body}</Text>
        </View>
      </View>
    </View>
  )
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  // Skeletons
  skeletonWrap: {
    padding: spacing[4],
    gap: spacing[4],
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2],
  },
  skeletonSection: {
    gap: spacing[2],
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  // State wrapper (error + empty)
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    gap: spacing[2],
  },
  stateIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  stateTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    textAlign: 'center',
  },
  stateBody: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
    lineHeight: 20,
  },
  // Retry button
  retryBtn: {
    marginTop: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    minHeight: 44,
  },
  retryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // CTA button (empty states)
  ctaBtn: {
    marginTop: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Offline banner
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  offlineText: {
    flex: 1,
    gap: 2,
  },
  offlineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  offlineBody: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 17,
  },
  // Edge case banners
  edgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2.5],
    backgroundColor: colors.warningLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[3],
    ...shadow('sm'),
  },
  edgeBannerDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.successLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.successLight,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
  },
  edgeLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
    flex: 1,
  },
  edgeText: {
    flex: 1,
    gap: 2,
  },
  edgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  edgeBody: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
    lineHeight: 17,
  },
  edgeDoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  edgeRetryBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: colors.warning,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  edgeRetryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
})
