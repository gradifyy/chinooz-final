import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ViewStyle } from 'react-native'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Minus, ArrowLeft, Package } from 'lucide-react-native'
import { colors, spacing, radii, shadows } from '@chinooz/theme'
import {
  type AnalyticsSectionData,
  type AnalyticsProductRow,
  type AnalyticsProductCallout,
  type AnalyticsRange,
  type AnalyticsFilter,
  getProductDetail,
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

export default function ProductsSection({
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
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const productsKpis = data.kpis.filter(k =>
    ['pViews', 'pAddToCart', 'pUnits', 'pRevenue', 'pConvRate', 'pReturnRate'].includes(k.key),
  )

  const sortedProducts = useMemo(() => {
    if (!data.products) return []
    return [...data.products].sort((a, b) => b.revenue - a.revenue)
  }, [data.products])

  const detail = useMemo(
    () => (selectedId ? getProductDetail(selectedId, range, { compare, filter }) : null),
    [selectedId, range, compare, filter],
  )

  if (detail) {
    return (
      <ProductDetail
        detail={detail}
        compare={compare}
        onBack={() => setSelectedId(null)}
        t={t}
      />
    )
  }

  return (
    <View accessibilityRole="summary" accessibilityLabel={t('seller.analytics.sectionProducts')}>
      {/* KPI row */}
      <View style={styles.kpiGrid}>
        {productsKpis.map(kpi => (
          <KpiCard key={kpi.key} kpi={kpi} compare={compare} />
        ))}
      </View>

      {/* Callouts */}
      {data.productCallouts && data.productCallouts.length > 0 && (
        <View style={styles.calloutStack}>
          {data.productCallouts.map(c => (
            <CalloutCard key={c.id} callout={c} t={t} />
          ))}
        </View>
      )}

      {/* Ranked cards */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('seller.analytics.products.tableTitle')}</Text>
        {sortedProducts.map((p, i) => (
          <ProductCardMobile
            key={p.id}
            product={p}
            rank={i + 1}
            onSelect={() => setSelectedId(p.id)}
            t={t}
          />
        ))}
      </View>

      {/* Category comparison */}
      {data.categoryComparison && data.categoryComparison.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('seller.analytics.products.categoryCompare')}</Text>
          {data.categoryComparison.map((cat, i) => {
            const max = Math.max(1, ...data.categoryComparison!.map(c => c.revenue))
            const pct = Math.max(2, Math.round((cat.revenue / max) * 100))
            return (
              <View key={cat.id} style={[styles.barRow, i > 0 && styles.barRowBorder]}>
                <View style={styles.barLabelRow}>
                  <View style={styles.barLabelLeft}>
                    <View style={[styles.barDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.barLabel} numberOfLines={1}>{cat.label}</Text>
                  </View>
                  <Text style={styles.barValue}>{fmtNPR(cat.revenue)}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                </View>
                <View style={styles.barMetaRow}>
                  <Text style={styles.barShare}>{cat.share}% · {cat.units} {t('seller.analytics.products.colUnits')}</Text>
                  <Text style={styles.barShare}>{cat.convPct}% {t('seller.analytics.products.colConv')}</Text>
                </View>
              </View>
            )
          })}
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
          <Text style={styles.kpiPrev} numberOfLines={1}>vs {kpi.previousValue}</Text>
        ) : (
          <Text style={styles.kpiHint} numberOfLines={1}>{kpi.hint}</Text>
        )}
      </View>
    </View>
  )
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(1, ...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 48
  const h = 20
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  })
  const ariaSummary = `7-day trend: ${data[0]} to ${data[data.length - 1]}, peak ${max}`
  return (
    <View accessibilityRole="image" accessibilityLabel={ariaSummary}>
      <SvgSparkline points={pts.join(' ')} w={w} h={h} />
    </View>
  )
}

function SvgSparkline({ points, w, h }: { points: string; w: number; h: number }) {
  return (
    <View style={{ width: w, height: h }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: w,
          height: h,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: h, paddingHorizontal: 2, gap: 1 }}>
        {points.split(' ').map((pt, i) => {
          const [, y] = pt.split(',').map(Number)
          const barH = h - y
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: Math.max(2, barH),
                backgroundColor: i === points.split(' ').length - 1 ? colors.gold : colors.primary + '80',
                borderRadius: 1,
              }}
            />
          )
        })}
      </View>
    </View>
  )
}

