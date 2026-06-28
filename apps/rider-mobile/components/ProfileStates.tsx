import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import {
  CloudOff,
  AlertCircle,
  RefreshCw,
  UserPlus,
  CreditCard,
  UploadCloud,
  Lock,
  Clock,
} from 'lucide-react-native'
import { Skeleton } from '@chinooz/ui'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'

/**
 * Profile & Settings — shared loading, empty, error, and offline state
 * components.
 *
 * Design principles:
 * - Loading = shimmer skeletons (never spinners), aria-busy on the container.
 * - Empty: missing-info prompts (encouraging), no-payout-method (with link),
 *   announced role=text + liveRegion=polite.
 * - Errors: load/save/upload/OTP failures (role=alert, preserve edits),
 *   offline (cached profile + queued edits), session-expiry on sensitive
 *   actions (explains re-auth needed).
 * - Edge: document expired/rejected inline banners, verification-pending lock.
 * - Edits are never lost on failure; sensitive actions are safe.
 */

/* ────────────────────────────────────────────────────────────────────
 * Skeletons — shimmer, not spinners
 * ──────────────────────────────────────────────────────────────────── */

/** Profile hub skeleton: header + quick links + settings sections. */
export function ProfileHubSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      {/* Header card */}
      <View style={[styles.skeletonCard, { alignItems: 'center', gap: spacing[2] }]}>
        <Skeleton width={80} height={80} borderRadius={radii.full} />
        <Skeleton width={140} height={18} />
        <View style={styles.skeletonRow}>
          <Skeleton width={60} height={22} borderRadius={radii.full} />
          <Skeleton width={60} height={22} borderRadius={radii.full} />
        </View>
        <Skeleton width="70%" height={12} />
      </View>

      {/* Quick links */}
      <Skeleton width={120} height={12} />
      <View style={styles.skeletonGrid2}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={[styles.skeletonCard, { flex: 1, gap: spacing[1] }]}>
            <Skeleton width={28} height={28} borderRadius={radii.full} />
            <Skeleton width="80%" height={13} />
            <Skeleton width="50%" height={11} />
          </View>
        ))}
      </View>

      {/* Settings sections */}
      <Skeleton width={100} height={12} />
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={[styles.skeletonCard, { gap: spacing[2] }]}>
          {Array.from({ length: 2 }).map((_, j) => (
            <View key={j} style={styles.skeletonRow}>
              <Skeleton width={32} height={32} borderRadius={radii.md} />
              <View style={{ flex: 1, gap: spacing[1] }}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="40%" height={11} />
              </View>
              <Skeleton width={16} height={16} />
            </View>
          ))}
        </View>
      ))}

      {/* Sign out + version */}
      <View style={{ alignItems: 'center', gap: spacing[2], marginTop: spacing[2] }}>
        <Skeleton width={100} height={16} borderRadius={radii.lg} />
        <Skeleton width={60} height={11} />
      </View>
    </View>
  )
}

/** Personal edit skeleton: photo + form fields. */
export function PersonalEditSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      {/* Photo */}
      <View style={{ alignItems: 'center', gap: spacing[2], paddingVertical: spacing[2] }}>
        <Skeleton width={88} height={88} borderRadius={radii.full} />
        <Skeleton width={100} height={14} borderRadius={radii.full} />
      </View>

      {/* Form fields */}
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={{ gap: spacing[1.5] }}>
          <Skeleton width={80} height={14} />
          <Skeleton width="100%" height={48} borderRadius={radii.md} />
        </View>
      ))}

      {/* Save button */}
      <Skeleton width="100%" height={52} borderRadius={radii.lg} />
    </View>
  )
}

/** Vehicle & documents skeleton: form fields + doc cards. */
export function VehicleDocsSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      {/* Vehicle type row */}
      <Skeleton width={60} height={12} />
      <View style={styles.skeletonRow}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={70} height={44} borderRadius={radii.md} />
        ))}
      </View>

      {/* Vehicle fields */}
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={{ gap: spacing[1.5] }}>
          <Skeleton width={80} height={14} />
          <Skeleton width="100%" height={48} borderRadius={radii.md} />
        </View>
      ))}

      <Skeleton width="100%" height={50} borderRadius={radii.lg} />

      {/* Doc cards */}
      <Skeleton width={100} height={12} />
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={[styles.skeletonCard, { gap: spacing[2] }]}>
          <View style={styles.skeletonRow}>
            <Skeleton width={44} height={44} borderRadius={radii.md} />
            <View style={{ flex: 1, gap: spacing[1] }}>
              <Skeleton width="60%" height={14} />
              <Skeleton width="40%" height={11} />
            </View>
            <Skeleton width={50} height={22} borderRadius={radii.full} />
          </View>
        </View>
      ))}
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Empty states — missing-info, no-payout-method
 * ──────────────────────────────────────────────────────────────────── */

