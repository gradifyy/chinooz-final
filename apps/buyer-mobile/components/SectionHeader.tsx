import React, { memo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { useAppTheme } from './ThemeProvider'
import { spacing, fontSz, radii, springs } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import Icon, { type IconName } from './Icon'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  /** Retained for API compatibility; no longer rendered (replaced by the gold accent bar). */
  icon?: IconName
  iconColor?: string
  actionLabel?: string
  onAction?: () => void
  size?: 'default' | 'large'
  accent?: boolean
}

function SectionHeaderInner({
  title,
  subtitle,
  actionLabel,
  onAction,
  size = 'default',
  accent = false,
}: SectionHeaderProps) {
  const { colors } = useAppTheme()
  const reduced = useReducedMotion()
  const chevronScale = useSharedValue(1)

  const isLarge = size === 'large'
  const titleFontSize = isLarge ? fontSz('xl')[0] : fontSz('lg')[0]

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chevronScale.value }],
  }))

  const handlePressIn = () => {
    if (!reduced) chevronScale.value = withSpring(0.85, springs.press)
  }
  const handlePressOut = () => {
    if (!reduced) chevronScale.value = withSpring(1, springs.press)
  }

  return (
    <View style={[styles.container, accent && { backgroundColor: colors.primary50 + '40' }]}>
      <View style={styles.left}>
        <View style={[styles.accentBar, { height: isLarge ? 22 : 18, backgroundColor: colors.gold }]} />
        <View style={styles.titleWrap}>
          <Text
            style={[styles.title, { fontSize: titleFontSize, color: colors.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Animated.View style={[styles.actionRow, chevronStyle]}>
            <Text style={[styles.actionText, { color: colors.primary }]}>{actionLabel}</Text>
            <Icon name="chevron-forward" size={14} color={colors.primary} />
          </Animated.View>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
    paddingHorizontal: spacing[1],
    paddingVertical: spacing[1],
    borderRadius: radii.lg,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    flex: 1,
  },
  accentBar: {
    width: 4,
    borderRadius: radii.full,
  },
  titleWrap: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontFamily: 'Fraunces',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: fontSz('xs')[0],
    fontWeight: '400',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontFamily: 'Inter',
    fontSize: fontSz('sm')[0],
    fontWeight: '600',
  },
})

export const SectionHeader = memo(SectionHeaderInner)
export default SectionHeader
