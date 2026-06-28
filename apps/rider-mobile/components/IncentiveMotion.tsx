import React, { useEffect, useRef, useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated'
import { colors, radii, duration as dur, easing as ez, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/**
 * RI7 — Motion pass for Incentives & Quests.
 *
 * Tasteful, on-brand animations using the shared motion tokens (S6/THEME).
 * Every animation respects reduced-motion (instant fill, no confetti/flame,
 * static tier-up + surge). Celebrations are brief + classy, not gimmicky.
 *
 *  - AnimatedProgressFill: bar fills from 0 → target on mount/update.
 *  - AnimatedMissionRing: SVG ring stroke fills from 0 → target.
 *  - ConfettiLite: brief 6-particle burst (gold/success), 1.2s total.
 *  - StreakFlame: gentle scale pulse (1 → 1.08 → 1), 2s loop.
 *  - SurgePulse: subtle opacity pulse on surge zones, 1.8s loop.
 *  - ListEnter: staggered fade + translateY for list items.
 *  - ClaimCelebration: success check pop + confetti-lite overlay.
 */

/* ---------- AnimatedProgressFill ---------- */

export function AnimatedProgressFill({
  pct,
  color = colors.gold,
  height = 8,
  borderRadius = radii.full,
  trackColor = colors.borderLight,
  reduced: reducedOverride,
  delay = 100,
}: {
  pct: number
  color?: string
  height?: number
  borderRadius?: number | string
  trackColor?: string
  reduced?: boolean
  delay?: number
}) {
  const reduced = useReducedMotion()
  const isReduced = reducedOverride ?? reduced
  const width = useSharedValue(isReduced ? pct * 100 : 0)

  useEffect(() => {
    if (isReduced) {
      width.value = pct * 100
    } else {
      width.value = withDelay(delay, withTiming(pct * 100, {
        duration: dur.slow,
        easing: Easing.bezier(...ez.easeOut),
        reduceMotion: ReduceMotion.Never,
      }))
    }
  }, [pct, isReduced, delay, width])

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }))

  return (
    <View style={[styles.progressTrack, { height, borderRadius, backgroundColor: trackColor }]}>
      <Animated.View
        style={[styles.progressFill, { backgroundColor: color, borderRadius }, fillStyle]}
      />
    </View>
  )
}

/* ---------- AnimatedMissionRing ---------- */

export function AnimatedMissionRing({
  pct,
  size = 88,
  stroke = 8,
  color = colors.gold,
  trackColor = colors.borderLight,
  reduced: reducedOverride,
  delay = 150,
}: {
  pct: number
  size?: number
  stroke?: number
  color?: string
  trackColor?: string
  reduced?: boolean
  delay?: number
}) {
  const reduced = useReducedMotion()
  const isReduced = reducedOverride ?? reduced
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius

  const dashOffset = useSharedValue(isReduced ? circ * (1 - pct) : circ)

  useEffect(() => {
    if (isReduced) {
      dashOffset.value = circ * (1 - pct)
    } else {
      dashOffset.value = withDelay(delay, withTiming(circ * (1 - pct), {
        duration: dur.slower,
        easing: Easing.bezier(...ez.easeOut),
        reduceMotion: ReduceMotion.Never,
      }))
    }
  }, [pct, circ, isReduced, delay, dashOffset])

  const circleProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }))

  return (
    <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no">
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={trackColor}
        strokeWidth={stroke}
        fill="none"
      />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circ}
        animatedProps={circleProps}
        rotation={-90}
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  )
}

/* ---------- ConfettiLite ---------- */

const CONFETTI_COLORS = [colors.gold, colors.success, colors.primary, '#E0A93B', '#B23C7E']
const CONFETTI_PARTICLES = 6

export function ConfettiLite({
  visible,
  reduced: reducedOverride,
}: {
  visible: boolean
  reduced?: boolean
}) {
  const reduced = useReducedMotion()
  const isReduced = reducedOverride ?? reduced

  if (isReduced || !visible) return null

  const particles = useMemo(
    () =>
      Array.from({ length: CONFETTI_PARTICLES }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        angle: (i / CONFETTI_PARTICLES) * Math.PI * 2,
        delay: i * 40,
      })),
    [],
  )

  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {particles.map(p => (
        <ConfettiParticle key={p.id} color={p.color} angle={p.angle} delay={p.delay} />
      ))}
    </View>
  )
}

function ConfettiParticle({ color, angle, delay }: { color: string; angle: number; delay: number }) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(0)
  const translateX = useSharedValue(0)
  const scale = useSharedValue(0)

  useEffect(() => {
    const dist = 50
    opacity.value = withDelay(delay, withTiming(1, { duration: 80, reduceMotion: ReduceMotion.Never }))
    scale.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 200 }))
    translateX.value = withDelay(delay, withTiming(Math.cos(angle) * dist, {
      duration: dur.slower,
      easing: Easing.bezier(...ez.easeOut),
      reduceMotion: ReduceMotion.Never,
    }))
    translateY.value = withDelay(delay, withTiming(Math.sin(angle) * dist - 20, {
      duration: dur.slower,
      easing: Easing.bezier(...ez.easeOut),
      reduceMotion: ReduceMotion.Never,
    }))
    opacity.value = withDelay(delay + 600, withTiming(0, {
      duration: dur.normal,
      reduceMotion: ReduceMotion.Never,
    }))
  }, [angle, delay, opacity, scale, translateX, translateY])

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }))

  return (
    <Animated.View
      style={[styles.confettiParticle, { backgroundColor: color }, style]}
    />
  )
}

