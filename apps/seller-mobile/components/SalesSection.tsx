import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react-native'
import { colors, spacing, radii, shadows } from '@chinooz/theme'
import {
  type AnalyticsRange,
  type AnalyticsSectionData,
  type AnalyticsBreakdownGroup,
  type AnalyticsInsight,
  type AnalyticsChartGranularity,
  getSalesTrend,
  type AnalyticsFilter,
} from '@chinooz/mock-data'

type Kpi = AnalyticsSectionData['kpis'][number]

function trendColor(t: 'up' | 'down' | 'flat') {
  return t === 'up' ? colors.success : t === 'down' ? colors.error : colors.textMuted
}

function trendWord(t: 'up' | 'down' | 'flat') {
  return t === 'up' ? 'increased' : t === 'down' ? 'decreased' : 'unchanged'
}

function fmtNPR(n: number): string {
  return `NPR ${Math.round(n).toLocaleString()}`
}

export default function SalesSection({
  data,
  range,
  compare,
  filter,
}: {
  data: AnalyticsSectionData
  range: AnalyticsRange
  compare: boolean
  filter: AnalyticsFilter
}) {
  const { t } = useTranslation()
  const [granularity, setGranularity] = useState<AnalyticsChartGranularity>('day')
  const [grossNet, setGrossNet] = useState<'gross' | 'net'>('net')

  const trend = useMemo(
    () => getSalesTrend(range, { granularity, grossNet, compare, filter }),
    [range, granularity, grossNet, compare, filter],
  )

  const salesKpis = data.kpis.filter(k => ['netRevenue', 'orders', 'units', 'aov'].includes(k.key))

  return (
    <View accessibilityRole="summary" accessibilityLabel={t('seller.analytics.sectionSales')}>
      {/* KPI row */}
      <View style={styles.kpiGrid}>
        {salesKpis.map(kpi => (
          <KpiCard key={kpi.key} kpi={kpi} compare={compare} />
        ))}
      </View>

      {/* Trend chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('seller.analytics.sales.trendTitle')}</Text>

        <View style={styles.controlsRow}>
          <Segmented
            ariaLabel={t('seller.analytics.sales.granularityAria')}
            options={[
              { key: 'day', label: t('seller.analytics.sales.granularityDay') },
              { key: 'week', label: t('seller.analytics.sales.granularityWeek') },
              { key: 'month', label: t('seller.analytics.sales.granularityMonth') },
            ]}
            activeKey={granularity}
            onChange={k => setGranularity(k as AnalyticsChartGranularity)}
          />
          <Segmented
            ariaLabel={t('seller.analytics.sales.grossNetAria')}
            options={[
              { key: 'net', label: t('seller.analytics.sales.grossNetNet') },
              { key: 'gross', label: t('seller.analytics.sales.grossNetGross') },
            ]}
            activeKey={grossNet}
            onChange={k => setGrossNet(k as 'gross' | 'net')}
          />
        </View>

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

        <SalesTrendChart points={trend.points} compare={compare} grossNet={grossNet} />
      </View>

      {/* Insights */}
      {data.insights && data.insights.length > 0 && (
        <View style={styles.insightStack}>
          {data.insights.map(ins => (
            <InsightCallout key={ins.id} insight={ins} />
          ))}
        </View>
      )}

      {/* Breakdowns */}
      {data.breakdowns &&
        data.breakdowns.map(group => <BreakdownCard key={group.id} group={group} />)}
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

function Segmented({
  options,
  activeKey,
  onChange,
  ariaLabel,
}: {
  options: { key: string; label: string }[]
  activeKey: string
  onChange: (key: string) => void
  ariaLabel: string
}) {
  return (
    <View style={styles.segmented} accessibilityRole="toolbar" accessibilityLabel={ariaLabel}>
      {options.map(opt => {
        const active = opt.key === activeKey
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            style={[styles.segmentBtn, active && styles.segmentBtnActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function SalesTrendChart({
  points,
  compare,
  grossNet,
}: {
  points: AnalyticsSectionData['chart']
  compare: boolean
  grossNet: 'gross' | 'net'
}) {
  const { t } = useTranslation()
  const max = Math.max(1, ...points.map(p => Math.max(p.current, p.previous ?? 0)))
  const ariaSummary = points
    .map(p =>
      compare && p.previous != null
        ? t('seller.analytics.sales.chartSummaryCompare', {
            label: p.label,
            current: p.current.toLocaleString(),
            previous: p.previous.toLocaleString(),
          })
        : t('seller.analytics.sales.chartSummary', {
            label: p.label,
            value: p.current.toLocaleString(),
            period: grossNet,
          }),
    )
    .join('. ')

  return (
    <View accessibilityRole="image" accessibilityLabel={ariaSummary}>
      <View style={styles.chartArea}>
        {points.map((p, i) => {
          const h = Math.max(4, (p.current / max) * 100)
          const ph = p.previous != null ? Math.max(4, (p.previous / max) * 100) : 0
          const peak = p.current === Math.max(...points.map(pp => pp.current))
          return (
            <View key={p.label + i} style={styles.chartBarCol}>
              <View style={styles.chartBarTrack}>
                {compare && <View style={[styles.chartBarPrev, { height: `${ph}%` }]} />}
                <View
                  style={[
                    styles.chartBar,
                    { height: `${h}%`, width: compare ? '45%' : '60%' },
                    peak && styles.chartBarPeak,
                  ]}
                />
              </View>
              <Text style={styles.chartLabel}>{p.label}</Text>
            </View>
          )
        })}
      </View>

      {/* Text fallback */}
      <View style={styles.chartFallback}>
        {points.map((p, i) => (
          <View key={p.label + i} style={styles.fallbackRow}>
            <Text style={styles.fallbackLabel}>{p.label}</Text>
            <Text style={styles.fallbackValue}>{fmtNPR(p.current)}</Text>
            {compare && p.previous != null && (
              <Text style={styles.fallbackPrev}>{fmtNPR(p.previous)}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}

function InsightCallout({ insight }: { insight: AnalyticsInsight }) {
  const { t } = useTranslation()
  const toneBg =
    insight.tone === 'best'
      ? colors.gold + '14'
      : insight.tone === 'worst'
        ? colors.error + '14'
        : colors.info + '14'
  const toneBorder =
    insight.tone === 'best'
      ? colors.gold + '59'
      : insight.tone === 'worst'
        ? colors.error + '59'
        : colors.info + '59'
  const toneLabel =
    insight.tone === 'best'
      ? t('seller.analytics.sales.insightBest')
      : insight.tone === 'worst'
        ? t('seller.analytics.sales.insightWorst')
        : t('seller.analytics.sales.insightInfo')
  return (
    <View
      style={[styles.insightCard, { backgroundColor: toneBg, borderColor: toneBorder }]}
      accessibilityRole="summary"
      accessibilityLabel={t('seller.analytics.sales.insightAria', {
        tone: toneLabel,
        title: insight.title,
        body: insight.body,
      })}
    >
      <View style={styles.insightRow}>
        <View style={styles.insightIcon}>
          <Sparkles size={16} color={colors.gold} />
        </View>
        <View style={styles.insightBody}>
          <Text style={styles.insightTitle}>
            {insight.title} <Text style={styles.insightPeriod}>· {insight.period}</Text>
          </Text>
          <Text style={styles.insightText}>{insight.body}</Text>
        </View>
      </View>
    </View>
  )
}

function BreakdownCard({ group }: { group: AnalyticsBreakdownGroup }) {
  const { t } = useTranslation()
  const title =
    group.id === 'category'
      ? t('seller.analytics.sales.breakdownCategory')
      : group.id === 'payment'
        ? t('seller.analytics.sales.breakdownPayment')
        : t('seller.analytics.sales.breakdownStatus')
  const isStatus = group.id === 'status'
  const refunded = group.rows.find(r => r.id === 'refunded')
  const cancelled = group.rows.find(r => r.id === 'cancelled')
  const total = group.rows.reduce((s, r) => s + r.value, 0) || 1
  const max = Math.max(1, ...group.rows.map(r => r.value))

  return (
    <View style={styles.card}>
      <View style={styles.breakdownHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {!isStatus && <Text style={styles.breakdownTotal}>{fmtNPR(group.total)}</Text>}
      </View>

      {group.rows.map((r, i) => {
        const pct = Math.max(2, Math.round((r.value / max) * 100))
        const sharePct = Math.round((r.value / total) * 100)
        return (
          <View key={r.id} style={[styles.barRow, i > 0 && styles.barRowBorder]}>
            <View style={styles.barLabelRow}>
              <View style={styles.barLabelLeft}>
                <View style={[styles.barDot, { backgroundColor: r.color }]} />
                <Text style={styles.barLabel} numberOfLines={1}>
                  {r.label}
                </Text>
              </View>
              <Text style={styles.barValue}>
                {isStatus ? r.value.toLocaleString() : fmtNPR(r.value)}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: r.color }]} />
            </View>
            <View style={styles.barMetaRow}>
              <Text style={styles.barShare}>{sharePct}%</Text>
              <Text
                style={[
                  styles.barDelta,
                  { color: trendColor(r.deltaPct > 3 ? 'up' : r.deltaPct < -3 ? 'down' : 'flat') },
                ]}
              >
                {r.deltaPct > 0 ? '+' : ''}
                {r.deltaPct}%
              </Text>
            </View>
          </View>
        )
      })}

      {isStatus && refunded && cancelled && (
        <View style={styles.rateRow}>
          <Text style={styles.rateText}>
            {t('seller.analytics.sales.refundRate')}:{' '}
            <Text style={styles.rateValue}>{Math.round((refunded.value / total) * 100)}%</Text>
          </Text>
          <Text style={styles.rateText}>
            {t('seller.analytics.sales.cancelRate')}:{' '}
            <Text style={styles.rateValue}>{Math.round((cancelled.value / total) * 100)}%</Text>
          </Text>
        </View>
      )}
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
  controlsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[2.5],
    flexWrap: 'wrap',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radii.full,
    padding: spacing[0.5],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  segmentBtn: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  segmentLabelActive: { color: colors.white },
  legendRow: { flexDirection: 'row', gap: spacing[2.5], marginBottom: spacing[2] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  legendDot: { width: 10, height: 10, borderRadius: radii.sm },
  legendText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
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
  chartBarPeak: { backgroundColor: colors.gold },
  chartBarPrev: {
    width: '45%',
    borderRadius: radii.sm,
    minHeight: 4,
    backgroundColor: colors.primary + '59',
  },
  chartLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  chartFallback: {
    marginTop: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  fallbackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[1] },
  fallbackLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500', width: 48 },
  fallbackValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginLeft: 'auto',
  },
  fallbackPrev: {
    fontSize: 11,
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
    marginLeft: spacing[2],
  },
  insightStack: { gap: spacing[2] },
  insightCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing[3.5],
  },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2.5] },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.gold + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightBody: { flex: 1, gap: 4 },
  insightTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  insightPeriod: { fontSize: 11, fontWeight: '500', color: colors.textMuted },
  insightText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  breakdownHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  breakdownTotal: { fontSize: 11, color: colors.textMuted, fontVariant: ['tabular-nums'] },
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
  barMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[1],
  },
  barShare: { fontSize: 10, color: colors.textTertiary },
  barDelta: { fontSize: 10, fontWeight: '600', fontVariant: ['tabular-nums'] },
  rateRow: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingTop: spacing[2.5],
    marginTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  rateText: { fontSize: 11, color: colors.textMuted },
  rateValue: { fontSize: 11, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
})
