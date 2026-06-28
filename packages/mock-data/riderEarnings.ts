/**
 * RE1 — Rider Earnings mock data.
 *
 * Shared source for the rider-mobile "Earnings" tab (overview, chart, ledger,
 * cash-out). All amounts are NPR integers (paisa = 0) so the UI can render
 * tabular figures without floating-point rounding noise.
 *
 * Surfaces:
 * - getRiderEarnings():  withdrawable balance, period summaries, pending
 *   clearance, and entry-point flags for the overview hero.
 * - getRiderEarningsChart():  RE2 chart series (today / 7d / 30d).
 * - getRiderEarningsLedger():  RE3 trip-level ledger rows.
 * - getRiderCashWallet():  Cash & COD Wallet (cash-in-hand, owed to Chinooz).
 *
 * The Cash & COD Wallet is intentionally a separate concept from earnings:
 * "earnings" = income Chinooz owes the rider (withdrawable), while
 * "cash-in-hand" = physical cash the rider collected for COD orders and
 * must remit. The overview hero always shows the withdrawable balance.
 */

export type RiderEarningsRangeKey = 'today' | '7d' | '30d' | 'month'

export interface RiderEarningsRange {
  key: RiderEarningsRangeKey
  label: string
  days: number
}

export interface RiderPeriodSummary {
  range: RiderEarningsRange
  /** Net earned (NPR) for the period, after Chinooz commission + incentives. */
  earned: number
  /** Completed trips in the period. */
  trips: number
  /** Avg earn per trip (NPR). */
  perTrip: number
}

export interface RiderEarningsOverview {
  currency: 'NPR'
  /** Withdrawable income — the hero number. */
  withdrawableBalance: number
  /** Lifetime earnings (NPR). */
  lifetimeEarnings: number
  /** Funds in clearance, available in 1-2 days. */
  pendingClearance: number
  /** Next scheduled payout date (ISO yyyy-mm-dd). */
  nextPayoutDate: string
  /** Period summaries shown as tiles. */
  periods: RiderPeriodSummary[]
  /** True when a cash-out is currently in flight (mock). */
  hasActiveCashout: boolean
  /** ISO timestamp of last cash-out, if any. */
  lastCashoutAt: string | null
}

export interface RiderChartPoint {
  label: string
  value: number
  /** ISO date (yyyy-mm-dd) for the point, used for ledger deep-links. */
  date: string
  /** Base pay component for the point (NPR). */
  base: number
  /** Distance pay component for the point (NPR). */
  distance: number
  /** Incentives/bonuses component for the point (NPR). */
  incentives: number
  /** Tips component for the point (NPR). */
  tips: number
  /** Platform fee deducted for the point (NPR, positive number). */
  fee: number
  /** Trips count for the point. */
  trips: number
  /** Previous-period net value for comparison (NPR). */
  previous?: number
}

export interface RiderEarningsBreakdownRow {
  /** Stable id, e.g. "base". */
  id: 'base' | 'distance' | 'incentives' | 'tips' | 'fee'
  /** Human label. */
  label: string
  /** Signed NPR total for the period (fee is negative). */
  amount: number
  /** Share of gross, 0-100. */
  share: number
}

export interface RiderEarningsBreakdown {
  range: RiderEarningsRange
  /** Gross earnings before fee (base + distance + incentives + tips). */
  gross: number
  /** Platform fee (positive number). */
  fee: number
  /** Net earnings (gross - fee). */
  net: number
  rows: RiderEarningsBreakdownRow[]
  /** Previous-period net for comparison (NPR). */
  previousNet: number
  /** Percent change vs previous period. */
  deltaPct: number
  /** Trend direction. */
  trend: 'up' | 'down' | 'flat'
  /** Busiest day/time hint label, e.g. "Fri 6–8p". */
  busiestLabel: string
  /** Busiest period earnings (NPR). */
  busiestAmount: number
  /** Trip count in the period. */
  trips: number
}

export interface RiderEarningsChart {
  range: RiderEarningsRange
  points: RiderChartPoint[]
}

export type RiderLedgerKind =
  | 'trip_earning'
  | 'incentive'
  | 'cashout'
  | 'adjustment'
  | 'cod_remit'

export interface RiderLedgerRow {
  id: string
  /** ISO date (yyyy-mm-dd). */
  date: string
  /** Human label, e.g. "Trip #4471 — Patan to Thapathali". */
  label: string
  kind: RiderLedgerKind
  /** Signed NPR amount (positive = credit, negative = debit). */
  amount: number
  /** Running withdrawable balance after this entry (NPR). */
  balanceAfter: number
}

export interface RiderCashWallet {
  currency: 'NPR'
  /** Physical cash the rider holds from COD collections. */
  cashInHand: number
  /** Cash owed to Chinooz (to be remitted). */
  owedToChinooz: number
  /** COD orders collected today (count). */
  codCollectedToday: number
  /** Suggested remit amount for the next deposit drop. */
  suggestedRemit: number
  /** Date of last remit (ISO yyyy-mm-dd), if any. */
  lastRemitDate: string | null
}

