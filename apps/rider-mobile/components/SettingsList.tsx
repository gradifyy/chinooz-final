import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import {
  User,
  Bike,
  Bell,
  Shield,
  Globe,
  ChevronRight,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import type {
  RiderSettingsSection,
  RiderSettingsStatusKind,
} from '@chinooz/mock-data'

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  user: User,
  bike: Bike,
  bell: Bell,
  shield: Shield,
  globe: Globe,
}

const STATUS_TINT: Record<RiderSettingsStatusKind, { fg: string; bg: string }> = {
  success: { fg: colors.success, bg: colors.successLight },
  warning: { fg: colors.warning, bg: colors.warningLight },
  info: { fg: colors.info, bg: colors.infoLight },
  neutral: { fg: colors.textMuted, bg: colors.background },
}

interface SettingsListProps {
  sections: RiderSettingsSection[]
  labels: Record<string, string>
  groupAria: string
  onPress: (route: string, label: string) => void
}

export default function SettingsList({
  sections,
  labels,
  groupAria,
  onPress,
}: SettingsListProps) {
  return (
    <View accessibilityRole="list" accessibilityLabel={groupAria}>
      {sections.map(section => (
        <View key={section.id} style={styles.group}>
          <Text style={styles.groupTitle}>{labels[section.titleKey]}</Text>
          <View style={styles.groupCard}>
            {section.rows.map((row, idx) => {
              const Icon = ICONS[row.icon] ?? User
              const isLast = idx === section.rows.length - 1
              const label = labels[row.labelKey]
              const desc = labels[row.descKey]
              const statusLabel = labels[row.status.labelKey]
              const tint = STATUS_TINT[row.status.kind]
              return (
                <Pressable
                  key={row.id}
                  onPress={() => onPress(row.route, label)}
                  style={({ pressed }) => [
                    styles.row,
                    !isLast && styles.rowBorder,
                    pressed && styles.rowPressed,
                  ]}
                  accessibilityRole="link"
                  accessibilityLabel={label}
                  accessibilityHint={desc}
                >
                  <View style={[styles.iconWrap, { backgroundColor: tint.bg }]}>
                    <Icon size={20} color={colors.textSecondary} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {label}
                    </Text>
                    <Text style={styles.rowDesc} numberOfLines={1}>
                      {desc}
                    </Text>
                  </View>
                  <View style={styles.rowTrailing}>
                    <View style={[styles.statusPill, { backgroundColor: tint.bg }]}>
                      <Text style={[styles.statusText, { color: tint.fg }]}>
                        {statusLabel}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={colors.textTertiary} />
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    gap: spacing[2],
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[1],
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    minHeight: 60,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowPressed: {
    backgroundColor: colors.background,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  rowDesc: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexShrink: 0,
  },
  statusPill: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
