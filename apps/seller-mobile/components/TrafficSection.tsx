import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react-native'
import { colors, spacing, radii, shadows } from '@chinooz/theme'
import {
  type AnalyticsSectionData,
  type AnalyticsFunnelStage,
  type AnalyticsTrafficSource,
  type AnalyticsChartPoint,
} from '@chinooz/mock-data'

type Kpi = AnalyticsSectionData['kpis'][number]

function trendColor(t: 'up' | 'down' | 'flat') {
  return t === 'up' ? colors.success : t === 'down' ? colors.error : colors.textMuted
}

function trendWord(t: 'up' | 'down' | 'flat') {
  return t === 'up' ? 'increased' : t === 'down' ? 'decreased' : 'unchanged'
}

export default function TrafficSection({
  data,
  compare,
}: {
  data: AnalyticsSectionData
  compare: boolean
}) {
  const { t } = useTranslation()

  const trafficKpis = data.kpis.filter(k =>
    ['storeViews', 'productViews', 'visitors', 'addToCart', 'checkouts', 'convRate'].includes(
      k.key,
    ),
  )

  return (
    <View accessibilityRole="summary" accessibilityLabel={t('seller.analytics.sectionTraffic')}>
      {/* KPI row */}
      <View style={styles.kpiGrid}>
        {trafficKpis.map(kpi => (
          <KpiCard key={kpi.key} kpi={kpi} compare={compare} />
        ))}
      </View>

      {/* Funnel (hero) */}
      {data.funnel && (
        <View style={styles.card}>
          <FunnelChart stages={data.funnel} t={t} />
        </View>
      )}

      {/* Traffic sources */}
      {data.trafficSources && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('seller.analytics.traffic.sourcesTitle')}</Text>
          <SourcesBreakdown sources={data.trafficSources} t={t} />
        </View>
      )}

      {/* Conversion trend */}
      {data.convTrend && (
        <View style={styles.card}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>{t('seller.analytics.traffic.convTrendTitle')}</Text>
            {compare && (
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendText}>{t('seller.analytics.chartCurrent')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary + '59' }]} />
                  <Text style={styles.legendText}>{t('seller.analytics.chartPrevious')}</Text>
                </View>
              </View>
            )}
          </View>
          <ConvTrendChart points={data.convTrend} compare={compare} t={t} />
        </View>
      )}
    </View>
  )
}

function KpiCard({ kpi, compare }: { kpi: Kpi; compare: boolean }) {
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus
  const tc = trendColor(kpi.trend)
  const aria = `${kpi.label}: ${kpi.value}, ${trendWord(kpi.trend)} ${kpi.deltaPct > 0 ? '+' : ''}${kpi.deltaPct}%${compare && kpi.previousValue ? `, previous ${kpi.previousValue}` : ''}`
  return (
    <View
      style={[styles.kpiCard, shadows.sm]}
      accessibilityRole="summary"
      accessibilityLabel={aria}
    >
      <Text style={styles.kpiLabel}>{kpi.label}</Text>
      <Text style={styles.kpiValue}>{kpi.value}</Text>
      <View style={styles.kpiDeltaRow}>
        <TrendIcon size={14} color={tc} />
        <Text style={[styles.kpiDelta, { color: tc }]}>
          {kpi.deltaPct > 0 ? '+' : ''}
          {kpi.deltaPct}%
        </Text>
        {compare && kpi.previousValue ? (
          <Text style={styles.kpiPrev} numberOfLines={1}>
            vs {kpi.previousValue}
          </Text>
        ) : (
          <Text style={styles.kpiHint} numberOfLines={1}>
            {kpi.hint}
          </Text>
        )}
      </View>
    </View>
  )
}