export const RIDER_EARNINGS_RANGES: { key: RiderEarningsRangeKey; label: string; days: number }[] = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7d', days: 7 },
  { key: '30d', label: '30d', days: 30 },
  { key: 'month', label: 'This month', days: 30 },
]

const CHART_LABELS: Record<number, string[]> = {
  1: ['12a', '4a', '8a', '12p', '4p', '8p'],
  7: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  30: ['W1', 'W2', 'W3', 'W4'],
}

const CHART_DATES: Record<number, () => string[]> = {
  1: () => {
    const today = new Date()
    return ['12a', '4a', '8a', '12p', '4p', '8p'].map(() => today.toISOString().slice(0, 10))
  },
  7: () => {
    const out: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      out.push(d.toISOString().slice(0, 10))
    }
    return out
  },
  30: () => {
    const out: string[] = []
    for (let i = 27; i >= 0; i -= 7) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      out.push(d.toISOString().slice(0, 10))
    }
    return out
  },
}

function seeded(n: number, seed: number): number {
  const x = Math.sin(seed + n * 99.13) * 10000
  return x - Math.floor(x)
}

function scaleFor(days: number): number {
  if (days <= 1) return 0.1
  if (days <= 7) return 0.6
  return 1
}

export async function getRiderEarnings(): Promise<RiderEarningsOverview> {
  await new Promise(resolve => setTimeout(resolve, 220 + Math.random() * 320))

  const withdrawableBalance = 18450
  const lifetimeEarnings = 487200
  const pendingClearance = 2400
  const next = new Date()
  next.setDate(next.getDate() + 2)
  const nextPayoutDate = next.toISOString().slice(0, 10)
  const lastCashoutAt = new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString()

  const periods: RiderPeriodSummary[] = RIDER_EARNINGS_RANGES.map(r => {
    const scale = scaleFor(r.days)
    const seed = r.days + (r.key === 'month' ? 11 : 0)
    const earned = Math.round(2200 * scale * (0.85 + seeded(1, seed) * 0.3))
    const trips = Math.max(1, Math.round(12 * scale * (0.8 + seeded(2, seed) * 0.4)))
    return {
      range: r,
      earned,
      trips,
      perTrip: Math.round(earned / trips),
    }
  })

  return {
    currency: 'NPR',
    withdrawableBalance,
    lifetimeEarnings,
    pendingClearance,
    nextPayoutDate,
    periods,
    hasActiveCashout: false,
    lastCashoutAt,
  }
}

export async function getRiderEarningsChart(range: RiderEarningsRange): Promise<RiderEarningsChart> {
  await new Promise(resolve => setTimeout(resolve, 160 + Math.random() * 220))
  const scale = scaleFor(range.days)
  const seed = range.days + 3
  const labels = CHART_LABELS[range.days] ?? CHART_LABELS[30]
  const dates = chartDatesFor(range.days)
  const points: RiderChartPoint[] = labels.map((label, i) => {
    const net = Math.round(420 * scale * (0.4 + seeded(i + 4, seed) * 0.9))
    const base = Math.round(net * 0.55)
    const distance = Math.round(net * 0.25)
    const incentives = Math.round(net * 0.12)
    const tips = Math.max(0, net - base - distance - incentives)
    const fee = Math.round((net / 0.92) * 0.08)
    const trips = Math.max(1, Math.round(6 * scale * (0.6 + seeded(i + 9, seed) * 0.8)))
    const previous = Math.round(420 * scale * (0.35 + seeded(i + 20, seed + 1) * 0.8))
    return {
      label,
      date: dates[i] ?? dates[0],
      value: net,
      base,
      distance,
      incentives,
      tips,
      fee,
      trips,
      previous,
    }
  })
  return { range, points }
}

