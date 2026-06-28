import React, { useEffect } from 'react'
import { View, Text, StyleSheet, AccessibilityInfo, Platform } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated'
import { Check } from 'lucide-react-native'
import { colors, spacing, fontFamily, fontSize, easing } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import type { OnboardingStep } from '@chinooz/state'
import { ONBOARDING_STEPS } from '@chinooz/state'

interface Props {
  /** Furthest step reached (the rider's progress). */
  currentStep: OnboardingStep
  /** Labels for each step, keyed by step id. */
  labels: Record<OnboardingStep, string>
}

/**
 * RO3–RO6 — progress stepper header shown across all onboarding steps.
 *
 * Renders Personal → Vehicle → Documents → Review with a filling progress
 * bar up to the current step. Announces "Step X of 4: <label>" when the
 * step changes and marks the active step aria-current="step".
 */
export default function ProgressStepper({ currentStep, labels }: Props) {
  const reduced = useReducedMotion()
  const currentIndex = ONBOARDING_STEPS.indexOf(currentStep)
  const total = ONBOARDING_STEPS.length

  useEffect(() => {
    if (Platform.OS === 'web') return
    try {
      AccessibilityInfo.announceForAccessibility(
        labels[currentStep]
          ? `Step ${currentIndex + 1} of ${total}: ${labels[currentStep]}`
          : `Step ${currentIndex + 1} of ${total}`,
      )
    } catch {}
  }, [currentIndex, total, currentStep, labels])

  // Progress fill: covers completed + half of the current step's segment.
  const fillRatio = (currentIndex + 0.5) / total
  const fillWidth = useSharedValue(fillRatio * 100)

  useEffect(() => {
    fillWidth.value = withTiming(fillRatio * 100, {
      duration: reduced ? 0 : 360,
      easing: Easing.bezier(...easing.easeOut),
      reduceMotion: ReduceMotion.Never,
    })
  }, [fillRatio, reduced])

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value}%`,
  }))

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: currentIndex + 1 }}
      accessibilityLabel={`Step ${currentIndex + 1} of ${total}`}
    >
      {/* Track */}
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>

      {/* Step dots + labels */}
      <View style={styles.stepsRow}>
        {ONBOARDING_STEPS.map((step, i) => {
          const isComplete = i < currentIndex
          const isCurrent = i === currentIndex
          const isUpcoming = i > currentIndex
          return (
            <View key={step} style={styles.stepCol}>
              <View
                style={[
                  styles.dot,
                  isComplete && styles.dotComplete,
                  isCurrent && styles.dotCurrent,
                  isUpcoming && styles.dotUpcoming,
                ]}
                accessibilityRole="text"
                accessibilityState={{ selected: isCurrent }}
              >
                {isComplete ? (
                  <Check size={13} color={colors.white} strokeWidth={3} />
                ) : (
                  <Text
                    style={[
                      styles.dotText,
                      isCurrent && styles.dotTextCurrent,
                      isUpcoming && styles.dotTextUpcoming,
                    ]}
                  >
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isCurrent && styles.stepLabelCurrent,
                  isUpcoming && styles.stepLabelUpcoming,
                ]}
                numberOfLines={1}
                accessibilityLabel={labels[step]}
              >
                {labels[step]}
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
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    backgroundColor: colors.background,
  },
  track: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing[3],
  },
  fill: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepCol: {
    alignItems: 'center',
    flex: 1,
    gap: spacing[1.5],
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  dotComplete: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotCurrent: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  dotUpcoming: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  dotText: {
    fontSize: fontSize.xs[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  dotTextCurrent: {
    color: colors.primary,
  },
  dotTextUpcoming: {
    color: colors.textTertiary,
  },
  stepLabel: {
    fontSize: fontSize.xs[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
    textAlign: 'center',
  },
  stepLabelCurrent: {
    color: colors.primary,
  },
  stepLabelUpcoming: {
    color: colors.textTertiary,
    fontWeight: '500',
  },
})
