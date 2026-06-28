import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Bell, BellOff } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import type { OnlineStatus } from '@chinooz/state'

interface RequestSlotProps {
  status: OnlineStatus
  title: string
  placeholder: string
}

/**
 * RH4 — Incoming-request overlay slot.
 * When online, shows an active "listening" panel where incoming requests will
 * surface. When offline, it is intentionally absent/calm (no requests arrive).
 * The real incoming-request UI is a future task; this is the layout shell.
 */
export default function RequestSlot({ status, title, placeholder }: RequestSlotProps) {
  const isOnline = status === 'online'

  if (!isOnline) {
    // Offline: no request surface at all — calm and clear.
    return null
  }

  return (
    <View
      style={styles.overlay}
      accessibilityRole="summary"
      accessibilityLabel={`${title}. ${placeholder}`}
    >
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Bell size={20} color={colors.success} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.placeholder}>{placeholder}</Text>
        </View>
        <View style={styles.pulse} />
      </View>
    </View>
  )
}

// Re-export a compact offline marker used inside the offline state body.
export function OfflineBell({ label }: { label: string }) {
  return (
    <View style={styles.offlineBell} accessibilityRole="image">
      <View style={styles.offlineBellIcon}>
        <BellOff size={28} color={colors.textTertiary} />
      </View>
      <Text style={styles.offlineBellText}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  placeholder: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: fontFamily.sans[0],
  },
  pulse: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.success,
  },
  offlineBell: {
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[6],
  },
  offlineBellIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBellText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },
})
