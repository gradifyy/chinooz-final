import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import {
  CloudOff,
  AlertCircle,
  Inbox,
  Wallet,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Lock,
  WifiOff,
  FileWarning,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize } from '@chinooz/theme'

/**
 * RW7 — Shared loading / empty / error / offline / edge-case states for the
 * Cash & COD Wallet screens.
 *
 * Philosophy: money errors are calm + safe (never lose/double money).
 * Skeletons shimmer, not spinners. Recovery is always clear.
 *
 * - WalletSkeleton: shimmer blocks for balance/meter/stats (aria-busy).
 * - EmptyState: no collections / no deposits (icon + explainer).
 * - ErrorState: wallet load error (role=alert, calm, Retry).
 * - OfflineBanner: role=status, cached balance, queued deposit hint.
 * - DisputeBanner: disputed collection affecting balance.
 * - PartialDepositBanner: partial deposit reconciliation.
 * - AtLimitBanner: COD jobs blocked, deposit to unlock.
 */

// ---------------------------------------------------------------------------
// Skeleton — shimmer blocks, not spinners
// ---------------------------------------------------------------------------

export function WalletSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
      aria-busy
    >
      {/* Hero skeleton */}
      <View style={styles.skelHeroCard}>
        <View style={styles.skelHeroLabel} />
        <View style={styles.skelHeroAmount} />
        <View style={styles.skelHeroCaption} />
        <View style={styles.skelHeroBtn} />
      </View>

      {/* Meter skeleton */}
      <View style={styles.skelMeterCard}>
        <View style={styles.skelMeterHeader} />
        <View style={styles.skelMeterBar} />
        <View style={styles.skelMeterLabels} />
      </View>

      {/* Stats skeleton */}
      <View style={styles.skelStatsRow}>
        {[0, 1, 2].map(i => (
          <View key={i} style={styles.skelStatTile}>
            <View style={styles.skelStatLabel} />
            <View style={styles.skelStatValue} />
          </View>
        ))}
      </View>

      {/* Entries skeleton */}
      <View style={styles.skelEntriesCard}>
        {[0, 1].map(i => (
          <View key={i} style={styles.skelEntryRow}>
            <View style={styles.skelEntryIcon} />
            <View style={styles.skelEntryText} />
          </View>
        ))}
      </View>
    </View>
  )
}

/** Compact skeleton for the limit meter only. */
export function MeterSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skelMeterCard}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
      aria-busy
    >
      <View style={styles.skelMeterHeader} />
      <View style={styles.skelMeterBar} />
      <View style={styles.skelMeterLabels} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Empty state — no collections / no deposits
