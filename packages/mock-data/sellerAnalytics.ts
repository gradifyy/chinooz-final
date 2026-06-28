export type AnalyticsRangeKey = 'today' | '7d' | '30d' | '90d' | 'this_month' | 'custom'

export type AnalyticsSection = 'sales' | 'traffic' | 'products' | 'customers'

export interface AnalyticsRange {
  key: AnalyticsRangeKey
  label: string
  days: number
  custom?: { start: string; end: string }
}

export type AnalyticsChartGranularity = 'day' | 'week' | 'month'

export interface AnalyticsKpi {
  key: string
  label: string
  value: string
  rawValue: number
  deltaPct: number
  trend: 'up' | 'down' | 'flat'
  hint: string
  previousValue?: string
}

export interface AnalyticsChartPoint {
  label: string
  current: number
  previous?: number
}

export interface AnalyticsBreakdownRow {
  id: string
  label: string
  value: number
  share: number
  deltaPct: number
  color?: string
}

export interface AnalyticsBreakdownGroup {
  id: string
  title: string
  total: number
  rows: AnalyticsBreakdownRow[]
}

export interface AnalyticsInsight {
  id: string
  title: string
  body: string
  tone: 'best' | 'worst' | 'info'
  period: string
}

export interface AnalyticsProductRow {
  id: string
  name: string
  category: string
  views: number
  addToCart: number
  units: number
  revenue: number
  convPct: number
  returnRate: number
  deltaPct: number
  sparkline: number[]
  outOfStock: boolean
  stockCount: number
}

export interface AnalyticsFunnelStage {
  id: string
  label: string
  count: number
  convFromPrev: number
  dropOffPct: number
  isBiggestLeak: boolean
}

export interface AnalyticsTrafficSource {
  id: string
  label: string
  value: number
  share: number
  color: string
}

export interface AnalyticsProductCallout {
  id: string
  type: 'top' | 'under' | 'oos_demand'
  title: string
  hint: string
  productIds: string[]
  productNames: string[]
}

export interface AnalyticsCategoryComparison {
  id: string
  label: string
  revenue: number
  units: number
  views: number
  convPct: number
  share: number
  color: string
}

export interface AnalyticsProductDetail {
  product: AnalyticsProductRow
  trend: AnalyticsChartPoint[]
  funnel: AnalyticsFunnelStage[]
}

export interface AnalyticsCustomerRow {
  id: string
  name: string
  orders: number
  spend: number
  aov: number
  lastOrder: string
}

export interface AnalyticsFilter {
  categoryId?: string
  productId?: string
}

export interface AnalyticsSectionData {
  section: AnalyticsSection
  range: AnalyticsRange
  compare: boolean
  kpis: AnalyticsKpi[]
  chart: AnalyticsChartPoint[]
  breakdown: AnalyticsBreakdownRow[]
  breakdowns?: AnalyticsBreakdownGroup[]
  insights?: AnalyticsInsight[]
  products?: AnalyticsProductRow[]
  customers?: AnalyticsCustomerRow[]
  funnel?: AnalyticsFunnelStage[]
  trafficSources?: AnalyticsTrafficSource[]
  convTrend?: AnalyticsChartPoint[]
  productCallouts?: AnalyticsProductCallout[]
  categoryComparison?: AnalyticsCategoryComparison[]
}

export const ANALYTICS_RANGES: { key: AnalyticsRangeKey; label: string; days: number }[] = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7d', days: 7 },
  { key: '30d', label: '30d', days: 30 },
  { key: '90d', label: '90d', days: 90 },
  { key: 'this_month', label: 'This month', days: 30 },
  { key: 'custom', label: 'Custom', days: 30 },
]

type KpiDef = { key: string; label: string; base: number; hint: string; money?: boolean }

const SALES_KPIS: KpiDef[] = [
  { key: 'netRevenue', label: 'Net revenue', base: 18450, hint: 'After refunds', money: true },
  { key: 'orders', label: 'Orders', base: 64, hint: 'Confirmed orders', money: false },
  { key: 'units', label: 'Units sold', base: 128, hint: 'Items sold', money: false },
  { key: 'aov', label: 'Avg. order value', base: 288, hint: 'Revenue / orders', money: true },
]