function chartDatesFor(days: number): string[] {
  if (days <= 1) {
    const today = new Date().toISOString().slice(0, 10)
    return CHART_LABELS[1].map(() => today)
  }
  if (days <= 7) {
    const out: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      out.push(d.toISOString().slice(0, 10))
    }
    return out
  }
  const out: string[] = []
  for (let i = 27; i >= 0; i -= 7) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export async function getRiderEarningsBreakdown(range: RiderEarningsRange): Promise<RiderEarningsBreakdown> {
  await new Promise(resolve => setTimeout(resolve, 180 + Math.random() * 240))
  const chart = await getRiderEarningsChart(range)
  let base = 0
  let distance = 0
  let incentives = 0
  let tips = 0
  let fee = 0
  let trips = 0
  let busiestIdx = 0
  for (let i = 0; i < chart.points.length; i++) {
    const p = chart.points[i]
    base += p.base
    distance += p.distance
    incentives += p.incentives
    tips += p.tips
    fee += p.fee
    trips += p.trips
    if (p.value > chart.points[busiestIdx].value) busiestIdx = i
  }
  const gross = base + distance + incentives + tips
  const net = gross - fee
  const previousNet = chart.points.reduce((s, p) => s + (p.previous ?? 0), 0)
  const deltaPct = previousNet > 0 ? Math.round(((net - previousNet) / previousNet) * 100) : 0
  const trend: 'up' | 'down' | 'flat' = deltaPct > 1 ? 'up' : deltaPct < -1 ? 'down' : 'flat'
  const busiest = chart.points[busiestIdx]
  const rows: RiderEarningsBreakdownRow[] = [
    { id: 'base', label: 'Base pay', amount: base, share: gross > 0 ? Math.round((base / gross) * 100) : 0 },
    { id: 'distance', label: 'Distance pay', amount: distance, share: gross > 0 ? Math.round((distance / gross) * 100) : 0 },
    { id: 'incentives', label: 'Incentives & bonuses', amount: incentives, share: gross > 0 ? Math.round((incentives / gross) * 100) : 0 },
    { id: 'tips', label: 'Tips', amount: tips, share: gross > 0 ? Math.round((tips / gross) * 100) : 0 },
    { id: 'fee', label: 'Platform fee', amount: -fee, share: gross > 0 ? -Math.round((fee / gross) * 100) : 0 },
  ]
  return {
    range,
    gross,
    fee,
    net,
    rows,
    previousNet,
    deltaPct,
    trend,
    busiestLabel: busiest.label,
    busiestAmount: busiest.value,
    trips,
  }
}

export async function getRiderEarningsLedger(): Promise<RiderLedgerRow[]> {
  await new Promise(resolve => setTimeout(resolve, 180 + Math.random() * 240))
  const rows: Omit<RiderLedgerRow, 'balanceAfter'>[] = [
    { id: 'l1', date: '2025-06-28', label: 'Trip #4471 — Patan to Thapathali', kind: 'trip_earning', amount: 185 },
    { id: 'l2', date: '2025-06-28', label: 'Trip #4470 — Baluwatar to Naxal', kind: 'trip_earning', amount: 150 },
    { id: 'l3', date: '2025-06-28', label: 'Peak-hour incentive', kind: 'incentive', amount: 60 },
    { id: 'l4', date: '2025-06-27', label: 'Trip #4468 — Kirtipur to Kalanki', kind: 'trip_earning', amount: 195 },
    { id: 'l5', date: '2025-06-27', label: 'COD remit — 3 orders', kind: 'cod_remit', amount: -1240 },
    { id: 'l6', date: '2025-06-27', label: 'Cash out to eSewa', kind: 'cashout', amount: -5000 },
    { id: 'l7', date: '2025-06-26', label: 'Trip #4462 — Boudha to Jorpati', kind: 'trip_earning', amount: 140 },
    { id: 'l8', date: '2025-06-26', label: 'Adjustment — overcharge refund', kind: 'adjustment', amount: -25 },
  ]
  let running = 18450 + 5000 + 1240 - 185 - 150 - 60
  const withBalance: RiderLedgerRow[] = []
  for (const r of rows) {
    running += r.amount
    withBalance.push({ ...r, balanceAfter: running })
  }
  return withBalance
}

/**
 * RE3 — Trip-earnings ledger.
 *
 * A chronological list of completed trips grouped by day with daily totals.
 * Each trip carries route (pickup→drop-off area), distance, timestamp, net
 * earning, and any incentive/bonus line items. Incentive lines are surfaced
 * both inline (as a gold-accent marker) and as separate ledger entries so
 * the rider can see exactly what made up a trip's payout.
 */

export type TripLedgerKind = 'trip' | 'incentive' | 'tip' | 'adjustment'

export interface TripLedgerLine {
  id: string
  kind: TripLedgerKind
  /** Human label, e.g. "Base pay" or "Peak-hour bonus". */
  label: string
  /** Signed NPR amount (positive = credit, negative = debit). */
  amount: number
}

export interface TripLedgerEntry {
  id: string
  /** Job/order ref, e.g. "CHZ-2048". */
  orderRef: string
  /** ISO date (yyyy-mm-dd). */
  date: string
  /** ISO timestamp of completion. */
  completedAt: string
  /** Pickup area label, e.g. "Thamel". */
  pickupArea: string
  /** Drop-off area label, e.g. "Patan". */
  dropoffArea: string
  /** Trip distance in km (pickup→dropoff). */
  distanceKm: number
  /** Net earning for the trip (NPR), sum of lines. */
  netEarning: number
  /** Whether the trip had a COD collection. */
  isCod: boolean
  /** COD amount collected (NPR), 0 if prepaid. */
  codAmount: number
  /** Breakdown lines (base, distance, incentive, tip, fee, etc.). */
  lines: TripLedgerLine[]
  /** True if any line is an incentive/bonus. */
  hasIncentive: boolean
}