interface EmptyProps {
  icon: React.ReactNode
  title: string
  body: string
  ariaLabel: string
  actionLabel?: string
  actionAria?: string
  onAction?: () => void
}

function EmptyCard({ icon, title, body, ariaLabel, actionLabel, actionAria, onAction }: EmptyProps) {
  return (
    <View
      style={styles.stateCard}
      accessibilityRole="text"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.stateIconWrap}>{icon}</View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={actionAria ?? actionLabel}
          onPress={onAction}
          style={styles.actionBtn}
        >
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

/** Missing optional info — encouraging prompt to complete profile. */
export function MissingInfoPrompt({
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
  actionLabel?: string
  actionAria?: string
  onAction?: () => void
}) {
  return (
    <EmptyCard
      icon={<UserPlus size={26} color={colors.primary} />}
      title={title}
      body={body}
      ariaLabel={ariaLabel}
      actionLabel={actionLabel}
      actionAria={actionAria}
      onAction={onAction}
    />
  )
}

/** No payout method — links to Earnings/payout setup. */
export function NoPayoutMethodPrompt({
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
    <EmptyCard
      icon={<CreditCard size={26} color={colors.primary} />}
      title={title}
      body={body}
      ariaLabel={ariaLabel}
      actionLabel={actionLabel}
      actionAria={actionAria}
      onAction={onAction}
    />
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Error states — load/save/upload/OTP failure, role=alert
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

/** Save failure — preserves edits, offers retry. */
export function SaveFailState({
  title,
  body,
  preservedNote,
  retry,
  retryAria,
  onRetry,
  cancelLabel,
  cancelAria,
  onCancel,
}: {
  title: string
  body: string
  preservedNote: string
  retry: string
  retryAria: string
  onRetry: () => void
  cancelLabel: string
  cancelAria: string
  onCancel: () => void
}) {
  return (
    <View
      style={styles.inlineBanner}
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${body} ${preservedNote}`}
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.inlineLeft}>
        <AlertCircle size={18} color={colors.warning} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.inlineTitle}>{title}</Text>
          <Text style={styles.inlineBody}>{body}</Text>
          <Text style={styles.preservedNote}>{preservedNote}</Text>
        </View>
      </View>
      <View style={styles.inlineActions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={cancelAria}
          onPress={onCancel}
          style={styles.inlineCancelBtn}
        >
          <Text style={styles.inlineCancelText}>{cancelLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={retryAria}
          onPress={onRetry}
          style={styles.inlineRetryBtn}
        >
          <RefreshCw size={14} color={colors.white} />
          <Text style={styles.inlineRetryText}>{retry}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

/** Upload failure — for document re-upload / photo upload. */
export function UploadFailState({
  title,
  body,
  retry,
  retryAria,
  onRetry,
  onCancel,
  cancelLabel,
  cancelAria,
}: {
  title: string
  body: string
  retry: string
  retryAria: string
  onRetry: () => void
  onCancel: () => void
  cancelLabel: string
  cancelAria: string
}) {
  return (
    <View
      style={styles.inlineBanner}
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${body}`}
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.inlineLeft}>
        <UploadCloud size={18} color={colors.warning} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.inlineTitle}>{title}</Text>
          <Text style={styles.inlineBody}>{body}</Text>
        </View>
      </View>
      <View style={styles.inlineActions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={cancelAria}
          onPress={onCancel}
          style={styles.inlineCancelBtn}
        >
          <Text style={styles.inlineCancelText}>{cancelLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={retryAria}
          onPress={onRetry}
          style={styles.inlineRetryBtn}
        >
          <RefreshCw size={14} color={colors.white} />
          <Text style={styles.inlineRetryText}>{retry}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

/** OTP / phone-change failure — preserves form, offers retry. */
export function OtpFailState({
  title,
  body,
  preservedNote,
  retry,
  retryAria,
  onRetry,
}: {
  title: string
  body: string
  preservedNote: string
  retry: string
  retryAria: string
  onRetry: () => void
}) {
  return (
    <View
      style={styles.inlineBanner}
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${body} ${preservedNote}`}
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.inlineLeft}>
        <AlertCircle size={18} color={colors.error} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.inlineTitle}>{title}</Text>
          <Text style={styles.inlineBody}>{body}</Text>
          <Text style={styles.preservedNote}>{preservedNote}</Text>
        </View>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={retryAria}
        onPress={onRetry}
        style={styles.inlineRetryBtn}
      >
        <RefreshCw size={14} color={colors.white} />
        <Text style={styles.inlineRetryText}>{retry}</Text>
      </TouchableOpacity>
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Offline state — cached profile + queued edits
 * ──────────────────────────────────────────────────────────────────── */

export function OfflineProfileBanner({
  cachedDate,
  queuedEdits,
  title,
  bodyTemplate,
  queuedNote,
  ariaLabel,
  retry,
  retryAria,
  onRetry,
}: {
  cachedDate: string
  queuedEdits: boolean
  title: string
  bodyTemplate: string
  queuedNote: string
  ariaLabel: string
  retry: string
  retryAria: string
  onRetry: () => void
}) {
  const body = bodyTemplate.replace('{{date}}', cachedDate)
  return (
    <View
      style={styles.offlineBanner}
      accessibilityRole="text"
      accessibilityLabel={ariaLabel.replace('{{date}}', cachedDate)}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.offlineLeft}>
        <CloudOff size={20} color={colors.textMuted} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.offlineTitle}>{title}</Text>
          <Text style={styles.offlineBody}>{body}</Text>
          {queuedEdits && <Text style={styles.queuedNote}>{queuedNote}</Text>}
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
 * Session expiry — sensitive actions need re-auth
 * ──────────────────────────────────────────────────────────────────── */

export function SessionExpiryState({
  title,
  body,
  reauthLabel,
  reauthAria,
  onReauth,
  cancelLabel,
  cancelAria,
  onCancel,
}: {
  title: string
  body: string
  reauthLabel: string
  reauthAria: string
  onReauth: () => void
  cancelLabel: string
  cancelAria: string
  onCancel: () => void
}) {
  return (
    <View
      style={styles.stateCard}
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${body}`}
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.stateIconWrap}>
        <Lock size={28} color={colors.warning} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
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
          accessibilityLabel={reauthAria}
          onPress={onReauth}
          style={styles.failRetryBtn}
        >
          <Lock size={16} color={colors.white} />
          <Text style={styles.failRetryText}>{reauthLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Edge: document expired/rejected inline banner
 * ──────────────────────────────────────────────────────────────────── */

export function DocExpiredBanner({
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
      style={styles.edgeBanner}
      accessibilityRole="text"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.edgeLeft}>
        <Clock size={16} color={colors.warning} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.edgeTitle}>{title}</Text>
          <Text style={styles.edgeBody}>{body}</Text>
        </View>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={actionAria}
        onPress={onAction}
        style={styles.edgeBtn}
      >
        <Text style={styles.edgeBtnText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

export function DocRejectedBanner({
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
      style={[styles.edgeBanner, { backgroundColor: colors.errorLight, borderColor: colors.error }]}
      accessibilityRole="text"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.edgeLeft}>
        <AlertCircle size={16} color={colors.error} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.edgeTitle, { color: colors.error }]}>{title}</Text>
          <Text style={[styles.edgeBody, { color: colors.error }]}>{body}</Text>
        </View>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={actionAria}
        onPress={onAction}
        style={[styles.edgeBtn, { borderColor: colors.error }]}
      >
        <Text style={[styles.edgeBtnText, { color: colors.error }]}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Edge: verification-pending lock
 * ──────────────────────────────────────────────────────────────────── */

export function VerificationPendingLock({
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
      style={styles.lockBanner}
      accessibilityRole="text"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
    >
      <Lock size={16} color={colors.textMuted} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.lockTitle}>{title}</Text>
        <Text style={styles.lockBody}>{body}</Text>
      </View>
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Styles
 * ──────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  // Skeletons.
  skeletonWrap: { padding: spacing[5], gap: spacing[4] },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    ...shadow('sm'),
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  skeletonGrid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2.5],
  },

  // Empty + error state card.
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
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
  actionBtn: {
    marginTop: spacing[1],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
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

  // Inline banner (save/upload/OTP fail, offline).
  inlineBanner: {
    backgroundColor: colors.warningLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2.5],
  },
  inlineLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
    flex: 1,
  },
  inlineTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  inlineBody: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
    lineHeight: 17,
  },
  preservedNote: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
  },
  inlineActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
  },
  inlineCancelBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCancelText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  inlineRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    minHeight: 40,
  },
  inlineRetryText: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },

  // Offline banner.
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
  queuedNote: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
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

  // Session expiry + fail buttons.
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

  // Edge banners (expired/rejected docs).
  edgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    backgroundColor: colors.warningLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  edgeLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
    flex: 1,
  },
  edgeTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: '#92400E',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  edgeBody: {
    fontSize: 12,
    color: '#92400E',
    fontFamily: fontFamily.sans[0],
    lineHeight: 17,
  },
  edgeBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#92400E',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  edgeBtnText: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: '#92400E',
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Verification-pending lock.
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  lockTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  lockBody: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 17,
  },
})
