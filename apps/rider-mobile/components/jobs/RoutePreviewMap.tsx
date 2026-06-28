import React, { useEffect, useMemo } from 'react'
import { StyleSheet, View, Text, Dimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import Svg, { Rect, Circle, G, Text as SvgText, Polyline } from 'react-native-svg'
import { colors, radii, fontFamily, fontSize, shadow, duration, easing } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { rs3Project } from '@chinooz/rs3'
import type { GeoPoint } from '@chinooz/types'
import { formatKm, formatDuration, formatNpr } from './format'

/**
 * Route preview map for the Job Detail screen (RJ4). Renders the RS3 boundary
 * as a calm frame, the rider's current location (plum dot), a dashed route
 * line from rider → pickup → drop-off, and labelled pins for pickup (gold)
 * and drop-off (info-blue). All SVG — no map tiles.
 *
 * Below the map: three stat tiles (distance / est. time / est. payout).
 * Accessibility: the container is an accessible image with a readable summary.
 */

interface RoutePreviewMapProps {
  riderLocation: GeoPoint
  pickup: GeoPoint
  dropoff: GeoPoint
  pickupLabel: string
  dropoffLabel: string
  /** Total trip distance pickup → dropoff, km. */
  tripDistanceKm: number
  /** Estimated total time rider → pickup → dropoff, minutes. */
  estTimeMin: number
  /** Estimated payout, NPR. */
  estPayout: number
  testID?: string
}

const PAD = 16
const PIN_R = 8
const RIDER_R = 6
const DASH = '4 3'

export default function RoutePreviewMap({
  riderLocation,
  pickup,
  dropoff,
  pickupLabel,
  dropoffLabel,
  tripDistanceKm,
  estTimeMin,
  estPayout,
  testID,
}: RoutePreviewMapProps) {
  const reduced = useReducedMotion()
  const width = Dimensions.get('window').width - 32 // minus parent padding
  const height = 240
  const w = width - PAD * 2
  const h = height - PAD * 2

  // Reveal animation: fade + slight scale up on mount.
  const revealOpacity = useSharedValue(reduced ? 1 : 0)
  const revealScale = useSharedValue(reduced ? 1 : 0.96)

  useEffect(() => {
    if (reduced) return
    revealOpacity.value = withTiming(1, { duration: duration.slow })
    revealScale.value = withDelay(
      duration.fast,
      withTiming(1, { duration: duration.slow, easing: Easing.bezier(...easing.easeOut) }),
    )
  }, [reduced])

  const revealStyle = useAnimatedStyle(() => ({
    opacity: revealOpacity.value,
    transform: [{ scale: revealScale.value }],
  }))

  const pts = useMemo(() => {
    const r = rs3Project(riderLocation)
    const p = rs3Project(pickup)
    const d = rs3Project(dropoff)
    return {
      rider: { x: PAD + r.x * w, y: PAD + r.y * h },
      pickup: { x: PAD + p.x * w, y: PAD + p.y * h },
      dropoff: { x: PAD + d.x * w, y: PAD + d.y * h },
    }
  }, [riderLocation, pickup, dropoff, w, h])

  const routePoints = `${pts.rider.x},${pts.rider.y} ${pts.pickup.x},${pts.pickup.y} ${pts.dropoff.x},${pts.dropoff.y}`

  const a11ySummary = `Route preview. From your location to ${pickupLabel} for pickup, then to ${dropoffLabel} for drop-off. Trip distance ${formatKm(tripDistanceKm)}, estimated time ${formatDuration(estTimeMin)}, payout ${formatNpr(estPayout)}.`

  return (
    <View style={styles.container}>
      <Animated.View style={revealStyle}>
      <View
        testID={testID}
        accessibilityRole="image"
        accessibilityLabel={a11ySummary}
        style={styles.mapWrap}
      >
        <Svg width={width} height={height} testID={testID ? `${testID}-svg` : undefined}>
          {/* Boundary frame */}
          <Rect
            x={PAD}
            y={PAD}
            width={w}
            height={h}
            rx={radii.lg}
            fill={colors.background}
            stroke={colors.borderLight}
            strokeWidth={1}
          />

          {/* Dashed route: rider → pickup → dropoff */}
          <Polyline
            points={routePoints}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeDasharray={DASH}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.7}
          />

          {/* Rider location */}
          <G>
            <Circle cx={pts.rider.x} cy={pts.rider.y} r={RIDER_R + 5} fill={colors.primary} opacity={0.15} />
            <Circle cx={pts.rider.x} cy={pts.rider.y} r={RIDER_R} fill={colors.primary} stroke={colors.white} strokeWidth={2} />
            <SvgText
              x={pts.rider.x}
              y={pts.rider.y + RIDER_R + 11}
              fontSize={8}
              fontFamily={fontFamily.sansSemiBold[0]}
              fontWeight="600"
              fill={colors.textMuted}
              textAnchor="middle"
            >
              You
            </SvgText>
          </G>

          {/* Pickup pin (gold) */}
          <G>
            <Circle cx={pts.pickup.x} cy={pts.pickup.y} r={PIN_R + 3} fill={colors.gold} opacity={0.2} />
            <Circle cx={pts.pickup.x} cy={pts.pickup.y} r={PIN_R} fill={colors.gold} stroke={colors.surface} strokeWidth={2} />
            <SvgText
              x={pts.pickup.x}
              y={pts.pickup.y - PIN_R - 4}
              fontSize={8}
              fontFamily={fontFamily.sansSemiBold[0]}
              fontWeight="600"
              fill={colors.textSecondary}
              textAnchor="middle"
            >
              Pickup
            </SvgText>
          </G>

          {/* Drop-off pin (info-blue) */}
          <G>
            <Circle cx={pts.dropoff.x} cy={pts.dropoff.y} r={PIN_R + 3} fill={colors.info} opacity={0.2} />
            <Circle cx={pts.dropoff.x} cy={pts.dropoff.y} r={PIN_R} fill={colors.info} stroke={colors.surface} strokeWidth={2} />
            <SvgText
              x={pts.dropoff.x}
              y={pts.dropoff.y - PIN_R - 4}
              fontSize={8}
              fontFamily={fontFamily.sansSemiBold[0]}
              fontWeight="600"
              fill={colors.textSecondary}
              textAnchor="middle"
            >
              Drop-off
            </SvgText>
          </G>
        </Svg>
      </View>
      </Animated.View>
      <View style={styles.statsRow}>
        <StatTile label="Distance" value={formatKm(tripDistanceKm)} testID={testID ? `${testID}-stat-distance` : undefined} />
        <View style={styles.statDivider} />
        <StatTile label="Est. time" value={formatDuration(estTimeMin)} testID={testID ? `${testID}-stat-time` : undefined} />
        <View style={styles.statDivider} />
        <StatTile label="Payout" value={formatNpr(estPayout)} valueColor={colors.primary} testID={testID ? `${testID}-stat-payout` : undefined} />
      </View>
    </View>
  )
}

function StatTile({
  label,
  value,
  valueColor,
  testID,
}: {
  label: string
  value: string
  valueColor?: string
  testID?: string
}) {
  return (
    <View style={styles.statTile} testID={testID}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  mapWrap: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadow('md'),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.borderLight,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  statValue: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
})
