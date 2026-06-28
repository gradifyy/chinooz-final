export type FinanceRangeKey = 'today' | '7d' | '30d' | 'month' | 'custom'

export interface FinanceRange {
  key: FinanceRangeKey
  label: string
  days: number
  custom?: { start: string; end: string }
}

export interface FinanceEarningsPoint {
  label: string
  date: string
  gross: number
  net: number
  sales: number
  refunds: number
  fees: number
}

export interface FinanceEarningsSeries {
  points: FinanceEarningsPoint[]
  previousPoints: FinanceEarningsPoint[]
  comparisonPct: number
  peak: FinanceEarningsPoint | null
}

export interface FinanceSummary {
  range: FinanceRange
  currency: 'NPR'
  availableBalance: number
  pendingBalance: number
  lifetimeEarnings: number
  thisPeriodNet: number
  pendingPayout: number
  nextScheduledPayoutDate: string
  earnings: FinanceEarningsSeries
}

export const FINANCE_DATE_RANGES: { key: FinanceRangeKey; label: string; days: number }[] = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7d', days: 7 },
  { key: '30d', label: '30d', days: 30 },
  { key: 'month', label: 'This month', days: 30 },
  { key: 'custom', label: 'Custom', days: 30 },
]

const CHART_LABELS: Record<number, string[]> = {
  1: ['12a', '4a', '8a', '12p', '4p', '8p'],
  7: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  30: ['W1', 'W2', 'W3', 'W4'],
}

function seeded(n: number, seed: number): number {
  const x = Math.sin(seed + n) * 10000
  return x - Math.floor(x)
}

const FEE_RATE = 0.04
const REFUND_RATE = 0.03

function buildEarnings(
  days: number,
  scale: number,
  seed: number,
  previous = false,
): FinanceEarningsPoint[] {
  const labels = CHART_LABELS[days] ?? CHART_LABELS[30]
  const seedOffset = previous ? 50 : 0
  const base = new Date()
  base.setDate(base.getDate() - (previous ? days : 0))
  return labels.map((label, i) => {
    const gross = Math.round(2000 * scale * (0.5 + seeded(i + 10 + seedOffset, seed) * 0.9))
    const fees = Math.round(gross * FEE_RATE)
    const refunds = Math.round(gross * REFUND_RATE * (0.6 + seeded(i + 30 + seedOffset, seed) * 0.6))
    const sales = gross + refunds
    const net = gross - fees - refunds
    const d = new Date(base)
    d.setDate(d.getDate() + (days === 1 ? 0 : Math.round((i / Math.max(1, labels.length - 1)) * days)))
    return { label, date: d.toISOString().slice(0, 10), gross, net, sales, refunds, fees }
  })
}

function computeComparison(current: number[], previous: number[]): number {
  const c = current.reduce((a, b) => a + b, 0)
  const p = previous.reduce((a, b) => a + b, 0)
  if (p === 0) return c > 0 ? 100 : 0
  return Math.round(((c - p) / p) * 100)
}

export async function getFinanceSummary(range: FinanceRange): Promise<FinanceSummary> {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 350))

  const days = range.days
  const scale = days === 1 ? 0.08 : days === 7 ? 0.55 : 1
  const seed = days + (range.custom ? 13 : 0) + (range.key === 'month' ? 7 : 0)

  const availableBalance = 45200
  const pendingBalance = Math.round(12400 * (0.9 + seeded(2, seed) * 0.2))
  const lifetimeEarnings = Math.round(2846500 * (0.96 + seeded(3, seed) * 0.08))
  const thisPeriodNet = Math.round(18450 * scale * (0.85 + seeded(4, seed) * 0.3))
  const pendingPayout = Math.round(8600 * (0.85 + seeded(5, seed) * 0.3))

  const next = new Date()
  next.setDate(next.getDate() + 3)
  const nextScheduledPayoutDate = next.toISOString().slice(0, 10)

  const points = buildEarnings(days, scale, seed, false)
  const previousPoints = buildEarnings(days, scale, seed, true)
  const comparisonPct = computeComparison(points.map(p => p.net), previousPoints.map(p => p.net))
  const peak = points.reduce((m, p) => (m && m.net > p.net ? m : p), null as FinanceEarningsPoint | null)

  return {
    range,
    currency: 'NPR',
    availableBalance,
    pendingBalance,
    lifetimeEarnings,
    thisPeriodNet,
    pendingPayout,
    nextScheduledPayoutDate,
    earnings: { points, previousPoints, comparisonPct, peak },
  }
}

export function formatNPR(value: number): string {
  return `NPR ${value.toLocaleString('en-US')}`
}

export function formatNPRAmount(value: number): string {
  return value.toLocaleString('en-US')
}
