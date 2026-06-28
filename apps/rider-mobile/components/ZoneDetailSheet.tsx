import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Zap, Clock, TrendingUp, Package, ChevronRight } from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize } from '@chinooz/theme'
import {
  type DemandZone,
  type SurgeZone,
  type GeoPoint,
  getZoneRecommendations,
} from '@chinooz/mock-data'

/**
 * RD2 — Zone detail sheet content.
 * RD3 — Recommendations slot.
 *
 * This is the content that slots into the bottom sheet on the hotspots
 * screen. It renders the selected zone's demand/requests/ETA/earnings +
 * surge status (RD2), then a short ranked list of recommended zones (RD3).
 *
 * The sheet chrome itself is provided by the parent (HotspotsScreen) so this
 * component stays focused on content.
 */

interface ZoneDetailSheetProps {
  zone: DemandZone
  surge?: SurgeZone
  allZones: DemandZone[]
  riderLocation?: GeoPoint
  /** CTA to view jobs in this zone (navigates to Jobs/Available). */
  onSeeJobs?: (zone: DemandZone) => void
  onRecommendationPress?: (zone: DemandZone) => void
  /** i18n helpers (kept explicit so the sheet is locale-aware). */
  labels: {
    demand: string
    demandValue: (d: number) => string
    requests: string
    requestsValue: (n: number) => string
    eta: string
    etaValue: (e: number) => string
    earnings: string
    earningsValue: (m: number) => string
    surge: string
    surgeValue: (m: number, minutes: number) => string
    surgeNone: string
    recommendTitle: string
    recommendSub: string
    recommendRow: (name: string, reason: string) => string
    recommendRowAria: (name: string, reason: string) => string
    seeJobs: string
    seeJobsAria: (name: string) => string
    levelLabel: (level: DemandZone['level']) => string
  }
}

export default function ZoneDetailSheet({
  zone,
  surge,
  allZones,
  riderLocation,
  onSeeJobs,
  onRecommendationPress,
  labels,
}: ZoneDetailSheetProps) {
  const recommendations = useMemo(
    () => getZoneRecommendations(allZones, { riderLocation, limit: 3 }),
    [allZones, riderLocation],
  )

  const surgeMinutesLeft = surge
    ? Math.max(0, Math.round((surge.endsAt - Date.now()) / 60_000))
    : 0

  return (
    <View style={styles.body}>
      {/* Zone header */}
      <View style={styles.zoneHeader}>
        <View>
          <Text style={styles.zoneName}>{zone.name}</Text>
          <Text style={styles.zoneLevel}>{labels.levelLabel(zone.level)}</Text>
        </View>
        {surge ? (
          <View style={styles.surgePill} testID="zone-surge-pill">
            <Zap size={13} color={colors.gold} />
            <Text style={styles.surgePillText}>
              {labels.surgeValue(surge.multiplier, surgeMinutesLeft)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* RD2 — metrics grid */}
      <View style={styles.metrics}>
        <Metric
          icon={<TrendingUp size={16} color={colors.primary} />}
          label={labels.demand}
          value={labels.demandValue(zone.demand)}
        />
        <Metric
          icon={<Package size={16} color={colors.info} />}
          label={labels.requests}
          value={labels.requestsValue(zone.openRequests)}
        />
        <Metric
          icon={<Clock size={16} color={colors.textMuted} />}
          label={labels.eta}
          value={labels.etaValue(zone.avgPickupEtaMin)}
        />
        <Metric
          icon={<Zap size={16} color={colors.gold} />}
          label={labels.earnings}
          value={labels.earningsValue(zone.earningsBoost)}
        />
      </View>

      {/* Surge row (only if not shown as a pill) */}
      {!surge ? (
        <Text style={styles.surgeNone}>{labels.surgeNone}</Text>
      ) : null}

      {/* RD3 — recommendations */}
      <View style={styles.recommend}>
        <Text style={styles.recommendTitle}>{labels.recommendTitle}</Text>
        <Text style={styles.recommendSub}>{labels.recommendSub}</Text>
        {recommendations.map(({ zone: rec, reason }) => (
          <TouchableOpacity
            key={rec.id}
            accessibilityRole="button"
            accessibilityLabel={labels.recommendRowAria(rec.name, reason)}
            onPress={() => onRecommendationPress?.(rec)}
            style={styles.recommendRow}
          >
            <View style={styles.recommendDot} />
            <View style={styles.recommendBody}>
              <Text style={styles.recommendName}>{rec.name}</Text>
              <Text style={styles.recommendReason}>{reason}</Text>
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
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    gap: spacing[4],
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  zoneName: {
    fontSize: fontSize.xl[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  zoneLevel: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  surgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  surgePillText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.gold,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  metric: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[1],
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  surgeNone: {
    fontSize: fontSize.sm[0],
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },
  recommend: {
    gap: spacing[2],
  },
  recommendTitle: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  recommendSub: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
  },
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
  recommendDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  recommendBody: {
    flex: 1,
    gap: 2,
  },
  recommendName: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  recommendReason: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
  },
  seeJobsBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  seeJobsText: {
    color: colors.white,
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
  },
})