const TRAFFIC_KPIS: KpiDef[] = [
  { key: 'storeViews', label: 'Store views', base: 3120, hint: 'Storefront page views' },
  { key: 'productViews', label: 'Product views', base: 8640, hint: 'Product detail views' },
  { key: 'visitors', label: 'Unique visitors', base: 2180, hint: 'Distinct sessions' },
  { key: 'addToCart', label: 'Add to cart', base: 312, hint: 'Add-to-cart events' },
  { key: 'checkouts', label: 'Checkouts', base: 96, hint: 'Checkout started' },
  { key: 'convRate', label: 'Conversion rate', base: 4, hint: 'Purchases / views' },
]

const CUSTOMER_KPIS: KpiDef[] = [
  { key: 'new', label: 'New customers', base: 38, hint: 'First-time buyers' },
  { key: 'returning', label: 'Returning', base: 26, hint: 'Repeat buyers' },
  { key: 'total', label: 'Total customers', base: 64, hint: 'In this range' },
  { key: 'ltv', label: 'Avg. LTV', base: 412, hint: 'Lifetime value', money: true },
]

const PRODUCTS_KPIS: KpiDef[] = [
  { key: 'pViews', label: 'Total views', base: 8640, hint: 'Product detail views' },
  { key: 'pAddToCart', label: 'Add to cart', base: 312, hint: 'Add-to-cart events' },
  { key: 'pUnits', label: 'Units sold', base: 128, hint: 'Items sold' },
  { key: 'pRevenue', label: 'Revenue', base: 18450, hint: 'Gross revenue', money: true },
  { key: 'pConvRate', label: 'Avg. conv. rate', base: 4, hint: 'Purchases / views' },
  { key: 'pReturnRate', label: 'Avg. return rate', base: 3, hint: 'Returned / sold' },
]

const CHART_LABELS: Record<number, string[]> = {
  1: ['12a', '4a', '8a', '12p', '4p', '8p'],
  7: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  30: ['W1', 'W2', 'W3', 'W4'],
  90: ['M1', 'M2', 'M3'],
}

const SALES_BREAKDOWN = [
  { id: 'khalti', label: 'Khalti' },
  { id: 'esewa', label: 'eSewa' },
  { id: 'cod', label: 'Cash on delivery' },
  { id: 'bank', label: 'Bank transfer' },
]

const TRAFFIC_BREAKDOWN = [
  { id: 'direct', label: 'Direct' },
  { id: 'search', label: 'Search' },
  { id: 'social', label: 'Social' },
  { id: 'referral', label: 'Referral' },
]

const TRAFFIC_SOURCES = [
  { id: 'search', label: 'Search' },
  { id: 'categories', label: 'Categories' },
  { id: 'deals', label: 'Deals' },
  { id: 'direct', label: 'Direct' },
  { id: 'share', label: 'Share' },
]

const FUNNEL_STAGES = [
  { id: 'views', label: 'Store views', ratio: 1.0 },
  { id: 'productViews', label: 'Product views', ratio: 0.72 },
  { id: 'addToCart', label: 'Add to cart', ratio: 0.36 },
  { id: 'checkout', label: 'Checkout', ratio: 0.12 },
  { id: 'purchase', label: 'Purchase', ratio: 0.08 },
]

const SALES_CATEGORY_BREAKDOWN = [
  { id: 'electronics', label: 'Electronics' },
  { id: 'handicrafts', label: 'Handicrafts' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'groceries', label: 'Groceries' },
]

const SALES_PAYMENT_BREAKDOWN = [
  { id: 'prepaid', label: 'Prepaid' },
  { id: 'cod', label: 'Cash on delivery' },
]

const SALES_STATUS_BREAKDOWN = [
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'fulfilled', label: 'Fulfilled' },
  { id: 'refunded', label: 'Refunded' },
  { id: 'cancelled', label: 'Cancelled' },
]

