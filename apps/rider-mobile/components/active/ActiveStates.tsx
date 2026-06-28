import React, { useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  WifiOff,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle2,
  MapPinOff,
  CloudOff,
  RotateCcw,
  Pause,
} from 'lucide-react-native'
import { Skeleton } from '@chinooz/ui'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { useA11y } from '../A11yProvider'
import type { ActiveDeliveryError } from '@chinooz/types'

// ─── Loading skeleton ───────────────────────────────────────────────

/**
 * Map + route calc skeleton shown while the active delivery is initializing.
 * Uses aria-busy + ariaLiveRegion so screen readers announce the loading state.
 */
export function ActiveLoadingSkeleton() {
  const { t } = useTranslation()
  return (
    <View
      style={skeletonStyles.wrap}
      accessibilityRole="alert"
      accessibilityLabel={t('rider.active.activeLoadingAria')}
      accessibilityLiveRegion="polite"
      testID="active-loading-skeleton"
    >
      <View style={skeletonStyles.mapArea}>
        <Skeleton width="100%" height="100%" borderRadius={0} testID="active-sk-map" />
      </View>
      <View style={skeletonStyles.sheetArea}>
        <Skeleton width={40} height={4} borderRadius={2} />
        <View style={skeletonStyles.row}>
          <Skeleton width={80} height={24} borderRadius={radii.full} />
          <Skeleton width={60} height={12} />
        </View>
        <Skeleton width="100%" height={56} borderRadius={radii.xl} />
        <Skeleton width="60%" height={16} />
        <Skeleton width="100%" height={56} borderRadius={radii.xl} />
      </View>
    </View>
  )
}

const skeletonStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapArea: {
    flex: 1,
  },
  sheetArea: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    padding: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[6],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
})

// ─── Error banner ───────────────────────────────────────────────────

interface ErrorBannerProps {
  error: ActiveDeliveryError
  onRetry: () => void
  onDismiss: () => void
}

/**
 * Error banner with retry + dismiss. Shows the appropriate message per error
 * type, preserves trip progress (never loses state), and is announced via
 * role=alert for screen readers.
 */
export function ErrorBanner({ error, onRetry, onDismiss }: ErrorBannerProps) {
  const { t } = useTranslation()
  const { reducedMotion, minTouchTarget } = useA11y()

  const { message, aria } = (() => {
    switch (error) {
      case 'status_update_failed':
        return { message: t('rider.active.errorStatusUpdate'), aria: t('rider.active.errorStatusUpdateAria') }
      case 'proof_submit_failed':
        return { message: t('rider.active.errorProofSubmit'), aria: t('rider.active.errorProofSubmitAria') }
      case 'cod_record_failed':
        return { message: t('rider.active.errorCodRecord'), aria: t('rider.active.errorCodRecordAria') }
      case 'map_gps_failed':
        return { message: t('rider.active.errorMapGps'), aria: t('rider.active.errorMapGpsAria') }
      default:
        return { message: t('rider.active.errorStatusUpdate'), aria: t('rider.active.errorStatusUpdateAria') }
    }
  })()

  const handleRetry = useCallback(() => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) } catch {}
    onRetry()
  }, [reducedMotion, onRetry])

  const handleDismiss = useCallback(() => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    onDismiss()
  }, [reducedMotion, onDismiss])

  return (
    <View
      style={errorStyles.container}
      accessibilityRole="alert"
      accessibilityLabel={aria}
      accessibilityLiveRegion="assertive"
      testID={`active-error-${error}`}
    >
      <View style={errorStyles.iconWrap}>
        {error === 'map_gps_failed' ? (
          <MapPinOff size={18} color={colors.error} />
        ) : (
          <AlertTriangle size={18} color={colors.error} />
        )}
      </View>
      <Text style={errorStyles.message}>{message}</Text>
      <View style={errorStyles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('rider.active.errorRetryAria')}
          onPress={handleRetry}
          style={[errorStyles.retryBtn, { minHeight: minTouchTarget }]}
          activeOpacity={0.85}
          testID="active-error-retry"
        >
          <RefreshCw size={14} color={colors.white} />
          <Text style={errorStyles.retryText}>{t('rider.active.errorRetry')}</Text>
        </TouchableOpacity>
        {error !== 'map_gps_failed' && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.active.errorDismissAria')}
            onPress={handleDismiss}
            style={[errorStyles.dismissBtn, { minHeight: minTouchTarget }]}
            hitSlop={8}
          >
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const errorStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.errorLight,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    marginHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: colors.error,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: 'rgba(220,38,38,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.error,
    borderRadius: radii.md,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
  },
  retryText: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.white,
  },
  dismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[1],
  },
})