function ProductCardMobile({
  product,
  rank,
  onSelect,
  t,
}: {
  product: AnalyticsProductRow
  rank: number
  onSelect: () => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityLabel={t('seller.analytics.products.viewProductAria', { name: product.name })}
      style={styles.productRow}
      activeOpacity={0.7}
    >
      <Text style={styles.rankText}>{rank}</Text>
      <View style={styles.productBody}>
        <View style={styles.productHeader}>
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
            {product.outOfStock && (
              <Text style={styles.oosBadge}> OOS</Text>
            )}
          </Text>
        </View>
        <Text style={styles.productCategory} numberOfLines={1}>{product.category}</Text>
        <View style={styles.productMetrics}>
          <Text style={styles.metricText}>
            {product.views.toLocaleString()} {t('seller.analytics.products.colViews')}
          </Text>
          <Text style={styles.metricRevenue}>{fmtNPR(product.revenue)}</Text>
        </View>
        <View style={styles.productMetrics}>
          <Text style={[styles.metricSmall, product.convPct < 3 && styles.metricWarn]}>
            {product.convPct}% {t('seller.analytics.products.colConv')}
          </Text>
          <Text style={[styles.metricSmall, product.returnRate > 5 && styles.metricError]}>
            {product.returnRate}% {t('seller.analytics.products.colReturn')}
          </Text>
        </View>
      </View>
      <Sparkline data={product.sparkline} />
    </TouchableOpacity>
  )
}

