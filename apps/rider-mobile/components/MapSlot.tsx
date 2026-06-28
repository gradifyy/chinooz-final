import React, { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { LocateFixed, Flame, ChevronRight } from 'lucide-react-native'
import Svg, { Polygon, Circle, G, Defs, ClipPath } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  ReduceMotion,
} from 'react-native-reanimated'
import { colors, spacing, radii, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { Skeleton } from '@chinooz/ui'
import { useA11y } from './A11yProvider'
import { useOnlineStatusStore } from '@chinooz/state'
import { useDemandZones } from '@chinooz/hooks'
import {
  VALLEY_BOUNDARY,
  RIDER_LOCATION,
  type DemandZone,
  type DemandLevel,
  type GeoPoint,
} from '@chinooz/mock-data'

interface MapSlotProps {
  status: 'online' | 'offline' | 'paused'
  title: string
  offlineHint: string
  onlineHint: string
}

const SCREEN_WIDTH = Dimensions.get('window').width
const MAP_HEIGHT = 200

/** Heat fill per demand level — on-brand, subtle, not noisy. */
const HEAT_FILL: Record<DemandLevel, string> = {
  low: '#F8EAF1',
  medium: 'rgba(224, 169, 59, 0.35)',
  high: 'rgba(178, 60, 126, 0.45)',
  very_high: 'rgba(138, 27, 87, 0.55)',
}

/**
 * RH3 — Home map slot.
 *
 * A lightweight SVG mini-map centered on the rider's mock location, reusing
 * the RS3 / VALLEY_BOUNDARY projection from the Hotspots heatmap. Shows a
 * demand peek (subtle heat shading for top zones), a distinct rider marker,
 * a floating recenter button (e2 elevation), and a "See Hotspots" deep-link.
 *
 * Offline state dims the map and shows a prompt to go online.
 *
 * Battery/data-conscious: no continuous animation when idle, no map tiles
 * fetched (pure SVG), demand data via TanStack Query with the shared
 * staleTime convention.
 */
export default function MapSlot({ status, title, offlineHint, onlineHint }: MapSlotProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { minTouchTarget, reducedMotion } = useA11y()
  const setOnlineStatus = useOnlineStatusStore(s => s.setOnlineStatus)

  const demandQuery = useDemandZones()
  const zones = demandQuery.data ?? []
  const isLoading = demandQuery.isLoading
  const isError = demandQuery.isError

  const isOnline = status === 'online'

  // Card width = screen - 2*horizontal padding (spacing[5] = 20 each side).
  const cardWidth = SCREEN_WIDTH - spacing[5] * 2
  const mapWidth = cardWidth - spacing[4] * 2 // card padding

  const { project } = useProjection(mapWidth, MAP_HEIGHT)

  const boundaryPoints = useMemo(
    () => polygonPoints(VALLEY_BOUNDARY, project),
    [project],
  )

  const rider = useMemo(() => project(RIDER_LOCATION), [project])

  // Top 4 zones by demand for the peek (keep it subtle, not noisy).
  const peekZones = useMemo(() => zones.slice(0, 4), [zones])
  const sortedPeek = useMemo(
    () => [...peekZones].sort((a, b) => a.demand - b.demand),
    [peekZones],
  )

  const topZone = zones[0]

  const ariaSummary = isOnline
    ? t('rider.home.mapAriaSummary', {
        count: zones.length,
        topZone: topZone?.name ?? '—',
        topDemand: topZone?.demand ?? 0,
      })
    : t('rider.home.mapAriaOffline')

  const goHotspots = useCallback(() => router.push('/hotspots'), [router])
  const goOnline = useCallback(() => setOnlineStatus('online'), [setOnlineStatus])

  // Recenter: in the SVG mini-map this is a visual nudge (no real pan state).
  // We animate the rider marker scale briefly to confirm the action, using
  // a spring for a satisfying bounce. Reduced-motion: instant snap.
  const [recentered, setRecentered] = useState(false)
  const recenterBtnScale = useSharedValue(1)

  const handleRecenter = useCallback(() => {
    if (reducedMotion) {
      setRecentered(true)
      setTimeout(() => setRecentered(false), 200)
      return
    }
    setRecentered(true)
    recenterBtnScale.value = withSequence(
      withSpring(0.88, { damping: 15, stiffness: 300, reduceMotion: ReduceMotion.System }),
      withSpring(1, { damping: 12, stiffness: 200, reduceMotion: ReduceMotion.System }),
    )
    setTimeout(() => setRecentered(false), 600)
  }, [reducedMotion])

  const recenterBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recenterBtnScale.value }],
  }))

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.mapSkeleton}>
          <Skeleton width="100%" height={MAP_HEIGHT} borderRadius={radii.lg} />
        </View>
      </View>
    )
  }

  if (isError) {
    // Fallback to the non-map list on error.
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <FallbackList
          zones={zones}
          title={t('rider.home.mapFallbackTitle')}
          emptyText={t('rider.home.mapFallbackEmpty')}
          ariaItem={z => t('rider.home.mapZoneItemAria', { name: z.name, demand: z.demand, requests: z.openRequests, eta: z.avgPickupEtaMin })}
          onSeeHotspots={goHotspots}
          seeHotspotsLabel={t('rider.home.mapSeeHotspots')}
          seeHotspotsAria={t('rider.home.mapSeeHotspotsAria')}
          minTouchTarget={minTouchTarget}
        />
      </View>
    )
  }

  return (
    <View
      style={[styles.card, !isOnline && styles.cardOffline]}
      accessibilityRole="summary"
      accessibilityLabel={ariaSummary}
    >
      <View style={styles.header}>
        <Text style={[styles.title, !isOnline && styles.titleMuted]}>{title}</Text>
        {isOnline && topZone && (
          <View style={styles.topZoneChip}>
            <Flame size={12} color={colors.gold} />
            <Text style={styles.topZoneText} numberOfLines={1}>
              {topZone.name} · {topZone.demand}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.mapWrap}>
        <Svg width={mapWidth} height={MAP_HEIGHT} viewBox={`0 0 ${mapWidth} ${MAP_HEIGHT}`}>
          <Defs>
            <ClipPath id="home-valley-clip">
              <Polygon points={boundaryPoints} />
            </ClipPath>
          </Defs>

          {/* Valley backdrop */}
          <Polygon
            points={boundaryPoints}
            fill={isOnline ? colors.surface : colors.background}
            stroke={isOnline ? colors.border : colors.borderLight}
            strokeWidth={1.5}
          />

          {/* Demand peek shading (online only, clipped to valley) */}
          {isOnline && (
            <G clipPath="url(#home-valley-clip)">
              {sortedPeek.map(zone => (
                <Polygon
                  key={zone.id}
                  points={polygonPoints(zone.polygon, project)}
                  fill={HEAT_FILL[zone.level]}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={0.8}
                />
              ))}
            </G>
          )}

          {/* Rider marker — distinct, no pulse (battery conscious) */}
          <G pointerEvents="none">
            <Circle
              cx={rider.x}
              cy={rider.y}
              r={recentered && !reducedMotion ? 14 : 10}
              fill={isOnline ? colors.success : colors.textTertiary}
              fillOpacity={0.18}
            />
            <Circle
              cx={rider.x}
              cy={rider.y}
              r={6}
              fill={isOnline ? colors.success : colors.textTertiary}
              stroke={colors.white}
              strokeWidth={2}
            />
          </G>
        </Svg>

        {/* Offline overlay prompt */}
        {!isOnline && (
          <View style={styles.offlineOverlay} pointerEvents="none">
            <Text style={styles.offlinePrompt}>{t('rider.home.mapOfflinePrompt')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('rider.home.mapGoOnlineAria')}
              style={styles.onlinePill}
              onPress={goOnline}
            >
              <Text style={styles.onlinePillText}>{t('rider.home.mapGoOnline')}</Text>
            </Pressable>
          </View>
        )}

        {/* Recenter floating button (e2 elevation, press-scale spring) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('rider.home.mapRecenterAria')}
          onPress={handleRecenter}
        >
          <Animated.View
            style={[styles.recenterBtn, { minHeight: minTouchTarget, minWidth: minTouchTarget }, recenterBtnStyle]}
          >
            <LocateFixed size={20} color={isOnline ? colors.primary : colors.textTertiary} />
          </Animated.View>
        </Pressable>
      </View>

      {/* Footer: hint + See Hotspots link */}
      <View style={styles.footer}>
        <Text style={[styles.hint, !isOnline && styles.hintMuted]} numberOfLines={1}>
          {isOnline ? onlineHint : offlineHint}
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('rider.home.mapSeeHotspotsAria')}
          style={styles.hotspotsLink}
          onPress={goHotspots}
        >
          <Text style={styles.hotspotsLinkText}>{t('rider.home.mapSeeHotspots')}</Text>
          <ChevronRight size={16} color={colors.primary} />
        </Pressable>
      </View>

      {/* Non-map fallback list (always present for screen readers) */}
      <View style={styles.fallbackSection}>
        <Text style={styles.fallbackTitle}>{t('rider.home.mapFallbackTitle')}</Text>
        {zones.length === 0 ? (
          <Text style={styles.fallbackEmpty}>{t('rider.home.mapFallbackEmpty')}</Text>
        ) : (
          zones.slice(0, 3).map(zone => (
            <View key={zone.id} style={styles.fallbackItem} accessibilityRole="text">
              <Text
                style={styles.fallbackItemText}
                accessibilityLabel={t('rider.home.mapZoneItemAria', {
                  name: zone.name,
                  demand: zone.demand,
                  requests: zone.openRequests,
                  eta: zone.avgPickupEtaMin,
                })}
                numberOfLines={1}
              >
                {zone.name} · {zone.demand}% · {zone.openRequests} open
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Non-map fallback list
// ---------------------------------------------------------------------------

function FallbackList({
  zones,
  title,
  emptyText,
  ariaItem,
  onSeeHotspots,
  seeHotspotsLabel,
  seeHotspotsAria,
  minTouchTarget,
}: {
  zones: DemandZone[]
  title: string
  emptyText: string
  ariaItem: (z: DemandZone) => string
  onSeeHotspots: () => void
  seeHotspotsLabel: string
  seeHotspotsAria: string
  minTouchTarget: number
}) {
  return (
    <View>
      <Text style={styles.fallbackTitle}>{title}</Text>
      {zones.length === 0 ? (
        <Text style={styles.fallbackEmpty}>{emptyText}</Text>
      ) : (
        zones.slice(0, 5).map(zone => (
          <View key={zone.id} style={styles.fallbackItem} accessibilityRole="text">
            <Text
              style={styles.fallbackItemText}
              accessibilityLabel={ariaItem(zone)}
              numberOfLines={1}
            >
              {zone.name} · {zone.demand}% · {zone.openRequests} open · {zone.avgPickupEtaMin}min
            </Text>
          </View>
        ))
      )}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={seeHotspotsAria}
        style={[styles.hotspotsLink, { minHeight: minTouchTarget }]}
        onPress={onSeeHotspots}
      >
        <Text style={styles.hotspotsLinkText}>{seeHotspotsLabel}</Text>
        <ChevronRight size={16} color={colors.primary} />
      </Pressable>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Projection — reuse the VALLEY_BOUNDARY bounding box (same as DemandHeatmap)
// ---------------------------------------------------------------------------

function useProjection(width: number, height: number) {
  return useMemo(() => {
    const pts = VALLEY_BOUNDARY
    const lats = pts.map(p => p.lat)
    const lngs = pts.map(p => p.lng)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const pad = 14
    const w = width - pad * 2
    const h = height - pad * 2
    const latSpan = maxLat - minLat || 1
    const lngSpan = maxLng - minLng || 1
    const scale = Math.min(w / lngSpan, h / latSpan)
    const offsetX = pad + (w - lngSpan * scale) / 2
    const offsetY = pad + (h - latSpan * scale) / 2

    const project = (p: GeoPoint) => {
      const x = offsetX + (p.lng - minLng) * scale
      const y = offsetY + (maxLat - p.lat) * scale
      return { x, y }
    }
    return { project }
  }, [width, height])
}

function polygonPoints(
  points: GeoPoint[],
  project: (p: GeoPoint) => { x: number; y: number },
): string {
  return points
    .map(p => {
      const { x, y } = project(p)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardOffline: {
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  title: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  titleMuted: {
    color: colors.textMuted,
  },
  topZoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: 'rgba(224, 169, 59, 0.12)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  topZoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    fontFamily: fontFamily.sansSemiBold[0],
    fontVariant: ['tabular-nums'],
  },
  mapWrap: {
    position: 'relative',
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  mapSkeleton: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  offlineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  offlinePrompt: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  onlinePill: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
  },
  onlinePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  recenterBtn: {
    position: 'absolute',
    right: spacing[2],
    bottom: spacing[2],
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow('lg'),
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[3],
    gap: spacing[2],
  },
  hint: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
  },
  hintMuted: {
    color: colors.textTertiary,
  },
  hotspotsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
  },
  hotspotsLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Non-map fallback list
  fallbackSection: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  fallbackTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
    marginBottom: spacing[2],
  },
  fallbackEmpty: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },
  fallbackItem: {
    paddingVertical: spacing[1],
  },
  fallbackItemText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
    fontVariant: ['tabular-nums'],
  },
})
