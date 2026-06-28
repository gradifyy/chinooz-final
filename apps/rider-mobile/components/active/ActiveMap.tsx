import React, { useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import Svg, { Polyline, Circle, Rect, Line, Text as SvgText } from 'react-native-svg'
import { colors, fontFamily } from '@chinooz/theme'
import { rs3Project, sampleLeg } from '@chinooz/rs3'
import type { ActiveDelivery, DeliveryStatus, GeoPoint } from '@chinooz/types'

interface ActiveMapProps {
  delivery: ActiveDelivery
  a11ySummary: string
  testID?: string
}

/**
 * Full-screen RS3 map for the Active Delivery route.
 *
 * Renders the RS3 boundary as a framed canvas, the two route legs as
 * polylines, the pickup/dropoff markers, and the rider marker at the
 * delivery's `currentPoint`. The rider marker is driven entirely by the
 * shared activeDelivery store, so it animates as the trip simulator ticks.
 *
 * No external map tiles are fetched — the map is drawn with react-native-svg
 * so it stays light on battery and data and works offline.
 */
export default function ActiveMap({ delivery, a11ySummary, testID }: ActiveMapProps) {
  const { pickup, dropoff, legToPickup, legToDropoff, currentPoint, status } = delivery

  // Sample the legs into drawable polylines in normalized [0..1] space.
  const pickupPolyline = useMemo(() => sampleLeg(legToPickup, 16), [legToPickup])
  const dropoffPolyline = useMemo(() => sampleLeg(legToDropoff, 16), [legToDropoff])

  const rider = useMemo(() => rs3Project(currentPoint), [currentPoint])
  const pickupProj = useMemo(() => rs3Project(pickup), [pickup])
  const dropoffProj = useMemo(() => rs3Project(dropoff), [dropoff])

  const toPoints = (pts: GeoPoint[]) =>
    pts
      .map(p => {
        const pr = rs3Project(p)
        return `${pr.x * 100},${pr.y * 100}`
      })
      .join(' ')

  // Which leg is currently active (drawn highlighted).
  const activeLeg: 'pickup' | 'dropoff' | null =
    status === 'heading_to_pickup'
      ? 'pickup'
      : status === 'picked_up' || status === 'in_transit'
        ? 'dropoff'
        : null

  const pickupDone =
    status !== 'assigned' &&
    status !== 'heading_to_pickup' &&
    status !== 'cancelled' &&
    status !== 'failed'
  const dropoffDone = status === 'delivered'

  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={a11ySummary}
      testID={testID}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Boundary frame */}
        <Rect
          x={0.5}
          y={0.5}
          width={99}
          height={99}
          rx={2}
          fill="#E8F0F5"
          stroke={colors.borderLight}
          strokeWidth={0.4}
        />

        {/* Stylized road grid */}
        {[20, 40, 60, 80].map(p => (
          <Line key={`h${p}`} x1={0} y1={p} x2={100} y2={p} stroke={colors.borderLight} strokeWidth={0.25} />
        ))}
        {[20, 40, 60, 80].map(p => (
          <Line key={`v${p}`} x1={p} y1={0} x2={p} y2={100} stroke={colors.borderLight} strokeWidth={0.25} />
        ))}

        {/* Leg to pickup (muted once picked up) */}
        <Polyline
          points={toPoints(pickupPolyline)}
          fill="none"
          stroke={pickupDone ? colors.border : colors.primary}
          strokeWidth={activeLeg === 'pickup' ? 1.6 : 1}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={pickupDone ? '2,1.5' : undefined}
          opacity={pickupDone ? 0.5 : 0.9}
        />

        {/* Leg to dropoff (highlighted once in transit) */}
        <Polyline
          points={toPoints(dropoffPolyline)}
          fill="none"
          stroke={dropoffDone ? colors.success : colors.primaryDark}
          strokeWidth={activeLeg === 'dropoff' ? 1.6 : 1}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={dropoffDone ? '2,1.5' : undefined}
          opacity={activeLeg === 'dropoff' || dropoffDone ? 0.95 : 0.45}
        />

        {/* Pickup marker */}
        <Circle
          cx={pickupProj.x * 100}
          cy={pickupProj.y * 100}
          r={2.4}
          fill={colors.primary}
          stroke={colors.white}
          strokeWidth={0.8}
        />
        <SvgText
          x={pickupProj.x * 100}
          y={pickupProj.y * 100 - 4}
          fontSize={3}
          fontFamily={fontFamily.sansSemiBold[0]}
          fill={colors.primaryDark}
          textAnchor="middle"
        >
          {pickup.label.length > 14 ? `${pickup.label.slice(0, 13)}…` : pickup.label}
        </SvgText>

        {/* Dropoff marker */}
        <Circle
          cx={dropoffProj.x * 100}
          cy={dropoffProj.y * 100}
          r={2.4}
          fill={dropoffDone ? colors.success : colors.gold}
          stroke={colors.white}
          strokeWidth={0.8}
        />
        <SvgText
          x={dropoffProj.x * 100}
          y={dropoffProj.y * 100 - 4}
          fontSize={3}
          fontFamily={fontFamily.sansSemiBold[0]}
          fill={colors.text}
          textAnchor="middle"
        >
          {dropoff.label.length > 14 ? `${dropoff.label.slice(0, 13)}…` : dropoff.label}
        </SvgText>

        {/* Rider marker (animated by the store's currentPoint) */}
        {!isTerminal(status) && (
          <>
            <Circle cx={rider.x * 100} cy={rider.y * 100} r={4.5} fill={colors.primary} opacity={0.18} />
            <Circle
              cx={rider.x * 100}
              cy={rider.y * 100}
              r={2.6}
              fill={colors.primary}
              stroke={colors.white}
              strokeWidth={1}
            />
          </>
        )}
      </Svg>
    </View>
  )
}

function isTerminal(s: DeliveryStatus): boolean {
  return s === 'delivered' || s === 'cancelled' || s === 'failed'
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E8F0F5',
  },
})
