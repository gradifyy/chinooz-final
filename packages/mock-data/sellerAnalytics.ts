export type AnalyticsRangeKey = 'today' | '7d' | '30d' | '90d' | 'this_month' | 'custom'

export type AnalyticsSection = 'sales' | 'traffic' | 'products' | 'customers'

export interface AnalyticsRange {
  key: AnalyticsRangeKey
  label: string
  days: number
  custom?: { start: string; end: string }
}

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
}

export interface AnalyticsProductRow {
  id: string
  name: string
  category: string
  views: number
  units: number
  revenue: number
  convPct: number
  deltaPct: number
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
  products?: AnalyticsProductRow[]
  customers?: AnalyticsCustomerRow[]
}

export const ANALYTICS_RANGES: { key: AnalyticsRangeKey; label: string; days: number }[] = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7d', days: 7 },
  { key: '30d', label: '30d', days: 30 },
  { key: '90d', label: '90d', days: 90 },
  { key: 'this_month', label: 'This month', days: 30 },
  { key: 'custom', label: 'Custom', days: 30 },
]

const SALES_KPIS = [
  { key: 'revenue', label: 'Revenue', base: 18450, hint: 'Gross sales' },
  { key: 'orders', label: 'Orders', base: 64, hint: 'Confirmed orders' },
  { key: 'aov', label: 'Avg. order value', base: 288, hint: 'Revenue / orders' },
  { key: 'refunds', label: 'Refunds', base: 2, hint: 'Refunded orders' },
] as const

const TRAFFIC_KPIS = [
  { key: 'views', label: 'Store views', base: 3120, hint: 'Unique visitors' },
  { key: 'visitors', label: 'Unique visitors', base: 2180, hint: 'Distinct sessions' },
  { key: 'bounce', label: 'Bounce rate', base: 42, hint: 'Left after one page' },
  { key: 'session', label: 'Avg. session', base: 184, hint: 'Seconds / session' },
] as const

const CUSTOMER_KPIS = [
  { key: 'new', label: 'New customers', base: 38, hint: 'First-time buyers' },
  { key: 'returning', label: 'Returning', base: 26, hint: 'Repeat buyers' },
  { key: 'total', label: 'Total customers', base: 64, hint: 'In this range' },
  { key: 'ltv', label: 'Avg. LTV', base: 412, hint: 'Lifetime value' },
] as const

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
        : section === 'customers'
          ? CUSTOMER_KPIS
          : SALES_KPIS

  const kpis: AnalyticsKpi[] = kpiDefs.map((k, i) => {
    const raw = k.base * scale * (0.82 + seeded(i, seedBase) * 0.34)
    const prevRaw = k.base * scale * (0.7 + seeded(i + 7, seedBase) * 0.4)
    const deltaPct = Math.round((seeded(i + 1, seedBase) - 0.42) * 44)
    const isMoney = k.key === 'revenue' || k.key === 'aov' || k.key === 'ltv'
    const isPct = k.key === 'bounce'
    const value = isMoney ? fmtMoney(raw) : isPct ? fmtPct(Math.round(raw)) : fmtNum(raw)
    const previousValue = compare
      ? isMoney
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
    return { id: b.id, label: b.label, value, share, deltaPct }
  })

  let products: AnalyticsProductRow[] | undefined
  let customers: AnalyticsCustomerRow[] | undefined

  if (section === 'products') {
    products = PRODUCT_ROWS.map((p, i) => {
      const revenue = p.base * scale * (0.7 + seeded(i, seedBase) * 0.6)
      const views = Math.round(p.base * scale * (2 + seeded(i + 2, seedBase) * 1.5))
      const units = Math.round(revenue / 480)
      const convPct = Math.round((4 + seeded(i + 4, seedBase) * 6) * 10) / 10
      const deltaPct = Math.round((seeded(i + 6, seedBase) - 0.4) * 50)
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        views,
        units,
        revenue: Math.round(revenue),
        convPct,
        deltaPct,
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

  return { section, range, compare, kpis, chart, breakdown, products, customers }
}
