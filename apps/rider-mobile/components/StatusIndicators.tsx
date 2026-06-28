import React, { useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, Linking, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MapPin, Wifi, WifiOff, AlertTriangle, MapPinOff } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import { useAppState } from './AppStateProvider'

type GpsState = 'good' | 'weak' | 'off' | 'denied'

interface StatusIndicatorsProps {
  /** Mock GPS state. In production this would read from expo-location. */
  gpsState?: GpsState
}

/**
 * RH5 — Connection/GPS status indicator.
 *
 * A small inline indicator showing GPS + network connectivity. When location
 * is off, shows a gentle nudge with a "Turn on location" action. When offline,
 * shows a "No connection" indicator. Both are announced to screen readers.
 *
 * Helpful, not nagging: the nudge is a single calm row, not a full-screen
 * blocker. It only appears when something actually blocks getting jobs.
 */
export default function StatusIndicators({ gpsState = 'good' }: StatusIndicatorsProps) {
  const { t } = useTranslation()
  const { minTouchTarget } = useA11y()
  const { connectivity } = useAppState()

  const isOnline = connectivity === 'online'
  const gpsOk = gpsState === 'good'
  const gpsWeak = gpsState === 'weak'
  const gpsOff = gpsState === 'off'
  const gpsDenied = gpsState === 'denied'
  const gpsBlocked = gpsOff || gpsDenied

  const handleTurnOnLocation = useCallback(() => {
    try {
      if (Platform.OS === 'ios') {
        Linking.openURL('App-Prefs:Privacy&path=LOCATION')
      } else {
        Linking.openURL('android.settings.LOCATION_SOURCE_SETTINGS')
      }
    } catch {}
  }, [])

  const handleOpenSettings = useCallback(() => {
    try {
      if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:')
      } else {
        Linking.openURL('android.settings.APPLICATION_DETAILS_SETTINGS')
      }
    } catch {}
  }, [])

  // Nothing to show — all good.
  if (gpsOk && isOnline) return null

  return (
    <View style={styles.container}>
      {/* GPS denied — full explainer with enable steps */}
      {gpsDenied && (
        <View style={styles.deniedCard} accessibilityRole="alert">
          <View style={styles.deniedIcon}>
            <MapPinOff size={20} color={colors.error} />
          </View>
          <View style={styles.deniedBody}>
            <Text style={styles.deniedTitle}>{t('rider.home.gpsDeniedTitle')}</Text>
            <Text style={styles.deniedSub}>{t('rider.home.gpsDeniedBody')}</Text>
            <View style={styles.deniedSteps}>
              <Text style={styles.deniedStep}>{t('rider.home.gpsDeniedStep1')}</Text>
              <Text style={styles.deniedStep}>{t('rider.home.gpsDeniedStep2')}</Text>
              <Text style={styles.deniedStep}>{t('rider.home.gpsDeniedStep3')}</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('rider.home.gpsDeniedActionAria')}
            style={[styles.deniedAction, { minHeight: minTouchTarget }]}
            onPress={handleOpenSettings}
          >
            <Text style={styles.deniedActionText}>{t('rider.home.gpsDeniedAction')}</Text>
          </Pressable>
        </View>
      )}

      {/* GPS off nudge — the main blocker */}
      {gpsOff && (
        <View style={styles.nudgeCard} accessibilityRole="alert">
          <View style={styles.nudgeIcon}>
            <AlertTriangle size={18} color={colors.warning} />
          </View>
          <View style={styles.nudgeBody}>
            <Text style={styles.nudgeTitle}>{t('rider.home.gpsOff')}</Text>
            <Text style={styles.nudgeSub}>{t('rider.home.gpsOffAria')}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('rider.home.gpsOffAction')}
            style={[styles.nudgeAction, { minHeight: minTouchTarget }]}
            onPress={handleTurnOnLocation}
          >
            <Text style={styles.nudgeActionText}>{t('rider.home.gpsOffAction')}</Text>
          </Pressable>
        </View>
      )}

      {/* Inline status chips (when GPS is not blocked) */}
      {!gpsBlocked && (
        <View style={styles.chipRow}>
          <StatusChip
            icon={<MapPin size={12} color={gpsWeak ? colors.warning : colors.success} />}
            label={gpsWeak ? t('rider.home.gpsWeak') : t('rider.home.gpsGood')}
            variant={gpsWeak ? 'warning' : 'success'}
          />
          {!isOnline && (
            <StatusChip
              icon={<WifiOff size={12} color={colors.error} />}
              label={t('rider.home.connOffline')}
              variant="error"
            />
          )}
          {isOnline && (
            <StatusChip
              icon={<Wifi size={12} color={colors.success} />}
              label={t('rider.home.connOnline')}
              variant="success"
            />
          )}
        </View>
      )}

      {/* Offline nudge (when no connection but GPS ok) */}
      {!isOnline && !gpsBlocked && (
        <View style={styles.offlineNudge} accessibilityRole="text">
          <WifiOff size={14} color={colors.error} />
          <Text style={styles.offlineNudgeText}>{t('rider.home.connOfflineAria')}</Text>
        </View>
      )}
    </View>
  )
}

function StatusChip({
  icon,
  label,
  variant,
}: {
  icon: React.ReactNode
  label: string
  variant: 'success' | 'warning' | 'error'
}) {
  const bg = variant === 'success' ? colors.successLight : variant === 'warning' ? colors.warningLight : colors.errorLight
  const fg = variant === 'success' ? colors.success : variant === 'warning' ? colors.warning : colors.error

  return (
    <View
      style={[styles.chip, { backgroundColor: bg }]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      {icon}
      <Text style={[styles.chipText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  // GPS off nudge
  nudgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.warningLight,
    borderRadius: radii.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  nudgeIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeBody: {
    flex: 1,
  },
  nudgeTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.warning,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  nudgeSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
    fontFamily: fontFamily.sans[0],
  },
  nudgeAction: {
    backgroundColor: colors.warning,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
  },
  nudgeActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  // Inline status chips
  chipRow: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Offline nudge
  offlineNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
  },
  offlineNudgeText: {
    fontSize: 12,
    color: colors.error,
    fontFamily: fontFamily.sans[0],
  },
  // GPS denied explainer
  deniedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.errorLight,
    borderRadius: radii.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  deniedIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  deniedBody: {
    flex: 1,
  },
  deniedTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.error,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  deniedSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing[1],
    fontFamily: fontFamily.sans[0],
  },
  deniedSteps: {
    marginTop: spacing[2],
    gap: spacing[1],
  },
  deniedStep: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
  },
  deniedAction: {
    backgroundColor: colors.error,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    marginTop: spacing[1],
  },
  deniedActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
})
