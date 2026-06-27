import React, { useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, Clipboard } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii, duration, easing } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'
import type {
  OrderStatusTimelineProps,
  TimelineStep,
  ShipmentTimeline,
} from '@chinooz/types'

const NODE_SIZE = 24
const LINE_WIDTH = 2

function formatTimestamp(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

interface TimelineNodeProps {
  step: TimelineStep
  index: number
  totalSteps: number
  isLast: boolean
  reduced: boolean
  lineFillProgress: Animated.SharedValue<number>
}

function TimelineNode({
  step,
  index,
  totalSteps,
  isLast,
  reduced,
  lineFillProgress,
}: TimelineNodeProps) {
  const pulseScale = useSharedValue(1)
  const nodeOpacity = useSharedValue(reduced ? 1 : 0)
  const nodeScale = useSharedValue(reduced ? 1 : 0.5)

  const isCompleted = step.status === 'completed'
  const isCurrent = step.status === 'current'
  const isCancelled = step.key === 'cancelled' || step.key === 'returned'

  useEffect(() => {
    const delayMs = reduced ? 0 : index * 80
    nodeOpacity.value = withDelay(
      delayMs,
      withTiming(1, { duration: reduced ? 0 : duration.normal }),
    )
    nodeScale.value = withDelay(
      delayMs,
      withSpring(1, { damping: 12, stiffness: 200 }),
    )
  }, [])

  useEffect(() => {
    if (isCurrent && !reduced) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      )
    } else {
      pulseScale.value = withTiming(1, { duration: reduced ? 0 : 200 })
    }
  }, [isCurrent, reduced])

  const nodeAnimStyle = useAnimatedStyle(() => ({
    opacity: nodeOpacity.value,
    transform: [{ scale: nodeScale.value * (isCurrent ? pulseScale.value : 1) }],
  }))

  const lineAnimStyle = useAnimatedStyle(() => {
    if (isLast) return { height: 0 }
    const targetFill = isCompleted || isCurrent ? 1 : 0
    const fill = isCompleted || isCurrent ? lineFillProgress.value : 0
    return {
      backgroundColor: isCancelled
        ? colors.error
        : fill >= targetFill
          ? colors.primary
          : colors.border,
    }
  })

  const getNodeBg = () => {
    if (isCancelled) return colors.errorLight
    if (isCompleted) return colors.primary
    if (isCurrent) return colors.primary
    return colors.surface
  }

  const getNodeBorder = () => {
    if (isCancelled) return colors.error
    if (isCompleted || isCurrent) return colors.primary
    return colors.border
  }

  const getLabelWeight = () => {
    if (isCompleted || isCurrent) return '600' as const
    return '400' as const
  }

  const getLabelColor = () => {
    if (isCancelled) return colors.error
    if (isCompleted || isCurrent) return colors.text
    return colors.textMuted
  }

  const getLabelSize = () => {
    if (isCompleted || isCurrent) return 16
    return 14
  }

  return (
    <Animated.View style={[{ flexDirection: 'row', gap: spacing[3] }, nodeAnimStyle]}>
      {/* Node + connecting line column */}
      <View style={{ alignItems: 'center', width: NODE_SIZE }}>
        {/* Node circle */}
        <View
          style={{
            width: NODE_SIZE,
            height: NODE_SIZE,
            borderRadius: NODE_SIZE / 2,
            backgroundColor: getNodeBg(),
            borderWidth: 2,
            borderColor: getNodeBorder(),
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="text"
          accessibilityLabel={`${step.label}, ${step.status}${step.timestamp ? `, ${formatTimestamp(step.timestamp)}` : ''}`}
        >
          {(isCompleted || isCurrent) && !isCancelled && (
            <Text style={{ fontSize: 12, color: colors.white }}>✓</Text>
          )}
          {isCancelled && (
            <Text style={{ fontSize: 12, color: colors.error }}>
              {step.key === 'returned' ? '↩' : '✕'}
            </Text>
          )}
        </View>

        {/* Connecting line */}
        {!isLast && (
          <Animated.View
            style={[
              {
                width: LINE_WIDTH,
                flex: 1,
                minHeight: spacing[8],
                marginTop: spacing[1],
              },
              lineAnimStyle,
            ]}
          />
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1, paddingBottom: isLast ? 0 : spacing[2] }}>
        <Text
          style={{
            fontSize: getLabelSize(),
            fontWeight: getLabelWeight(),
            color: getLabelColor(),
            fontFamily: isCompleted || isCurrent ? 'Inter-SemiBold' : 'Inter',
          }}
        >
          {step.label}
        </Text>
        {step.timestamp && (
          <Text
            style={{
              fontSize: 12,
              color: colors.textMuted,
              marginTop: 2,
              fontFamily: 'Inter',
            }}
          >
            {formatTimestamp(step.timestamp)}
          </Text>
        )}
        {step.note && (
          <Text
            style={{
              fontSize: 12,
              color: colors.textTertiary,
              marginTop: 2,
              fontFamily: 'Inter',
            }}
          >
            {step.note}
          </Text>
        )}
      </View>
    </Animated.View>
  )
}

function TrackingChip({
  trackingNumber,
  onCopy,
}: {
  trackingNumber: string
  onCopy?: (tn: string) => void
}) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = useCallback(async () => {
    Clipboard.setString(trackingNumber)
    setCopied(true)
    onCopy?.(trackingNumber)
    setTimeout(() => setCopied(false), 2000)
  }, [trackingNumber, onCopy])

  return (
    <TouchableOpacity
      onPress={handleCopy}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Tracking number: ${trackingNumber}. Tap to copy.`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[2],
        gap: spacing[2],
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '500',
          color: colors.textSecondary,
          fontFamily: 'Inter',
          fontVariant: ['tabular-nums'],
        }}
      >
        {trackingNumber}
      </Text>
      <Text style={{ fontSize: 12, color: copied ? colors.success : colors.primary, fontWeight: '600' }}>
        {copied ? '✓ Copied!' : 'Copy'}
      </Text>
    </TouchableOpacity>
  )
}

function CodBadge() {
  return (
    <View
      style={{
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderRadius: radii.full,
        paddingHorizontal: spacing[2.5],
        paddingVertical: spacing[1],
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#F59E0B' }}>
        Cash on delivery
      </Text>
    </View>
  )
}

function ShipmentCard({
  shipment,
  reduced,
}: {
  shipment: ShipmentTimeline
  reduced: boolean
}) {
  const { t } = useTranslation()
  const lineFillProgress = useSharedValue(0)

  useEffect(() => {
    if (!reduced) {
      lineFillProgress.value = withDelay(
        300,
        withSpring(1, {
          damping: 20,
          stiffness: 150,
          mass: 0.8,
          restDisplacementThreshold: 0.01,
        }),
      )
    } else {
      lineFillProgress.value = 1
    }
  }, [reduced])

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        padding: spacing[4],
        borderWidth: 1,
        borderColor: colors.borderLight,
        gap: spacing[3],
      }}
    >
      {/* Seller header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, fontFamily: 'Inter-SemiBold' }}>
          {shipment.sellerName}
        </Text>
        {shipment.estimatedDelivery && (
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.primary, fontFamily: 'Inter' }}>
            {t('orders.estimatedDelivery')}: {new Date(shipment.estimatedDelivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        )}
      </View>

      {/* COD badge */}
      {shipment.isCod && <CodBadge />}

      {/* Tracking chip */}
      {shipment.trackingNumber && (
        <TrackingChip trackingNumber={shipment.trackingNumber} />
      )}

      {/* Timeline steps */}
      <View style={{ gap: 0 }}>
        {shipment.steps.map((step, index) => (
          <TimelineNode
            key={step.key}
            step={step}
            index={index}
            totalSteps={shipment.steps.length}
            isLast={index === shipment.steps.length - 1}
            reduced={reduced}
            lineFillProgress={lineFillProgress}
          />
        ))}
      </View>

      {/* Map placeholder */}
      <View
        style={{
          height: 120,
          backgroundColor: colors.shimmer,
          borderRadius: radii.lg,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 24 }}>📍</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: spacing[1] }}>
          Live tracking coming soon
        </Text>
      </View>
    </View>
  )
}

export default function OrderStatusTimeline({
  steps,
  shipments,
  isCod,
  trackingNumber,
  onCopyTracking,
  testID,
}: OrderStatusTimelineProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const lineFillProgress = useSharedValue(0)

  const completedCount = steps.filter(s => s.status === 'completed').length
  const currentStep = steps.find(s => s.status === 'current')
  const currentStatusLabel = currentStep?.label || steps[steps.length - 1]?.label || ''

  useEffect(() => {
    if (!reduced) {
      lineFillProgress.value = withDelay(
        200,
        withSpring(1, {
          damping: 20,
          stiffness: 150,
          mass: 0.8,
          restDisplacementThreshold: 0.01,
        }),
      )
    } else {
      lineFillProgress.value = 1
    }
  }, [reduced])

  return (
    <View
      testID={testID}
      accessibilityLabel={t('orders.orderStatus', {
        status: currentStatusLabel,
        current: completedCount + (currentStep ? 1 : 0),
        total: steps.length,
      })}
      style={{ gap: spacing[4] }}
    >
      {/* Main timeline (single-seller or overview) */}
      {!shipments || shipments.length <= 1 ? (
        <View style={{ gap: 0 }}>
          {steps.map((step, index) => (
            <TimelineNode
              key={step.key}
              step={step}
              index={index}
              totalSteps={steps.length}
              isLast={index === steps.length - 1}
              reduced={reduced}
              lineFillProgress={lineFillProgress}
            />
          ))}

          {/* COD badge */}
          {isCod && (
            <View style={{ marginTop: spacing[3] }}>
              <CodBadge />
            </View>
          )}

          {/* Tracking chip */}
          {trackingNumber && (
            <View style={{ marginTop: spacing[3] }}>
              <TrackingChip trackingNumber={trackingNumber} onCopy={onCopyTracking} />
            </View>
          )}

          {/* Map placeholder */}
          {(currentStep?.key === 'shipped' || currentStep?.key === 'out_for_delivery') && (
            <View
              style={{
                height: 120,
                backgroundColor: colors.shimmer,
                borderRadius: radii.lg,
                overflow: 'hidden',
                marginTop: spacing[3],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 24 }}>📍</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: spacing[1] }}>
                Live tracking coming soon
              </Text>
            </View>
          )}
        </View>
      ) : (
        /* Multi-seller: each shipment in its own card */
        <View style={{ gap: spacing[3] }}>
          {shipments.map((shipment, index) => (
            <ShipmentCard
              key={shipment.sellerName}
              shipment={shipment}
              reduced={reduced}
            />
          ))}
        </View>
      )}
    </View>
  )
}
