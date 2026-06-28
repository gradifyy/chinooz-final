import React, { useMemo } from 'react'
import { StyleSheet, View, Text, AccessibilityInfo } from 'react-native'
import Svg, { Polygon, Circle, G, Text as SvgText, Defs, ClipPath } from 'react-native-svg'
import { colors, radii, fontFamily } from '@chinooz/theme'
import {
  VALLEY_BOUNDARY,
  RIDER_LOCATION,
  type DemandZone,
  type SurgeZone,
  type GeoPoint,
  type DemandLevel,
} from '@chinooz/mock-data'

/**
 * RD1 — Demand heatmap map.
 *
 * Renders the RS3 Kathmandu Valley boundary as a clipped SVG, with demand
 * heat shading per zone, the rider's current location marker, and an optional
 * surge overlay (RI5). All rendering is SVG so no map tiles are fetched —
 * light on battery and data.
 *
 * The map is not the only way in: the parent also renders a ranked list of
 * zones by demand (see HotspotsScreen). This component exposes an
 * `onZonePress` callback so tapping a zone opens the RD2 detail sheet.
 */

interface DemandHeatmapProps {
  zones: DemandZone[]
  surgeZones: SurgeZone[]
  showSurge: boolean
  onZonePress: (zone: DemandZone) => void
  /** Accessibility summary for screen readers (the map itself is non-text). */
  accessibilitySummary: string
  /** i18n strings so the map stays locale-aware without prop-drilling labels. */
  labels: {
    riderMarkerAria: string
    surgeZoneLabel: string
    zoneTapAria: (z: DemandZone) => string
    levelLabel: (level: DemandLevel) => string
    requestsLabel: (count: number) => string
    etaLabel: (eta: number) => string
  }
  /** SVG canvas size in px (the parent controls layout). */
  width: number
  height: number
  /** Optional selected zone id to highlight. */
  selectedZoneId?: string | null
}

/** Heat fill per demand level — on-brand, tasteful, not garish. */
const HEAT_FILL: Record<DemandLevel, string> = {
  low: '#F8EAF1', // primary50 — calm
  medium: '#E0A93B', // gold
  high: '#B23C7E', // primaryLight
  very_high: '#8A1B57', // primary
}

/** Heat fill opacity — kept modest so the map stays light + readable. */
const HEAT_OPACITY: Record<DemandLevel, number> = {
  low: 0.55,
  medium: 0.45,
  high: 0.55,
  very_high: 0.7,
}

const SURGE_STROKE = colors.gold
const SURGE_FILL = 'rgba(224, 169, 59, 0.18)'

/**
 * Project lat/lng to SVG x/y. Uses the bounding box of the valley boundary
 * so the map always frames the full RS3 region. A small padding keeps the
 * boundary off the edges.
 */
function useProjection(width: number, height: number) {
  return useMemo(() => {
    const pts = VALLEY_BOUNDARY
    const lats = pts.map(p => p.lat)
    const lngs = pts.map(p => p.lng)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const pad = 18
    const w = width - pad * 2
    const h = height - pad * 2
    const latSpan = maxLat - minLat || 1
    const lngSpan = maxLng - minLng || 1
    // Fit by the smaller axis so the valley isn't stretched.
    const scale = Math.min(w / lngSpan, h / latSpan)
    const offsetX = pad + (w - lngSpan * scale) / 2
    const offsetY = pad + (h - latSpan * scale) / 2

    const project = (p: GeoPoint) => {
      // lng → x, lat → y (invert lat because SVG y grows downward).
      const x = offsetX + (p.lng - minLng) * scale
      const y = offsetY + (maxLat - p.lat) * scale
      return { x, y }
    }
    return { project }
  }, [width, height])
}

