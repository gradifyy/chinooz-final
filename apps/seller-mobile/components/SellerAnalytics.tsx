import React, { useMemo, useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Switch,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, X } from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import { useSellerCategories, useSellerProducts } from '@chinooz/hooks'
import {
  getAnalytics,
  ANALYTICS_RANGES,
  type AnalyticsSection,
  type AnalyticsRange,
  type AnalyticsRangeKey,
  type AnalyticsSectionData,
  type AnalyticsFilter,
} from '@chinooz/mock-data'
import { analytics as tracker } from '@chinooz/analytics'

type SectionKey = AnalyticsSection

const SECTIONS: { key: SectionKey; labelKey: string }[] = [
  { key: 'sales', labelKey: 'seller.analytics.sectionSales' },
  { key: 'traffic', labelKey: 'seller.analytics.sectionTraffic' },
  { key: 'products', labelKey: 'seller.analytics.sectionProducts' },
  { key: 'customers', labelKey: 'seller.analytics.sectionCustomers' },
]

const RANGE_LABEL_KEY: Record<AnalyticsRangeKey, string> = {
  today: 'rangeToday',
  '7d': 'range7d',
  '30d': 'range30d',
  '90d': 'range90d',
  this_month: 'rangeMonth',
  custom: 'rangeCustom',
}

function trendColor(t: 'up' | 'down' | 'flat') {
  return t === 'up' ? colors.success : t === 'down' ? colors.error : colors.textMuted
}

