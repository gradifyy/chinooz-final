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
  RefreshCw,
  ShieldCheck,
  WifiOff,
  FileWarning,
  LogIn,
  PlayCircle,
  RotateCcw,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize } from '@chinooz/theme'
import { Skeleton } from '@chinooz/ui'

/**
 * RO3-RO7 — Shared loading / empty / error / offline / edge-case states for
 * the rider onboarding flow.
 *
 * Philosophy: onboarding failures preserve progress, errors are calm +
 * recoverable, skeletons shimmer (not spinners).
 *
 * - OnboardingSkeleton: stepper + body shimmer (aria-busy).
 * - PendingSkeleton: verification pills shimmer.
 * - GoOnlineSkeleton: checklist items shimmer.
 * - OnboardingError: generic error with retry (role=alert, progress preserved).
 * - SubmitError: submit failure with preserved input + retry.
 * - UploadError: per-document upload failure (retry, others safe).
 * - OfflineBanner: role=status, progress saved + queued.
 * - SessionExpiredCard: session expiry with re-login CTA.
 * - EmptyDocsState: no documents uploaded yet (prompt).
 * - ResumeCard: half-finished onboarding resume prompt.
 * - RejectedDocCard: document rejected mid-review + retake.
 */

// ---------------------------------------------------------------------------
// Skeletons — shimmer blocks, not spinners
// ---------------------------------------------------------------------------

export function OnboardingSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
      aria-busy
    >
      {/* Stepper skeleton */}
      <View style={styles.skelStepperRow}>
        <View style={styles.skelStepDot} />
        <View style={styles.skelStepLine} />
        <View style={styles.skelStepDot} />
        <View style={styles.skelStepLine} />
        <View style={styles.skelStepDot} />
        <View style={styles.skelStepLine} />
        <View style={styles.skelStepDot} />
      </View>

      {/* Body skeleton */}
      <View style={styles.skelBody}>
        <Skeleton width="60%" height={20} />
        <View style={styles.skelCard}>
          <Skeleton width="40%" height={16} />
          <View style={styles.skelRow}>
            <Skeleton width="30%" height={14} />
            <Skeleton width="50%" height={14} />
          </View>
          <View style={styles.skelRow}>
            <Skeleton width="25%" height={14} />
            <Skeleton width="55%" height={14} />
          </View>
          <View style={styles.skelRow}>
            <Skeleton width="35%" height={14} />
            <Skeleton width="45%" height={14} />
          </View>
        </View>
        <View style={styles.skelCard}>
          <Skeleton width="35%" height={16} />
          <View style={styles.skelRow}>
            <Skeleton width="30%" height={14} />
            <Skeleton width="50%" height={14} />
          </View>
          <View style={styles.skelRow}>
            <Skeleton width="25%" height={14} />
            <Skeleton width="55%" height={14} />
          </View>
        </View>
      </View>
    </View>
  )
}

export function PendingSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
      aria-busy
    >
      <View style={styles.skelCenterWrap}>
        <View style={styles.skelCircle} />
        <Skeleton width="50%" height={24} />
        <Skeleton width="70%" height={16} />
        <Skeleton width="40%" height={14} />
      </View>
      <View style={styles.skelPills}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={styles.skelPill}>
            <Skeleton width={16} height={16} borderRadius={8} />
            <Skeleton width="40%" height={14} />
            <Skeleton width="20%" height={12} />
          </View>
        ))}
      </View>
    </View>
  )
}

export function GoOnlineSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
      aria-busy
    >
      <Skeleton width="70%" height={20} />
      <View style={styles.skelChecklist}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={styles.skelChecklistItem}>
            <Skeleton width={24} height={24} borderRadius={12} />
            <Skeleton width="50%" height={16} />
          </View>
        ))}
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Error state — calm, progress preserved, retry
// ---------------------------------------------------------------------------

