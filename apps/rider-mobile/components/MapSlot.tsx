import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MapPin } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import type { OnlineStatus } from '@chinooz/state'

interface MapSlotProps {
  status: OnlineStatus
  title: string
  offlineHint: string
  onlineHint: string
}

/**
 * RH3 — Map slot.
 * Placeholder for the live map. Offline shows a calm muted panel; online shows
 * an active "standing by" panel. The real map is a future task.
 */
export default function MapSlot({ status, title, offlineHint, onlineHint }: MapSlotProps) {
  const isOnline = status === 'online'

  return (
    <View
      style={[styles.card, isOnline ? styles.cardOnline : styles.cardOffline]}
      accessibilityRole="summary"
      accessibilityLabel={`${title}. ${isOnline ? onlineHint : offlineHint}`}
    >
      <View style={styles.header}>
        <MapPin
          size={18}
          color={isOnline ? colors.success : colors.textTertiary}
        />
        <Text style={[styles.title, !isOnline && styles.titleMuted]}>{title}</Text>
      </View>

      <View style={styles.body}>
        {/* Stylized map grid */}
        <View style={styles.grid} pointerEvents="none">
          <View style={[styles.gridLine, { top: '30%' }]} />
          <View style={[styles.gridLine, { top: '62%' }]} />
          <View style={[styles.gridLineV, { left: '35%' }]} />
          <View style={[styles.gridLineV, { left: '68%' }]} />
          <View style={[styles.pin, isOnline ? styles.pinOnline : styles.pinOffline]}>
            <View
              style={[
                styles.pinDot,
                isOnline ? styles.pinDotOnline : styles.pinDotOffline,
              ]}
            />
          </View>
        </View>

        <Text style={[styles.hint, !isOnline && styles.hintMuted]}>
          {isOnline ? onlineHint : offlineHint}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardOnline: {
    backgroundColor: '#ECFDF5',
  },
  cardOffline: {
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[4],
    paddingBottom: spacing[2],
  },
  title: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  titleMuted: {
    color: colors.textMuted,
  },
  body: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  grid: {
    height: 150,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    position: 'relative',
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.borderLight,
  },
  pin: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    marginLeft: -16,
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinOnline: {
    backgroundColor: colors.successLight,
  },
  pinOffline: {
    backgroundColor: colors.border,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
  },
  pinDotOnline: {
    backgroundColor: colors.success,
  },
  pinDotOffline: {
    backgroundColor: colors.textTertiary,
  },
  hint: {
    marginTop: spacing[3],
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  hintMuted: {
    color: colors.textTertiary,
  },
})
