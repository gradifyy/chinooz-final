import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  Easing,
  withTiming,
} from 'react-native-reanimated'
import { Check } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'

export interface WizardStep {
  key: string
  labelKey: string
  label: string
}

interface Props {
  steps: WizardStep[]
  current: number
}

export default function WizardStepper({ steps, current }: Props) {
  const reduced = useReducedMotion()
  const progress = useSharedValue(current === 0 ? 0 : current / (steps.length - 1))

  React.useEffect(() => {
    const target = current === 0 ? 0 : current / (steps.length - 1)
    progress.value = reduced ? target : withSpring(target, { damping: 20, stiffness: 300, mass: 0.8 })
  }, [current, reduced])

  const lineStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }))

  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <View style={styles.track}>
        <Animated.View style={[styles.trackFill, lineStyle]} />
      </View>
      <View style={styles.stepsRow}>
        {steps.map((step, i) => {
          const isCompleted = i < current
          const isCurrent = i === current
          return (
            <View key={step.key} style={styles.stepItem}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isCurrent && styles.circleCurrent,
                ]}
              >
                {isCompleted ? (
                  <Check size={14} color={colors.white} strokeWidth={3} />
                ) : (
                  <Text
                    style={[
                      styles.circleText,
                      isCurrent && styles.circleTextCurrent,
                      !isCompleted && !isCurrent && styles.circleTextUpcoming,
                    ]}
                  >
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  isCurrent && styles.labelCurrent,
                  isCompleted && styles.labelCompleted,
                  !isCompleted && !isCurrent && styles.labelUpcoming,
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  track: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 1.5,
    marginBottom: spacing[3],
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 1.5,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  circleCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  circleCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  circleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: fontFamily.sansBold[0],
  },
  circleTextCurrent: {
    color: colors.primary,
  },
  circleTextUpcoming: {
    color: colors.textTertiary,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing[1.5],
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  labelCurrent: {
    color: colors.primary,
  },
  labelCompleted: {
    color: colors.text,
  },
  labelUpcoming: {
    color: colors.textTertiary,
  },
})
