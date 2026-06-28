import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import {
  Zap,
  Clock,
  TrendingUp,
  Package,
  ChevronRight,
  Navigation,
  MapPin,
  Info,
  Sun,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize } from '@chinooz/theme'
import {
  type DemandZone,
  type SurgeZone,
  type GeoPoint,
  type DemandLevel,
  distanceKm,
  getZoneRecommendations,
} from '@chinooz/mock-data'

/**
 * RD2 — Zone detail sheet content (decision-ready).
 * RD3 — Recommendations slot.
 *
 * Slots into the bottom sheet on the hotspots screen. Renders the selected
 * zone's name/area, demand level (labeled, not color-only), active orders +
 * est. wait, distance from the rider, surge/bonus (RI5 tie-in), a short
 * why-hint + best-time note, and one-thumb Navigate + go-online actions.
 *
 * The sheet chrome is provided by the parent (HotspotsScreen) so this
 * component stays focused on content.
 */

interface ZoneDetailSheetProps {
  zone: DemandZone
  surge?: SurgeZone
  allZones: DemandZone[]
  riderLocation?: GeoPoint
  /** Whether the rider is already online (controls go-online CTA state). */
  isOnline?: boolean
  /** CTA to open maps directions to the zone (maps handoff). */
  onNavigate?: (zone: DemandZone) => void
  /** CTA to go online (sets rider status to online). */
  onGoOnline?: (zone: DemandZone) => void
  /** CTA to view jobs in this zone (navigates to Jobs/Available). */
  onSeeJobs?: (zone: DemandZone) => void
  onRecommendationPress?: (zone: DemandZone) => void
  /** i18n helpers (kept explicit so the sheet is locale-aware). */
  labels: {
    area: string
    demand: string
    demandValue: (d: number) => string
    activeOrders: string
    activeOrdersValue: (n: number) => string
    estWait: string
    estWaitValue: (e: number) => string
    distance: string
    distanceValue: (km: number) => string
    earnings: string
    earningsValue: (m: number) => string
    surge: string
    surgeValue: (m: number, minutes: number) => string
    surgeNone: string
    whyHint: string
    bestTime: string
    bestTimeValue: (time: string) => string
    navigate: string
    navigateAria: (name: string) => string
    goOnline: string
    goOnlineAria: (name: string) => string
    goOnlineDone: (name: string) => string
    recommendTitle: string
    recommendSub: string
    recommendRowAria: (name: string, reason: string) => string
    seeJobs: string
    seeJobsAria: (name: string) => string
    levelLabel: (level: DemandLevel) => string
    ariaSummary: (p: {
      name: string
      area: string
      demand: number
      level: string
      distance: string
      orders: string
      eta: string
      surge: string
      whyHint: string
      bestTime: string
    }) => string
  }
}

/** Demand level accent color (labeled, not color-only). */
const LEVEL_ACCENT: Record<DemandLevel, string> = {
  low: colors.textTertiary,
  medium: colors.gold,
  high: colors.primaryLight,
  very_high: colors.primary,
}