export interface TripLedgerDay {
  /** ISO date (yyyy-mm-dd). */
  date: string
  /** Human label, e.g. "Today" or "Fri, Jun 27". */
  label: string
  /** Entries for this day, newest first. */
  entries: TripLedgerEntry[]
  /** Sum of net earnings across the day's trips (NPR). */
  dailyTotal: number
  /** Trip count for the day. */
  tripCount: number
  /** Incentive/bonus total for the day (NPR). */
  incentiveTotal: number
}

export interface TripLedger {
  days: TripLedgerDay[]
  /** Grand total across all days (NPR). */
  grandTotal: number
  /** Total trip count. */
  totalTrips: number
}

function dayLabel(date: string): string {
  const d = new Date(date + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const TRIP_FIXTURES: Omit<TripLedgerEntry, 'netEarning' | 'hasIncentive'>[] = [
  {
    id: 'trip-1', orderRef: 'CHZ-2048', date: '2025-06-28',
    completedAt: '2025-06-28T18:42:00',
    pickupArea: 'Thamel', dropoffArea: 'Patan', distanceKm: 5.2,
    isCod: true, codAmount: 1299,
    lines: [
      { id: 't1l1', kind: 'trip', label: 'Base pay', amount: 120 },
      { id: 't1l2', kind: 'trip', label: 'Distance pay', amount: 45 },
      { id: 't1l3', kind: 'incentive', label: 'Peak-hour bonus', amount: 30 },
      { id: 't1l4', kind: 'tip', label: 'Customer tip', amount: 20 },
      { id: 't1l5', kind: 'adjustment', label: 'Platform fee', amount: -18 },
    ],
  },
  {
    id: 'trip-2', orderRef: 'CHZ-2046', date: '2025-06-28',
    completedAt: '2025-06-28T15:10:00',
    pickupArea: 'Baluwatar', dropoffArea: 'Naxal', distanceKm: 2.8,
    isCod: false, codAmount: 0,
    lines: [
      { id: 't2l1', kind: 'trip', label: 'Base pay', amount: 90 },
      { id: 't2l2', kind: 'trip', label: 'Distance pay', amount: 30 },
      { id: 't2l3', kind: 'adjustment', label: 'Platform fee', amount: -12 },
    ],
  },
  {
    id: 'trip-3', orderRef: 'CHZ-2044', date: '2025-06-28',
    completedAt: '2025-06-28T11:25:00',
    pickupArea: 'Baneshwor', dropoffArea: 'Koteshwor', distanceKm: 3.1,
    isCod: true, codAmount: 450,
    lines: [
      { id: 't3l1', kind: 'trip', label: 'Base pay', amount: 100 },
      { id: 't3l2', kind: 'trip', label: 'Distance pay', amount: 35 },
      { id: 't3l3', kind: 'incentive', label: '3-trip streak bonus', amount: 50 },
      { id: 't3l4', kind: 'adjustment', label: 'Platform fee', amount: -14 },
    ],
  },
  {
    id: 'trip-4', orderRef: 'CHZ-2041', date: '2025-06-27',
    completedAt: '2025-06-27T19:05:00',
    pickupArea: 'Kirtipur', dropoffArea: 'Kalanki', distanceKm: 4.4,
    isCod: false, codAmount: 0,
    lines: [
      { id: 't4l1', kind: 'trip', label: 'Base pay', amount: 110 },
      { id: 't4l2', kind: 'trip', label: 'Distance pay', amount: 55 },
      { id: 't4l3', kind: 'tip', label: 'Customer tip', amount: 15 },
      { id: 't4l4', kind: 'adjustment', label: 'Platform fee', amount: -16 },
    ],
  },
  {
    id: 'trip-5', orderRef: 'CHZ-2039', date: '2025-06-27',
    completedAt: '2025-06-27T13:48:00',
    pickupArea: 'Boudha', dropoffArea: 'Jorpati', distanceKm: 2.0,
    isCod: true, codAmount: 2150,
    lines: [
      { id: 't5l1', kind: 'trip', label: 'Base pay', amount: 80 },
      { id: 't5l2', kind: 'trip', label: 'Distance pay', amount: 25 },
      { id: 't5l3', kind: 'incentive', label: 'Surge zone bonus', amount: 40 },
      { id: 't5l4', kind: 'adjustment', label: 'Platform fee', amount: -10 },
    ],
  },
  {
    id: 'trip-6', orderRef: 'CHZ-2036', date: '2025-06-26',
    completedAt: '2025-06-26T17:30:00',
    pickupArea: 'Chabahil', dropoffArea: 'Gausala', distanceKm: 1.6,
    isCod: false, codAmount: 0,
    lines: [
      { id: 't6l1', kind: 'trip', label: 'Base pay', amount: 75 },
      { id: 't6l2', kind: 'trip', label: 'Distance pay', amount: 20 },
      { id: 't6l3', kind: 'adjustment', label: 'Platform fee', amount: -9 },
    ],
  },
]

function buildTripLedger(): TripLedger {
  const withNet: TripLedgerEntry[] = TRIP_FIXTURES.map(t => {
    const netEarning = t.lines.reduce((s, l) => s + l.amount, 0)
    const hasIncentive = t.lines.some(l => l.kind === 'incentive')
    return { ...t, netEarning, hasIncentive } as TripLedgerEntry
  })
  // Group by day, newest first.
  const byDay = new Map<string, TripLedgerEntry[]>()
  for (const e of withNet) {
    if (!byDay.has(e.date)) byDay.set(e.date, [])
    byDay.get(e.date)!.push(e)
  }
  const days: TripLedgerDay[] = Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, entries]) => {
      entries.sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))
      const dailyTotal = entries.reduce((s, e) => s + e.netEarning, 0)
      const tripCount = entries.length
      const incentiveTotal = entries.reduce(
        (s, e) => s + e.lines.filter(l => l.kind === 'incentive').reduce((ls, l) => ls + l.amount, 0),
        0,
      )
      return { date, label: dayLabel(date), entries, dailyTotal, tripCount, incentiveTotal }
    })
  const grandTotal = days.reduce((s, d) => s + d.dailyTotal, 0)
  const totalTrips = days.reduce((s, d) => s + d.tripCount, 0)
  return { days, grandTotal, totalTrips }
}

