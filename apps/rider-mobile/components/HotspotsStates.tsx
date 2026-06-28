import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native'
import {
  CloudOff,
  AlertCircle,
  MapPinOff,
  Moon,
  Inbox,
  RefreshCw,
  MapPin,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize } from '@chinooz/theme'

/**
 * RD5 — Empty / Error / Offline / GPS-denied states for hotspots.
 *
 * - QuietDemand: role=status — honest "it's quiet" (no fabricated hotspots).
 *   Shows next peak time so the rider can plan.
 * - NoData: role=status — no data for this area yet, with pick-area CTA.
 * - DataError: role=alert — calm, actionable, with Retry button.
 * - GpsDenied: role=alert — manual area pick + enable-location CTAs.
 * - Offline: role=status — cached timestamp.
 *
 * All states are calm + actionable, not alarming. Icons use the muted
 * palette, not error-red.
 */

export interface StateLabels {
  quietTitle: string
  quietBody: (time: string) => string
  quietAria: (time: string) => string
  noDataTitle: string
  noDataBody: string
  noDataAria: string
  noDataPickArea: string
  errorTitle: string
  errorBody: string
  errorAria: string
  errorRetry: string
  errorRetryAria: string
  gpsDeniedTitle: string
  gpsDeniedBody: string
  gpsDeniedAria: string
  gpsDeniedPickArea: string
  gpsDeniedPickAreaAria: string
  gpsDeniedEnableLocation: string
  gpsDeniedEnableLocationAria: string
  offlineTitle: string
  offlineBody: (time: string) => string
  offlineAria: (time: string) => string
  staleTitle: (minutes: number) => string
  staleAria: (minutes: number) => string
  staleRefresh: string
  staleRefreshAria: string
}

interface StateCardProps {
  icon: React.ReactNode
  title: string
  body: string
  ariaLabel: string
  isError?: boolean
  children?: React.ReactNode
}

function StateCard({ icon, title, body, ariaLabel, isError, children }: StateCardProps) {
  return (
    <View
      style={styles.card}
      accessibilityRole="alert"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion={isError ? 'assertive' : 'polite'}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {children}
    </View>
  )
}

function ActionBtn({
  label,
  ariaLabel,
  onPress,
  testID,
}: {
  label: string
  ariaLabel: string
  onPress: () => void
  testID?: string
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      onPress={onPress}
      style={styles.actionBtn}
      testID={testID}
    >
      <Text style={styles.actionBtnText}>{label}</Text>
    </TouchableOpacity>
  )
}

/** Honest quiet-demand state — no fabricated hotspots. */
export function QuietDemandState({
  nextPeakTime,
  labels,
}: {
  nextPeakTime: string
  labels: StateLabels
}) {
  return (
    <StateCard
      icon={<Moon size={28} color={colors.textMuted} />}
      title={labels.quietTitle}
      body={labels.quietBody(nextPeakTime)}
      ariaLabel={labels.quietAria(nextPeakTime)}
    />
  )
}

/** No data for this area yet. */
export function NoDataState({
  labels,
  onPickArea,
}: {
  labels: StateLabels
  onPickArea: () => void
}) {
  return (
    <StateCard
      icon={<Inbox size={28} color={colors.textMuted} />}
      title={labels.noDataTitle}
      body={labels.noDataBody}
      ariaLabel={labels.noDataAria}
    >
      <ActionBtn
        label={labels.noDataPickArea}
        ariaLabel={labels.noDataPickArea}
        onPress={onPickArea}
        testID="hotspots-no-data-pick-area"
      />
    </StateCard>
  )
}

/** Data/map load error — calm + actionable, with Retry. */
export function DataErrorState({
  labels,
  onRetry,
}: {
  labels: StateLabels
  onRetry: () => void
}) {
  return (
    <StateCard
      icon={<AlertCircle size={28} color={colors.warning} />}
      title={labels.errorTitle}
      body={labels.errorBody}
      ariaLabel={labels.errorAria}
      isError
    >
      <ActionBtn
        label={labels.errorRetry}
        ariaLabel={labels.errorRetryAria}
        onPress={onRetry}
        testID="hotspots-error-retry"
      />
    </StateCard>
  )
}

/** GPS/location denied — manual area pick + enable location CTAs. */
export function GpsDeniedState({
  labels,
  onPickArea,
  onEnableLocation,
}: {
  labels: StateLabels
  onPickArea: () => void
  onEnableLocation: () => void
}) {
  return (
    <StateCard
      icon={<MapPinOff size={28} color={colors.warning} />}
      title={labels.gpsDeniedTitle}
      body={labels.gpsDeniedBody}
      ariaLabel={labels.gpsDeniedAria}
      isError
    >
      <ActionBtn
        label={labels.gpsDeniedPickArea}
        ariaLabel={labels.gpsDeniedPickAreaAria}
        onPress={onPickArea}
        testID="hotspots-gps-pick-area"
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={labels.gpsDeniedEnableLocationAria}
        onPress={onEnableLocation}
        style={styles.secondaryBtn}
        testID="hotspots-gps-enable-location"
      >
        <MapPin size={16} color={colors.primary} />
        <Text style={styles.secondaryBtnText}>{labels.gpsDeniedEnableLocation}</Text>
      </TouchableOpacity>
    </StateCard>
  )
}

/** Offline — showing cached heatmap with timestamp. */
export function OfflineState({
  cachedTime,
  labels,
}: {
  cachedTime: string
  labels: StateLabels
}) {
  return (
    <StateCard
      icon={<CloudOff size={28} color={colors.textMuted} />}
      title={labels.offlineTitle}
      body={labels.offlineBody(cachedTime)}
      ariaLabel={labels.offlineAria(cachedTime)}
    />
  )
}

/** Stale data indicator — inline banner when data is >5 min old. */
export function StaleIndicator({
  minutes,
  labels,
  onRefresh,
}: {
  minutes: number
  labels: StateLabels
  onRefresh: () => void
}) {
  return (
    <View
      style={styles.staleBanner}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={labels.staleAria(minutes)}
    >
      <View style={styles.staleLeft}>
        <RefreshCw size={13} color={colors.warning} />
        <Text style={styles.staleText}>{labels.staleTitle(minutes)}</Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={labels.staleRefreshAria}
        onPress={onRefresh}
        testID="hotspots-stale-refresh"
      >
        <Text style={styles.staleRefresh}>{labels.staleRefresh}</Text>
      </TouchableOpacity>
    </View>
  )
}

/** Open OS location settings. */
export function openLocationSettings() {
  const url = Platform.select({
    ios: 'app-settings:',
    android: 'android.settings.LOCATION_SOURCE_SETTINGS',
    default: 'app-settings:',
  }) as string
  Linking.openURL(url).catch(() => {})
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[1],
  },
  actionBtnText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.white,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    minHeight: 44,
  },
  secondaryBtnText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderWidth: 1,
    borderColor: colors.warning,
    minHeight: 44,
  },
  staleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  staleText: {
    fontSize: fontSize.sm[0],
    color: colors.warning,
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
  },
  staleRefresh: {
    fontSize: fontSize.sm[0],
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
  },
})