function FunnelChart({
  stages,
  t,
}: {
  stages: AnalyticsFunnelStage[]
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const maxCount = Math.max(1, ...stages.map(s => s.count))
  const biggestLeak = stages.find(s => s.isBiggestLeak)
  const summary = stages
    .map(s =>
      t('seller.analytics.traffic.funnelStageAria', {
        stage: s.label,
        count: s.count,
        convPct: s.convFromPrev,
        dropPct: s.dropOffPct,
      }),
    )
    .join('. ')

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={t('seller.analytics.traffic.funnelAria', {
        count: stages.length,
        summary,
      })}
    >
      <View style={styles.funnelHeader}>
        <Text style={styles.cardTitle}>{t('seller.analytics.traffic.funnelTitle')}</Text>
        {biggestLeak && (
          <View style={styles.leakBadge}>
            <AlertTriangle size={12} color={colors.gold} />
            <Text style={styles.leakBadgeText} numberOfLines={1}>
              {t('seller.analytics.traffic.funnelBiggestLeak')}
            </Text>
          </View>
        )}
      </View>

      {stages.map((stage, i) => {
        const widthPct = Math.max(8, Math.round((stage.count / maxCount) * 100))
        const isLeak = stage.isBiggestLeak
        return (
          <View key={stage.id} style={styles.funnelStage}>
            <View style={styles.funnelLabelRow}>
              <Text style={styles.funnelStageLabel}>{stage.label}</Text>
              <View style={styles.funnelMetrics}>
                <Text style={styles.funnelCount}>
                  {t('seller.analytics.traffic.funnelCount', {
                    count: stage.count.toLocaleString(),
                  })}
                </Text>
                {i > 0 && (
                  <Text style={styles.funnelConv}>
                    {t('seller.analytics.traffic.funnelConvPct', { pct: stage.convFromPrev })}
                  </Text>
                )}
                {stage.dropOffPct > 0 && (
                  <Text style={[styles.funnelDrop, isLeak && styles.funnelDropLeak]}>
                    {t('seller.analytics.traffic.funnelDropOff', { pct: stage.dropOffPct })}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.funnelBarTrack}>
              <View
                style={[
                  styles.funnelBarFill,
                  { width: `${widthPct}%`, backgroundColor: isLeak ? colors.gold : colors.primary },
                ]}
              />
            </View>
          </View>
        )
      })}

      {biggestLeak && (
        <Text style={styles.leakLabel}>
          {t('seller.analytics.traffic.funnelBiggestLeakLabel', {
            stage: biggestLeak.label,
            pct: biggestLeak.dropOffPct,
          })}
        </Text>
      )}

      {/* Text fallback */}
      <View style={styles.funnelFallback}>
        {stages.map(s => (
          <View key={s.id} style={styles.fallbackRow}>
            <Text style={styles.fallbackLabel}>{s.label}</Text>
            <Text style={styles.fallbackValue}>{s.count.toLocaleString()}</Text>
            <Text style={styles.fallbackMeta}>
              {s.convFromPrev}% · {s.dropOffPct}% drop
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function SourcesBreakdown({
  sources,
  t,
}: {
  sources: AnalyticsTrafficSource[]
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const max = Math.max(1, ...sources.map(s => s.value))

  return (
    <View>
      {sources.map((src, i) => {
        const pct = Math.max(2, Math.round((src.value / max) * 100))
        return (
          <View key={src.id} style={[styles.barRow, i > 0 && styles.barRowBorder]}>
            <View style={styles.barLabelRow}>
              <View style={styles.barLabelLeft}>
                <View style={[styles.barDot, { backgroundColor: src.color }]} />
                <Text style={styles.barLabel} numberOfLines={1}>
                  {src.label}
                </Text>
              </View>
              <Text style={styles.barValue}>{src.value.toLocaleString()}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: src.color }]} />
            </View>
            <Text style={styles.barShare}>
              {src.share}% · {t('seller.analytics.colShare')}
            </Text>
          </View>
        )
      })}

      {/* Text fallback */}
      <View style={styles.funnelFallback}>
        {sources.map(s => (
          <View key={s.id} style={styles.fallbackRow}>
            <Text style={styles.fallbackLabel}>{s.label}</Text>
            <Text style={styles.fallbackValue}>{s.value.toLocaleString()}</Text>
            <Text style={styles.fallbackMeta}>{s.share}%</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function ConvTrendChart({
  points,
  compare,
  t,
}: {
  points: AnalyticsChartPoint[]
  compare: boolean
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const max = Math.max(1, ...points.map(p => Math.max(p.current, p.previous ?? 0)))
  const ariaSummary = points
    .map(p =>
      compare && p.previous != null
        ? t('seller.analytics.traffic.convTrendSummaryCompare', {
            label: p.label,
            current: p.current,
            previous: p.previous!,
          })
        : t('seller.analytics.traffic.convTrendSummary', { label: p.label, value: p.current }),
    )
    .join('. ')

  return (
    <View accessibilityRole="image" accessibilityLabel={ariaSummary}>
      <View style={styles.chartArea}>
        {points.map((p, i) => {
          const h = Math.max(4, (p.current / max) * 100)
          const ph = p.previous != null ? Math.max(4, (p.previous / max) * 100) : 0
          return (
            <View key={p.label + i} style={styles.chartBarCol}>
              <View style={styles.chartBarTrack}>
                {compare && <View style={[styles.chartBarPrev, { height: `${ph}%` }]} />}
                <View
                  style={[styles.chartBar, { height: `${h}%`, width: compare ? '45%' : '60%' }]}
                />
              </View>
              <Text style={styles.chartLabel}>{p.label}</Text>
            </View>
          )
        })}
      </View>

      {/* Text fallback */}
      <View style={styles.funnelFallback}>
        {points.map((p, i) => (
          <View key={p.label + i} style={styles.fallbackRow}>
            <Text style={styles.fallbackLabel}>{p.label}</Text>
            <Text style={styles.fallbackValue}>{p.current}%</Text>
            {compare && p.previous != null && (
              <Text style={styles.fallbackMeta}>prev {p.previous}%</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  kpiCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3.5],
    gap: 6,
  } as ViewStyle,
  kpiLabel: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  kpiValue: { fontSize: 22, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  kpiDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  kpiDelta: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  kpiHint: { fontSize: 11, color: colors.textTertiary, marginLeft: 'auto', flexShrink: 1 },
  kpiPrev: {
    fontSize: 11,
    color: colors.textTertiary,
    marginLeft: 'auto',
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing[2.5] },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2.5],
  },
  legendRow: { flexDirection: 'row', gap: spacing[2.5] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  legendDot: { width: 10, height: 10, borderRadius: radii.sm },
  legendText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  funnelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    marginBottom: spacing[2.5],
  },
  leakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.gold + '14',
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  leakBadgeText: { fontSize: 10, fontWeight: '600', color: colors.gold },
  funnelStage: { marginBottom: spacing[2.5] },
  funnelLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  funnelStageLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  funnelMetrics: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  funnelCount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  funnelConv: { fontSize: 11, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  funnelDrop: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  funnelDropLeak: { color: colors.gold },
  funnelBarTrack: {
    height: 32,
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  funnelBarFill: { height: 32, borderRadius: radii.sm },
  leakLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.gold,
    marginTop: spacing[1],
    lineHeight: 16,
  },
  funnelFallback: {
    marginTop: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  fallbackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[1] },
  fallbackLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500', width: 80 },
  fallbackValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginLeft: 'auto',
  },
  fallbackMeta: {
    fontSize: 11,
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
    marginLeft: spacing[2],
  },
  barRow: { paddingVertical: spacing[2.5] },
  barRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  barLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  barLabelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    flex: 1,
    minWidth: 0,
  },
  barDot: { width: 10, height: 10, borderRadius: radii.sm },
  barLabel: { fontSize: 13, fontWeight: '500', color: colors.text },
  barValue: { fontSize: 13, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  barTrack: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: radii.full },
  barShare: { fontSize: 10, color: colors.textTertiary, marginTop: spacing[1] },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    gap: spacing[2],
  },
  chartBarCol: { flex: 1, alignItems: 'center', gap: spacing[1.5], height: '100%' },
  chartBarTrack: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  chartBar: { borderRadius: radii.sm, minHeight: 4, backgroundColor: colors.primary },
  chartBarPrev: {
    width: '45%',
    borderRadius: radii.sm,
    minHeight: 4,
    backgroundColor: colors.primary + '59',
  },
  chartLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
})
