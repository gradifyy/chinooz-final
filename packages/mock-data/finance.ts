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

// --- Transactions ledger ---

export type TransactionType = 'sale' | 'refund' | 'fee' | 'payout' | 'adjustment'
export type TransactionDirection = 'credit' | 'debit'

export interface Transaction {
  id: string
  type: TransactionType
  direction: TransactionDirection
  orderId: string | null
  date: string
  description: string
  gross: number
  fees: number
  net: number
  runningBalance: number
}

export interface TransactionFilters {
  type: TransactionType | 'all'
  dateRange: 'all' | '7d' | '30d' | 'custom'
  dateFrom?: string
  dateTo?: string
  orderId?: string
  sort: 'date_desc' | 'date_asc' | 'net_desc' | 'net_asc'
}

export interface TransactionDetail extends Transaction {
  breakdown: { label: string; amount: number; direction: TransactionDirection }[]
}

const TX_TYPES: TransactionType[] = ['sale', 'refund', 'fee', 'payout', 'adjustment']

function txDirection(type: TransactionType): TransactionDirection {
  return type === 'sale' || type === 'adjustment' ? 'credit' : 'debit'
}

function txDescription(type: TransactionType, orderId: string | null): string {
  switch (type) {
    case 'sale':
      return `Order ${orderId} — sale settlement`
    case 'refund':
      return `Order ${orderId} — buyer refund`
    case 'fee':
      return `Order ${orderId} — platform commission`
    case 'payout':
      return `Payout to Khalti •••• 4321`
    case 'adjustment':
      return `Manual adjustment — rounding correction`
  }
}

function buildTransactions(): Transaction[] {
  const list: Transaction[] = []
  let balance = 0
  const now = new Date()
  for (let i = 0; i < 48; i++) {
    const typeIdx = Math.floor(seeded(i, 99) * TX_TYPES.length)
    const type = TX_TYPES[typeIdx]
    const hasOrder = type !== 'payout'
    const orderId = hasOrder ? `ORD-${2051 - i}` : null
    const d = new Date(now)
    d.setDate(d.getDate() - Math.floor(i / 3))
    d.setHours(8 + Math.floor(seeded(i + 5, 99) * 12))
    const date = d.toISOString()
    const gross =
      type === 'sale'
        ? Math.round((800 + seeded(i + 10, 99) * 40000) / 10) * 10
        : type === 'refund'
          ? Math.round((300 + seeded(i + 20, 99) * 5000) / 10) * 10
          : type === 'fee'
            ? Math.round((50 + seeded(i + 30, 99) * 2000) / 10) * 10
            : type === 'payout'
              ? Math.round((5000 + seeded(i + 40, 99) * 15000) / 100) * 100
              : Math.round((10 + seeded(i + 50, 99) * 200) / 10) * 10
    const fees = type === 'sale' ? Math.round(gross * FEE_RATE) : type === 'fee' ? gross : 0
    const net = type === 'sale' ? gross - fees : type === 'refund' ? -gross : type === 'fee' ? -fees : type === 'payout' ? -gross : gross
    balance += net
    list.push({
      id: `tx-${i}`,
      type,
      direction: txDirection(type),
      orderId,
      date,
      description: txDescription(type, orderId),
      gross,
      fees,
      net,
      runningBalance: balance,
    })
  }
  return list.reverse()
}

const ALL_TRANSACTIONS: Transaction[] = buildTransactions()

function filterTransactions(filters: TransactionFilters): Transaction[] {
  let list = [...ALL_TRANSACTIONS]
  if (filters.type !== 'all') {
    list = list.filter(t => t.type === filters.type)
  }
  if (filters.orderId) {
    const q = filters.orderId.toLowerCase().trim()
    list = list.filter(t => t.orderId?.toLowerCase().includes(q))
  }
  const now = Date.now()
  if (filters.dateRange === '7d') {
    list = list.filter(t => now - new Date(t.date).getTime() <= 7 * 86400000)
  } else if (filters.dateRange === '30d') {
    list = list.filter(t => now - new Date(t.date).getTime() <= 30 * 86400000)
  } else if (filters.dateRange === 'custom') {
    if (filters.dateFrom) list = list.filter(t => t.date >= filters.dateFrom!)
    if (filters.dateTo) list = list.filter(t => t.date <= filters.dateTo! + 'T23:59:59')
  }
  switch (filters.sort) {
    case 'date_asc':
      list.sort((a, b) => a.date.localeCompare(b.date))
      break
    case 'net_desc':
      list.sort((a, b) => b.net - a.net)
      break
    case 'net_asc':
      list.sort((a, b) => a.net - b.net)
      break
    case 'date_desc':
    default:
      list.sort((a, b) => b.date.localeCompare(a.date))
      break
  }
  return list
}