// ─── Offline banner ─────────────────────────────────────────────────

interface OfflineBannerProps {
  queuedCount: number
  syncing: boolean
  synced: boolean
}

/**
 * Offline banner with queued-update count. role=status + liveRegion so screen
 * readers announce the offline state. Shows syncing/synced states on reconnect.
 */
export function OfflineBanner({ queuedCount, syncing, synced }: OfflineBannerProps) {
  const { t } = useTranslation()

  if (synced) {
    return (
      <View
        style={offlineStyles.container}
        accessibilityRole="status"
        accessibilityLabel={t('rider.active.offlineSyncedAria')}
        accessibilityLiveRegion="polite"
        testID="active-offline-synced"
      >
        <CheckCircle2 size={16} color={colors.success} />
        <Text style={[offlineStyles.text, { color: colors.success }]}>
          {t('rider.active.offlineSynced')}
        </Text>
      </View>
    )
  }

  if (syncing) {
    return (
      <View
        style={offlineStyles.container}
        accessibilityRole="status"
        accessibilityLabel={t('rider.active.offlineSyncing')}
        accessibilityLiveRegion="polite"
        testID="active-offline-syncing"
      >
        <RotateCcw size={16} color={colors.primary} />
        <Text style={[offlineStyles.text, { color: colors.primary }]}>
          {t('rider.active.offlineSyncing')}
        </Text>
      </View>
    )
  }

  return (
    <View
      style={offlineStyles.container}
      accessibilityRole="status"
      accessibilityLabel={t('rider.active.offlineBannerAria')}
      accessibilityLiveRegion="polite"
      testID="active-offline-banner"
    >
      <WifiOff size={16} color={colors.gold} />
      <View style={offlineStyles.textWrap}>
        <Text style={offlineStyles.title}>{t('rider.active.offlineBannerTitle')}</Text>
        <Text style={offlineStyles.body}>
          {queuedCount > 0
            ? `${t('rider.active.offlineBannerBody')} ${t('rider.active.offlineBannerQueued', { count: queuedCount })}`
            : t('rider.active.offlineBannerBody')}
        </Text>
      </View>
    </View>
  )
}

const offlineStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.warningLight,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    marginHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: colors.gold,
  },
  textWrap: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  text: {
    flex: 1,
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
  },
  body: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
  },
})

// ─── Restore notice ─────────────────────────────────────────────────

interface RestoreNoticeProps {
  statusLabel: string
  onContinue: () => void
}

/**
 * Restore notice shown on app relaunch when a non-terminal delivery is found
 * in the persisted store. Announces the restore via role=alert.
 */
export function RestoreNotice({ statusLabel, onContinue }: RestoreNoticeProps) {
  const { t } = useTranslation()
  const { reducedMotion } = useA11y()

  const handleContinue = useCallback(() => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    onContinue()
  }, [reducedMotion, onContinue])

  return (
    <View style={restoreStyles.overlay}>
      <View
        style={restoreStyles.card}
        accessibilityRole="alert"
        accessibilityLabel={t('rider.active.restoreAria', { status: statusLabel })}
        accessibilityLiveRegion="assertive"
      >
        <View style={restoreStyles.iconWrap}>
          <RotateCcw size={28} color={colors.primary} />
        </View>
        <Text style={restoreStyles.title}>{t('rider.active.restoreTitle')}</Text>
        <Text style={restoreStyles.body}>
          {t('rider.active.restoreBody', { status: statusLabel })}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('rider.active.restoreContinue')}
          onPress={handleContinue}
          style={restoreStyles.continueBtn}
          activeOpacity={0.85}
          testID="active-restore-continue"
        >
          <Text style={restoreStyles.continueText}>{t('rider.active.restoreContinue')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const restoreStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    zIndex: 50,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    padding: spacing[5],
    gap: spacing[3],
    width: '100%',
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
    textAlign: 'center',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    width: '100%',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    minHeight: 56,
  },
  continueText: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.white,
  },
})