const BREAKDOWN_PALETTE = ['#8A1B57', '#B23C7E', '#E0A93B', '#6B7280', '#2563EB', '#16A34A']

const PRODUCT_ROWS = [
  { id: 'p1', name: 'Samsung Galaxy A55', category: 'Electronics', base: 4200 },
  { id: 'p2', name: 'Dhaka Topi', category: 'Handicrafts', base: 2800 },
  { id: 'p3', name: 'Pashmina Shawl', category: 'Fashion', base: 3600 },
  { id: 'p4', name: 'Khukuri Knife', category: 'Handicrafts', base: 1900 },
  { id: 'p5', name: 'Organic Honey 500g', category: 'Groceries', base: 1200 },
  { id: 'p6', name: 'Singing Bowl', category: 'Handicrafts', base: 980 },
]

const CUSTOMER_ROWS = [
  { id: 'c1', name: 'Aarav Sharma', orders: 6, lastOrder: '2d ago' },
  { id: 'c2', name: 'Sita Gurung', orders: 4, lastOrder: '5d ago' },
  { id: 'c3', name: 'Bishal Thapa', orders: 3, lastOrder: '1w ago' },
  { id: 'c4', name: 'Riya Maharjan', orders: 3, lastOrder: '2w ago' },
  { id: 'c5', name: 'Niraj Kc', orders: 2, lastOrder: '3w ago' },
]

function seeded(n: number, seed: number): number {
  const x = Math.sin(seed + n * 99.13) * 10000
  return x - Math.floor(x)
}

function scaleFor(days: number): number {
  if (days <= 1) return 0.08
  if (days <= 7) return 0.55
  if (days <= 30) return 1
  return 2.6
}

function trendFor(delta: number): 'up' | 'down' | 'flat' {
  return delta > 3 ? 'up' : delta < -3 ? 'down' : 'flat'
}

function fmtMoney(n: number): string {
  return `NPR ${Math.round(n).toLocaleString()}`
}

function fmtPct(n: number): string {
  return `${n}%`
}

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString()
}

