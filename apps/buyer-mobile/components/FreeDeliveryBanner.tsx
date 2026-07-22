import React, { memo, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useCartStore } from '@chinooz/state'
import { useAppTheme } from './ThemeProvider'
import { spacing, radii, fontSz, duration } from '@chinooz/theme'
import { SHIPPING_CONFIG } from '@chinooz/utils'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import Icon from './Icon'
import type { SharedValue } from 'react-native-reanimated'

interface FreeDeliveryBannerProps {
  scrollY?: SharedValue<number>
}

function FreeDeliveryBannerInner({ scrollY }: FreeDeliveryBannerProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { colors } = useAppTheme()
  const reduced = useReducedMotion()
  const items = useCartStore(s => s.items)
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const threshold = SHIPPING_CONFIG.freeShippingThreshold
  const progress = Math.min(subtotal / threshold, 1)
  const remaining = Math.max(0, threshold - subtotal)
  const unlocked = subtotal >= threshold

  const progressWidth = useSharedValue(progress)

  React.useEffect(() => {
    progressWidth.value = withTiming(progress, {
      duration: duration.slow,
      easing: Easing.out(Easing.cubic),
    })
  }, [progress, progressWidth])

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }))

  const fadeStyle = useAnimatedStyle(() => {
    if (reduced || !scrollY) return {}
    const opacity = interpolate(
      scrollY.value,
      [0, 80],
      [1, 0.7],
      Extrapolation.CLAMP,
    )
    return { opacity }
  })

  const handlePress = useCallback(() => {
    router.push('/cart')
  }, [router])

  if (items.length === 0) return null

  return (
    <Animated.View style={fadeStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={unlocked ? t('home.freeDeliveryUnlocked') : t('home.freeDeliveryRemaining', { amount: remaining })}
      >
        <View style={[styles.container, { backgroundColor: unlocked ? colors.successLight : colors.primary50 }]}>
          <View style={styles.iconWrap}>
            <Icon
              name={unlocked ? 'bicycle' : 'rocket'}
              size={18}
              color={unlocked ? colors.success : colors.primary}
            />
          </View>
          <View style={styles.content}>
            <Text
              style={[styles.text, { color: unlocked ? colors.success : colors.text }]}
              numberOfLines={1}
            >
              {unlocked
                ? t('home.freeDeliveryUnlocked')
                : t('home.freeDeliveryRemaining', { amount: remaining.toLocaleString('en-IN') })}
            </Text>
            <View style={[styles.track, { backgroundColor: unlocked ? colors.success + '20' : colors.primary + '20' }]}>
              <Animated.View
                style={[
                  styles.fill,
                  { backgroundColor: unlocked ? colors.success : colors.primary },
                  progressStyle,
                ]}
              />
            </View>
          </View>
          <Icon name="chevron-forward" size={14} color={unlocked ? colors.success : colors.primary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: spacing[1.5],
  },
  text: {
    fontSize: fontSz('xs')[0],
    fontWeight: '600',
  },
  track: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
})

export const FreeDeliveryBanner = memo(FreeDeliveryBannerInner)
export default FreeDeliveryBanner