// ─── System cancel notice ───────────────────────────────────────────

interface SystemCancelNoticeProps {
  compensationNote?: string
  onDone: () => void
}

/**
 * Mid-trip cancellation notice when the seller/system cancels the delivery.
 * Shows a clear explanation + compensation note. Dignified + actionable.
 */
export function SystemCancelNotice({ compensationNote, onDone }: SystemCancelNoticeProps) {
  const { t } = useTranslation()
  const { reducedMotion } = useA11y()

  const handleDone = useCallback(() => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    onDone()
  }, [reducedMotion, onDone])

  const aria = compensationNote
    ? t('rider.active.systemCancelAria', { note: compensationNote })
    : t('rider.active.systemCancelAria', { note: '' })

  return (
    <View style={systemStyles.overlay}>
      <View
        style={systemStyles.card}
        accessibilityRole="alert"
        accessibilityLabel={aria}
        accessibilityLiveRegion="assertive"
      >
        <View style={systemStyles.iconWrap}>
          <CloudOff size={28} color={colors.error} />
        </View>
        <Text style={systemStyles.title}>{t('rider.active.systemCancelTitle')}</Text>
        <Text style={systemStyles.body}>{t('rider.active.systemCancelBody')}</Text>
        {compensationNote ? (
          <View style={systemStyles.compNote}>
            <Text style={systemStyles.compText}>
              {t('rider.active.systemCancelCompensation', { note: compensationNote })}
            </Text>
          </View>
        ) : null}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('rider.active.systemCancelDone')}
          onPress={handleDone}
          style={systemStyles.doneBtn}
          activeOpacity={0.85}
          testID="active-system-cancel-done"
        >
          <Text style={systemStyles.doneText}>{t('rider.active.systemCancelDone')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const systemStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    zIndex: 50,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    padding: spacing[5],
    gap: spacing[3],
    width: '100%',
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.error,
  },
  body: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
    textAlign: 'center',
  },
  compNote: {
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    width: '100%',
  },
  compText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radii.xl,
    width: '100%',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    minHeight: 56,
  },
  doneText: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.white,
  },
})

// ─── Paused banner ──────────────────────────────────────────────────

interface PausedBannerProps {
  onResume: () => void
}

/**
 * Paused banner shown when the delivery is paused (issue reported, dispatch
 * reviewing). role=status, tap to resume.
 */
export function PausedBanner({ onResume }: PausedBannerProps) {
  const { t } = useTranslation()
  const { reducedMotion, minTouchTarget } = useA11y()

  const handleResume = useCallback(() => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    try { AccessibilityInfo.announceForAccessibility(t('rider.active.pausedBannerResume')) } catch {}
    onResume()
  }, [reducedMotion, t, onResume])

  return (
    <View
      style={pausedStyles.container}
      accessibilityRole="status"
      accessibilityLabel={t('rider.active.pausedBannerAria')}
      accessibilityLiveRegion="polite"
      testID="active-paused-banner"
    >
      <Pause size={16} color={colors.gold} />
      <View style={pausedStyles.textWrap}>
        <Text style={pausedStyles.title}>{t('rider.active.pausedBannerTitle')}</Text>
        <Text style={pausedStyles.body}>{t('rider.active.pausedBannerBody')}</Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('rider.active.pausedBannerResume')}
        onPress={handleResume}
        style={[pausedStyles.resumeBtn, { minHeight: minTouchTarget }]}
        activeOpacity={0.85}
        testID="active-paused-resume"
      >
        <Text style={pausedStyles.resumeText}>{t('rider.active.pausedBannerResume')}</Text>
      </TouchableOpacity>
    </View>
  )
}

const pausedStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.warningLight,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    marginHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: colors.gold,
  },
  textWrap: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  body: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
  },
  resumeBtn: {
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
  },
  resumeText: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.white,
  },
})
