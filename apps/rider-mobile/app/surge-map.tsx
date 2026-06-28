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
  type ViewStyle,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  Clock,
  TrendingUp,
  CheckCircle2,
  CircleAlert,
  ArrowRight,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useSurgeDetail, useDemandZones, useSurgeZones } from '@chinooz/hooks'
import { useOnlineStatusStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import { useA11y } from '../components/A11yProvider'
import DemandHeatmap from '../components/DemandHeatmap'
import type { DemandZone, DemandLevel } from '@chinooz/mock-data'

/**
 * RI5 — Surge / peak-pay view.
 *
 * Reuses the RS3 map boundary + DemandHeatmap from Hotspots (RD1) with the
 * surge overlay always on. Shows:
 *  - A map with surge/peak zones shaded by multiplier + active time windows.
 *  - A list of current + upcoming peak windows with bonus + countdown.
 *  - A "go online in this zone" tie-in.
 *  - A link to Hotspots (RD) for where the jobs are.
 *  - Honest surge rules (no fake urgency).
 *
 * Accessibility:
 *  - The map has an accessible summary + a fallback list of surge zones.
 *  - Bonus + countdown are announced (not color-only — multiplier/bonus labeled).
 *  - Zone tie-in + Hotspots link have aria-labels.
 *  - Not color-only: every surge zone, peak window, and bonus has a text label.
 */

/** Surge shading color by multiplier tier (clear but tasteful). */
const SURGE_SHADE: { fill: string; stroke: string; label: string }[] = [
  { fill: 'rgba(224, 169, 59, 0.12)', stroke: 'rgba(224, 169, 59, 0.5)', label: '1.2x' },
  { fill: 'rgba(224, 169, 59, 0.20)', stroke: colors.gold, label: '1.5x' },
  { fill: 'rgba(178, 60, 126, 0.25)', stroke: '#B23C7E', label: '2x' },
]

function surgeShadeIndex(mult: number): number {
  if (mult >= 1.8) return 2
  if (mult >= 1.4) return 1
  return 0
}

export default function SurgeMapScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { reducedMotion } = useA11y()

  const surgeDetailQuery = useSurgeDetail()
  const demandQuery = useDemandZones()
  const surgeZonesQuery = useSurgeZones()

  const [refreshing, setRefreshing] = useState(false)

  const status = useOnlineStatusStore(s => s.status)
  const setOnlineStatus = useOnlineStatusStore(s => s.setOnlineStatus)
  const isOnline = status === 'online'

  const detail = surgeDetailQuery.data
  const zones = demandQuery.data ?? []
  const surgeZones = surgeZonesQuery.data ?? []

  const screenW = Dimensions.get('window').width
  const mapW = screenW - spacing[4] * 2
  const mapH = Math.min(Dimensions.get('window').height * 0.42, 340)

  useEffect(() => {
    analytics.screen({ name: 'rider-surge-map' })
  }, [])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    Promise.all([
      surgeDetailQuery.refetch(),
      demandQuery.refetch(),
      surgeZonesQuery.refetch(),
    ]).finally(() => setRefreshing(false))
  }, [surgeDetailQuery, demandQuery, surgeZonesQuery])

  const handleGoOnline = useCallback(() => {
    try {
      if (!reducedMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {}
    setOnlineStatus('online')
    AccessibilityInfo.announceForAccessibility(t('rider.surge.goOnlineDone'))
    analytics.track({ name: 'rider_go_online_from_surge' })
  }, [reducedMotion, setOnlineStatus, t])

  const openHotspots = useCallback(() => {
    router.push('/hotspots')
  }, [router])

  // Map labels for DemandHeatmap (reuse the same interface).
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

  // Loading skeleton.
  if (surgeDetailQuery.isLoading || demandQuery.isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <SurgeHeader title={t('rider.surge.title')} subtitle={t('rider.surge.subtitle')} onBack={() => router.back()} backLabel={t('rider.surge.back')} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing[8] }]}
          showsVerticalScrollIndicator={false}
          accessibilityRole="progressbar"
          accessibilityLabel={t('rider.surge.skeletonAria')}
        >
          <View style={styles.skeletonBlock} />
          <View style={styles.skeletonBlock} />
          <View style={styles.skeletonBlock} />
        </ScrollView>
      </View>
    )
  }

  // Error state.
  if (surgeDetailQuery.isError || !detail) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <SurgeHeader title={t('rider.surge.title')} subtitle={t('rider.surge.subtitle')} onBack={() => router.back()} backLabel={t('rider.surge.back')} />
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>{t('rider.surge.errorTitle')}</Text>
          <Text style={styles.errorSub}>{t('rider.surge.errorSubtitle')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => surgeDetailQuery.refetch()}>
            <Text style={styles.retryText}>{t('rider.surge.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const topZone = detail.activeZones[0]
  const mapAria = topZone
    ? t('rider.surge.mapAria', {
        count: detail.activeZones.length,
        zone: topZone.zoneName,
        mult: topZone.multiplier,
      })
    : t('rider.surge.mapSummary', { count: zones.length })

  // Format countdown.
  const fmtCountdown = (minutes: number): string => {
    if (minutes <= 0) return t('rider.surge.countdownImminent')
    if (minutes <= 60) return t('rider.surge.countdownMinutes', { minutes })
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return t('rider.surge.countdownHours', { hours: h, minutes: m })
  }

  // Next peak time for idle state.
  const nextPeakTime = detail.nextPeak ? fmtCountdown(detail.nextPeak.minutesUntilStart) : ''
  const surgeIdleAria = t('rider.surge.surgeIdleAria', {
    time: nextPeakTime || t('rider.surge.peakNoUpcoming'),
  })

  // Active zones fallback list (for screen readers — the map is not the only way in).
  const activeZonesWithInfo = detail.activeZones.map(az => {
    const zone = zones.find(z => z.id === az.zoneId)
    return { ...az, zone }
  })

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SurgeHeader title={t('rider.surge.title')} subtitle={t('rider.surge.subtitle')} onBack={() => router.back()} backLabel={t('rider.surge.back')} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing[8] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Surge status banner */}
        {detail.surgeLive ? (
          <View
            style={styles.statusBannerLive}
            accessibilityRole="summary"
            accessibilityLabel={t('rider.surge.surgeLiveAria', {
              mult: detail.headlineMultiplier,
              zone: detail.headlineZoneLabel,
              minutes: detail.activeZones[0]?.minutesLeft ?? 0,
            })}
          >
            <View style={styles.statusBannerLeft}>
              <Zap size={18} color={colors.success} fill={colors.success} />
              <View>
                <Text style={styles.statusBannerTitle}>{t('rider.surge.surgeLive')}</Text>
                <Text style={styles.statusBannerSub}>
                  {t('rider.surge.surgeZoneCount', { count: detail.activeZones.length })}
                </Text>
              </View>
            </View>
            <View style={styles.statusBannerRight}>
              <Text style={styles.statusBannerMult}>
                {t('rider.surge.surgeMult', { mult: detail.headlineMultiplier })}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={styles.statusBannerIdle}
            accessibilityRole="summary"
            accessibilityLabel={surgeIdleAria}
          >
            <View style={styles.statusBannerLeft}>
              <Clock size={18} color={colors.textTertiary} />
              <View>
                <Text style={styles.statusBannerTitleIdle}>{t('rider.surge.surgeIdle')}</Text>
                <Text style={styles.statusBannerSubIdle}>
                  {nextPeakTime
                    ? t('rider.surge.peakCountdown', { time: nextPeakTime })
                    : t('rider.surge.peakNoUpcoming')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Surge map (reuses DemandHeatmap with surge overlay always on) */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading} accessibilityRole="header">
            {t('rider.surge.sectionMap')}
          </Text>
          <View style={styles.mapWrap}>
            <View style={{ width: mapW, height: mapH, alignSelf: 'center' } as ViewStyle}>
              <DemandHeatmap
                zones={zones}
                surgeZones={surgeZones}
                showSurge={true}
                onZonePress={() => {}}
                accessibilitySummary={mapAria}
                labels={mapLabels}
                width={mapW}
                height={mapH}
              />
            </View>

            {/* Surge legend (labeled, not color-only) */}
            <View style={styles.legend} accessibilityRole="summary" accessibilityLabel={t('rider.surge.mapLegendAria')}>
              <View style={styles.legendHeader}>
                <Zap size={13} color={colors.gold} />
                <Text style={styles.legendTitle}>{t('rider.surge.mapLegendTitle')}</Text>
              </View>
              <View style={styles.legendRow}>
                {SURGE_SHADE.map((s, i) => (
                  <View key={i} style={styles.legendItem}>
                    <View style={[styles.legendSwatch, { backgroundColor: s.fill, borderColor: s.stroke }]} />
                    <Text style={styles.legendLabel}>{s.label}</Text>
                  </View>
                ))}
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: 'transparent', borderColor: colors.borderLight }]} />
                  <Text style={styles.legendLabel}>{t('rider.surge.mapLegendLow')}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Fallback text list of active surge zones (not color-only) */}
        {activeZonesWithInfo.length > 0 ? (
          <View style={styles.section}>
            <Text
              style={styles.sectionHeading}
              accessibilityRole="header"
              accessibilityLabel={t('rider.surge.activeZonesTitleAria')}
            >
              {t('rider.surge.activeZonesTitle')}
            </Text>
            <View style={styles.zonesCard}>
              {activeZonesWithInfo.map((az, i) => (
                <View
                  key={az.zoneId}
                  style={[styles.zoneRow, i < activeZonesWithInfo.length - 1 ? styles.zoneRowBorder : null]}
                  accessibilityLabel={t('rider.surge.activeZoneAria', {
                    name: az.zoneName,
                    mult: az.multiplier,
                    bonus: az.bonusNpr,
                    minutes: az.minutesLeft,
                  })}
                >
                  <View style={styles.zoneLeft}>
                    <View style={[styles.zoneDot, { backgroundColor: SURGE_SHADE[surgeShadeIndex(az.multiplier)].stroke }]} />
                    <View>
                      <Text style={styles.zoneName}>{az.zoneName}</Text>
                      <Text style={styles.zoneMeta}>
                        {t('rider.surge.activeZoneMinutes', { minutes: az.minutesLeft })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.zoneRight}>
                    <Text style={styles.zoneMult}>
                      {t('rider.surge.activeZoneMult', { mult: az.multiplier })}
                    </Text>
                    <Text style={styles.zoneBonus}>
                      {t('rider.surge.activeZoneBonus', { amount: az.bonusNpr })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.noZonesCard}>
            <CircleAlert size={20} color={colors.textTertiary} />
            <Text style={styles.noZonesTitle}>{t('rider.surge.noActiveZones')}</Text>
            <Text style={styles.noZonesDesc}>
              {t('rider.surge.noActiveZonesDesc', { time: nextPeakTime || t('rider.surge.peakNoUpcoming') })}
            </Text>
          </View>
        )}

        {/* Peak windows — current + upcoming with countdown */}
        <View style={styles.section}>
          <Text
            style={styles.sectionHeading}
            accessibilityRole="header"
            accessibilityLabel={t('rider.surge.peaksTitleAria')}
          >
            {t('rider.surge.peaksTitle')}
          </Text>
          {detail.peakWindows.length > 0 ? (
            <View style={styles.peaksList}>
              {detail.peakWindows.map(pw => (
                <PeakWindowCard
                  key={pw.id}
                  window={pw}
                  t={t}
                  fmtCountdown={fmtCountdown}
                />
              ))}
            </View>
          ) : (
            <View style={styles.noPeaksCard}>
              <Text style={styles.noPeaksTitle}>{t('rider.surge.peakNoUpcoming')}</Text>
              <Text style={styles.noPeaksDesc}>{t('rider.surge.peakNoUpcomingDesc')}</Text>
            </View>
          )}
        </View>

        {/* Go-online tie-in */}
        <TouchableOpacity
          onPress={handleGoOnline}
          style={styles.goOnlineCard}
          accessibilityRole="button"
          accessibilityLabel={t('rider.surge.goOnlineAria')}
          activeOpacity={0.9}
        >
          <View style={styles.goOnlineLeft}>
            <View style={styles.goOnlineIcon}>
              <Zap size={20} color={colors.gold} />
            </View>
            <View style={styles.goOnlineText}>
              <Text style={styles.goOnlineTitle}>{t('rider.surge.goOnlineTitle')}</Text>
              <Text style={styles.goOnlineDesc}>{t('rider.surge.goOnlineDesc')}</Text>
            </View>
          </View>
          <View style={styles.goOnlineBtn}>
            <Text style={styles.goOnlineBtnText}>{t('rider.surge.goOnlineBtn')}</Text>
            <ArrowRight size={16} color={colors.white} />
          </View>
        </TouchableOpacity>

        {/* Hotspots tie-in */}
        <TouchableOpacity
          onPress={openHotspots}
          style={styles.hotspotsLink}
          accessibilityRole="button"
          accessibilityLabel={t('rider.surge.linkHotspotsAria')}
          activeOpacity={0.9}
        >
          <View style={styles.hotspotsLinkLeft}>
            <TrendingUp size={18} color={colors.primary} />
            <Text style={styles.hotspotsLinkLabel}>{t('rider.surge.linkHotspots')}</Text>
          </View>
          <ChevronRight size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Honest surge rules */}
        <View style={styles.section}>
          <Text
            style={styles.sectionHeading}
            accessibilityRole="header"
            accessibilityLabel={t('rider.surge.rulesTitleAria')}
          >
            {t('rider.surge.rulesTitle')}
          </Text>
          <View style={styles.rulesCard}>
            {detail.rules.map((rule, i) => (
              <View
                key={rule.id}
                style={[styles.ruleRow, i < detail.rules.length - 1 ? styles.ruleRowBorder : null]}
                accessibilityLabel={`${t(rule.titleKey)}. ${t(rule.descKey)}`}
              >
                <View style={styles.ruleIcon}>
                  <CheckCircle2 size={18} color={colors.success} />
                </View>
                <View style={styles.ruleText}>
                  <Text style={styles.ruleTitle}>{t(rule.titleKey)}</Text>
                  <Text style={styles.ruleDesc}>{t(rule.descKey)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

/* ---------- Header ---------- */

function SurgeHeader({
  title,
  subtitle,
  onBack,
  backLabel,
}: {
  title: string
  subtitle: string
  onBack: () => void
  backLabel: string
}) {
  return (
    <View style={styles.headerBar}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      >
        <ChevronLeft size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.headerTitles}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  )
}

/* ---------- Peak window card ---------- */

function PeakWindowCard({
  window: pw,
  t,
  fmtCountdown,
}: {
  window: import('@chinooz/mock-data').SurgePeakWindow
  t: (k: string, opts?: Record<string, unknown>) => string
  fmtCountdown: (minutes: number) => string
}) {
  const label = t(pw.labelKey)
  const isActive = pw.isActive
  const isUpcoming = pw.isUpcoming
  const countdown = fmtCountdown(pw.minutesUntilStart)
  const endTimeLabel = t('rider.surge.peakTimeRange', { range: pw.timeRange })

  const ariaLabel = isActive
    ? t('rider.surge.peakActiveAria', {
        label,
        endTime: endTimeLabel,
        mult: pw.multiplier,
        bonus: pw.bonusNpr,
        minutes: pw.minutesUntilEnd,
      })
    : isUpcoming
      ? t('rider.surge.peakCountdownAria', {
          label,
          time: countdown,
          mult: pw.multiplier,
          bonus: pw.bonusNpr,
        })
      : `${label}. ${t('rider.surge.peakEnded')}.`

  return (
    <View
      style={[styles.peakCard, isActive && styles.peakCardActive]}
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.peakHeader}>
        <View style={styles.peakHeaderLeft}>
          {isActive ? (
            <View style={styles.peakStatusBadgeActive}>
              <Zap size={12} color={colors.white} />
              <Text style={styles.peakStatusTextActive}>{t('rider.surge.peakActive')}</Text>
            </View>
          ) : isUpcoming ? (
            <View style={styles.peakStatusBadgeUpcoming}>
              <Clock size={12} color={colors.textMuted} />
              <Text style={styles.peakStatusTextUpcoming}>{t('rider.surge.peakUpcoming')}</Text>
            </View>
          ) : (
            <View style={styles.peakStatusBadgeEnded}>
              <Text style={styles.peakStatusTextEnded}>{t('rider.surge.peakEnded')}</Text>
            </View>
          )}
          <Text style={styles.peakLabel}>{label}</Text>
        </View>
        <Text style={styles.peakTimeRange}>{endTimeLabel}</Text>
      </View>

      <View style={styles.peakBody}>
        <View style={styles.peakMetrics}>
          <View style={styles.peakMetric}>
            <Text style={styles.peakMetricValue}>
              {t('rider.surge.peakMultiplier', { mult: pw.multiplier })}
            </Text>
            <Text style={styles.peakMetricLabel}>{t('rider.surge.mapLegendTitle')}</Text>
          </View>
          <View style={styles.peakMetricDivider} />
          <View style={styles.peakMetric}>
            <Text style={styles.peakMetricValueGold}>
              {t('rider.surge.peakBonusValue', { amount: pw.bonusNpr })}
            </Text>
            <Text style={styles.peakMetricLabel}>{t('rider.surge.peakBonus')}</Text>
          </View>
          <View style={styles.peakMetricDivider} />
          <View style={styles.peakMetric}>
            <Text style={styles.peakMetricValue}>
              {t('rider.surge.peakZones', { count: pw.zoneIds.length })}
            </Text>
            <Text style={styles.peakMetricLabel}>{t('rider.surge.sectionZones')}</Text>
          </View>
        </View>

        {/* Countdown */}
        {isActive ? (
          <Text style={styles.peakCountdownActive}>
            {t('rider.surge.surgeMinutesLeft', { minutes: pw.minutesUntilEnd })}
          </Text>
        ) : isUpcoming ? (
          <Text style={styles.peakCountdownUpcoming}>
            {t('rider.surge.peakCountdown', { time: countdown })}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    marginTop: 2,
  },
  headerSpacer: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    gap: spacing[4],
    paddingTop: spacing[2],
  },
  // Status banner
  statusBannerLive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.successLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.success,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    minHeight: 56,
  },
  statusBannerIdle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    minHeight: 56,
  },
  statusBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    flex: 1,
  },
  statusBannerRight: {
    alignItems: 'flex-end',
  },
  statusBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.success,
    fontFamily: fontFamily.sansBold[0],
  },
  statusBannerTitleIdle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  statusBannerSub: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
    marginTop: 2,
  },
  statusBannerSubIdle: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    marginTop: 2,
  },
  statusBannerMult: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.success,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  // Section
  section: {
    gap: spacing[2],
  },
  sectionHeading: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  // Map
  mapWrap: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[2],
    overflow: 'hidden',
    ...shadow('sm'),
  },
  legend: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    gap: spacing[2],
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  legendTitle: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.textSecondary,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2.5],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: radii.sm,
    borderWidth: 1.5,
  },
  legendLabel: {
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
  },
  // Active zones
  zonesCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadow('sm'),
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    minHeight: 56,
  },
  zoneRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  zoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    flex: 1,
  },
  zoneDot: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  zoneMeta: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    marginTop: 2,
  },
  zoneRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  zoneMult: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gold,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  zoneBonus: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  // No zones
  noZonesCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[1.5],
    alignItems: 'center',
    ...shadow('sm'),
  },
  noZonesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  noZonesDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  // Peaks
  peaksList: {
    gap: spacing[2.5],
  },
  peakCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
    ...shadow('sm'),
  },
  peakCardActive: {
    borderColor: colors.success,
    borderWidth: 1.5,
  },
  peakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  peakHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  peakStatusBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.success,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  peakStatusTextActive: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  peakStatusBadgeUpcoming: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.borderLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  peakStatusTextUpcoming: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  peakStatusBadgeEnded: {
    backgroundColor: colors.borderLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  peakStatusTextEnded: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  peakLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  peakTimeRange: {
    fontSize: 13,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    fontVariant: ['tabular-nums'],
  },
  peakBody: {
    gap: spacing[2.5],
  },
  peakMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  peakMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  peakMetricDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderLight,
  },
  peakMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  peakMetricValueGold: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gold,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  peakMetricLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },
  peakCountdownActive: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
    fontFamily: fontFamily.sansSemiBold[0],
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  peakCountdownUpcoming: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  // No peaks
  noPeaksCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[1.5],
    alignItems: 'center',
  },
  noPeaksTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  noPeaksDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  // Go-online card
  goOnlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    minHeight: 64,
    gap: spacing[3],
    ...shadow('sm'),
  },
  goOnlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  goOnlineIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(224, 169, 59, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goOnlineText: {
    flex: 1,
    gap: 2,
  },
  goOnlineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  goOnlineDesc: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  goOnlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.gold,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    minHeight: 40,
  },
  goOnlineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  // Hotspots link
  hotspotsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    minHeight: 52,
    ...shadow('sm'),
  },
  hotspotsLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    flex: 1,
  },
  hotspotsLinkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Rules
  rulesCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadow('sm'),
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
  },
  ruleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  ruleIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleText: {
    flex: 1,
    gap: 2,
  },
  ruleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  ruleDesc: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 17,
  },
  // Skeleton + error
  skeletonBlock: {
    height: 160,
    borderRadius: radii.lg,
    backgroundColor: colors.shimmer,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    gap: spacing[2],
  },
  errorTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  errorSub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  retryBtn: {
    marginTop: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
