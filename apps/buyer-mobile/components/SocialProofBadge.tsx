import React, { memo } from 'react'
import { Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { colors as lightColors, fontSz, radii } from '@chinooz/theme'
import Icon, { type IconName } from './Icon'

type BadgeVariant = 'sold' | 'trending' | 'popular' | 'new'

interface SocialProofBadgeProps {
  variant: BadgeVariant
  count?: number
  label?: string
  compact?: boolean
}

const VARIANT_CONFIG: Record<BadgeVariant, { icon: string; color: string; bg: string }> = {
  sold: { icon: 'flame', color: lightColors.gold, bg: 'rgba(224,169,59,0.12)' },
  trending: { icon: 'trending-up', color: lightColors.primary, bg: 'rgba(138,27,87,0.10)' },
  popular: { icon: 'star', color: lightColors.gold, bg: 'rgba(224,169,59,0.12)' },
  new: { icon: 'sparkles', color: lightColors.success, bg: 'rgba(22,163,74,0.12)' },
}

function SocialProofBadgeInner({ variant, count, label, compact = false }: SocialProofBadgeProps) {
  const config = VARIANT_CONFIG[variant]
  const scale = useSharedValue(1)

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const text = label ?? (
    variant === 'sold' && count ? `${count} ${'sold'}`
    : variant === 'trending' && count ? `${count} ${'viewing'}`
    : variant === 'popular' ? 'Popular'
    : variant === 'new' ? 'New'
    : ''
  )

  return (
    <Animated.View style={[styles.badge, { backgroundColor: config.bg }, compact && styles.badgeCompact, style]}>
      <Icon name={config.icon as IconName} size={compact ? 9 : 11} color={config.color} />
      <Text style={[styles.text, { color: config.color }, compact && styles.textCompact]} numberOfLines={1}>
        {text}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  badgeCompact: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  text: {
    fontSize: fontSz('xs')[0],
    fontWeight: '700',
  },
  textCompact: {
    fontSize: fontSz('2xs')[0],
  },
})

export const SocialProofBadge = memo(SocialProofBadgeInner)
export default SocialProofBadge
