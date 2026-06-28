import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Package, Clock, TrendingUp } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import type { OnlineStatus } from '@chinooz/state'

interface SnapshotSlotProps {
  status: OnlineStatus
  title: string
  emptyText: string
  onlineTimeLabel: string
  onlineTimeValue: string
}

/**
 * RH2 — Today's snapshot slot.
 * Shows quick stats for the day. In offline state it reads calm/empty.
 * Real data wiring is a future task; this is the layout + empty shell.
 */
export default function SnapshotSlot({
  status,
  title,
  emptyText,
  onlineTimeLabel,
  onlineTimeValue,
}: SnapshotSlotProps) {
  const isOnline = status === 'online'

  return (
    <View
      style={[styles.card, !isOnline && styles.cardOffline]}
      accessibilityRole="summary"
    >
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.stats}>
        <Stat
          icon={<Package size={18} color={isOnline ? colors.success : colors.textTertiary} />}
          label={emptyText}
          value={isOnline ? '0' : '—'}
          dimmed={!isOnline}
        />
        <Stat
          icon={<Clock size={18} color={isOnline ? colors.primary : colors.textTertiary} />}
          label={onlineTimeLabel}
          value={onlineTimeValue}
          dimmed={!isOnline}
        />
        <Stat
          icon={<TrendingUp size={18} color={isOnline ? colors.gold : colors.textTertiary} />}
          label="—"
          value={isOnline ? 'NPR 0' : '—'}
          dimmed={!isOnline}
        />
      </View>
    </View>
  )
}

function Stat({
  icon,
  label,
  value,
  dimmed,
}: {
  icon: React.ReactNode
  label: string
  value: string
  dimmed?: boolean
}) {
  return (
    <View style={styles.stat} accessibilityRole="text">
      <View style={styles.statIcon}>{icon}</View>
      <Text style={[styles.statValue, dimmed && styles.dimmed]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statLabel, dimmed && styles.dimmed]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardOffline: {
    backgroundColor: colors.background,
    borderColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[1],
  },
  statIcon: {
    marginBottom: spacing[1],
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  dimmed: {
    color: colors.textTertiary,
  },
})