export default function SellerAnalytics() {
  const { t } = useTranslation()
  const router = useRouter()
  const { reducedMotion, minTouchTarget } = useA11y()
  const { data: sellerCats } = useSellerCategories()
  const { data: sellerProds } = useSellerProducts({})

  const [section, setSection] = useState<SectionKey>('sales')
  const [rangeKey, setRangeKey] = useState<AnalyticsRangeKey>('30d')
  const [compare, setCompare] = useState(false)
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [productId, setProductId] = useState<string | undefined>(undefined)
  const fadeAnim = React.useRef(new Animated.Value(1)).current

  useEffect(() => {
    tracker.screen({ name: 'seller-analytics' })
  }, [])

  const range: AnalyticsRange = useMemo(() => {
    const meta = ANALYTICS_RANGES.find(r => r.key === rangeKey)
    return {
      key: rangeKey,
      label: meta?.label ?? '30d',
      days: meta?.days ?? 30,
    }
  }, [rangeKey])

  const filter: AnalyticsFilter = useMemo(
    () => ({ categoryId, productId }),
    [categoryId, productId],
  )

  const data: AnalyticsSectionData = useMemo(
    () => getAnalytics(section, range, { compare, filter }),
    [section, range, compare, filter],
  )

  const switchSection = useCallback(
    (key: SectionKey) => {
      if (key === section) return
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: reducedMotion ? 0 : 250,
        useNativeDriver: true,
      }).start(() => {
        setSection(key)
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: reducedMotion ? 0 : 250,
          useNativeDriver: true,
        }).start()
      })
    },
    [section, reducedMotion, fadeAnim],
  )

  const switchRange = useCallback(
    (key: AnalyticsRangeKey) => {
      if (key === rangeKey) return
      setRangeKey(key)
    },
    [rangeKey],
  )

  const showCategoryFilter =
    section === 'sales' || section === 'products' || section === 'customers'
  const showProductFilter = section === 'products' || section === 'traffic'

  const activeFilters: { key: string; label: string; onClear: () => void }[] = []
  if (categoryId) {
    const cat = sellerCats?.find(c => c.id === categoryId)
    activeFilters.push({
      key: 'cat',
      label: cat?.name ?? categoryId,
      onClear: () => setCategoryId(undefined),
    })
  }
  if (productId) {
    const prod = sellerProds?.items.find(p => p.id === productId)
    activeFilters.push({
      key: 'prod',
      label: prod?.name ?? productId,
      onClear: () => setProductId(undefined),
    })
  }

  const compareLabel = compare ? t('seller.analytics.compareOn') : t('seller.analytics.compareOff')

  return (
    <View style={styles.container}>
      {/* Sticky header bar */}
      <View style={styles.stickyHeader}>
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={() => router.push('/dashboard')}
            accessibilityRole="link"
            accessibilityLabel={t('seller.analytics.back')}
            hitSlop={8}
            style={[styles.backBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
          >
            <ArrowLeft size={20} color={colors.text} />
            <Text style={styles.backText}>{t('seller.analytics.title')}</Text>
          </TouchableOpacity>
        </View>

        {/* Section tabs — horizontally scrollable segment pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="tablist"
          accessibilityLabel={t('seller.analytics.sectionTablistAria')}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {SECTIONS.map(s => {
            const active = s.key === section
            return (
              <TouchableOpacity
                key={s.key}
                onPress={() => switchSection(s.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t('seller.analytics.sectionTabAria', {
                  section: t(s.labelKey),
                })}
                style={[styles.tabPill, active && styles.tabPillActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {t(s.labelKey)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Range + compare row */}
        <View style={styles.rangeRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            accessibilityRole="tablist"
            accessibilityLabel={t('seller.analytics.rangeAriaLabel')}
            style={styles.rangeScroll}
            contentContainerStyle={styles.rangeContent}
          >
            {ANALYTICS_RANGES.map(r => {
              const active = r.key === rangeKey
              const label = t(`seller.analytics.${RANGE_LABEL_KEY[r.key]}`)
              return (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => switchRange(r.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t('seller.analytics.rangeTabAria', { range: label })}
                  style={[styles.rangePill, active && styles.rangePillActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.rangeLabel, active && styles.rangeLabelActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          <View style={styles.compareBox}>
            <Switch
              value={compare}
              onValueChange={setCompare}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
              accessibilityRole="switch"
              accessibilityLabel={t('seller.analytics.compareAria')}
              accessibilityState={{ checked: compare }}
            />
            <Text style={styles.compareText}>{compareLabel}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Filters */}
        {(showCategoryFilter || showProductFilter) && (
          <View style={styles.filterRow}>
            {showCategoryFilter && (
              <FilterChipSelect
                ariaLabel={t('seller.analytics.filterCategoryAria')}
                placeholder={t('seller.analytics.filterCategoryAll')}
                value={categoryId}
                options={(sellerCats ?? []).map(c => ({ id: c.id, label: c.name }))}
                onSelect={setCategoryId}
              />
            )}
            {showProductFilter && (
              <FilterChipSelect
                ariaLabel={t('seller.analytics.filterProductAria')}
                placeholder={t('seller.analytics.filterProductAll')}
                value={productId}
                options={(sellerProds?.items ?? []).map(p => ({ id: p.id, label: p.name }))}
                onSelect={setProductId}
              />
            )}

            {activeFilters.map(f => (
              <View
                key={f.key}
                style={styles.chipActive}
                accessibilityRole="button"
                aria-pressed="true"
                accessibilityLabel={t('seller.analytics.filterChipAria', { filter: f.label })}
              >
                <Text style={styles.chipActiveText} numberOfLines={1}>
                  {f.label}
                </Text>
                <TouchableOpacity
                  onPress={f.onClear}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('seller.analytics.clearAll')}: ${f.label}`}
                >
                  <X size={12} color={colors.white} />
                </TouchableOpacity>
              </View>
            ))}

            {activeFilters.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setCategoryId(undefined)
                  setProductId(undefined)
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('seller.analytics.clearAll')}
              >
                <Text style={styles.clearAllText}>{t('seller.analytics.clearAll')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Animated.View style={{ opacity: fadeAnim }}>
          <SectionContent section={section} data={data} compare={compare} />
        </Animated.View>

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </View>
  )
}

function FilterChipSelect({
  ariaLabel,
  placeholder,
  value,
  options,
  onSelect,
}: {
  ariaLabel: string
  placeholder: string
  value: string | undefined
  options: { id: string; label: string }[]
  onSelect: (id: string | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.id === value)
  const label = selected ? selected.label : placeholder
  return (
    <View style={styles.chipSelectWrap}>
      <TouchableOpacity
        onPress={() => setOpen(o => !o)}
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
        style={[styles.chip, value ? styles.chipFilled : styles.chipOutline]}
        activeOpacity={0.8}
      >
        <Text
          style={[styles.chipText, value ? styles.chipTextFilled : styles.chipTextOutline]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.chipMenu}>
          <TouchableOpacity
            onPress={() => {
              onSelect(undefined)
              setOpen(false)
            }}
            style={styles.chipMenuItem}
            accessibilityRole="button"
          >
            <Text style={styles.chipMenuText}>{placeholder}</Text>
          </TouchableOpacity>
          {options.map(o => (
            <TouchableOpacity
              key={o.id}
              onPress={() => {
                onSelect(o.id)
                setOpen(false)
              }}
              style={styles.chipMenuItem}
              accessibilityRole="button"
            >
              <Text style={[styles.chipMenuText, o.id === value && styles.chipMenuTextActive]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

function SectionContent({
  section,
  data,
  compare,
}: {
  section: SectionKey
  data: AnalyticsSectionData
  compare: boolean
}) {
  const { t } = useTranslation()
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={t(
        `seller.analytics.section${section === 'sales' ? 'Sales' : section === 'traffic' ? 'Traffic' : section === 'products' ? 'Products' : 'Customers'}`,
      )}
    >
      {/* KPIs */}
      <View style={styles.kpiGrid}>
        {data.kpis.map(kpi => (
          <KpiCard key={kpi.key} kpi={kpi} compare={compare} />
        ))}
      </View>

      {/* Chart */}
      <View style={styles.card}>
        <View style={styles.chartHeader}>
          <Text style={styles.cardTitle}>{t('seller.analytics.chartTitle')}</Text>
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
        <TrendChart points={data.chart} compare={compare} />
      </View>

      {/* Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('seller.analytics.breakdownTitle')}</Text>
        {data.breakdown.map((b, i) => (
          <View key={b.id} style={[styles.breakdownRow, i > 0 && styles.breakdownRowBorder]}>
            <View style={styles.breakdownLeft}>
              <Text style={styles.breakdownLabel} numberOfLines={1}>
                {b.label}
              </Text>
              <Text style={styles.breakdownShare}>
                {b.share}% · {t('seller.analytics.colShare')}
              </Text>
            </View>
            <View style={styles.breakdownRight}>
              <Text style={styles.breakdownValue}>{b.value.toLocaleString()}</Text>
              <Text
                style={[
                  styles.breakdownDelta,
                  { color: trendColor(b.deltaPct > 3 ? 'up' : b.deltaPct < -3 ? 'down' : 'flat') },
                ]}
              >
                {b.deltaPct > 0 ? '+' : ''}
                {b.deltaPct}%
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Products */}
      {section === 'products' && data.products && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('seller.analytics.topProducts')}</Text>
          {data.products.map((p, i) => (
            <View key={p.id} style={[styles.productRow, i > 0 && styles.productRowBorder]}>
              <View style={styles.productBody}>
                <Text style={styles.productName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.productSub} numberOfLines={1}>
                  {p.category} · {t('seller.analytics.colUnits')} {p.units.toLocaleString()}
                </Text>
                <Text style={styles.productRevenue}>NPR {p.revenue.toLocaleString()}</Text>
              </View>
              <View style={styles.productRight}>
                <Text style={styles.productConv}>
                  {p.convPct}% {t('seller.analytics.colConv')}
                </Text>
                <Text
                  style={[
                    styles.productDelta,
                    {
                      color: trendColor(p.deltaPct > 3 ? 'up' : p.deltaPct < -3 ? 'down' : 'flat'),
                    },
                  ]}
                >
                  {p.deltaPct > 0 ? '+' : ''}
                  {p.deltaPct}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Customers */}
      {section === 'customers' && data.customers && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('seller.analytics.topCustomers')}</Text>
          {data.customers.map((c, i) => (
            <View key={c.id} style={[styles.productRow, i > 0 && styles.productRowBorder]}>
              <View style={styles.productBody}>
                <Text style={styles.productName} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.productSub} numberOfLines={1}>
                  {t('seller.analytics.colOrders')} {c.orders} · {c.lastOrder}
                </Text>
                <Text style={styles.productRevenue}>NPR {c.spend.toLocaleString()}</Text>
              </View>
              <View style={styles.productRight}>
                <Text style={styles.productConv}>AOV NPR {c.aov.toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function KpiCard({
  kpi,
  compare,
}: {
  kpi: AnalyticsSectionData['kpis'][number]
  compare: boolean
}) {
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus
  const tc = trendColor(kpi.trend)
  return (
    <View style={styles.kpiCard}>
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

function TrendChart({
  points,
  compare,
}: {
  points: AnalyticsSectionData['chart']
  compare: boolean
}) {
  const max = Math.max(1, ...points.map(p => Math.max(p.current, p.previous ?? 0)))
  return (
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
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  stickyHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  backText: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text },
  tabsScroll: { flexGrow: 0 },
  tabsContent: {
    flexDirection: 'row',
    gap: spacing[1.5],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  tabPill: {
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabLabelActive: { color: colors.white },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  rangeScroll: { flexGrow: 0 },
  rangeContent: { flexDirection: 'row', gap: spacing[1.5] },
  rangePill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rangePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rangeLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  rangeLabelActive: { color: colors.white },
  compareBox: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  compareText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  scrollContent: { padding: spacing[4], gap: spacing[2] },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  chipSelectWrap: { position: 'relative' },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipOutline: { borderColor: colors.borderLight, backgroundColor: colors.surface },
  chipFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextOutline: { color: colors.textMuted },
  chipTextFilled: { color: colors.white },
  chipMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: spacing[1],
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing[1],
    zIndex: 50,
    minWidth: 160,
    maxHeight: 240,
  },
  chipMenuItem: { paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  chipMenuText: { fontSize: 13, color: colors.text },
  chipMenuTextActive: { color: colors.primary, fontWeight: '700' },
  chipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
  },
  chipActiveText: { fontSize: 12, fontWeight: '600', color: colors.white, maxWidth: 120 },
  clearAllText: { fontSize: 12, fontWeight: '600', color: colors.primary },
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
  },
  kpiLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  kpiValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  kpiDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  kpiDelta: { fontSize: 12, fontWeight: '600' },
  kpiHint: { fontSize: 11, color: colors.textTertiary, marginLeft: 'auto', flexShrink: 1 },
  kpiPrev: { fontSize: 11, color: colors.textTertiary, marginLeft: 'auto', flexShrink: 1 },
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
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2.5],
  },
  breakdownRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  breakdownLeft: { flex: 1, gap: 2 },
  breakdownLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  breakdownShare: { fontSize: 11, color: colors.textMuted },
  breakdownRight: { alignItems: 'flex-end', gap: 2 },
  breakdownValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  breakdownDelta: { fontSize: 11, fontWeight: '600' },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2.5],
  },
  productRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  productBody: { flex: 1, gap: 2 },
  productName: { fontSize: 14, fontWeight: '600', color: colors.text },
  productSub: { fontSize: 12, color: colors.textMuted },
  productRevenue: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },
  productRight: { alignItems: 'flex-end', gap: 2 },
  productConv: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  productDelta: { fontSize: 12, fontWeight: '700' },
})
