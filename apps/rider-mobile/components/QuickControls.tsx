import React, { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { Coffee, Power, Filter, Bike, Scooter, Utensils, ShoppingBag, Package } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import { useOnlineStatusStore, type OnlineStatus } from '@chinooz/state'

interface QuickControlsProps {
  status: OnlineStatus
}

type JobTypeFilter = 'all' | 'food' | 'grocery' | 'parcel'
type VehicleFilter = 'all' | 'bike' | 'scooter' | 'cycle'

const JOB_TYPE_ICONS: Record<JobTypeFilter, React.ReactNode> = {
  all: <Filter size={14} color={colors.textMuted} />,
  food: <Utensils size={14} color={colors.primary} />,
  grocery: <ShoppingBag size={14} color={colors.primary} />,
  parcel: <Package size={14} color={colors.primary} />,
}

const VEHICLE_ICONS: Record<VehicleFilter, React.ReactNode> = {
  all: <Filter size={14} color={colors.textMuted} />,
  bike: <Bike size={14} color={colors.primary} />,
  scooter: <Scooter size={14} color={colors.primary} />,
  cycle: <Bike size={14} color={colors.primary} />,
}

/**
 * RH5 — Quick controls on Home.
 *
 * One-handed, reachable controls:
 *  - Take a break / Resume: sets status to "paused" (online but no jobs) or
 *    back to "online". Distinct from go-offline.
 *  - Go offline: sets status to "offline". Clearly distinct from break.
 *  - Job-type + vehicle filter (mock): a compact expandable filter row.
 *
 * Break is visually distinct from offline: break uses a warm/gold accent
 * (pause), offline uses a neutral/muted style. Both are large tap targets.
 */
export default function QuickControls({ status }: QuickControlsProps) {
  const { t } = useTranslation()
  const { reducedMotion, minTouchTarget } = useA11y()
  const setOnlineStatus = useOnlineStatusStore(s => s.setOnlineStatus)

  const [showFilters, setShowFilters] = useState(false)
  const [jobType, setJobType] = useState<JobTypeFilter>('all')
  const [vehicle, setVehicle] = useState<VehicleFilter>('all')

  const isPaused = status === 'paused'
  const isOffline = status === 'offline'

  const haptic = useCallback(() => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
  }, [reducedMotion])

  const handleBreak = useCallback(() => {
    haptic()
    setOnlineStatus(isPaused ? 'online' : 'paused')
  }, [isPaused, setOnlineStatus, haptic])

  const handleGoOffline = useCallback(() => {
    haptic()
    setOnlineStatus('offline')
  }, [setOnlineStatus, haptic])

  const handleFilterToggle = useCallback(() => {
    haptic()
    setShowFilters(v => !v)
  }, [haptic])

  const jobTypeSegments: { key: JobTypeFilter; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: t('rider.home.qcFilterAll'), icon: JOB_TYPE_ICONS.all },
    { key: 'food', label: t('rider.home.qcFilterFood'), icon: JOB_TYPE_ICONS.food },
    { key: 'grocery', label: t('rider.home.qcFilterGrocery'), icon: JOB_TYPE_ICONS.grocery },
    { key: 'parcel', label: t('rider.home.qcFilterParcel'), icon: JOB_TYPE_ICONS.parcel },
  ]

  const vehicleSegments: { key: VehicleFilter; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: t('rider.home.qcFilterAll'), icon: VEHICLE_ICONS.all },
    { key: 'bike', label: t('rider.home.qcFilterBike'), icon: VEHICLE_ICONS.bike },
    { key: 'scooter', label: t('rider.home.qcFilterScooter'), icon: VEHICLE_ICONS.scooter },
    { key: 'cycle', label: t('rider.home.qcFilterCycle'), icon: VEHICLE_ICONS.cycle },
  ]

  return (
    <View style={styles.container}>
      {/* Break/pause + Go-offline row */}
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPaused ? t('rider.home.qcResumeAria') : t('rider.home.qcTakeBreakAria')}
          accessibilityState={{ selected: isPaused }}
          style={[
            styles.actionBtn,
            isPaused ? styles.actionBtnActive : styles.actionBtnBreak,
            { minHeight: minTouchTarget },
          ]}
          onPress={handleBreak}
          disabled={isOffline}
        >
          <Coffee size={18} color={isPaused ? colors.white : colors.gold} />
          <Text style={[styles.actionText, isPaused ? styles.actionTextActive : styles.actionTextBreak]}>
            {isPaused ? t('rider.home.qcResume') : t('rider.home.qcTakeBreak')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('rider.home.qcGoOfflineAria')}
          style={[
            styles.actionBtn,
            styles.actionBtnOffline,
            { minHeight: minTouchTarget },
          ]}
          onPress={handleGoOffline}
          disabled={isOffline}
        >
          <Power size={18} color={isOffline ? colors.textTertiary : colors.textSecondary} />
          <Text style={[styles.actionText, styles.actionTextOffline, isOffline && styles.actionTextDisabled]}>
            {t('rider.home.qcGoOffline')}
          </Text>
        </Pressable>
      </View>

      {/* Break active indicator */}
      {isPaused && (
        <View style={styles.breakIndicator} accessibilityRole="text">
          <View style={styles.breakDot} />
          <Text style={styles.breakText}>{t('rider.home.qcBreakActive')}</Text>
        </View>
      )}

      {/* Job filter toggle + expandable filter row */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('rider.home.qcJobFilterAria')}
        accessibilityState={{ expanded: showFilters }}
        style={[styles.filterToggle, { minHeight: minTouchTarget }]}
        onPress={handleFilterToggle}
        disabled={isOffline}
      >
        <Filter size={16} color={isOffline ? colors.textTertiary : colors.textSecondary} />
        <Text style={[styles.filterToggleText, isOffline && styles.filterToggleDisabled]}>
          {t('rider.home.qcJobFilter')}
        </Text>
        {showFilters ? (
          <Text style={styles.filterChevron}>−</Text>
        ) : (
          <Text style={styles.filterChevron}>+</Text>
        )}
      </Pressable>

      {showFilters && !isOffline && (
        <View style={styles.filterPanel}>
          <FilterRow
            segments={jobTypeSegments}
            activeKey={jobType}
            onChange={k => { haptic(); setJobType(k as JobTypeFilter) }}
          />
          <FilterRow
            segments={vehicleSegments}
            activeKey={vehicle}
            onChange={k => { haptic(); setVehicle(k as VehicleFilter) }}
          />
        </View>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Filter row (compact chip selector)
// ---------------------------------------------------------------------------

function FilterRow({
  segments,
  activeKey,
  onChange,
}: {
  segments: { key: string; label: string; icon: React.ReactNode }[]
  activeKey: string
  onChange: (key: string) => void
}) {
  return (
    <View style={styles.filterRow}>
      <View style={styles.filterChips}>
        {segments.map(seg => {
          const active = seg.key === activeKey
          return (
            <Pressable
              key={seg.key}
              accessibilityRole="button"
              accessibilityLabel={seg.label}
              accessibilityState={{ selected: active }}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => onChange(seg.key)}
            >
              {seg.icon}
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {seg.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: radii.lg,
    paddingVertical: spacing[2.5],
    borderWidth: 1.5,
  },
  actionBtnBreak: {
    backgroundColor: 'rgba(224, 169, 59, 0.08)',
    borderColor: 'rgba(224, 169, 59, 0.3)',
  },
  actionBtnActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  actionBtnOffline: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
  },
  actionText: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  actionTextBreak: {
    color: colors.gold,
  },
  actionTextActive: {
    color: colors.white,
  },
  actionTextOffline: {
    color: colors.textSecondary,
  },
  actionTextDisabled: {
    color: colors.textTertiary,
  },
  // Break indicator
  breakIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    backgroundColor: 'rgba(224, 169, 59, 0.1)',
    borderRadius: radii.md,
  },
  breakDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.gold,
  },
  breakText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gold,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Filter toggle
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterToggleText: {
    flex: 1,
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  filterToggleDisabled: {
    color: colors.textTertiary,
  },
  filterChevron: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMuted,
  },
  // Filter panel
  filterPanel: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing[3],
  },
  filterRow: {
    gap: spacing[2],
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: colors.primary50,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  filterChipTextActive: {
    color: colors.primary,
  },
})
