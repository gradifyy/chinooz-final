import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Rect, Circle, G, Text as SvgText } from 'react-native-svg'
import { colors, radii, fontFamily } from '@chinooz/theme'
import { rs3Project, RS3_BOUNDARY } from '@chinooz/rs3'
import type { GeoPoint } from '@chinooz/types'
import type { JobRequest } from './types'
import { formatNpr } from './format'

/**
 * Mini map for the Available tab's map view. Renders the RS3 boundary as a
 * calm frame, the rider's current location as a plum dot, and a pin per
 * available job (positioned by its pickup geo). All SVG — no map tiles.
 *
 * Each pin is tap-targeted via the parent's `onJobPress` (the pin is a
 * labelled circle; the parent list still handles the a11y announcement).
 */

interface JobMiniMapProps {
  jobs: JobRequest[]
  /** Pickup geo per job (id → point). The parent supplies this from RiderJob. */
  jobPoints: Map<string, GeoPoint>
  riderLocation: GeoPoint
  width: number
  height: number
  onJobPress?: (job: JobRequest) => void
  accessibilityLabel: string
  testID?: string
}

const PAD = 14
const PIN_R = 7
const RIDER_R = 6

export default function JobMiniMap({
  jobs,
  jobPoints,
  riderLocation,
  width,
  height,
  onJobPress,
  accessibilityLabel,
  testID,
}: JobMiniMapProps) {
  const rider = useMemo(() => rs3Project(riderLocation), [riderLocation])

  const pins = useMemo(() => {
    return jobs
      .map(job => {
        const pt = jobPoints.get(job.id)
        if (!pt) return null
        const p = rs3Project(pt)
        return { job, x: p.x, y: p.y }
      })
      .filter((p): p is { job: JobRequest; x: number; y: number } => p !== null)
  }, [jobs, jobPoints])

  const w = width - PAD * 2
  const h = height - PAD * 2

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={styles.container}
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

        {/* Rider location */}
        <G>
          <Circle
            cx={PAD + rider.x * w}
            cy={PAD + rider.y * h}
            r={RIDER_R + 4}
            fill={colors.primary}
            opacity={0.18}
          />
          <Circle
            cx={PAD + rider.x * w}
            cy={PAD + rider.y * h}
            r={RIDER_R}
            fill={colors.primary}
            stroke={colors.white}
            strokeWidth={2}
          />
        </G>

        {/* Job pins */}
        {pins.map(p => (
          <G key={p.job.id}>
            <Circle
              cx={PAD + p.x * w}
              cy={PAD + p.y * h}
              r={PIN_R}
              fill={p.job.codAmount && p.job.codAmount > 0 ? colors.info : colors.gold}
              stroke={colors.surface}
              strokeWidth={2}
              onPress={() => onJobPress?.(p.job)}
            />
            <SvgText
              x={PAD + p.x * w}
              y={PAD + p.y * h - PIN_R - 3}
              fontSize={8}
              fontFamily={fontFamily.sansSemiBold[0]}
              fontWeight="600"
              fill={colors.textSecondary}
              textAnchor="middle"
            >
              {formatNpr(p.job.payout)}
            </SvgText>
          </G>
        ))}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
})
