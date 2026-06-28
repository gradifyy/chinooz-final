import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
  AccessibilityInfo,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  LocateFixed,
  Plus,
  Minus,
  Zap,
  Flame,
  ListOrdered,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { BottomSheet } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import {
  getDemandZones,
  getSurgeZones,
  RIDER_LOCATION,
  type DemandZone,
  type SurgeZone,
  type DemandLevel,
} from '@chinooz/mock-data'
import { useA11y } from '../components/A11yProvider'
import { useAppState } from '../components/AppStateProvider'
import DemandHeatmap from '../components/DemandHeatmap'
import ZoneDetailSheet from '../components/ZoneDetailSheet'

/**
 * RD1 — Demand / Hotspots heatmap.
 *
 * Reachable from Home/Jobs (not a bottom tab). Renders a full map (RS3
 * boundary) with low→high demand heat shading over Kathmandu Valley zones,
 * the rider's current location marker, a simple intensity legend (labels,
 * not color-only), a surge-overlay toggle (shares RI5 surge data), and
 * recenter + zoom as floating controls. A bottom slot hosts the zone detail
 * sheet (RD2) + recommendations (RD3).
 *
 * Accessibility:
 *  - The map is not the only way in: a ranked list of zones by demand is
 *    rendered below the map (same data, high → low).
 *  - The map has an accessible summary (a11y label) describing zone count +
 *    the hottest zone.
 *  - The legend is labeled (Low/Medium/High/Very high), not color-only.
 *  - Recenter + surge toggle have aria-labels + state.
 *
 * Battery/data conscious:
 *  - The map is SVG (no map tiles fetched), so rendering stays light.
 *  - Zoom is a simple CSS scale on the SVG container (no tile fetch).
 *  - No timers/polling: data is fetched once on mount + on pull-to-refresh.
 */