export async function getTransactions(
  filters: TransactionFilters,
): Promise<{ items: Transaction[]; total: number }> {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))
  const items = filterTransactions(filters)
  return { items, total: items.length }
}

export async function getTransactionById(id: string): Promise<TransactionDetail | null> {
  await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200))
  const tx = ALL_TRANSACTIONS.find(t => t.id === id)
  if (!tx) return null
  const breakdown: TransactionDetail['breakdown'] = []
  if (tx.type === 'sale') {
    breakdown.push({ label: 'Gross sale', amount: tx.gross, direction: 'credit' })
    breakdown.push({ label: 'Platform fee (4%)', amount: tx.fees, direction: 'debit' })
    breakdown.push({ label: 'Net credit', amount: tx.net, direction: 'credit' })
  } else if (tx.type === 'refund') {
    breakdown.push({ label: 'Refund to buyer', amount: tx.gross, direction: 'debit' })
    breakdown.push({ label: 'Fee reversal', amount: tx.fees, direction: 'credit' })
    breakdown.push({ label: 'Net debit', amount: tx.net, direction: 'debit' })
  } else if (tx.type === 'fee') {
    breakdown.push({ label: 'Commission', amount: tx.gross, direction: 'debit' })
    breakdown.push({ label: 'Net debit', amount: tx.net, direction: 'debit' })
  } else if (tx.type === 'payout') {
    breakdown.push({ label: 'Payout to Khalti', amount: tx.gross, direction: 'debit' })
    breakdown.push({ label: 'Net debit', amount: tx.net, direction: 'debit' })
  } else {
    breakdown.push({ label: 'Adjustment', amount: tx.gross, direction: 'credit' })
    breakdown.push({ label: 'Net credit', amount: tx.net, direction: 'credit' })
  }
  return { ...tx, breakdown }
}

export function exportTransactionsCSV(items: Transaction[]): string {
  const header = 'id,type,direction,order_id,date,gross,fees,net,running_balance'
  const rows = items.map(t =>
    [
      t.id,
      t.type,
      t.direction,
      t.orderId ?? '',
      t.date,
      t.gross,
      t.fees,
      t.net,
      t.runningBalance,
    ].join(','),
  )
  return [header, ...rows].join('\n')
}

// --- Payouts ---

export type FinancePayoutStatus = 'scheduled' | 'processing' | 'paid' | 'failed'
export type FinancePayoutMethod = 'bank' | 'esewa' | 'khalti'

export interface FinancePayoutLineItem {
  orderId: string
  date: string
  gross: number
  commission: number
  paymentFee: number
  refund: number
  net: number
}

export interface FinancePayoutBreakdownRow {
  label: string
  amount: number
  direction: 'credit' | 'debit'
  explainer?: string
}

export interface FinancePayoutTimelineStep {
  key: string
  label: string
  status: 'completed' | 'current' | 'upcoming'
  timestamp?: string
  note?: string
}

export interface FinancePayout {
  id: string
  date: string
  amount: number
  method: FinancePayoutMethod
  methodLabel: string
  accountMasked: string
  status: FinancePayoutStatus
  failureReason?: string
  orderCount: number
}

export interface FinancePayoutDetail extends FinancePayout {
  grossSales: number
  platformCommission: number
  paymentFees: number
  refunds: number
  adjustments: number
  vat: number
  netPayout: number
  lineItems: FinancePayoutLineItem[]
  breakdown: FinancePayoutBreakdownRow[]
  timeline: FinancePayoutTimelineStep[]
}

const PAYOUT_METHODS: { method: FinancePayoutMethod; label: string; mask: string }[] = [
  { method: 'bank', label: 'Bank transfer', mask: 'NIBL •••• 4521' },
  { method: 'khalti', label: 'Khalti', mask: 'Khalti •••• 4321' },
  { method: 'esewa', label: 'eSewa', mask: 'eSewa •••• 8899' },
]

