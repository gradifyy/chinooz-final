import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated'
import {
  User,
  Bike,
  Bell,
  Shield,
  Globe,
  ChevronRight,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, duration } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import type {
  RiderSettingsSection,
  RiderSettingsStatusKind,
} from '@chinooz/mock-data'

const AnimatedPress = Animated.createAnimatedComponent(Pressable)

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

function SettingsListInner({
  sections,
  labels,
  groupAria,
  onPress,
}: SettingsListProps) {
  const reduced = useReducedMotion()

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
                <AnimatedSettingRow
                  key={row.id}
                  icon={<Icon size={20} color={colors.textSecondary} />}
                  tint={tint}
                  label={label}
                  desc={desc}
                  statusLabel={statusLabel}
                  isLast={isLast}
                  onPress={() => onPress(row.route, label)}
                  reduced={reduced}
                />
              )
            })}
          </View>
        </View>
      ))}
    </View>
  )
}

function AnimatedSettingRow({
  icon,
  tint,
  label,
  desc,
  statusLabel,
  isLast,
  onPress,
  reduced,
}: {
  icon: React.ReactNode
  tint: { fg: string; bg: string }
  label: string
  desc: string
  statusLabel: string
  isLast: boolean
  onPress: () => void
  reduced: boolean
}) {
  const scale = useSharedValue(1)
  const chevronX = useSharedValue(0)

  const handlePressIn = () => {
    if (reduced) return
    scale.value = withSpring(0.98, { damping: 20, stiffness: 400, reduceMotion: ReduceMotion.System })
    chevronX.value = withTiming(3, { duration: duration.fast, easing: Easing.out(Easing.ease), reduceMotion: ReduceMotion.System })
  }
  const handlePressOut = () => {
    if (reduced) return
    scale.value = withSpring(1, { damping: 20, stiffness: 400, reduceMotion: ReduceMotion.System })
    chevronX.value = withTiming(0, { duration: duration.fast, easing: Easing.out(Easing.ease), reduceMotion: ReduceMotion.System })
  }

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: chevronX.value }],
  }))

  return (
    <Animated.View style={rowStyle}>
      <AnimatedPress
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }: any) => [
          styles.row,
          !isLast && styles.rowBorder,
          pressed && styles.rowPressed,
        ]}
        accessibilityRole="link"
        accessibilityLabel={label}
        accessibilityHint={desc}
      >
        <View style={[styles.iconWrap, { backgroundColor: tint.bg }]}>
          {icon}
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
          <Animated.View style={chevronStyle}>
            <ChevronRight size={18} color={colors.textTertiary} />
          </Animated.View>
        </View>
      </AnimatedPress>
    </Animated.View>
  )
}

export default React.memo(SettingsListInner)

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