export default function ZoneDetailSheet({
  zone,
  surge,
  allZones,
  riderLocation,
  isOnline = false,
  onNavigate,
  onGoOnline,
  onSeeJobs,
  onRecommendationPress,
  labels,
}: ZoneDetailSheetProps) {
  const recommendations = useMemo(
    () => getZoneRecommendations(allZones, { riderLocation, limit: 3 }),
    [allZones, riderLocation],
  )

  const distKm = useMemo(
    () => (riderLocation ? distanceKm(riderLocation, zone.center) : 0),
    [riderLocation, zone.center],
  )

  const surgeMinutesLeft = surge
    ? Math.max(0, Math.round((surge.endsAt - Date.now()) / 60_000))
    : 0

  const levelText = labels.levelLabel(zone.level)
  const accent = LEVEL_ACCENT[zone.level]

  return (
    <View style={styles.body}>
      {/* Zone header: name + area + demand level (labeled) */}
      <View style={styles.zoneHeader}>
        <View style={styles.zoneTitleWrap}>
          <Text style={styles.zoneName}>{zone.name}</Text>
          <View style={styles.zoneMeta}>
            <MapPin size={12} color={colors.textTertiary} />
            <Text style={styles.zoneArea}>{labels.area}</Text>
          </View>
        </View>
        <View style={[styles.levelPill, { borderColor: accent }]}>
          <View style={[styles.levelDot, { backgroundColor: accent }]} />
          <Text style={[styles.levelText, { color: accent }]}>{levelText}</Text>
        </View>
      </View>

      {/* Focus row: demand + distance (the decision focus) */}
      <View style={styles.focusRow}>
        <View style={styles.focusCell}>
          <View style={styles.focusIcon}>
            <TrendingUp size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.focusLabel}>{labels.demand}</Text>
            <Text style={styles.focusValue}>{labels.demandValue(zone.demand)}</Text>
          </View>
        </View>
        <View style={styles.focusDivider} />
        <View style={styles.focusCell}>
          <View style={styles.focusIcon}>
            <Navigation size={18} color={colors.info} />
          </View>
          <View>
            <Text style={styles.focusLabel}>{labels.distance}</Text>
            <Text style={styles.focusValue}>{labels.distanceValue(distKm)}</Text>
          </View>
        </View>
      </View>

      {/* Secondary metrics: active orders + est. wait + earnings boost */}
      <View style={styles.metrics}>
        <Metric
          icon={<Package size={15} color={colors.info} />}
          label={labels.activeOrders}
          value={labels.activeOrdersValue(zone.openRequests)}
        />
        <Metric
          icon={<Clock size={15} color={colors.textMuted} />}
          label={labels.estWait}
          value={labels.estWaitValue(zone.avgPickupEtaMin)}
        />
        <Metric
          icon={<Zap size={15} color={colors.gold} />}
          label={labels.earnings}
          value={labels.earningsValue(zone.earningsBoost)}
        />
      </View>

      {/* Surge tie-in (RI5) */}
      <View style={[styles.surgeRow, surge ? styles.surgeRowActive : null]}>
        <View style={styles.surgeRowLeft}>
          <Zap
            size={15}
            color={surge ? colors.gold : colors.textTertiary}
            fill={surge ? colors.gold : 'transparent'}
          />
          <Text style={[styles.surgeRowLabel, surge ? styles.surgeRowLabelActive : null]}>
            {surge ? labels.surgeValue(surge.multiplier, surgeMinutesLeft) : labels.surgeNone}
          </Text>
        </View>
      </View>

      {/* Why-hint + best-time note */}
      <View style={styles.hints}>
        <View style={styles.hintRow}>
          <Info size={14} color={colors.textMuted} />
          <View style={styles.hintBody}>
            <Text style={styles.hintLabel}>{labels.whyHint}</Text>
            <Text style={styles.hintText}>{zone.whyHint}</Text>
          </View>
        </View>
        <View style={styles.hintRow}>
          <Sun size={14} color={colors.gold} />
          <View style={styles.hintBody}>
            <Text style={styles.hintLabel}>{labels.bestTime}</Text>
            <Text style={styles.hintText}>{labels.bestTimeValue(zone.bestTime)}</Text>
          </View>
        </View>
      </View>

      {/* One-thumb actions: Navigate + go-online */}
      <View style={styles.actions}>
        {onNavigate ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={labels.navigateAria(zone.name)}
            onPress={() => onNavigate(zone)}
            style={styles.navigateBtn}
          >
            <Navigation size={18} color={colors.white} />
            <Text style={styles.navigateText}>{labels.navigate}</Text>
          </TouchableOpacity>
        ) : null}
        {onGoOnline ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={labels.goOnlineAria(zone.name)}
            onPress={() => onGoOnline(zone)}
            style={[
              styles.goOnlineBtn,
              isOnline && styles.goOnlineBtnDone,
            ]}
            disabled={isOnline}
          >
            <Zap size={18} color={isOnline ? colors.success : colors.primary} />
            <Text style={[styles.goOnlineText, isOnline && styles.goOnlineTextDone]}>
              {isOnline ? labels.goOnlineDone(zone.name) : labels.goOnline}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* RD3 — recommendations */}
      <View style={styles.recommend}>
        <Text style={styles.recommendTitle}>{labels.recommendTitle}</Text>
        <Text style={styles.recommendSub}>{labels.recommendSub}</Text>
        {recommendations.map(({ zone: rec }) => (
          <TouchableOpacity
            key={rec.id}
            accessibilityRole="button"
            accessibilityLabel={labels.recommendRowAria(rec.name, rec.whyHint)}
            onPress={() => onRecommendationPress?.(rec)}
            style={styles.recommendRow}
          >
            <View style={[styles.recommendDot, { backgroundColor: LEVEL_ACCENT[rec.level] }]} />
            <View style={styles.recommendBody}>
              <Text style={styles.recommendName}>{rec.name}</Text>
              <Text style={styles.recommendReason}>{rec.whyHint}</Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* See jobs CTA */}
      {onSeeJobs ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={labels.seeJobsAria(zone.name)}
          onPress={() => onSeeJobs(zone)}
          style={styles.seeJobsBtn}
        >
          <Text style={styles.seeJobsText}>{labels.seeJobs}</Text>
          <ChevronRight size={18} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricIconRow}>
        {icon}
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    gap: spacing[3.5],
  },
  // Zone header
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  zoneTitleWrap: { flex: 1, gap: 4 },
  zoneName: {
    fontSize: fontSize.xl[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  zoneMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  zoneArea: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  levelDot: { width: 8, height: 8, borderRadius: radii.full },
  levelText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  // Focus row: demand + distance
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  focusCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
  },
  focusIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusLabel: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  focusValue: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  focusDivider: { width: 1, height: 32, backgroundColor: colors.borderLight },
  // Secondary metrics
  metrics: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  metric: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    gap: spacing[1],
  },
  metricIconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  metricLabel: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  metricValue: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  // Surge row
  surgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  surgeRowActive: {
    backgroundColor: colors.warningLight,
    borderColor: colors.gold,
  },
  surgeRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  surgeRowLabel: {
    fontSize: fontSize.base[0],
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },
  surgeRowLabelActive: {
    color: colors.gold,
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
  },
  // Why-hint + best-time
  hints: { gap: spacing[2] },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  hintBody: { flex: 1, gap: 2 },
  hintLabel: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
  },
  hintText: {
    fontSize: fontSize.base[0],
    color: colors.text,
    fontFamily: fontFamily.sans[0],
  },
  // Actions
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  navigateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing[3],
    minHeight: 52,
  },
  navigateText: {
    color: colors.white,
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
  },
  goOnlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    paddingVertical: spacing[3],
    borderWidth: 1.5,
    borderColor: colors.primary,
    minHeight: 52,
  },
  goOnlineBtnDone: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  goOnlineText: {
    color: colors.primary,
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
  },
  goOnlineTextDone: { color: colors.success },
  // Recommendations
  recommend: { gap: spacing[2] },
  recommendTitle: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  recommendSub: { fontSize: fontSize.sm[0], color: colors.textMuted },
  recommendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 48,
  },
  recommendDot: { width: 8, height: 8, borderRadius: radii.full },
  recommendBody: { flex: 1, gap: 2 },
  recommendName: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  recommendReason: { fontSize: fontSize.sm[0], color: colors.textMuted },
  // See jobs
  seeJobsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
  },
  seeJobsText: {
    color: colors.primary,
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
  },
})
