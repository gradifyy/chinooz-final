import React, { memo } from 'react'
import { StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated'
import { useAppTheme } from './ThemeProvider'
import { radii } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { duration } from '@chinooz/theme'
import Icon from './Icon'

const TRIGGER = 55

interface CustomRefreshControlProps {
  refreshing: boolean
  onRefresh: () => void
}

function CustomRefreshControlInner({ refreshing }: CustomRefreshControlProps) {
  const { colors } = useAppTheme()
  const reduced = useReducedMotion()
  const pull = useSharedValue(0)
  const rotation = useSharedValue(0)
  const triggered = useSharedValue(false)

  React.useEffect(() => {
    if (refreshing) {
      pull.value = withTiming(TRIGGER, { duration: duration.fast, easing: Easing.out(Easing.cubic) })
      if (!reduced) {
        rotation.value = withSpring(0, { damping: 20, stiffness: 300 })
        const spin = () => {
          rotation.value = withTiming(360, { duration: 800, easing: Easing.linear }, () => {
            rotation.value = 0
            spin()
          })
        }
        spin()
      }
    } else {
      pull.value = withTiming(0, { duration: duration.fast })
      triggered.value = false
    }
  }, [refreshing, pull, rotation, triggered, reduced])

  const containerStyle = useAnimatedStyle(() => ({
    height: pull.value,
    opacity: interpolate(pull.value, [0, 20], [0, 1], Extrapolation.CLAMP),
  }))

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
    scale: interpolate(pull.value, [0, TRIGGER], [0.5, 1], Extrapolation.CLAMP),
  }))

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: triggered.value ? 1.2 : 1 }],
    opacity: triggered.value ? 1 : 0.4,
  }))

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      <Animated.View style={[styles.spinner, { backgroundColor: colors.primary50 }, iconStyle]}>
        <Icon
          name={refreshing ? 'refresh' : 'arrow-down'}
          size={18}
          color={colors.primary}
        />
      </Animated.View>
      <Animated.View style={[styles.triggerDot, { backgroundColor: colors.primary }, dotStyle]} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    zIndex: 10,
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
})

export const CustomRefreshControl = memo(CustomRefreshControlInner)
export default CustomRefreshControl