function buildPayouts(): FinancePayout[] {
  const list: FinancePayout[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const m = PAYOUT_METHODS[Math.floor(seeded(i, 77) * PAYOUT_METHODS.length)]
    const status: FinancePayoutStatus = i < 2 ? 'scheduled' : i === 2 ? 'processing' : i === 3 ? 'failed' : 'paid'
    const d = new Date(now)
    d.setDate(d.getDate() - i * 4)
    const amount = Math.round((5000 + seeded(i + 10, 77) * 20000) / 100) * 100
    list.push({
      id: `payout-${i}`,
      date: d.toISOString(),
      amount,
      method: m.method,
      methodLabel: m.label,
      accountMasked: m.mask,
      status,
      failureReason: status === 'failed' ? 'Bank rejected: invalid account number' : undefined,
      orderCount: Math.floor(3 + seeded(i + 20, 77) * 12),
    })
  }
  return list
}

const ALL_PAYOUTS: FinancePayout[] = buildPayouts()

const VAT_RATE = 0.13
const COMMISSION_RATE = 0.04
const PAYMENT_FEE_RATE = 0.025

export async function getFinancePayouts(): Promise<FinancePayout[]> {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))
  return [...ALL_PAYOUTS].sort((a, b) => b.date.localeCompare(a.date))
}

export async function getFinancePayoutById(id: string): Promise<FinancePayoutDetail | null> {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 250))
  const payout = ALL_PAYOUTS.find(p => p.id === id)
  if (!payout) return null

  const grossSales = payout.amount + Math.round(payout.amount * 0.15)
  const platformCommission = Math.round(grossSales * COMMISSION_RATE)
  const paymentFees = Math.round(grossSales * PAYMENT_FEE_RATE)
  const refunds = Math.round(grossSales * 0.03)
  const adjustments = Math.round(seeded(parseInt(id.split('-')[1] || '0'), 55) * 200)
  const vat = Math.round((grossSales * VAT_RATE) / (1 + VAT_RATE))
  const netPayout = payout.amount

  const lineItems: FinancePayoutLineItem[] = []
  for (let i = 0; i < payout.orderCount; i++) {
    const gross = Math.round((500 + seeded(i + 30, 88) * 8000) / 10) * 10
    const commission = Math.round(gross * COMMISSION_RATE)
    const paymentFee = Math.round(gross * PAYMENT_FEE_RATE)
    const refund = seeded(i + 40, 88) > 0.85 ? Math.round(gross * 0.5) : 0
    const net = gross - commission - paymentFee - refund
    const d = new Date(payout.date)
    d.setDate(d.getDate() - Math.floor(seeded(i, 88) * 5))
    lineItems.push({ orderId: `ORD-${2051 - i}`, date: d.toISOString(), gross, commission, paymentFee, refund, net })
  }

  const breakdown: FinancePayoutBreakdownRow[] = [
    { label: 'Gross sales', amount: grossSales, direction: 'credit', explainer: 'Total value of all orders included in this payout before any deductions.' },
    { label: 'Platform commission (4%)', amount: -platformCommission, direction: 'debit', explainer: 'Chinooz marketplace fee — 4% of gross sales for platform maintenance and seller tools.' },
    { label: 'Payment processing fees (2.5%)', amount: -paymentFees, direction: 'debit', explainer: 'Fees charged by payment gateways (Khalti, eSewa, card processors) for handling buyer payments.' },
    { label: 'Refunds', amount: -refunds, direction: 'debit', explainer: 'Amounts returned to buyers for cancelled or returned orders within this period.' },
    { label: 'Adjustments', amount: -adjustments, direction: 'debit', explainer: 'Rounding corrections, dispute resolutions, and manual adjustments applied by Chinooz support.' },
    { label: 'VAT (13%, inclusive)', amount: -vat, direction: 'debit', explainer: 'VAT is already included in sale prices. This line shows the VAT portion remitted to tax authorities.' },
    { label: 'Net payout', amount: netPayout, direction: 'credit', explainer: 'The final amount transferred to your account.' },
  ]

  const timeline: FinancePayoutTimelineStep[] = buildPayoutTimeline(payout)

  return { ...payout, grossSales, platformCommission, paymentFees, refunds, adjustments, vat, netPayout, lineItems, breakdown, timeline }
}