function CalloutCard({
  callout,
  t,
}: {
  callout: AnalyticsProductCallout
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const accentBorder =
    callout.type === 'top' ? colors.success + '59' : callout.type === 'under' ? colors.warning + '59' : colors.error + '59'
  const accentBg =
    callout.type === 'top' ? colors.success + '0D' : callout.type === 'under' ? colors.warning + '0D' : colors.error + '0D'
  const accentText =
    callout.type === 'top' ? colors.success : callout.type === 'under' ? colors.warning : colors.error

  return (
    <View
      style={[styles.calloutCard, { borderColor: accentBorder, backgroundColor: accentBg }]}
      accessibilityRole="summary"
      accessibilityLabel={t('seller.analytics.products.calloutAria', {
        title: callout.title,
        hint: callout.hint,
        products: callout.productNames.join(', '),
      })}
    >
      <Text style={[styles.calloutTitle, { color: accentText }]}>{callout.title}</Text>
      <Text style={styles.calloutHint}>{callout.hint}</Text>
      {callout.productNames.map(name => (
        <View key={name} style={styles.calloutProductRow}>
          <Text style={styles.calloutProduct} numberOfLines={1}>{name}</Text>
          {callout.type === 'oos_demand' && (
            <Text style={styles.restockLink}>{t('seller.analytics.products.restock')}</Text>
          )}
        </View>
      ))}
    </View>
  )
}

function ProductDetail({
  detail,
  compare,
  onBack,
  t,
}: {
  detail: NonNullable<ReturnType<typeof getProductDetail>>
  compare: boolean
  onBack: () => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const p = detail.product
  const maxTrend = Math.max(1, ...detail.trend.map(pt => Math.max(pt.current, pt.previous ?? 0)))
  const maxFunnel = Math.max(1, ...detail.funnel.map(f => f.count))

  return (
    <View accessibilityRole="summary" accessibilityLabel={t('seller.analytics.products.detailTitle')}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityRole="link" accessibilityLabel={t('seller.analytics.products.detailBack')}>
        <ArrowLeft size={18} color={colors.primary} />
        <Text style={styles.backText}>{t('seller.analytics.products.detailBack')}</Text>
      </TouchableOpacity>

      <Text style={styles.detailTitle}>{p.name}</Text>
      <Text style={styles.detailCategory}>{p.category}</Text>

      {/* KPIs */}
      <View style={styles.kpiGrid}>
        <DetailKpi label={t('seller.analytics.products.detailKpiViews')} value={p.views.toLocaleString()} />
        <DetailKpi label={t('seller.analytics.products.detailKpiAddToCart')} value={p.addToCart.toLocaleString()} />
        <DetailKpi label={t('seller.analytics.products.detailKpiUnits')} value={p.units.toLocaleString()} />
        <DetailKpi label={t('seller.analytics.products.detailKpiRevenue')} value={fmtNPR(p.revenue)} />
        <DetailKpi label={t('seller.analytics.products.detailKpiConv')} value={`${p.convPct}%`} />
        <DetailKpi label={t('seller.analytics.products.detailKpiReturn')} value={`${p.returnRate}%`} />
      </View>

      {/* Trend */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('seller.analytics.products.detailTrend')}</Text>
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
        <View
          style={styles.chartArea}
          accessibilityRole="image"
          accessibilityLabel={detail.trend.map(pt => `${pt.label}: ${fmtNPR(pt.current)}`).join(', ')}
        >
          {detail.trend.map((pt, i) => {
            const h = Math.max(4, (pt.current / maxTrend) * 100)
            const ph = pt.previous != null ? Math.max(4, (pt.previous / maxTrend) * 100) : 0
            return (
              <View key={pt.label + i} style={styles.chartBarCol}>
                <View style={styles.chartBarTrack}>
                  {compare && pt.previous != null && <View style={[styles.chartBarPrev, { height: `${ph}%` }]} />}
                  <View style={[styles.chartBar, { height: `${h}%`, width: compare ? '45%' : '60%' }]} />
                </View>
                <Text style={styles.chartLabel}>{pt.label}</Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* Funnel */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('seller.analytics.products.detailFunnel')}</Text>
        <View
          accessibilityRole="image"
          accessibilityLabel={detail.funnel.map(f => `${f.label}: ${f.count}, ${f.convFromPrev}% conversion, ${f.dropOffPct}% drop-off`).join('. ')}
        >
          {detail.funnel.map((f, i) => {
            const widthPct = Math.max(8, Math.round((f.count / maxFunnel) * 100))
            return (
              <View key={f.id} style={styles.funnelStage}>
                <View style={styles.funnelLabelRow}>
                  <Text style={styles.funnelStageLabel}>{f.label}</Text>
                  <View style={styles.funnelMetrics}>
                    <Text style={styles.funnelCount}>{f.count.toLocaleString()}</Text>
                    {i > 0 && (
                      <Text style={[styles.funnelDrop, f.isBiggestLeak && styles.funnelDropLeak]}>
                        {f.dropOffPct}% drop
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.funnelBarTrack}>
                  <View
                    style={[
                      styles.funnelBarFill,
                      { width: `${widthPct}%`, backgroundColor: f.isBiggestLeak ? colors.gold : colors.primary },
                    ]}
                  />
                </View>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}

function DetailKpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.detailKpi, shadows.sm]}>
      <Text style={styles.detailKpiLabel}>{label}</Text>
      <Text style={styles.detailKpiValue}>{value}</Text>
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
  kpiPrev: { fontSize: 11, color: colors.textTertiary, marginLeft: 'auto', flexShrink: 1, fontVariant: ['tabular-nums'] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing[2.5] },
  calloutStack: { gap: spacing[2] },
  calloutCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing[3.5],
  },
  calloutTitle: { fontSize: 13, fontWeight: '600' },
  calloutHint: { fontSize: 11, color: colors.textMuted, marginTop: 2, marginBottom: spacing[2] },
  calloutProductRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  calloutProduct: { fontSize: 12, fontWeight: '500', color: colors.text, flex: 1 },
  restockLink: { fontSize: 11, fontWeight: '600', color: colors.primary, marginLeft: spacing[2] },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2.5],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rankText: { fontSize: 14, fontWeight: '700', color: colors.textTertiary, fontVariant: ['tabular-nums'], width: 24 },
  productBody: { flex: 1, gap: 2 },
  productHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  productName: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  oosBadge: { fontSize: 10, fontWeight: '700', color: colors.error },
  productCategory: { fontSize: 12, color: colors.textMuted },
  productMetrics: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  metricText: { fontSize: 12, color: colors.textMuted },
  metricRevenue: { fontSize: 14, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  metricSmall: { fontSize: 11, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  metricWarn: { color: colors.warning, fontWeight: '600' },
  metricError: { color: colors.error, fontWeight: '600' },
  barRow: { paddingVertical: spacing[2.5] },
  barRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  barLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[1] },
  barLabelLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], flex: 1, minWidth: 0 },
  barDot: { width: 10, height: 10, borderRadius: radii.sm },
  barLabel: { fontSize: 13, fontWeight: '500', color: colors.text },
  barValue: { fontSize: 13, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  barTrack: { height: 8, backgroundColor: colors.background, borderRadius: radii.full, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: radii.full },
  barMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing[1] },
  barShare: { fontSize: 10, color: colors.textTertiary },
  detailKpi: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    gap: 4,
  } as ViewStyle,
  detailKpiLabel: { fontSize: 11, fontWeight: '500', color: colors.textMuted },
  detailKpiValue: { fontSize: 18, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], marginBottom: spacing[3] },
  backText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  detailTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 2 },
  detailCategory: { fontSize: 14, color: colors.textMuted, marginBottom: spacing[4] },
  legendRow: { flexDirection: 'row', gap: spacing[2.5], marginBottom: spacing[2] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  legendDot: { width: 10, height: 10, borderRadius: radii.sm },
  legendText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 144,
    gap: spacing[2],
  },
  chartBarCol: { flex: 1, alignItems: 'center', gap: spacing[1.5], height: '100%' },
  chartBarTrack: { flex: 1, width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  chartBar: { borderRadius: radii.sm, minHeight: 4, backgroundColor: colors.primary },
  chartBarPrev: { width: '45%', borderRadius: radii.sm, minHeight: 4, backgroundColor: colors.primary + '59' },
  chartLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  funnelStage: { marginBottom: spacing[2.5] },
  funnelLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[1] },
  funnelStageLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  funnelMetrics: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  funnelCount: { fontSize: 11, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  funnelDrop: { fontSize: 11, fontWeight: '600', color: colors.textTertiary, fontVariant: ['tabular-nums'] },
  funnelDropLeak: { color: colors.gold },
  funnelBarTrack: { height: 28, backgroundColor: colors.background, borderRadius: radii.sm, overflow: 'hidden' },
  funnelBarFill: { height: 28, borderRadius: radii.sm },
})