export async function getRiderTripLedger(): Promise<TripLedger> {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 260))
  return buildTripLedger()
}

export async function getRiderTripDetail(tripId: string): Promise<TripLedgerEntry | null> {
  await new Promise(resolve => setTimeout(resolve, 160 + Math.random() * 200))
  const ledger = buildTripLedger()
  for (const day of ledger.days) {
    const found = day.entries.find(e => e.id === tripId)
    if (found) return found
  }
  void tripId
  return null
}

export async function getRiderCashWallet(): Promise<RiderCashWallet> {
  await new Promise(resolve => setTimeout(resolve, 140 + Math.random() * 180))
  return {
    currency: 'NPR',
    cashInHand: 1240,
    owedToChinooz: 1240,
    codCollectedToday: 3,
    suggestedRemit: 1240,
    lastRemitDate: '2025-06-27',
  }
}

export function formatRiderNPR(value: number): string {
  return `NPR ${value.toLocaleString('en-IN')}`
}

export function formatRiderNPRAmount(value: number): string {
  return value.toLocaleString('en-IN')
}

/**
 * RW2 — Cash & COD Wallet mock.
 *
 * The Cash & COD Wallet is NOT earnings. It tracks physical cash the rider
 * has collected from Cash-on-Delivery (COD) orders and must hand back to
 * Chinooz via a deposit. The hero number is "cash-in-hand":
 *
 *     cashInHand = codCollectedTotal − codDepositedTotal
 *
 * Today's figures (collectedToday / depositedToday / pendingToDeposit) feed
 * the quick-stat tiles on the overview screen (RW2). The collection ledger
 * (RW3), settle/deposit flow (RW4) and deposit history (RW5) are separate
 * routes that this overview links into.
 */
export interface CODCollectionEntry {
  id: string
  orderId: string
  /** NPR amount collected from the customer. */
  amount: number
  /** ISO timestamp of collection. */
  collectedAt: string
  /** Customer-facing label, e.g. area or name. */
  label: string
}

export interface CODDepositEntry {
  id: string
  /** NPR amount deposited back to Chinooz. */
  amount: number
  /** ISO timestamp of deposit. */
  depositedAt: string
  /** Where the deposit was settled, e.g. hub name or bank reference. */
  reference: string
  status: 'settled' | 'pending' | 'failed'
}

export interface CODWalletStatus {
  currency: 'NPR'
  /** Total COD cash collected all-time. */
  codCollectedTotal: number
  /** Total COD cash deposited back to Chinooz all-time. */
  codDepositedTotal: number
  /**
   * Cash the rider currently holds and must deposit.
   * = codCollectedTotal − codDepositedTotal.
   */
  cashInHand: number
  /** COD cash collected today. */
  collectedToday: number
  /** COD cash deposited today. */
  depositedToday: number
  /**
   * Cash still to deposit. Equal to cashInHand by definition, surfaced
   * separately because the overview calls it out as a quick stat.
   */
  pendingToDeposit: number
  /** Count of COD orders collected today. */
  collectedTodayCount: number
  /** Suggested next deposit deadline (ISO yyyy-mm-dd). */
  nextDepositBy: string
  /**
   * Max COD cash the rider is allowed to hold (the COD float limit, NPR).
   * At/above this the rider is blocked from accepting new COD jobs until a
   * deposit brings cash-in-hand back under the limit.
   */
  maxCodFloat: number
}

/**
 * Derived limit status for the COD float meter (RW6).
 *
 * - healthy:      cash-in-hand < 80% of the limit.
 * - approaching:  80%–99% of the limit (nudge to deposit soon).
 * - atLimit:      >= 100% of the limit (COD jobs blocked until deposit).
 *
 * Never color-only: each state carries an icon + label so screen readers and
 * low-vision users get the same signal.
 */