export function getAnalytics(
  section: AnalyticsSection,
  range: AnalyticsRange,
  opts: { compare?: boolean; filter?: AnalyticsFilter } = {},
): AnalyticsSectionData {
  const compare = opts.compare ?? false
  const filter = opts.filter
  const days = range.days
  const scale = scaleFor(days)
  const seedBase = days + (filter?.categoryId?.length ?? 0) + (filter?.productId?.length ?? 0)

  const kpiDefs =
    section === 'sales'
      ? SALES_KPIS
      : section === 'traffic'
        ? TRAFFIC_KPIS
        : section === 'products'
          ? PRODUCTS_KPIS
          : section === 'customers'
            ? CUSTOMER_KPIS
            : SALES_KPIS

  const kpis: AnalyticsKpi[] = kpiDefs.map((k, i) => {
    const raw = k.base * scale * (0.82 + seeded(i, seedBase) * 0.34)
    const prevRaw = k.base * scale * (0.7 + seeded(i + 7, seedBase) * 0.4)
    const deltaPct = Math.round((seeded(i + 1, seedBase) - 0.42) * 44)
    const isMoney = k.money === true || k.key === 'aov' || k.key === 'ltv'
    const isPct = k.key === 'bounce' || k.key === 'convRate'
    const isConvRate = k.key === 'convRate'
    const displayValue = isConvRate
      ? `${raw.toFixed(1)}%`
      : isMoney
        ? fmtMoney(raw)
        : isPct
          ? fmtPct(Math.round(raw))
          : fmtNum(raw)
    const value = displayValue
    const previousValue = compare
      ? isConvRate
        ? `${prevRaw.toFixed(1)}%`
        : isMoney
          ? fmtMoney(prevRaw)
          : isPct
            ? fmtPct(Math.round(prevRaw))
            : fmtNum(prevRaw)
      : undefined
    return {
      key: k.key,
      label: k.label,
      value,
      rawValue: raw,
      deltaPct,
      trend: trendFor(deltaPct),
      hint: k.hint,
      previousValue,
    }
  })

  const labels = CHART_LABELS[days] ?? CHART_LABELS[30]
  const chart: AnalyticsChartPoint[] = labels.map((label, i) => {
    const base = section === 'traffic' ? 1600 : 2200
    const current = Math.round(base * scale * (0.45 + seeded(i + 10, seedBase) * 0.95))
    const previous = compare
      ? Math.round(base * scale * (0.4 + seeded(i + 20, seedBase + 1) * 0.85))
      : undefined
    return { label, current, previous }
  })

  const breakdownDefs =
    section === 'sales'
      ? SALES_BREAKDOWN
      : section === 'traffic'
        ? TRAFFIC_BREAKDOWN
        : section === 'products'
          ? SALES_BREAKDOWN
          : TRAFFIC_BREAKDOWN

  const totalShare = breakdownDefs.length
  const breakdown: AnalyticsBreakdownRow[] = breakdownDefs.map((b, i) => {
    const value = Math.round(100 * scale * (0.4 + seeded(i + 3, seedBase) * 0.9))
    const share = Math.round((100 / totalShare) * (0.6 + seeded(i + 5, seedBase) * 0.8))
    const deltaPct = Math.round((seeded(i + 9, seedBase) - 0.4) * 40)
    return {
      id: b.id,
      label: b.label,
      value,
      share,
      deltaPct,
      color: BREAKDOWN_PALETTE[i % BREAKDOWN_PALETTE.length],
    }
  })

  let breakdowns: AnalyticsBreakdownGroup[] | undefined
  let insights: AnalyticsInsight[] | undefined

  if (section === 'sales') {
    const mkGroup = (
      id: string,
      title: string,
      defs: { id: string; label: string }[],
      moneyValue: boolean,
    ): AnalyticsBreakdownGroup => {
      const rows: AnalyticsBreakdownRow[] = defs.map((b, i) => {
        const value = Math.round(
          (moneyValue ? 4200 : 40) * scale * (0.4 + seeded(i + 30 + id.length, seedBase) * 1.2),
        )
        const share = Math.round(
          (100 / defs.length) * (0.6 + seeded(i + 40 + id.length, seedBase) * 0.8),
        )
        const deltaPct = Math.round((seeded(i + 50 + id.length, seedBase) - 0.4) * 40)
        return {
          id: b.id,
          label: b.label,
          value,
          share,
          deltaPct,
          color: BREAKDOWN_PALETTE[i % BREAKDOWN_PALETTE.length],
        }
      })
      const total = rows.reduce((s, r) => s + r.value, 0)
      return { id, title, total, rows }
    }

    breakdowns = [
      mkGroup('category', 'Sales by category', SALES_CATEGORY_BREAKDOWN, true),
      mkGroup('payment', 'Sales by payment type', SALES_PAYMENT_BREAKDOWN, true),
      mkGroup('status', 'Sales by status', SALES_STATUS_BREAKDOWN, false),
    ]

    insights = [
      {
        id: 'best-period',
        title: 'Best period',
        body: `Revenue peaked in the most recent ${days <= 1 ? 'hours' : days <= 7 ? 'days' : 'weeks'} — NPR ${fmtMoney(4200 * scale)} (gross), up 12% vs the previous period.`,
        tone: 'best',
        period: range.label,
      },
      {
        id: 'worst-period',
        title: 'Slowest period',
        body: `Midweek dipped to NPR ${fmtMoney(1800 * scale)} (net) — 8% below the range average. Consider a midweek promotion.`,
        tone: 'worst',
        period: range.label,
      },
    ]
  }

  let products: AnalyticsProductRow[] | undefined
  let customers: AnalyticsCustomerRow[] | undefined

  if (section === 'products') {
    products = PRODUCT_ROWS.map((p, i) => {
      const revenue = p.base * scale * (0.7 + seeded(i, seedBase) * 0.6)
      const views = Math.round(p.base * scale * (2 + seeded(i + 2, seedBase) * 1.5))
      const addToCart = Math.round(views * (0.08 + seeded(i + 12, seedBase) * 0.06))
      const units = Math.round(revenue / 480)
      const convPct = Math.round((4 + seeded(i + 4, seedBase) * 6) * 10) / 10
      const returnRate = Math.round((1 + seeded(i + 14, seedBase) * 5) * 10) / 10
      const deltaPct = Math.round((seeded(i + 6, seedBase) - 0.4) * 50)
      const sparkline = Array.from({ length: 7 }, (_, j) =>
        Math.round(p.base * scale * 0.1 * (0.5 + seeded(i * 10 + j + 20, seedBase) * 1.2)),
      )
      const outOfStock = seeded(i + 30, seedBase) > 0.82
      const stockCount = outOfStock ? 0 : Math.round(50 + seeded(i + 31, seedBase) * 200)
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        views,
        addToCart,
        units,
        revenue: Math.round(revenue),
        convPct,
        returnRate,
        deltaPct,
        sparkline,
        outOfStock,
        stockCount,
      }
    })
  }

  if (section === 'customers') {
    customers = CUSTOMER_ROWS.map((c, i) => {
      const spend = c.orders * (260 + seeded(i, seedBase) * 220) * scale
      return {
        id: c.id,
        name: c.name,
        orders: c.orders,
        spend: Math.round(spend),
        aov: Math.round(spend / c.orders),
        lastOrder: c.lastOrder,
      }
    })
  }

  let funnel: AnalyticsFunnelStage[] | undefined
  let trafficSources: AnalyticsTrafficSource[] | undefined
  let convTrend: AnalyticsChartPoint[] | undefined

  if (section === 'traffic') {
    const baseCount = Math.round(3120 * scale * (0.8 + seeded(0, seedBase) * 0.4))
    const counts = FUNNEL_STAGES.map((s, i) => {
      const variance = 0.85 + seeded(i + 60, seedBase) * 0.3
      return Math.round(baseCount * s.ratio * variance)
    })

    const dropOffs = FUNNEL_STAGES.map((_, i) => {
      if (i === 0) return 0
      const prev = counts[i - 1] || 1
      const curr = counts[i] || 0
      return Math.round(((prev - curr) / prev) * 100)
    })

    const biggestLeakIdx =
      dropOffs.indexOf(Math.max(...dropOffs.slice(1)) + 0) === -1
        ? dropOffs.reduce((best, d, i) => (i > 0 && d > dropOffs[best] ? i : best), 1)
        : 1

    funnel = FUNNEL_STAGES.map((s, i) => {
      const prev = i === 0 ? counts[0] : counts[i - 1] || 1
      const curr = counts[i] || 0
      const convFromPrev = i === 0 ? 100 : Math.round((curr / prev) * 100)
      return {
        id: s.id,
        label: s.label,
        count: curr,
        convFromPrev,
        dropOffPct: dropOffs[i],
        isBiggestLeak: i === biggestLeakIdx && i > 0,
      }
    })

    const sourceTotal = TRAFFIC_SOURCES.reduce(
      (acc, s, i) =>
        acc + Math.round(baseCount * (0.3 - i * 0.04) * (0.8 + seeded(i + 80, seedBase) * 0.4)),
      0,
    )
    trafficSources = TRAFFIC_SOURCES.map((s, i) => {
      const value = Math.round(
        baseCount * (0.3 - i * 0.04) * (0.8 + seeded(i + 80, seedBase) * 0.4),
      )
      return {
        id: s.id,
        label: s.label,
        value,
        share: sourceTotal > 0 ? Math.round((value / sourceTotal) * 100) : 0,
        color: BREAKDOWN_PALETTE[i % BREAKDOWN_PALETTE.length],
      }
    })

    const convLabels = CHART_LABELS[days] ?? CHART_LABELS[30]
    convTrend = convLabels.map((label, i) => {
      const current = Math.round((3 + seeded(i + 90, seedBase) * 3) * 10) / 10
      const previous = compare
        ? Math.round((2.5 + seeded(i + 100, seedBase + 1) * 3) * 10) / 10
        : undefined
      return { label, current, previous }
    })
  }

  let productCallouts: AnalyticsProductCallout[] | undefined
  let categoryComparison: AnalyticsCategoryComparison[] | undefined

  if (section === 'products' && products) {
    const sortedByRevenue = [...products].sort((a, b) => b.revenue - a.revenue)
    const sortedByConv = [...products].sort((a, b) => a.convPct - b.convPct)
    const oosDemand = products.filter(p => p.outOfStock && p.views > sortedByRevenue[Math.floor(sortedByRevenue.length / 2)].views)

    productCallouts = [
      {
        id: 'top',
        type: 'top',
        title: 'Top sellers',
        hint: 'Strong revenue and conversion this period',
        productIds: sortedByRevenue.slice(0, 2).map(p => p.id),
        productNames: sortedByRevenue.slice(0, 2).map(p => p.name),
      },
      {
        id: 'under',
        type: 'under',
        title: 'Underperformers',
        hint: 'High views, low conversion — check pricing or photos',
        productIds: sortedByConv.slice(0, 2).map(p => p.id),
        productNames: sortedByConv.slice(0, 2).map(p => p.name),
      },
    ]
    if (oosDemand.length > 0) {
      productCallouts.push({
        id: 'oos',
        type: 'oos_demand',
        title: 'Out of stock but in demand',
        hint: 'Still getting views but no stock — restock to recover sales',
        productIds: oosDemand.map(p => p.id),
        productNames: oosDemand.map(p => p.name),
      })
    }

    const catMap = new Map<string, { revenue: number; units: number; views: number; convSum: number; count: number }>()
    for (const p of products) {
      const existing = catMap.get(p.category) ?? { revenue: 0, units: 0, views: 0, convSum: 0, count: 0 }
      existing.revenue += p.revenue
      existing.units += p.units
      existing.views += p.views
      existing.convSum += p.convPct
      existing.count += 1
      catMap.set(p.category, existing)
    }
    const catTotal = [...catMap.values()].reduce((s, v) => s + v.revenue, 0) || 1
    categoryComparison = [...catMap.entries()].map(([cat, v], i) => ({
      id: cat.toLowerCase(),
      label: cat,
      revenue: v.revenue,
      units: v.units,
      views: v.views,
      convPct: Math.round((v.convSum / v.count) * 10) / 10,
      share: Math.round((v.revenue / catTotal) * 100),
      color: BREAKDOWN_PALETTE[i % BREAKDOWN_PALETTE.length],
    }))
  }

  return {
    section,
    range,
    compare,
    kpis,
    chart,
    breakdown,
    breakdowns,
    insights,
    products,
    customers,
    funnel,
    trafficSources,
    convTrend,
    productCallouts,
    categoryComparison,
  }
}

