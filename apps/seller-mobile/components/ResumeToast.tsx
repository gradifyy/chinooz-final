import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii, fontFamily } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'

export default function ResumeToast() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [visible, setVisible] = useState(true)
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(-20)

  useEffect(() => {
    opacity.value = reduced ? 1 : withSpring(1, { damping: 20, stiffness: 300, mass: 0.8 })
    translateY.value = reduced ? 0 : withSpring(0, { damping: 20, stiffness: 300, mass: 0.8 })

    const timer = setTimeout(() => {
      setVisible(false)
      opacity.value = reduced ? 0 : withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) })
    }, 3000)

    return () => clearTimeout(timer)
  }, [reduced])

  if (!visible) return null

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.View
      style={[styles.toast, style]}
      accessibilityRole="alert"
      accessibilityLabel={t('seller.setup.resumeToast')}
    >
      <Text style={styles.text}>{t('seller.setup.resumeToast')}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 60,
    left: spacing[4],
    right: spacing[4],
    backgroundColor: colors.text,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    zIndex: 100,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