/* ---------- StreakFlame ---------- */

export function StreakFlame({
  children,
  size = 24,
  reduced: reducedOverride,
}: {
  children: React.ReactNode
  size?: number
  reduced?: boolean
}) {
  const reduced = useReducedMotion()
  const isReduced = reducedOverride ?? reduced
  const scale = useSharedValue(1)

  useEffect(() => {
    if (isReduced) return
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1000, easing: Easing.bezier(...ez.easeInOut), reduceMotion: ReduceMotion.Never }),
        withTiming(1, { duration: 1000, easing: Easing.bezier(...ez.easeInOut), reduceMotion: ReduceMotion.Never }),
      ),
      -1,
      false,
    )
  }, [isReduced, scale])

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return <Animated.View style={style}>{children}</Animated.View>
}

/* ---------- SurgePulse ---------- */

export function SurgePulse({
  children,
  reduced: reducedOverride,
}: {
  children: React.ReactNode
  reduced?: boolean
}) {
  const reduced = useReducedMotion()
  const isReduced = reducedOverride ?? reduced
  const opacity = useSharedValue(1)

  useEffect(() => {
    if (isReduced) return
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 900, easing: Easing.bezier(...ez.easeInOut), reduceMotion: ReduceMotion.Never }),
        withTiming(1, { duration: 900, easing: Easing.bezier(...ez.easeInOut), reduceMotion: ReduceMotion.Never }),
      ),
      -1,
      false,
    )
  }, [isReduced, opacity])

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return <Animated.View style={style}>{children}</Animated.View>
}

/* ---------- ListEnter ---------- */

export function ListEnter({
  children,
  index = 0,
  reduced: reducedOverride,
}: {
  children: React.ReactNode
  index?: number
  reduced?: boolean
}) {
  const reduced = useReducedMotion()
  const isReduced = reducedOverride ?? reduced
  const opacity = useSharedValue(isReduced ? 1 : 0)
  const translateY = useSharedValue(isReduced ? 0 : 12)

  useEffect(() => {
    if (isReduced) {
      opacity.value = 1
      translateY.value = 0
    } else {
      const stagger = Math.min(index * 50, 200)
      opacity.value = withDelay(stagger, withTiming(1, {
        duration: dur.normal,
        easing: Easing.bezier(...ez.easeOut),
        reduceMotion: ReduceMotion.Never,
      }))
      translateY.value = withDelay(stagger, withTiming(0, {
        duration: dur.normal,
        easing: Easing.bezier(...ez.easeOut),
        reduceMotion: ReduceMotion.Never,
      }))
    }
  }, [index, isReduced, opacity, translateY])

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return <Animated.View style={style}>{children}</Animated.View>
}

/* ---------- ClaimCelebration ---------- */

export function ClaimCelebration({
  visible,
  reduced: reducedOverride,
  onDone,
}: {
  visible: boolean
  reduced?: boolean
  onDone?: () => void
}) {
  const reduced = useReducedMotion()
  const isReduced = reducedOverride ?? reduced

  const scale = useSharedValue(isReduced ? 1 : 0)
  const opacity = useSharedValue(isReduced ? 1 : 0)

  useEffect(() => {
    if (visible) {
      if (isReduced) {
        scale.value = 1
        opacity.value = 1
      } else {
        opacity.value = withTiming(1, { duration: dur.fast, reduceMotion: ReduceMotion.Never })
        scale.value = withSpring(1, { damping: 10, stiffness: 150 })
      }
      const timer = setTimeout(() => {
        if (!isReduced) {
          opacity.value = withTiming(0, { duration: dur.normal, reduceMotion: ReduceMotion.Never })
        }
        setTimeout(() => onDone?.(), isReduced ? 0 : dur.normal + 50)
      }, isReduced ? 300 : 1200)
      return () => clearTimeout(timer)
    }
  }, [visible, isReduced, scale, opacity, onDone])

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  if (!visible) return null

  return (
    <View style={styles.celebrationOverlay} pointerEvents="none">
      <ConfettiLite visible={visible} reduced={isReduced} />
      <Animated.View style={[styles.celebrationBadge, style]}>
        <View style={styles.celebrationCheck}>
          <View style={styles.celebrationCheckInner} />
        </View>
      </Animated.View>
    </View>
  )
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  progressTrack: {
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  confettiContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    zIndex: 10,
  },
  confettiParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  celebrationBadge: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow('lg'),
  },
  celebrationCheck: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationCheckInner: {
    width: 14,
    height: 8,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: colors.white,
    transform: [{ rotate: '-45deg' }],
    marginTop: 4,
  },
})