function polygonPoints(points: GeoPoint[], project: (p: GeoPoint) => { x: number; y: number }): string {
  return points
    .map(p => {
      const { x, y } = project(p)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export default function DemandHeatmap({
  zones,
  surgeZones,
  showSurge,
  onZonePress,
  accessibilitySummary,
  labels,
  width,
  height,
  selectedZoneId,
}: DemandHeatmapProps) {
  const { project } = useProjection(width, height)

  const boundaryPoints = useMemo(
    () => polygonPoints(VALLEY_BOUNDARY, project),
    [project],
  )

  const rider = useMemo(() => project(RIDER_LOCATION), [project])

  // Surge lookup by zone id for the overlay.
  const surgeByZone = useMemo(() => {
    const m = new Map<string, SurgeZone>()
    for (const s of surgeZones) m.set(s.zoneId, s)
    return m
  }, [surgeZones])

  // Sort zones low → high so hotter zones paint on top (z-order within SVG).
  const sortedZones = useMemo(
    () => [...zones].sort((a, b) => a.demand - b.demand),
    [zones],
  )

  const handleZonePress = (zone: DemandZone) => {
    try {
      AccessibilityInfo.announceForAccessibility(labels.zoneTapAria(zone))
    } catch {}
    onZonePress(zone)
  }

  return (
    <View
      style={styles.wrap}
      accessibilityRole="image"
      accessibilityLabel={accessibilitySummary}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <ClipPath id="valley-clip">
            <Polygon points={boundaryPoints} />
          </ClipPath>
        </Defs>

        {/* Valley backdrop (clipped) */}
        <Polygon
          points={boundaryPoints}
          fill={colors.surface}
          stroke={colors.border}
          strokeWidth={1.5}
        />

        {/* Heat shading + zone tappable polygons (clipped to the valley) */}
        <G clipPath="url(#valley-clip)">
          {sortedZones.map(zone => {
            const isSurging = showSurge && surgeByZone.has(zone.id)
            const isSelected = selectedZoneId === zone.id
            const surge = isSurging ? surgeByZone.get(zone.id) : undefined
            return (
              <Polygon
                key={zone.id}
                points={polygonPoints(zone.polygon, project)}
                fill={surge ? SURGE_FILL : HEAT_FILL[zone.level]}
                fillOpacity={surge ? 1 : HEAT_OPACITY[zone.level]}
                stroke={isSurging ? SURGE_STROKE : isSelected ? colors.primary : 'rgba(255,255,255,0.5)'}
                strokeWidth={isSurging ? 2 : isSelected ? 2.5 : 1}
                strokeDasharray={isSurging ? '4 3' : undefined}
                onPress={() => handleZonePress(zone)}
                accessible
                accessibilityLabel={labels.zoneTapAria(zone)}
              />
            )
          })}
        </G>

        {/* Zone labels (centroids) — keep them legible, not noisy */}
        {zones.map(zone => {
          const c = project(zone.center)
          const isHot = zone.level === 'high' || zone.level === 'very_high'
          return (
            <G key={`label-${zone.id}`} pointerEvents="none">
              <SvgText
                x={c.x}
                y={c.y}
                fontSize={10}
                fontFamily={fontFamily.sansSemiBold[0]}
                fontWeight="600"
                fill={isHot ? colors.white : colors.textSecondary}
                textAnchor="middle"
                stroke={isHot ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.85)'}
                strokeWidth={isHot ? 0 : 2.5}
                paintOrder="stroke"
              >
                {zone.name}
              </SvgText>
            </G>
          )
        })}

        {/* Rider marker — distinct, pulsing-free (battery conscious) */}
        <G pointerEvents="none">
          <Circle cx={rider.x} cy={rider.y} r={11} fill={colors.success} fillOpacity={0.18} />
          <Circle
            cx={rider.x}
            cy={rider.y}
            r={6}
            fill={colors.success}
            stroke={colors.white}
            strokeWidth={2}
          />
        </G>
      </Svg>

      {/* Hidden text for the rider marker a11y (SVG text isn't reliably announced) */}
      <Text style={styles.hiddenA11y} accessibilityLabel={labels.riderMarkerAria}>
        {labels.riderMarkerAria}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  hiddenA11y: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
})
