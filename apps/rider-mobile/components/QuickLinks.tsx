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
  TrendingUp,
  Target,
  Wallet,
  Banknote,
  LifeBuoy,
  ChevronRight,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, duration, easing } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import type { RiderQuickLinkGroup } from '@chinooz/mock-data'

const AnimatedPress = Animated.createAnimatedComponent(Pressable)

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  'trending-up': TrendingUp,
  target: Target,
  wallet: Wallet,
  banknote: Banknote,
  'life-buoy': LifeBuoy,
}

const ICON_TINT: Record<string, string> = {
  'trending-up': colors.gold,
  target: colors.primary,
  wallet: colors.info,
  banknote: colors.success,
  'life-buoy': colors.error,
}

interface QuickLinksProps {
  groups: RiderQuickLinkGroup[]
  labels: Record<string, string>
  groupAria: string
  onPress: (route: string, label: string) => void
}

export default function QuickLinks({
  groups,
  labels,
  groupAria,
  onPress,
}: QuickLinksProps) {
  const reduced = useReducedMotion()

  return (
    <View accessibilityRole="list" accessibilityLabel={groupAria}>
      {groups.map(group => (
        <View key={group.id} style={styles.group}>
          <Text style={styles.groupTitle}>{labels[group.titleKey]}</Text>
          <View style={styles.groupCard}>
            {group.links.map((link, idx) => {
              const Icon = ICONS[link.icon] ?? TrendingUp
              const tint = ICON_TINT[link.icon] ?? colors.primary
              const isLast = idx === group.links.length - 1
              const label = labels[link.labelKey]
              const desc = labels[link.descKey]
              return (
                <AnimatedLinkRow
                  key={link.id}
                  icon={<Icon size={20} color={tint} />}
                  tint={tint}
                  label={label}
                  desc={desc}
                  badge={link.badge}
                  value={link.value}
                  isLast={isLast}
                  onPress={() => onPress(link.route, label)}
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

function AnimatedLinkRow({
  icon,
  tint,
  label,
  desc,
  badge,
  value,
  isLast,
  onPress,
  reduced,
}: {
  icon: React.ReactNode
  tint: string
  label: string
  desc: string
  badge?: number
  value?: string
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
        <View style={[styles.iconWrap, { backgroundColor: `${tint}1A` }]}>
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
          {!!badge && badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
          {!!value && (
            <Text style={styles.rowValue} numberOfLines={1}>
              {value}
            </Text>
          )}
          <Animated.View style={chevronStyle}>
            <ChevronRight size={18} color={colors.textTertiary} />
          </Animated.View>
        </View>
      </AnimatedPress>
    </Animated.View>
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
  rowValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
})