export type CODLimitStatusKind = 'healthy' | 'approaching' | 'atLimit'

export interface CODLimitStatus {
  kind: CODLimitStatusKind
  /** Cash-in-hand (NPR). */
  cashInHand: number
  /** Max allowed COD float (NPR). */
  maxCodFloat: number
  /** Remaining headroom before the limit is hit (NPR, >= 0). */
  headroom: number
  /** Fraction of the limit used, 0–1 (clamped). */
  fraction: number
  /** Percent of the limit used, 0–100 (clamped, rounded). */
  percent: number
}

/** Threshold (fraction of the limit) at which "approaching" kicks in. */
export const COD_LIMIT_APPROACHING_THRESHOLD = 0.8

/**
 * Compute the derived COD limit status from cash-in-hand and the max float.
 * Pure function so the store, the wallet screen and Jobs all derive the same
 * status from the same shared numbers.
 */
export function computeCodLimitStatus(
  cashInHand: number,
  maxCodFloat: number,
): CODLimitStatus {
  const safeLimit = Math.max(1, maxCodFloat)
  const rawFrac = cashInHand / safeLimit
  const fraction = Math.max(0, Math.min(1, rawFrac))
  const percent = Math.round(fraction * 100)
  const headroom = Math.max(0, safeLimit - cashInHand)
  const kind: CODLimitStatusKind =
    rawFrac >= 1 ? 'atLimit' : rawFrac >= COD_LIMIT_APPROACHING_THRESHOLD ? 'approaching' : 'healthy'
  return { kind, cashInHand, maxCodFloat: safeLimit, headroom, fraction, percent }
}

export interface CODWalletSnapshot extends CODWalletStatus {
  recentCollections: CODCollectionEntry[]
  recentDeposits: CODDepositEntry[]
}

const COD_WALLET_DEFAULT: CODWalletSnapshot = {
  currency: 'NPR',
  codCollectedTotal: 84650,
  codDepositedTotal: 71200,
  cashInHand: 13450,
  collectedToday: 5820,
  depositedToday: 2000,
  pendingToDeposit: 13450,
  collectedTodayCount: 7,
  nextDepositBy: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10),
  maxCodFloat: 15000,
  recentCollections: [
    {
      id: 'col-1',
      orderId: 'ORD-20481',
      amount: 1240,
      collectedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      label: 'Balaju — COD',
    },
    {
      id: 'col-2',
      orderId: 'ORD-20479',
      amount: 860,
      collectedAt: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
      label: 'Thamel — COD',
    },
    {
      id: 'col-3',
      orderId: 'ORD-20476',
      amount: 2150,
      collectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      label: 'Patan — COD',
    },
  ],
  recentDeposits: [
    {
      id: 'dep-1',
      amount: 2000,
      depositedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      reference: 'HUB-KTM-04 · midday',
      status: 'settled',
    },
    {
      id: 'dep-2',
      amount: 4500,
      depositedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      reference: 'HUB-KTM-04 · yesterday',
      status: 'settled',
    },
  ],
}

/**
 * Mock async fetcher for the rider's COD wallet status. Mirrors a real API
 * call (latency + jitter) so the overview screen's loading/skeleton and
 * TanStack Query paths are exercised. The cashInHand invariant is always
 * recomputed before returning.
 */
export async function getCODWallet(): Promise<CODWalletSnapshot> {
  await new Promise(resolve => setTimeout(resolve, 220 + seeded(1, 7) * 280))
  const snap = { ...COD_WALLET_DEFAULT }
  snap.cashInHand = snap.codCollectedTotal - snap.codDepositedTotal
  snap.pendingToDeposit = snap.cashInHand
  return snap
}

/**
 * Synchronous accessor used by the optimistic `codWalletStatus` store so the
 * hero balance can render immediately on first paint before the async fetch
 * resolves.
 */
export function getCODWalletSync(): CODWalletSnapshot {
  const snap = { ...COD_WALLET_DEFAULT }
  snap.cashInHand = snap.codCollectedTotal - snap.codDepositedTotal
  snap.pendingToDeposit = snap.cashInHand
  return snap
}

// ─── RE5/RE6 — Payout methods + withdrawal history ──────────────────────

/** Payout instrument types the rider can link. */
export type PayoutMethodKind = 'bank' | 'esewa' | 'khalti'

export interface RiderPayoutMethod {
  id: string
  kind: PayoutMethodKind
  /** Human label, e.g. "NIBL Bank" or "eSewa". */
  label: string
  /** Masked identifier, e.g. "•••• 4521" (bank) or "98••• 8899" (wallet). */
  maskedAccount: string
  /** Is this the default payout method? */
  isDefault: boolean
  /** Bank-specific (null for wallets). */
  bankName?: string
  accountNumber?: string
  /** Wallet-specific (null for bank). */
  walletPhone?: string
  /** Display color accent per kind (for icon tinting). */
  accentColor: string
}

