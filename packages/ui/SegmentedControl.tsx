import React, { useEffect } from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useAnimatedReaction,
  withTiming,
} from 'react-native-reanimated'
import { colors, radii, spacing, fontSize, fontFamily } from '@chinooz/theme'
import type { SegmentedControlProps } from '@chinooz/types/components'
import { useReducedMotion } from './hooks/useReducedMotion'

const SEGMENT_HEIGHT = 40
const BADGE_PADDING = 8

export default function SegmentedControl({
  segments,
  activeKey,
  onChange,
  testID,
}: SegmentedControlProps) {
  const reduced = useReducedMotion()
  const activeIndex = segments.findIndex(s => s.key === activeKey)
  const indicatorX = useSharedValue(activeIndex >= 0 ? activeIndex : 0)
  const segmentWidth = useSharedValue(0)

  useEffect(() => {
    indicatorX.value = activeIndex >= 0 ? activeIndex : 0
  }, [activeIndex])

  const indicatorStyle = useAnimatedStyle(() => {
    const x = segmentWidth.value * indicatorX.value
    return {
      transform: [{ translateX: reduced ? x : withSpring(x, { damping: 25, stiffness: 350, mass: 0.8 }) }],
    }
  })

  return (
    <View
      testID={testID}
      style={styles.container}
      accessibilityRole="tablist"
    >
      <View
        style={styles.track}
        onLayout={e => {
          const w = e.nativeEvent.layout.width / segments.length
          segmentWidth.value = w
        }}
      >
        <Animated.View
          style={[
            styles.indicator,
            { width: segmentWidth.value || undefined },
            indicatorStyle,
          ]}
        />
        {segments.map(seg => {
          const isActive = seg.key === activeKey
          return (
            <TouchableOpacity
              key={seg.key}
              onPress={() => onChange(seg.key)}
              style={styles.segment}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              activeOpacity={0.7}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {seg.label}
              </Text>
              {seg.badge != null && seg.badge > 0 && (
                <UnreadBadge count={seg.badge} />
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

function UnreadBadge({ count }: { count: number }) {
  const scale = useSharedValue(1)
  const prevCount = useSharedValue(count)

  useAnimatedReaction(
    () => count,
    (current, previous) => {
      if (previous === undefined || previous === null) return
      if (current > previous) {
        scale.value = withTiming(1.3, { duration: 150 }, () => {
          scale.value = withSpring(1, { damping: 10, stiffness: 400 })
        })
      } else if (current === 0) {
        scale.value = withTiming(0, { duration: 200 })
      }
    },
    [count],
  )

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: count === 0 ? withTiming(0, { duration: 200 }) : 1,
  }))

  if (count <= 0) return null

  return (
    <Animated.View style={[styles.badge, animStyle]}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    height: SEGMENT_HEIGHT,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: SEGMENT_HEIGHT,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: SEGMENT_HEIGHT,
    gap: spacing[1],
  },
  label: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.white,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: BADGE_PADDING,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.white,
  },
})
