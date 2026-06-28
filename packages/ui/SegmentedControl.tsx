import React, { useEffect } from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useAnimatedReaction,
  withTiming,
} from 'react-native-reanimated'
import { colors, radii, spacing, fontSize, fontFamily, duration } from '@chinooz/theme'
import type { SegmentedControlProps } from '@chinooz/types/components'
import { useReducedMotion } from './hooks/useReducedMotion'

const SEGMENT_HEIGHT = 40
const BADGE_PADDING = 8

const SPRING_CONFIG = { damping: 25, stiffness: 350, mass: 0.8 }
const BADGE_SPRING = { damping: 10, stiffness: 400 }

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
      transform: [{ translateX: reduced ? x : withSpring(x, SPRING_CONFIG) }],
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
          const hasBadge = seg.badge != null && seg.badge > 0
          const a11yLabel = hasBadge
            ? `${seg.label}, ${seg.badge! > 99 ? '99+' : seg.badge}`
            : seg.label
          return (
            <TouchableOpacity
              key={seg.key}
              onPress={() => onChange(seg.key)}
              style={styles.segment}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={a11yLabel}
              activeOpacity={0.7}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {seg.label}
              </Text>
              {hasBadge && (
                <UnreadBadge count={seg.badge!} isActive={isActive} reduced={reduced} />
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

function UnreadBadge({ count, isActive, reduced }: { count: number; isActive: boolean; reduced: boolean }) {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)

  useAnimatedReaction(
    () => count,
    (current, previous) => {
      if (previous === undefined || previous === null) return
      if (reduced) {
        scale.value = 1
        opacity.value = current === 0 ? 0 : 1
        return
      }
      if (current > previous) {
        scale.value = withTiming(1.3, { duration: duration.fast }, () => {
          scale.value = withSpring(1, BADGE_SPRING)
        })
      } else if (current === 0) {
        scale.value = withTiming(0, { duration: duration.normal })
        opacity.value = withTiming(0, { duration: duration.normal })
      }
    },
    [count, reduced],
  )

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  if (count <= 0) return null

  return (
    <Animated.View style={[styles.badge, isActive && styles.badgeActive, animStyle]}>
      <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
        {count > 99 ? '99+' : count}
      </Text>
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
  badgeActive: {
    backgroundColor: colors.white,
  },
  badgeText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.white,
  },
  badgeTextActive: {
    color: colors.primary,
  },
})