export interface SalesTrendOptions {
  granularity?: AnalyticsChartGranularity
  grossNet?: 'gross' | 'net'
}

export function getSalesTrend(
  range: AnalyticsRange,
  opts: SalesTrendOptions & { compare?: boolean; filter?: AnalyticsFilter } = {},
): {
  points: AnalyticsChartPoint[]
  granularity: AnalyticsChartGranularity
  grossNet: 'gross' | 'net'
} {
  const granularity = opts.granularity ?? 'day'
  const grossNet = opts.grossNet ?? 'net'
  const compare = opts.compare ?? false
  const filter = opts.filter
  const days = range.days
  const scale = scaleFor(days)
  const seedBase = days + granularity.length + grossNet.length + (filter?.categoryId?.length ?? 0)

  const granularityLabels: Record<AnalyticsChartGranularity, string[]> = {
    day:
      days <= 1
        ? ['12a', '4a', '8a', '12p', '4p', '8p']
        : days <= 7
          ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          : Array.from({ length: Math.min(days, 14) }, (_, i) => `D${i + 1}`),
    week: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
    month: ['M1', 'M2', 'M3'],
  }
  const labels = granularityLabels[granularity]
  const netFactor = grossNet === 'net' ? 0.88 : 1
  const base = 2200

  const points: AnalyticsChartPoint[] = labels.map((label, i) => {
    const current = Math.round(base * scale * netFactor * (0.45 + seeded(i + 10, seedBase) * 0.95))
    const previous = compare
      ? Math.round(base * scale * netFactor * (0.4 + seeded(i + 20, seedBase + 1) * 0.85))
      : undefined
    return { label, current, previous }
  })

  return { points, granularity, grossNet }
}

