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
  const points: RiderChartPoint[] = labels.map((label, i) => ({
    label,
    value: Math.round(420 * scale * (0.4 + seeded(i + 4, seed) * 0.9)),
  }))
  return { range, points }
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