export type WithdrawalStatus = 'requested' | 'processing' | 'paid' | 'failed'

export interface RiderWithdrawal {
  id: string
  /** ISO timestamp of request. */
  requestedAt: string
  /** ISO timestamp of completion (paid/failed), or null if still pending. */
  completedAt: string | null
  /** NPR amount requested. */
  amount: number
  /** Fee deducted (NPR). */
  fee: number
  /** NPR net payout (amount − fee). */
  net: number
  /** Payout method used. */
  method: PayoutMethodKind
  methodLabel: string
  maskedAccount: string
  status: WithdrawalStatus
  /** Reference number once paid. */
  reference?: string
  /** Reason if failed. */
  failureReason?: string
}

export interface RiderWithdrawalDetail extends RiderWithdrawal {
  /** Timeline of the withdrawal lifecycle. */
  timeline: { key: string; label: string; status: 'completed' | 'current' | 'upcoming'; timestamp?: string; note?: string }[]
  /** Full breakdown. */
  breakdown: { label: string; amount: number; direction: 'credit' | 'debit' }[]
}

/** Minimum withdrawable amount (NPR). */
export const MIN_WITHDRAWAL = 500

/** Fee for instant withdrawal (NPR, flat). 0 for weekly auto-payout. */
export const INSTANT_FEE = 25

/** Weekly auto-payout has no fee. */
export const WEEKLY_FEE = 0

/** Mock payout methods. */
const PAYOUT_METHOD_FIXTURES: RiderPayoutMethod[] = [
  {
    id: 'pm-bank-1',
    kind: 'bank',
    label: 'NIBL Bank',
    maskedAccount: '•••• 4521',
    isDefault: true,
    bankName: 'NIBL',
    accountNumber: '12345678904521',
    accentColor: '#4A6FA5',
  },
  {
    id: 'pm-esewa-1',
    kind: 'esewa',
    label: 'eSewa',
    maskedAccount: '98••• 8899',
    isDefault: false,
    walletPhone: '9800008899',
    accentColor: '#60B246',
  },
  {
    id: 'pm-khalti-1',
    kind: 'khalti',
    label: 'Khalti',
    maskedAccount: '98••• 4321',
    isDefault: false,
    walletPhone: '9800004321',
    accentColor: '#7C3AED',
  },
]

/** Mock withdrawal history. */
function buildWithdrawals(): RiderWithdrawal[] {
  const now = Date.now()
  return [
    {
      id: 'wd-1',
      requestedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      amount: 5000,
      fee: INSTANT_FEE,
      net: 5000 - INSTANT_FEE,
      method: 'bank',
      methodLabel: 'NIBL Bank',
      maskedAccount: '•••• 4521',
      status: 'processing',
    },
    {
      id: 'wd-2',
      requestedAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      amount: 8000,
      fee: INSTANT_FEE,
      net: 8000 - INSTANT_FEE,
      method: 'bank',
      methodLabel: 'NIBL Bank',
      maskedAccount: '•••• 4521',
      status: 'paid',
      reference: 'TXN-48291',
    },
    {
      id: 'wd-3',
      requestedAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(now - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      amount: 12000,
      fee: WEEKLY_FEE,
      net: 12000,
      method: 'esewa',
      methodLabel: 'eSewa',
      maskedAccount: '98••• 8899',
      status: 'paid',
      reference: 'ESW-77103',
    },
    {
      id: 'wd-4',
      requestedAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(now - 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
      amount: 3000,
      fee: INSTANT_FEE,
      net: 3000 - INSTANT_FEE,
      method: 'khalti',
      methodLabel: 'Khalti',
      maskedAccount: '98••• 4321',
      status: 'failed',
      failureReason: 'Khalti wallet number not verified. Please update and retry.',
    },
    {
      id: 'wd-5',
      requestedAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(now - 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      amount: 6500,
      fee: INSTANT_FEE,
      net: 6500 - INSTANT_FEE,
      method: 'bank',
      methodLabel: 'NIBL Bank',
      maskedAccount: '•••• 4521',
      status: 'paid',
      reference: 'TXN-45821',
    },
  ]
}

let PAYOUT_METHODS: RiderPayoutMethod[] = [...PAYOUT_METHOD_FIXTURES]
let WITHDRAWALS: RiderWithdrawal[] = buildWithdrawals()

export async function getRiderPayoutMethods(): Promise<RiderPayoutMethod[]> {
  await new Promise(resolve => setTimeout(resolve, 180 + Math.random() * 220))
  return [...PAYOUT_METHODS]
}

export async function addRiderPayoutMethod(
  input: Omit<RiderPayoutMethod, 'id' | 'maskedAccount' | 'isDefault' | 'accentColor'>,
): Promise<RiderPayoutMethod> {
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200))
  const id = `pm-${input.kind}-${Date.now()}`
  const maskedAccount = input.kind === 'bank'
    ? `•••• ${input.accountNumber?.slice(-4) ?? '0000'}`
    : `${input.walletPhone?.slice(0, 2) ?? '98'}••• ${input.walletPhone?.slice(-4) ?? '0000'}`
  const accentMap: Record<PayoutMethodKind, string> = {
    bank: '#4A6FA5',
    esewa: '#60B246',
    khalti: '#7C3AED',
  }
  const method: RiderPayoutMethod = {
    ...input,
    id,
    maskedAccount,
    isDefault: PAYOUT_METHODS.length === 0,
    accentColor: accentMap[input.kind],
  }
  PAYOUT_METHODS = [...PAYOUT_METHODS, method]
  return method
}

export async function setDefaultRiderPayoutMethod(methodId: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 150))
  PAYOUT_METHODS = PAYOUT_METHODS.map(m => ({ ...m, isDefault: m.id === methodId }))
}