export function getProductDetail(
  productId: string,
  range: AnalyticsRange,
  opts: { compare?: boolean; filter?: AnalyticsFilter } = {},
): AnalyticsProductDetail | null {
  const compare = opts.compare ?? false
  const days = range.days
  const scale = scaleFor(days)
  const seedBase = days + productId.length

  const productDef = PRODUCT_ROWS.find(p => p.id === productId)
  if (!productDef) return null

  const i = PRODUCT_ROWS.indexOf(productDef)
  const revenue = productDef.base * scale * (0.7 + seeded(i, seedBase) * 0.6)
  const views = Math.round(productDef.base * scale * (2 + seeded(i + 2, seedBase) * 1.5))
  const addToCart = Math.round(views * (0.08 + seeded(i + 12, seedBase) * 0.06))
  const units = Math.round(revenue / 480)
  const convPct = Math.round((4 + seeded(i + 4, seedBase) * 6) * 10) / 10
  const returnRate = Math.round((1 + seeded(i + 14, seedBase) * 5) * 10) / 10
  const deltaPct = Math.round((seeded(i + 6, seedBase) - 0.4) * 50)
  const sparkline = Array.from({ length: 7 }, (_, j) =>
    Math.round(productDef.base * scale * 0.1 * (0.5 + seeded(i * 10 + j + 20, seedBase) * 1.2)),
  )
  const outOfStock = seeded(i + 30, seedBase) > 0.82
  const stockCount = outOfStock ? 0 : Math.round(50 + seeded(i + 31, seedBase) * 200)

  const product: AnalyticsProductRow = {
    id: productDef.id,
    name: productDef.name,
    category: productDef.category,
    views,
    addToCart,
    units,
    revenue: Math.round(revenue),
    convPct,
    returnRate,
    deltaPct,
    sparkline,
    outOfStock,
    stockCount,
  }

  const labels = CHART_LABELS[days] ?? CHART_LABELS[30]
  const trend: AnalyticsChartPoint[] = labels.map((label, j) => {
    const current = Math.round(revenue / labels.length * (0.5 + seeded(j + 40, seedBase) * 1.0))
    const previous = compare
      ? Math.round(revenue / labels.length * (0.4 + seeded(j + 50, seedBase + 1) * 0.9))
      : undefined
    return { label, current, previous }
  })

  const funnelStages = [
    { id: 'views', label: 'Views', ratio: 1.0 },
    { id: 'addToCart', label: 'Add to cart', ratio: 0.36 },
    { id: 'checkout', label: 'Checkout', ratio: 0.12 },
    { id: 'purchase', label: 'Purchase', ratio: 0.08 },
  ]
  const funnel: AnalyticsFunnelStage[] = funnelStages.map((s, j) => {
    const count = Math.round(views * s.ratio * (0.85 + seeded(j + 60 + i, seedBase) * 0.3))
    const prev = j === 0 ? count : Math.round(views * funnelStages[j - 1].ratio * (0.85 + seeded(j - 1 + 60 + i, seedBase) * 0.3))
    const convFromPrev = j === 0 ? 100 : Math.round((count / Math.max(1, prev)) * 100)
    const dropOffPct = j === 0 ? 0 : Math.round(((prev - count) / Math.max(1, prev)) * 100)
    return { id: s.id, label: s.label, count, convFromPrev, dropOffPct, isBiggestLeak: false }
  })

  const biggestLeakIdx = funnel.reduce((best, f, j) => (j > 0 && f.dropOffPct > funnel[best].dropOffPct ? j : best), 1)
  funnel[biggestLeakIdx].isBiggestLeak = true

  return { product, trend, funnel }
}
