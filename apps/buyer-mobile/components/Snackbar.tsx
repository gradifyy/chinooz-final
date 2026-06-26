import React, { useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { colors, spacing, radii } from '@chinooz/theme'

interface SnackbarProps {
  visible: boolean
  message: string
  actionLabel?: string
  onAction?: () => void
  onDismiss?: () => void
  autoHideMs?: number
}

export default function Snackbar({
  visible,
  message,
  actionLabel,
  onAction,
  onDismiss,
  autoHideMs = 3000,
}: SnackbarProps) {
  const translateY = useSharedValue(80)
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 300, mass: 0.8 })
      opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })
      if (autoHideMs > 0) {
        const timer = setTimeout(() => {
          translateY.value = withTiming(80, { duration: 250, easing: Easing.in(Easing.cubic) })
          opacity.value = withTiming(0, { duration: 250 }, () => {
            if (onDismiss) {
              try { onDismiss() } catch {}
            }
          })
        }, autoHideMs)
        return () => clearTimeout(timer)
      }
    } else {
      translateY.value = withTiming(80, { duration: 250 })
      opacity.value = withTiming(0, { duration: 250 })
    }
  }, [visible])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  if (!visible) return null

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 100,
          left: spacing[4],
          right: spacing[4],
          backgroundColor: colors.text,
          borderRadius: radii.lg,
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 6,
          zIndex: 9998,
        },
        animStyle,
      ]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      <Text style={{ fontSize: 14, color: colors.white, flex: 1 }}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} style={{ marginLeft: spacing[3] }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.gold }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  )
}