export async function deleteRiderPayoutMethod(methodId: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 150))
  PAYOUT_METHODS = PAYOUT_METHODS.filter(m => m.id !== methodId)
}

export async function getRiderWithdrawals(): Promise<RiderWithdrawal[]> {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 250))
  return [...WITHDRAWALS].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
}

export async function getRiderWithdrawalById(id: string): Promise<RiderWithdrawalDetail | null> {
  await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200))
  const wd = WITHDRAWALS.find(w => w.id === id)
  if (!wd) return null
  const timeline: RiderWithdrawalDetail['timeline'] = []
  if (wd.status === 'requested') {
    timeline.push({ key: 'requested', label: 'Requested', status: 'current', timestamp: wd.requestedAt })
    timeline.push({ key: 'processing', label: 'Processing', status: 'upcoming' })
    timeline.push({ key: 'paid', label: 'Paid', status: 'upcoming' })
  } else if (wd.status === 'processing') {
    timeline.push({ key: 'requested', label: 'Requested', status: 'completed', timestamp: wd.requestedAt })
    timeline.push({ key: 'processing', label: 'Processing', status: 'current', timestamp: wd.requestedAt, note: 'Funds being transferred' })
    timeline.push({ key: 'paid', label: 'Paid', status: 'upcoming' })
  } else if (wd.status === 'paid') {
    timeline.push({ key: 'requested', label: 'Requested', status: 'completed', timestamp: wd.requestedAt })
    timeline.push({ key: 'processing', label: 'Processing', status: 'completed', timestamp: wd.requestedAt })
    timeline.push({ key: 'paid', label: 'Paid', status: 'completed', timestamp: wd.completedAt!, note: `NPR ${formatRiderNPRAmount(wd.net)} sent to ${wd.maskedAccount}` })
  } else {
    timeline.push({ key: 'requested', label: 'Requested', status: 'completed', timestamp: wd.requestedAt })
    timeline.push({ key: 'processing', label: 'Processing', status: 'completed', timestamp: wd.requestedAt })
    timeline.push({ key: 'failed', label: 'Failed', status: 'current', timestamp: wd.completedAt, note: wd.failureReason ?? 'Withdrawal failed' })
  }
  const breakdown: RiderWithdrawalDetail['breakdown'] = [
    { label: 'Withdrawal amount', amount: wd.amount, direction: 'credit' },
    { label: 'Processing fee', amount: -wd.fee, direction: 'debit' },
    { label: 'Net payout', amount: wd.net, direction: 'credit' },
  ]
  return { ...wd, timeline, breakdown }
}

export async function requestRiderWithdrawal(input: {
  amount: number
  methodId: string
  isInstant: boolean
}): Promise<RiderWithdrawal> {
  await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 300))
  const method = PAYOUT_METHODS.find(m => m.id === input.methodId)
  if (!method) throw new Error('Payout method not found')
  const fee = input.isInstant ? INSTANT_FEE : WEEKLY_FEE
  const wd: RiderWithdrawal = {
    id: `wd-${Date.now()}`,
    requestedAt: new Date().toISOString(),
    completedAt: null,
    amount: input.amount,
    fee,
    net: input.amount - fee,
    method: method.kind,
    methodLabel: method.label,
    maskedAccount: method.maskedAccount,
    status: 'requested',
  }
  WITHDRAWALS = [wd, ...WITHDRAWALS]
  // Simulate processing → paid after a short delay (caller polls or refreshes).
  setTimeout(() => {
    WITHDRAWALS = WITHDRAWALS.map(w =>
      w.id === wd.id
        ? { ...w, status: 'processing' as WithdrawalStatus }
        : w,
    )
  }, 1500)
  setTimeout(() => {
    WITHDRAWALS = WITHDRAWALS.map(w =>
      w.id === wd.id
        ? {
            ...w,
            status: 'paid' as WithdrawalStatus,
            completedAt: new Date().toISOString(),
            reference: `TXN-${Math.floor(Math.random() * 90000) + 10000}`,
          }
        : w,
    )
  }, 4000)
  return wd
}
