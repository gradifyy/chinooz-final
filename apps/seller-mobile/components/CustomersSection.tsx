import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native'
import { colors, spacing, radii, shadows } from '@chinooz/theme'
import {
  type AnalyticsSectionData,
  type AnalyticsCustomerRow,
  type AnalyticsGeoRow,
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

export default function CustomersSection({
  data,
  compare,
}: {
  data: AnalyticsSectionData
  compare: boolean
}) {
  const { t } = useTranslation()

  const customerKpis = data.kpis.filter(k =>
    ['total', 'new', 'returning', 'repeatRate', 'ltv'].includes(k.key),
  )

  return (
    <View accessibilityRole="summary" accessibilityLabel={t('seller.analytics.sectionCustomers')}>
      {/* KPI row */}
      <View style={styles.kpiGrid}>
        {customerKpis.map(kpi => (
          <KpiCard key={kpi.key} kpi={kpi} compare={compare} />
        ))}
      </View>

      {/* New vs returning trend */}
      {data.customerTrend && (
        <View style={styles.card}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>{t('seller.analytics.customers.trendTitle')}</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>{t('seller.analytics.customers.trendNew')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.gold }]} />
                <Text style={styles.legendText}>
                  {t('seller.analytics.customers.trendReturning')}
                </Text>
              </View>
            </View>
          </View>
          <CustomerTrendChart points={data.customerTrend} t={t} />
        </View>
      )}

      {/* Top customers */}
      {data.customers && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('seller.analytics.customers.topCustomers')}</Text>
          <TopCustomers customers={data.customers} t={t} />
        </View>
      )}

      {/* Geo breakdown */}
      {data.geoBreakdown && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('seller.analytics.customers.geoTitle')}</Text>
          <GeoBreakdown rows={data.geoBreakdown} t={t} />
        </View>
      )}

      {/* Search terms */}
      {data.searchTerms && data.searchTerms.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('seller.analytics.customers.searchTitle')}</Text>
          <View style={styles.searchChipRow}>
            {data.searchTerms.map(term => (
              <View
                key={term.id}
                style={styles.searchChip}
                accessibilityRole="text"
                accessibilityLabel={t('seller.analytics.customers.searchAria', {
                  term: term.term,
                  count: term.count,
                })}
              >
                <Text style={styles.searchChipText}>{term.term}</Text>
                <Text style={styles.searchChipCount}>{term.count}</Text>
              </View>
            ))}
          </View>
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

function CustomerTrendChart({
  points,
  t,
}: {
  points: { label: string; new: number; returning: number }[]
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const max = Math.max(1, ...points.map(p => p.new + p.returning))
  const ariaSummary = points
    .map(p =>
      t('seller.analytics.customers.trendSummary', {
        label: p.label,
        newC: p.new,
        returningC: p.returning,
      }),
    )
    .join('. ')

  return (
    <View accessibilityRole="image" accessibilityLabel={ariaSummary}>
      <View style={styles.chartArea}>
        {points.map((p, i) => {
          const newH = Math.max(4, (p.new / max) * 100)
          const returningH = Math.max(4, (p.returning / max) * 100)
          return (
            <View key={p.label + i} style={styles.chartBarCol}>
              <View style={styles.chartBarTrack}>
                <View style={[styles.chartBarReturning, { height: `${returningH}%` }]} />
                <View style={[styles.chartBarNew, { height: `${newH}%` }]} />
              </View>
              <Text style={styles.chartLabel}>{p.label}</Text>
            </View>
          )
        })}
      </View>

      {/* Text fallback */}
      <View style={styles.fallback}>
        {points.map((p, i) => (
          <View key={p.label + i} style={styles.fallbackRow}>
            <Text style={styles.fallbackLabel}>{p.label}</Text>
            <Text style={styles.fallbackValue}>
              {p.new} new · {p.returning} ret
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function TopCustomers({
  customers,
  t,
}: {
  customers: AnalyticsCustomerRow[]
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const sorted = [...customers].sort((a, b) => b.spend - a.spend).slice(0, 6)
  return (
    <View>
      {sorted.map((c, i) => (
        <View
          key={c.id}
          style={[styles.customerRow, i > 0 && styles.customerRowBorder]}
          accessibilityRole="summary"
          accessibilityLabel={t('seller.analytics.customers.rowAria', {
            name: c.displayName,
            orders: c.orders,
            spend: c.spend.toLocaleString(),
            aov: c.aov.toLocaleString(),
            lastOrder: c.lastOrder,
          })}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{c.displayName.charAt(0)}</Text>
          </View>
          <View style={styles.customerBody}>
            <Text style={styles.customerName} numberOfLines={1}>
              {c.displayName}
            </Text>
            <Text style={styles.customerSub} numberOfLines={1}>
              {c.orders} {t('seller.analytics.customers.colOrders')} · {c.lastOrder}
            </Text>
          </View>
          <View style={styles.customerRight}>
            <Text style={styles.customerSpend}>{fmtNPR(c.spend)}</Text>
            <Text style={styles.customerAov}>NPR {c.aov.toLocaleString()}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function GeoBreakdown({
  rows,
  t,
}: {
  rows: AnalyticsGeoRow[]
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const max = Math.max(1, ...rows.map(r => r.customers))
  return (
    <View>
      {rows.map((r, i) => {
        const pct = Math.max(2, Math.round((r.customers / max) * 100))
        return (
          <View key={r.id} style={[styles.barRow, i > 0 && styles.barRowBorder]}>
            <View style={styles.barLabelRow}>
              <View style={styles.barLabelLeft}>
                <View style={[styles.barDot, { backgroundColor: r.color }]} />
                <Text style={styles.barLabel} numberOfLines={1}>
                  {r.label}
                </Text>
              </View>
              <Text style={styles.barValue}>{r.customers.toLocaleString()}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: r.color }]} />
            </View>
            <Text style={styles.barShare}>
              {r.share}% · {t('seller.analytics.colShare')}
            </Text>
          </View>
        )
      })}

      {/* Text fallback */}
      <View style={styles.fallback}>
        {rows.map(r => (
          <View key={r.id} style={styles.fallbackRow}>
            <Text style={styles.fallbackLabel}>{r.label}</Text>
            <Text style={styles.fallbackValue}>{r.customers.toLocaleString()}</Text>
            <Text style={styles.fallbackMeta}>{r.share}%</Text>
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
    gap: spacing[2],
  },
  legendRow: { flexDirection: 'row', gap: spacing[2] },
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
    width: '60%',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 1,
  },
  chartBarNew: {
    width: '100%',
    borderRadius: radii.sm,
    minHeight: 4,
    backgroundColor: colors.primary,
  },
  chartBarReturning: {
    width: '100%',
    borderRadius: radii.sm,
    minHeight: 4,
    backgroundColor: colors.gold,
  },
  chartLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  fallback: {
    marginTop: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  fallbackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[1] },
  fallbackLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500', width: 60 },
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
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    paddingVertical: spacing[2.5],
  },
  customerRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  avatarText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  customerBody: { flex: 1, gap: 2 },
  customerName: { fontSize: 14, fontWeight: '600', color: colors.text },
  customerSub: { fontSize: 12, color: colors.textMuted },
  customerRight: { alignItems: 'flex-end', gap: 2 },
  customerSpend: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  customerAov: { fontSize: 11, color: colors.textTertiary, fontVariant: ['tabular-nums'] },
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
  searchChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  searchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.background,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
  },
  searchChipText: { fontSize: 13, fontWeight: '500', color: colors.text },
  searchChipCount: { fontSize: 11, color: colors.textTertiary, fontVariant: ['tabular-nums'] },
})