function buildPayoutTimeline(payout: FinancePayout): FinancePayoutTimelineStep[] {
  const steps: FinancePayoutTimelineStep[] = []
  const d = new Date(payout.date)

  if (payout.status === 'scheduled') {
    steps.push({ key: 'scheduled', label: 'Scheduled', status: 'current', timestamp: d.toISOString(), note: `Payout queued for ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` })
    steps.push({ key: 'processing', label: 'Processing', status: 'upcoming' })
    steps.push({ key: 'paid', label: 'Paid', status: 'upcoming' })
  } else if (payout.status === 'processing') {
    steps.push({ key: 'scheduled', label: 'Scheduled', status: 'completed', timestamp: new Date(d.getTime() - 86400000).toISOString() })
    steps.push({ key: 'processing', label: 'Processing', status: 'current', timestamp: d.toISOString(), note: 'Funds being transferred to your account' })
    steps.push({ key: 'paid', label: 'Paid', status: 'upcoming' })
  } else if (payout.status === 'paid') {
    steps.push({ key: 'scheduled', label: 'Scheduled', status: 'completed', timestamp: new Date(d.getTime() - 86400000 * 2).toISOString() })
    steps.push({ key: 'processing', label: 'Processing', status: 'completed', timestamp: new Date(d.getTime() - 86400000).toISOString() })
    steps.push({ key: 'paid', label: 'Paid', status: 'completed', timestamp: d.toISOString(), note: `NPR ${formatNPRAmount(payout.amount)} sent to ${payout.accountMasked}` })
  } else {
    steps.push({ key: 'scheduled', label: 'Scheduled', status: 'completed', timestamp: new Date(d.getTime() - 86400000 * 2).toISOString() })
    steps.push({ key: 'processing', label: 'Processing', status: 'completed', timestamp: new Date(d.getTime() - 86400000).toISOString() })
    steps.push({ key: 'failed', label: 'Failed', status: 'current', timestamp: d.toISOString(), note: payout.failureReason ?? 'Payout failed — please update your payout method' })
  }

  return steps
}

export function exportFinancePayoutStatementCSV(detail: FinancePayoutDetail): string {
  const header = 'order_id,date,gross,commission,payment_fee,refund,net'
  const rows = detail.lineItems.map(li =>
    [li.orderId, li.date.slice(0, 10), li.gross, li.commission, li.paymentFee, li.refund, li.net].join(','),
  )
  const summary = [
    '',
    'Summary',
    `Gross sales,${detail.grossSales}`,
    `Platform commission,${detail.platformCommission}`,
    `Payment fees,${detail.paymentFees}`,
    `Refunds,${detail.refunds}`,
    `Adjustments,${detail.adjustments}`,
    `VAT,${detail.vat}`,
    `Net payout,${detail.netPayout}`,
  ].join('\n')
  return [header, ...rows, summary].join('\n')
}

// --- Withdraw / cash-out ---

export interface WithdrawMethod {
  id: string
  type: FinancePayoutMethod
  label: string
  accountMasked: string
  isDefault: boolean
}

export interface WithdrawResult {
  success: boolean
  payoutId?: string
  newAvailableBalance?: number
  newPendingBalance?: number
  error?: string
}

export const MIN_WITHDRAWAL = 500

const WITHDRAW_METHODS: WithdrawMethod[] = [
  { id: 'm1', type: 'khalti', label: 'Khalti', accountMasked: 'Khalti •••• 4321', isDefault: true },
  { id: 'm2', type: 'esewa', label: 'eSewa', accountMasked: 'eSewa •••• 8899', isDefault: false },
  { id: 'm3', type: 'bank', label: 'Bank transfer', accountMasked: 'NIBL •••• 4521', isDefault: false },
]

let mockAvailableBalance = 45200
let mockPendingBalance = 12400

export async function getWithdrawMethods(): Promise<WithdrawMethod[]> {
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 150))
  return [...WITHDRAW_METHODS]
}

export async function requestWithdraw(input: {
  amount: number
  methodId: string
}): Promise<WithdrawResult> {
  await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 600))

  if (input.amount < MIN_WITHDRAWAL) {
    return { success: false, error: 'below_minimum' }
  }
  if (input.amount > mockAvailableBalance) {
    return { success: false, error: 'exceeds_available' }
  }
  const method = WITHDRAW_METHODS.find(m => m.id === input.methodId)
  if (!method) {
    return { success: false, error: 'no_method' }
  }

  // 5% simulated failure
  if (Math.random() < 0.05) {
    return { success: false, error: 'service_unavailable' }
  }

  const fee = 0 // no withdrawal fee for now
  const payoutAmount = input.amount - fee
  mockAvailableBalance -= payoutAmount
  mockPendingBalance += payoutAmount

  return {
    success: true,
    payoutId: `payout-w-${Date.now()}`,
    newAvailableBalance: mockAvailableBalance,
    newPendingBalance: mockPendingBalance,
  }
}

export function getWithdrawBalances(): { available: number; pending: number } {
  return { available: mockAvailableBalance, pending: mockPendingBalance }
}

export function rollbackWithdraw(amount: number): void {
  mockAvailableBalance += amount
  mockPendingBalance -= amount
}