export function OnboardingError({
  title,
  body,
  ariaLabel,
  retryLabel,
  retryAria,
  calmText,
  onRetry,
}: {
  title: string
  body: string
  ariaLabel: string
  retryLabel: string
  retryAria: string
  calmText?: string
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
        <Text style={styles.errorCalmText}>{calmText ?? 'Progress saved'}</Text>
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

export function SubmitError({
  title,
  body,
  ariaLabel,
  retryLabel,
  retryAria,
  calmText,
  onRetry,
}: {
  title: string
  body: string
  ariaLabel: string
  retryLabel: string
  retryAria: string
  calmText?: string
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
        <Text style={styles.errorCalmText}>{calmText ?? 'All details preserved'}</Text>
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
// Upload error — per-document, others safe, retry
// ---------------------------------------------------------------------------

export function UploadError({
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
      style={styles.uploadErrorCard}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.uploadErrorHeader}>
        <AlertCircle size={16} color={colors.error} />
        <Text style={styles.uploadErrorTitle}>{title}</Text>
      </View>
      <Text style={styles.uploadErrorBody}>{body}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={retryAria}
        onPress={onRetry}
        style={styles.uploadRetryBtn}
      >
        <RefreshCw size={14} color={colors.primary} />
        <Text style={styles.uploadRetryText}>{retryLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Offline banner — role=status, progress saved + queued
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
      accessibilityRole="summary"
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
      style={styles.offlineBanner}
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.offlineLeft}>
        <CloudOff size={18} color={colors.warning} />
        <View style={styles.offlineTextWrap}>
          <Text style={styles.offlineTitle}>{title}</Text>
          <Text style={styles.offlineBody}>{body}</Text>
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Session expired — re-login CTA
// ---------------------------------------------------------------------------

export function SessionExpiredCard({
  title,
  body,
  ariaLabel,
  loginLabel,
  loginAria,
  calmText,
  onLogin,
}: {
  title: string
  body: string
  ariaLabel: string
  loginLabel: string
  loginAria: string
  calmText?: string
  onLogin: () => void
}) {
  return (
    <View
      style={styles.sessionCard}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.sessionIconWrap}>
        <LogIn size={28} color={colors.primary} />
      </View>
      <Text style={styles.sessionTitle}>{title}</Text>
      <Text style={styles.sessionBody}>{body}</Text>
      <View style={styles.errorCalmRow}>
        <ShieldCheck size={13} color={colors.success} />
        <Text style={styles.errorCalmText}>{calmText ?? 'Progress saved'}</Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={loginAria}
        onPress={onLogin}
        style={styles.sessionLoginBtn}
      >
        <Text style={styles.sessionLoginText}>{loginLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Empty docs state — prompt to start uploading
// ---------------------------------------------------------------------------

export function EmptyDocsState({
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
      style={styles.emptyCard}
      accessibilityRole="summary"
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.emptyIconWrap}>
        <Inbox size={28} color={colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={actionAria}
        onPress={onAction}
        style={styles.emptyActionBtn}
      >
        <Text style={styles.emptyActionText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Resume card — half-finished onboarding
// ---------------------------------------------------------------------------

export function ResumeCard({
  title,
  body,
  ariaLabel,
  continueLabel,
  continueAria,
  onContinue,
  startOverLabel,
  startOverAria,
  onStartOver,
}: {
  title: string
  body: string
  ariaLabel: string
  continueLabel: string
  continueAria: string
  onContinue: () => void
  startOverLabel: string
  startOverAria: string
  onStartOver: () => void
}) {
  return (
    <View
      style={styles.resumeCard}
      accessibilityRole="summary"
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.resumeIconWrap}>
        <PlayCircle size={28} color={colors.primary} />
      </View>
      <Text style={styles.resumeTitle}>{title}</Text>
      <Text style={styles.resumeBody}>{body}</Text>
      <View style={styles.resumeActions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={continueAria}
          onPress={onContinue}
          style={styles.resumeContinueBtn}
        >
          <Text style={styles.resumeContinueText}>{continueLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={startOverAria}
          onPress={onStartOver}
          style={styles.resumeStartOverBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <RotateCcw size={14} color={colors.textMuted} />
          <Text style={styles.resumeStartOverText}>{startOverLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Rejected doc card — reason + retake
// ---------------------------------------------------------------------------

export function RejectedDocCard({
  title,
  body,
  ariaLabel,
  retakeLabel,
  retakeAria,
  onRetake,
}: {
  title: string
  body: string
  ariaLabel: string
  retakeLabel: string
  retakeAria: string
  onRetake: () => void
}) {
  return (
    <View
      style={styles.rejectedCard}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.rejectedHeader}>
        <FileWarning size={16} color={colors.error} />
        <Text style={styles.rejectedTitle}>{title}</Text>
      </View>
      <Text style={styles.rejectedBody}>{body}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={retakeAria}
        onPress={onRetake}
        style={styles.rejectedRetakeBtn}
      >
        <RefreshCw size={14} color={colors.white} />
        <Text style={styles.rejectedRetakeText}>{retakeLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Progress saved toast — inline reassurance
// ---------------------------------------------------------------------------

export function ProgressSavedToast({ text }: { text: string }) {
  return (
    <View
      style={styles.progressToast}
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
    >
      <ShieldCheck size={14} color={colors.success} />
      <Text style={styles.progressToastText}>{text}</Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Skeletons
  skeletonWrap: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing[5],
  },
  skelStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[5],
  },
  skelStepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.shimmer,
  },
  skelStepLine: {
    flex: 1,
    height: 4,
    backgroundColor: colors.shimmer,
    borderRadius: 2,
  },
  skelBody: {
    gap: spacing[4],
  },
  skelCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  skelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skelCenterWrap: {
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[5],
  },
  skelCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.shimmer,
    marginBottom: spacing[2],
  },
  skelPills: {
    gap: spacing[2.5],
  },
  skelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.shimmer,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  skelChecklist: {
    gap: spacing[2.5],
    marginTop: spacing[4],
  },
  skelChecklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.shimmer,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
  },
  // Error
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[5],
    alignItems: 'center',
    gap: spacing[2.5],
    margin: spacing[5],
  },
  errorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: fontFamily.sans[0],
  },
  errorCalmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  errorCalmText: {
    fontSize: fontSize.sm[0],
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
    height: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing[5],
    marginTop: spacing[1],
  },
  errorRetryText: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  // Upload error (inline, not full-screen)
  uploadErrorCard: {
    backgroundColor: colors.errorLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  uploadErrorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  uploadErrorTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.error,
    fontFamily: fontFamily.sansBold[0],
  },
  uploadErrorBody: {
    fontSize: fontSize.xs[0],
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
    lineHeight: 16,
  },
  uploadRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    alignSelf: 'flex-start',
  },
  uploadRetryText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Offline
  offlineBanner: {
    backgroundColor: colors.warningLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
    flex: 1,
  },
  offlineTextWrap: {
    flex: 1,
    gap: spacing[0.5],
  },
  offlineTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.warning,
    fontFamily: fontFamily.sansBold[0],
  },
  offlineBody: {
    fontSize: fontSize.xs[0],
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
    lineHeight: 16,
  },
  // Session expired
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[5],
    alignItems: 'center',
    gap: spacing[2.5],
    margin: spacing[5],
  },
  sessionIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    fontFamily: fontFamily.sansBold[0],
  },
  sessionBody: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: fontFamily.sans[0],
  },
  sessionLoginBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[1],
  },
  sessionLoginText: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  // Empty docs
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[5],
    alignItems: 'center',
    gap: spacing[2.5],
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    fontFamily: fontFamily.sansBold[0],
  },
  emptyBody: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: fontFamily.sans[0],
  },
  emptyActionBtn: {
    backgroundColor: colors.primary,
    height: 44,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[1],
  },
  emptyActionText: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  // Resume card
  resumeCard: {
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[5],
    alignItems: 'center',
    gap: spacing[2.5],
  },
  resumeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    fontFamily: fontFamily.sansBold[0],
  },
  resumeBody: {
    fontSize: fontSize.base[0],
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: fontFamily.sans[0],
  },
  resumeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  resumeContinueBtn: {
    backgroundColor: colors.primary,
    height: 44,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeContinueText: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  resumeStartOverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingVertical: spacing[2],
  },
  resumeStartOverText: {
    fontSize: fontSize.sm[0],
    fontWeight: '500',
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  // Rejected doc
  rejectedCard: {
    backgroundColor: colors.errorLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  rejectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  rejectedTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.error,
    fontFamily: fontFamily.sansBold[0],
  },
  rejectedBody: {
    fontSize: fontSize.xs[0],
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
    lineHeight: 16,
  },
  rejectedRetakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.primary,
    height: 36,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    alignSelf: 'flex-start',
  },
  rejectedRetakeText: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  // Progress saved toast
  progressToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
    paddingVertical: spacing[1.5],
  },
  progressToastText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.success,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