export default function HotspotsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { reducedMotion } = useA11y()
  const { isForeground } = useAppState()

  const [zones, setZones] = useState<DemandZone[]>([])
  const [surgeZones, setSurgeZones] = useState<SurgeZone[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showSurge, setShowSurge] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [selectedZone, setSelectedZone] = useState<DemandZone | null>(null)
  const [sheetVisible, setSheetVisible] = useState(false)

  const screenW = Dimensions.get('window').width
  const mapW = screenW - spacing[4] * 2
  const mapH = Math.min(Dimensions.get('window').height * 0.46, 360)

  useEffect(() => {
    analytics.screen({ name: 'rider-hotspots' })
  }, [])

  const load = useCallback(() => {
    const z = getDemandZones({ now: Date.now() })
    const s = getSurgeZones({ now: Date.now() })
    setZones(z)
    setSurgeZones(s)
  }, [])

  useEffect(() => {
    // Lightweight: one fetch on mount. No polling.
    load()
    setLoading(false)
  }, [load])

  // Pause nothing extra on background — there's no polling here, but we keep
  // the hook read so the screen stays consistent with the app-wide policy.
  void isForeground

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    AccessibilityInfo.announceForAccessibility(t('rider.hotspots.loading'))
    load()
    setTimeout(() => {
      setRefreshing(false)
    }, 500)
  }, [load, t])

  const handleZonePress = useCallback(
    (zone: DemandZone) => {
      try {
        if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
      setSelectedZone(zone)
      setSheetVisible(true)
    },
    [reducedMotion],
  )

  const handleCloseSheet = useCallback(() => {
    setSheetVisible(false)
  }, [])

  const handleRecenter = useCallback(() => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    setZoom(1)
    AccessibilityInfo.announceForAccessibility(t('rider.hotspots.recenter'))
  }, [reducedMotion, t])

  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(2.2, +(z + 0.3).toFixed(2)))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(0.7, +(z - 0.3).toFixed(2)))
  }, [])

  const handleSurgeToggle = useCallback(() => {
    setShowSurge(prev => {
      const next = !prev
      try {
        if (!reducedMotion) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }
      } catch {}
      AccessibilityInfo.announceForAccessibility(
        next ? t('rider.hotspots.surgeToggleOn') : t('rider.hotspots.surgeToggleOff'),
      )
      return next
    })
  }, [reducedMotion, t])

  const handleSeeJobs = useCallback(
    (zone: DemandZone) => {
      setSheetVisible(false)
      // Jobs is the host screen; route there with the zone name as a hint.
      // expo-router query params keep it stateless.
      router.push({ pathname: '/jobs', params: { zone: zone.id } })
    },
    [router],
  )

  const selectedSurge = useMemo(
    () => (selectedZone ? surgeZones.find(s => s.zoneId === selectedZone.id) : undefined),
    [selectedZone, surgeZones],
  )

  // Heat legend items (labeled, not color-only).
  const legendItems: { level: DemandLevel; labelKey: string; fill: string }[] = [
    { level: 'low', labelKey: 'rider.hotspots.legendLow', fill: '#F8EAF1' },
    { level: 'medium', labelKey: 'rider.hotspots.legendMedium', fill: '#E0A93B' },
    { level: 'high', labelKey: 'rider.hotspots.legendHigh', fill: '#B23C7E' },
    { level: 'very_high', labelKey: 'rider.hotspots.legendVeryHigh', fill: '#8A1B57' },
  ]

  const mapLabels = useMemo(
    () => ({
      riderMarkerAria: t('rider.hotspots.riderMarkerAria'),
      surgeZoneLabel: t('rider.hotspots.surgeZoneLabel'),
      zoneTapAria: (z: DemandZone) =>
        t('rider.hotspots.zoneTapAria', {
          name: z.name,
          demand: z.demand,
          level: t(`rider.hotspots.level${z.level.charAt(0).toUpperCase()}${z.level.slice(1)}` as never),
          requests: t('rider.hotspots.requestsCount', { count: z.openRequests }),
          eta: z.avgPickupEtaMin,
        }),
      levelLabel: (level: DemandLevel) =>
        t(`rider.hotspots.level${level.charAt(0).toUpperCase()}${level.slice(1)}` as never),
      requestsLabel: (count: number) => t('rider.hotspots.requestsCount', { count }),
      etaLabel: (eta: number) => t('rider.hotspots.etaMin', { eta }),
    }),
    [t],
  )

  const sheetLabels = useMemo(
    () => ({
      demand: t('rider.hotspots.sheetDemand'),
      demandValue: (d: number) => t('rider.hotspots.sheetDemandValue', { demand: d }),
      requests: t('rider.hotspots.sheetRequests'),
      requestsValue: (n: number) => t('rider.hotspots.requestsCount', { count: n }),
      eta: t('rider.hotspots.sheetEta'),
      etaValue: (e: number) => t('rider.hotspots.sheetEtaValue', { eta: e }),
      earnings: t('rider.hotspots.sheetEarnings'),
      earningsValue: (m: number) => t('rider.hotspots.sheetEarningsValue', { mult: m }),
      surge: t('rider.hotspots.sheetSurge'),
      surgeValue: (m: number, minutes: number) =>
        t('rider.hotspots.sheetSurgeValue', { mult: m, minutes }),
      surgeNone: t('rider.hotspots.sheetSurgeNone'),
      recommendTitle: t('rider.hotspots.sheetRecommendTitle'),
      recommendSub: t('rider.hotspots.sheetRecommendSub'),
      recommendRow: (name: string, reason: string) =>
        t('rider.hotspots.sheetRecommendRow', { name, reason }),
      recommendRowAria: (name: string, reason: string) =>
        t('rider.hotspots.sheetRecommendRowAria', { name, reason }),
      seeJobs: t('rider.hotspots.sheetOpenJobs'),
      seeJobsAria: (name: string) => t('rider.hotspots.sheetOpenJobsAria', { name }),
      levelLabel: (level: DemandLevel) =>
        t(`rider.hotspots.level${level.charAt(0).toUpperCase()}${level.slice(1)}` as never),
    }),
    [t],
  )

  const topZone = zones[0]
  const mapAria = topZone
    ? t('rider.hotspots.mapAria', {
        count: zones.length,
        topZone: topZone.name,
        topDemand: topZone.demand,
      })
    : t('rider.hotspots.mapSummary', { count: zones.length })

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[3] }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('rider.hotspots.back')}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('rider.hotspots.title')}
          </Text>
          <Text style={styles.subtitle}>{t('rider.hotspots.subtitle')}</Text>
        </View>
        {/* Surge toggle */}
        <TouchableOpacity
          accessibilityRole="switch"
          accessibilityLabel={t('rider.hotspots.surgeToggleAria')}
          accessibilityState={{ checked: showSurge }}
          accessibilityValue={{ text: showSurge ? t('rider.hotspots.surgeToggleOn') : t('rider.hotspots.surgeToggleOff') }}
          onPress={handleSurgeToggle}
          style={[styles.surgeToggle, showSurge && styles.surgeToggleOn]}
          testID="hotspots-surge-toggle"
        >
          <Zap
            size={15}
            color={showSurge ? colors.white : colors.gold}
            fill={showSurge ? colors.white : 'transparent'}
          />
          <Text style={[styles.surgeToggleText, showSurge && styles.surgeToggleTextOn]}>
            {t('rider.hotspots.surgeToggle')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing[6] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Map */}
        <View style={styles.mapWrap}>
          <View
            style={{
              width: mapW,
              height: mapH,
              transform: [{ scale: zoom }],
              alignSelf: 'center',
            }}
          >
            <DemandHeatmap
              zones={zones}
              surgeZones={surgeZones}
              showSurge={showSurge}
              onZonePress={handleZonePress}
              accessibilitySummary={mapAria}
              labels={mapLabels}
              width={mapW}
              height={mapH}
              selectedZoneId={selectedZone?.id}
            />
          </View>

          {/* Floating controls: recenter + zoom (e2) */}
          <View style={[styles.floatingControls, { top: spacing[2], right: spacing[2] }]}>
            <FloatingBtn
              ariaLabel={t('rider.hotspots.zoomInAria')}
              onPress={handleZoomIn}
              testID="hotspots-zoom-in"
            >
              <Plus size={20} color={colors.text} />
            </FloatingBtn>
            <FloatingBtn
              ariaLabel={t('rider.hotspots.zoomOutAria')}
              onPress={handleZoomOut}
              testID="hotspots-zoom-out"
            >
              <Minus size={20} color={colors.text} />
            </FloatingBtn>
            <FloatingBtn
              ariaLabel={t('rider.hotspots.recenterAria')}
              onPress={handleRecenter}
              testID="hotspots-recenter"
              highlight
            >
              <LocateFixed size={20} color={colors.primary} />
            </FloatingBtn>
          </View>

          {/* Legend (labeled, not color-only) */}
          <View
            style={styles.legend}
            accessibilityRole="summary"
            accessibilityLabel={t('rider.hotspots.legendAria')}
          >
            <View style={styles.legendHeader}>
              <Flame size={13} color={colors.primary} />
              <Text style={styles.legendTitle}>{t('rider.hotspots.legendTitle')}</Text>
            </View>
            <View style={styles.legendRow}>
              {legendItems.map(item => (
                <View key={item.level} style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: item.fill }]} />
                  <Text style={styles.legendLabel}>{t(item.labelKey)}</Text>
                </View>
              ))}
            </View>
            {showSurge && surgeZones.length > 0 ? (
              <View style={styles.legendSurge}>
                <View style={styles.legendSurgeSwatch} />
                <Text style={styles.legendSurgeLabel}>
                  {t('rider.hotspots.surgePill', { mult: surgeZones[0].multiplier })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Ranked fallback list (the map is not the only way in) */}
        <View
          style={styles.rankedSection}
          accessibilityRole="summary"
          accessibilityLabel={t('rider.hotspots.rankedListTitle')}
        >
          <View style={styles.rankedHeader}>
            <ListOrdered size={16} color={colors.primary} />
            <View style={styles.rankedHeaderText}>
              <Text style={styles.rankedTitle}>{t('rider.hotspots.rankedListTitle')}</Text>
              <Text style={styles.rankedSub}>{t('rider.hotspots.rankedListSub')}</Text>
            </View>
          </View>
          {zones.map((zone, idx) => (
            <TouchableOpacity
              key={zone.id}
              accessibilityRole="button"
              accessibilityLabel={t('rider.hotspots.rankedRowAria', {
                rank: idx + 1,
                name: zone.name,
                demand: zone.demand,
                level: mapLabels.levelLabel(zone.level),
                requests: zone.openRequests,
              })}
              onPress={() => handleZonePress(zone)}
              style={styles.rankedRow}
            >
              <Text style={styles.rankedRank}>{idx + 1}</Text>
              <View style={styles.rankedBody}>
                <Text style={styles.rankedName}>{zone.name}</Text>
                <Text style={styles.rankedDemand}>
                  {t('rider.hotspots.rankedRow', {
                    rank: idx + 1,
                    name: zone.name,
                    demand: zone.demand,
                  })}
                </Text>
              </View>
              <View style={styles.rankedRight}>
                <View style={[styles.rankedDot, { backgroundColor: HEAT_DOT[zone.level] }]} />
                <Text style={styles.rankedLevel}>{mapLabels.levelLabel(zone.level)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom slot: zone detail sheet (RD2) + recommendations (RD3) */}
      <BottomSheet
        visible={sheetVisible}
        onClose={handleCloseSheet}
        title={t('rider.hotspots.sheetTitle')}
        testID="hotspots-zone-sheet"
      >
        {selectedZone ? (
          <ZoneDetailSheet
            zone={selectedZone}
            surge={selectedSurge}
            allZones={zones}
            riderLocation={RIDER_LOCATION}
            onSeeJobs={handleSeeJobs}
            onRecommendationPress={z => {
              setSelectedZone(z)
            }}
            labels={sheetLabels}
          />
        ) : null}
      </BottomSheet>
    </View>
  )
}

/** Heat dot color per level (for the ranked list). */
const HEAT_DOT: Record<DemandLevel, string> = {
  low: '#F8EAF1',
  medium: '#E0A93B',
  high: '#B23C7E',
  very_high: '#8A1B57',
}

function FloatingBtn({
  children,
  ariaLabel,
  onPress,
  testID,
  highlight,
}: {
  children: React.ReactNode
  ariaLabel: string
  onPress: () => void
  testID?: string
  highlight?: boolean
}) {
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      onPress={onPress}
      style={[styles.floatingBtn, highlight && styles.floatingBtnHighlight]}
    >
      {children}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: fontSize.lg[0], fontFamily: fontFamily.sansBold[0], fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: 2 },
  surgeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.gold,
    minHeight: 44,
  },
  surgeToggleOn: {
    backgroundColor: colors.gold,
  },
  surgeToggleText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.gold,
  },
  surgeToggleTextOn: { color: colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing[4], gap: spacing[4] },
  mapWrap: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[2],
    overflow: 'hidden',
  },
  floatingControls: {
    position: 'absolute',
    gap: spacing[1.5],
  },
  floatingBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow('md'),
  },
  floatingBtnHighlight: {
    backgroundColor: colors.primary50,
  },
  legend: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    gap: spacing[2],
  },
  legendHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  legendTitle: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.textSecondary,
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2.5] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  legendLabel: {
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
  },
  legendSurge: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  legendSurgeSwatch: {
    width: 14,
    height: 14,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: 'rgba(224,169,59,0.18)',
  },
  legendSurgeLabel: {
    fontSize: fontSize.sm[0],
    color: colors.gold,
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
  },
  rankedSection: {
    gap: spacing[2],
  },
  rankedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] },
  rankedHeaderText: { gap: 2 },
  rankedTitle: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  rankedSub: { fontSize: fontSize.sm[0], color: colors.textMuted },
  rankedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 48,
  },
  rankedRank: {
    width: 24,
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  rankedBody: { flex: 1, gap: 2 },
  rankedName: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  rankedDemand: { fontSize: fontSize.sm[0], color: colors.textMuted },
  rankedRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  rankedDot: { width: 10, height: 10, borderRadius: radii.full },
  rankedLevel: {
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
})