// ---------------------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  body,
  ariaLabel,
  actionLabel,
  actionAria,
  onAction,
}: {
  icon?: React.ReactNode
  title: string
  body: string
  ariaLabel: string
  actionLabel?: string
  actionAria?: string
  onAction?: () => void
}) {
  return (
    <View
      style={styles.emptyCard}
      accessibilityRole="summary"
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.emptyIconWrap}>
        {icon ?? <Inbox size={28} color={colors.textMuted} />}
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={actionAria ?? actionLabel}
          onPress={onAction}
          style={styles.emptyActionBtn}
        >
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Error state — calm, safe, retry
// ---------------------------------------------------------------------------

export function WalletErrorState({
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
      style={styles.errorCard}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.errorIconWrap}>
        <AlertCircle size={28} color={colors.warning} />
      </View>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorBody}>{body}</Text>
      <View style={styles.errorCalmRow}>
        <ShieldCheck size={13} color={colors.success} />
        <Text style={styles.errorCalmText}>Your money is safe.</Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={retryAria}
        onPress={onRetry}
        style={styles.errorRetryBtn}
      >
        <RefreshCw size={15} color={colors.white} />
        <Text style={styles.errorRetryText}>{retryLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Offline banner — cached balance, queued deposit
// ---------------------------------------------------------------------------

export function OfflineBanner({
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
      style={styles.offlineBanner}
      accessibilityRole="status"
      accessibilityLiveRegion="polite"
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.offlineLeft}>
        <WifiOff size={18} color={colors.warning} />
        <View style={styles.offlineTextWrap}>
          <Text style={styles.offlineTitle}>{title}</Text>
          <Text style={styles.offlineBody}>{body}</Text>
        </View>
      </View>
    </View>
  )
}

/** Offline + queued deposit — shows the queued deposit intent. */
export function OfflineQueuedBanner({
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
      style={styles.offlineQueuedBanner}
      accessibilityRole="status"
      accessibilityLiveRegion="polite"
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.offlineQueuedLeft}>
        <CloudOff size={18} color={colors.info} />
        <View style={styles.offlineTextWrap}>
          <Text style={styles.offlineQueuedTitle}>{title}</Text>
          <Text style={styles.offlineQueuedBody}>{body}</Text>
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Dispute banner — disputed collection affecting balance
// ---------------------------------------------------------------------------

export function DisputeBanner({
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
      style={styles.disputeBanner}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.disputeLeft}>
        <FileWarning size={16} color={colors.warning} />
        <View style={styles.offlineTextWrap}>
          <Text style={styles.disputeTitle}>{title}</Text>
          <Text style={styles.disputeBody}>{body}</Text>
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Partial deposit banner — partial reconciliation
// ---------------------------------------------------------------------------

export function PartialDepositBanner({
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
      style={styles.partialBanner}
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.disputeLeft}>
        <AlertCircle size={16} color={colors.info} />
        <View style={styles.offlineTextWrap}>
          <Text style={styles.partialTitle}>{title}</Text>
          <Text style={styles.partialBody}>{body}</Text>
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// At-limit banner — COD jobs blocked
// ---------------------------------------------------------------------------

export function AtLimitBanner({
  title,
  body,
  ariaLabel,
  actionLabel,
  actionAria,
  onAction,
}: {
  title: string
  body: string
  ariaLabel: string
  actionLabel: string
  actionAria: string
  onAction: () => void
}) {
  return (
    <View
      style={styles.atLimitBanner}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.atLimitLeft}>
        <Lock size={16} color={colors.error} />
        <View style={styles.offlineTextWrap}>
          <Text style={styles.atLimitTitle}>{title}</Text>
          <Text style={styles.atLimitBody}>{body}</Text>
        </View>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={actionAria}
        onPress={onAction}
        style={styles.atLimitAction}
      >
        <Text style={styles.atLimitActionText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Deposit error — preserves amount/method, no double-count
// ---------------------------------------------------------------------------

export function DepositErrorState({
  title,
  body,
  ariaLabel,
  preservedNote,
  retryLabel,
  retryAria,
  onRetry,
  onBack,
  backLabel,
}: {
  title: string
  body: string
  ariaLabel: string
  preservedNote: string
  retryLabel: string
  retryAria: string
  onRetry: () => void
  onBack: () => void
  backLabel: string
}) {
  return (
    <View
      style={styles.errorCard}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.errorIconWrap}>
        <AlertCircle size={28} color={colors.warning} />
      </View>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorBody}>{body}</Text>
      <View style={styles.preservedRow}>
        <ShieldCheck size={13} color={colors.success} />
        <Text style={styles.preservedText}>{preservedNote}</Text>
      </View>
      <View style={styles.errorBtnRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={retryAria}
          onPress={onRetry}
          style={styles.errorRetryBtn}
        >
          <RefreshCw size={15} color={colors.white} />
          <Text style={styles.errorRetryText}>{retryLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={onBack}
          style={styles.errorBackBtn}
        >
          <Text style={styles.errorBackText}>{backLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Skeleton
  skeletonWrap: {
    padding: spacing[4],
    gap: spacing[4],
    flex: 1,
  },
  skelHeroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[5],
    gap: spacing[2.5],
  },
  skelHeroLabel: {
    width: 120,
    height: 12,
    backgroundColor: colors.shimmer,
    borderRadius: radii.sm,
  },
  skelHeroAmount: {
    width: 180,
    height: 36,
    backgroundColor: colors.shimmer,
    borderRadius: radii.md,
  },
  skelHeroCaption: {
    width: '100%',
    height: 14,
    backgroundColor: colors.shimmer,
    borderRadius: radii.sm,
  },
  skelHeroBtn: {
    width: '100%',
    height: 44,
    backgroundColor: colors.shimmer,
    borderRadius: radii.lg,
    marginTop: spacing[2],
  },
  skelMeterCard: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[5],
    gap: spacing[3],
  },
  skelMeterHeader: {
    width: 140,
    height: 14,
    backgroundColor: colors.shimmer,
    borderRadius: radii.sm,
  },
  skelMeterBar: {
    width: '100%',
    height: 10,
    backgroundColor: colors.shimmer,
    borderRadius: radii.full,
  },
  skelMeterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skelStatsRow: {
    flexDirection: 'row',
    gap: spacing[2.5],
  },
  skelStatTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    gap: spacing[1.5],
  },
  skelStatLabel: {
    width: 70,
    height: 10,
    backgroundColor: colors.shimmer,
    borderRadius: radii.sm,
  },
  skelStatValue: {
    width: 80,
    height: 16,
    backgroundColor: colors.shimmer,
    borderRadius: radii.sm,
  },
  skelEntriesCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  skelEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 56,
  },
  skelEntryIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.shimmer,
  },
  skelEntryText: {
    flex: 1,
    height: 32,
    backgroundColor: colors.shimmer,
    borderRadius: radii.sm,
  },

  // Empty
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    fontFamily: fontFamily.sansBold[0],
  },
  emptyBody: {
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: fontFamily.sans[0],
  },
  emptyActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[1],
  },
  emptyActionText: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Error
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[2.5],
  },
  errorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    fontFamily: fontFamily.sansBold[0],
  },
  errorBody: {
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: fontFamily.sans[0],
  },
  errorCalmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.md,
  },
  errorCalmText: {
    fontSize: fontSize.xs[0],
    fontWeight: '600',
    color: colors.success,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  errorRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    minHeight: 48,
  },
  errorRetryText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  errorBtnRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  errorBackBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 48,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  errorBackText: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Preserved note (deposit error)
  preservedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.md,
  },
  preservedText: {
    fontSize: fontSize.xs[0],
    fontWeight: '600',
    color: colors.success,
    fontFamily: fontFamily.sansSemiBold[0],
    flex: 1,
  },

  // Offline banner
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  offlineLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
    flex: 1,
  },
  offlineTextWrap: {
    flex: 1,
    gap: 2,
  },
  offlineTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  offlineBody: {
    fontSize: fontSize.xs[0],
    color: colors.textSecondary,
    lineHeight: 16,
    fontFamily: fontFamily.sans[0],
  },

  // Offline queued
  offlineQueuedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  offlineQueuedLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
    flex: 1,
  },
  offlineQueuedTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  offlineQueuedBody: {
    fontSize: fontSize.xs[0],
    color: colors.textSecondary,
    lineHeight: 16,
    fontFamily: fontFamily.sans[0],
  },

  // Dispute banner
  disputeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  disputeLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
    flex: 1,
  },
  disputeTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  disputeBody: {
    fontSize: fontSize.xs[0],
    color: colors.textSecondary,
    lineHeight: 16,
    fontFamily: fontFamily.sans[0],
  },

  // Partial deposit banner
  partialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  partialTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  partialBody: {
    fontSize: fontSize.xs[0],
    color: colors.textSecondary,
    lineHeight: 16,
    fontFamily: fontFamily.sans[0],
  },

  // At-limit banner
  atLimitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.25)',
    gap: spacing[2.5],
  },
  atLimitLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
    flex: 1,
  },
  atLimitTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.error,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  atLimitBody: {
    fontSize: fontSize.xs[0],
    color: colors.textSecondary,
    lineHeight: 16,
    fontFamily: fontFamily.sans[0],
  },
  atLimitAction: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atLimitActionText: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
})
