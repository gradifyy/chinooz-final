export type SellerDateRangeKey = 'today' | '7d' | '30d' | 'custom'

export interface SellerDateRange {
  key: SellerDateRangeKey
  label: string
  days: number
  custom?: { start: string; end: string }
}

export type SellerKpiKey = 'revenue' | 'orders' | 'units' | 'aov' | 'conversion' | 'payouts'

export interface SellerKpi {
  key: SellerKpiKey
  label: string
  value: string
  numericValue: number
  prefix?: string
  suffix?: string
  decimals?: number
  deltaPct: number
  trend: 'up' | 'down' | 'flat'
  hint: string
  period: string
  sparkline: number[]
  route: string
  accent: 'plum' | 'default'
}

export interface SellerChartPoint {
  label: string
  revenue: number
  orders: number
  units: number
}

export type SellerChartMetric = 'revenue' | 'orders' | 'units'

export type SellerAlertSeverity = 'error' | 'warning' | 'info' | 'success'
export type SellerAlertIcon = 'new-orders' | 'low-stock' | 'out-of-stock' | 'returns' | 'messages' | 'reviews' | 'payout' | 'kyc'

export interface SellerAlert {
  id: string
  severity: SellerAlertSeverity
  icon: SellerAlertIcon
  title: string
  count: number
  route: string
  dismissible: boolean
}

export interface SellerQuickAction {
  id: string
  label: string
  icon: string
  href?: string
}

export type SellerActivityKind = 'order' | 'review' | 'message'
export type SellerActivityStatus = 'new' | 'confirmed' | 'shipped' | 'delivered' | 'pending' | 'positive' | 'neutral'

export interface SellerActivityItem {
  id: string
  kind: SellerActivityKind
  title: string
  subtitle: string
  meta: string
  at: string
  timestamp: number
  amount?: string
  status?: SellerActivityStatus
  route: string
}

export interface SellerGoLiveTask {
  id: string
  label: string
  done: boolean
}

export interface SellerDashboardMetrics {
  range: SellerDateRange
  kpis: SellerKpi[]
  chart: SellerChartPoint[]
  alerts: SellerAlert[]
  quickActions: SellerQuickAction[]
  activity: SellerActivityItem[]
}

export const SELLER_DATE_RANGES: { key: SellerDateRangeKey; label: string; days: number }[] = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7d', days: 7 },
  { key: '30d', label: '30d', days: 30 },
  { key: 'custom', label: 'Custom', days: 30 },
]

export const SELLER_GO_LIVE_TASKS: SellerGoLiveTask[] = [
  { id: 'profile', label: 'Complete store profile', done: true },
  { id: 'kyc', label: 'Verify KYC details', done: true },
  { id: 'product', label: 'Add your first product', done: false },
  { id: 'payout', label: 'Set up payout method', done: false },
  { id: 'policies', label: 'Add return & shipping policies', done: false },
]

const KPIS: { key: SellerKpiKey; label: string; base: number; prefix?: string; suffix?: string; decimals?: number; hint: string; route: string; accent: 'plum' | 'default' }[] = [
  { key: 'revenue', label: 'Revenue', base: 18450, prefix: 'NPR', hint: 'Gross sales', route: '/finance', accent: 'plum' },
  { key: 'orders', label: 'Orders', base: 64, hint: 'Confirmed orders', route: '/orders', accent: 'default' },
  { key: 'units', label: 'Units sold', base: 128, hint: 'Total units', route: '/products', accent: 'default' },
  { key: 'aov', label: 'Avg order value', base: 288, prefix: 'NPR', hint: 'Revenue / orders', route: '/finance', accent: 'default' },
  { key: 'conversion', label: 'Conversion', base: 3.2, suffix: '%', decimals: 1, hint: 'Orders / views', route: '/analytics', accent: 'default' },
  { key: 'payouts', label: 'Pending payouts', base: 12400, prefix: 'NPR', hint: 'Awaiting settlement', route: '/finance', accent: 'default' },
]

const CHART_LABELS: Record<number, string[]> = {
  1: ['12a', '4a', '8a', '12p', '4p', '8p'],
  7: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  30: ['W1', 'W2', 'W3', 'W4'],
}

const ALERTS: SellerAlert[] = [
  {
    id: 'new-orders',
    severity: 'info',
    icon: 'new-orders',
    title: 'New orders to fulfill',
    count: 3,
    route: '/orders',
    dismissible: false,
  },
  {
    id: 'out-of-stock',
    severity: 'error',
    icon: 'out-of-stock',
    title: 'Products out of stock',
    count: 1,
    route: '/inventory',
    dismissible: true,
  },
  {
    id: 'low-stock',
    severity: 'warning',
    icon: 'low-stock',
    title: 'Products running low on stock',
    count: 2,
    route: '/inventory',
    dismissible: true,
  },
  {
    id: 'pending-returns',
    severity: 'warning',
    icon: 'returns',
    title: 'Return requests need action',
    count: 1,
    route: '/orders',
    dismissible: false,
  },
  {
    id: 'unanswered-messages',
    severity: 'info',
    icon: 'messages',
    title: 'Unanswered buyer messages',
    count: 5,
    route: '/messages',
    dismissible: true,
  },
  {
    id: 'unanswered-reviews',
    severity: 'info',
    icon: 'reviews',
    title: 'Reviews waiting for your response',
    count: 4,
    route: '/reviews',
    dismissible: true,
  },
  {
    id: 'payout-ready',
    severity: 'success',
    icon: 'payout',
    title: 'Payout ready to withdraw',
    count: 1,
    route: '/finance',
    dismissible: true,
  },
  {
    id: 'kyc-incomplete',
    severity: 'error',
    icon: 'kyc',
    title: 'KYC verification incomplete',
    count: 1,
    route: '/settings',
    dismissible: false,
  },
]

const QUICK_ACTIONS: SellerQuickAction[] = [
  { id: 'add-product', label: 'Add product', icon: 'plus', href: '/products/new' },
  { id: 'orders', label: 'View orders', icon: 'box', href: '/orders' },
  { id: 'promotions', label: 'Create promotion', icon: 'tag', href: '/promotions/new' },
  { id: 'inventory', label: 'Update inventory', icon: 'layers', href: '/inventory' },
  { id: 'payouts', label: 'View payouts', icon: 'wallet', href: '/finance' },
  { id: 'settings', label: 'Store settings', icon: 'settings', href: '/settings' },
]

const now = Date.now()
const minsAgo = (m: number) => now - m * 60_000

const ACTIVITY: SellerActivityItem[] = [
  {
    id: 'a1',
    kind: 'order',
    title: 'Order #ORD-2051',
    subtitle: 'Samsung Galaxy A55 5G',
    meta: '1 item',
    at: '2m ago',
    timestamp: minsAgo(2),
    amount: 'NPR 45,999',
    status: 'new',
    route: '/orders/ORD-2051',
  },
  {
    id: 'a2',
    kind: 'review',
    title: 'New 5★ review',
    subtitle: '“Great service, fast delivery!”',
    meta: 'Samsung Galaxy A55',
    at: '1h ago',
    timestamp: minsAgo(60),
    status: 'positive',
    route: '/reviews',
  },
  {
    id: 'a3',
    kind: 'message',
    title: 'Message from Ram S.',
    subtitle: '“Is this available in blue?”',
    meta: 'Samsung Galaxy A55',
    at: '3h ago',
    timestamp: minsAgo(180),
    status: 'pending',
    route: '/messages',
  },
  {
    id: 'a4',
    kind: 'order',
    title: 'Order #ORD-2048',
    subtitle: 'Handmade Dhaka Topi × 2',
    meta: '2 items',
    at: '5h ago',
    timestamp: minsAgo(300),
    amount: 'NPR 1,700',
    status: 'shipped',
    route: '/orders/ORD-2048',
  },
  {
    id: 'a5',
    kind: 'review',
    title: 'New 3★ review',
    subtitle: '“Good product, packaging could be better”',
    meta: 'Dhaka Topi',
    at: '8h ago',
    timestamp: minsAgo(480),
    status: 'neutral',
    route: '/reviews',
  },
  {
    id: 'a6',
    kind: 'order',
    title: 'Order #ORD-2042',
    subtitle: 'Organic Honey 500g × 3',
    meta: '3 items',
    at: '12h ago',
    timestamp: minsAgo(720),
    amount: 'NPR 2,400',
    status: 'delivered',
    route: '/orders/ORD-2042',
  },
  {
    id: 'a7',
    kind: 'message',
    title: 'Message from Sita K.',
    subtitle: '“Thank you for the quick delivery!”',
    meta: 'Organic Honey',
    at: '1d ago',
    timestamp: minsAgo(1440),
    status: 'neutral',
    route: '/messages',
  },
]

function seeded(n: number, seed: number): number {
  const x = Math.sin(seed + n) * 10000
  return x - Math.floor(x)
}

function periodLabel(days: number): string {
  if (days === 1) return 'Today'
  if (days === 7) return 'Last 7 days'
  if (days === 30) return 'Last 30 days'
  return 'Custom range'
}

export function getSellerDashboardMetrics(range: SellerDateRange): SellerDashboardMetrics {
  const days = range.days
  const scale = days === 1 ? 0.08 : days === 7 ? 0.55 : 1
  const period = periodLabel(days)

  const kpis: SellerKpi[] = KPIS.map((k, i) => {
    const raw = k.base * scale * (0.85 + seeded(i, days) * 0.3)
    const numericValue = k.decimals ? Math.round(raw * 10) / 10 : Math.round(raw)
    const deltaPct = Math.round((seeded(i + 1, days) - 0.4) * 40)
    const spark = Array.from({ length: 8 }, (_, j) =>
      Math.round(numericValue * (0.6 + seeded(i * 10 + j, days) * 0.5)),
    )
    let value: string
    if (k.prefix) value = `${k.prefix} ${numericValue.toLocaleString()}`
    else if (k.suffix) value = `${numericValue.toFixed(k.decimals ?? 0)}${k.suffix}`
    else value = numericValue.toLocaleString()
    return {
      key: k.key,
      label: k.label,
      value,
      numericValue,
      prefix: k.prefix,
      suffix: k.suffix,
      decimals: k.decimals,
      deltaPct,
      trend: deltaPct > 3 ? 'up' : deltaPct < -3 ? 'down' : 'flat',
      hint: k.hint,
      period,
      sparkline: spark,
      route: k.route,
      accent: k.accent,
    }
  })

  const labels = CHART_LABELS[days] ?? CHART_LABELS[30]
  const chart: SellerChartPoint[] = labels.map((label, i) => {
    const revBase = 2000 * scale * (0.5 + seeded(i + 10, days) * 0.9)
    const ordBase = 8 * scale * (0.5 + seeded(i + 20, days) * 0.9)
    const unitBase = 16 * scale * (0.5 + seeded(i + 30, days) * 0.9)
    return {
      label,
      revenue: Math.round(revBase),
      orders: Math.max(0, Math.round(ordBase)),
      units: Math.max(0, Math.round(unitBase)),
    }
  })

  return {
    range,
    kpis,
    chart,
    alerts: ALERTS,
    quickActions: QUICK_ACTIONS,
    activity: ACTIVITY,
  }
}

export function getEmptySellerDashboardMetrics(range: SellerDateRange): SellerDashboardMetrics {
  const period = periodLabel(range.days)
  const labels = CHART_LABELS[range.days] ?? CHART_LABELS[30]

  const kpis: SellerKpi[] = KPIS.map(k => ({
    key: k.key,
    label: k.label,
    value: k.prefix ? `${k.prefix} 0` : k.suffix ? `0${k.suffix}` : '0',
    numericValue: 0,
    prefix: k.prefix,
    suffix: k.suffix,
    decimals: k.decimals,
    deltaPct: 0,
    trend: 'flat' as const,
    hint: k.hint,
    period,
    sparkline: Array.from({ length: 8 }, () => 0),
    route: k.route,
    accent: k.accent,
  }))

  const chart: SellerChartPoint[] = labels.map(label => ({
    label,
    revenue: 0,
    orders: 0,
    units: 0,
  }))

  return {
    range,
    kpis,
    chart,
    alerts: [],
    quickActions: QUICK_ACTIONS,
    activity: [],
  }
}

export interface SellerReplyTemplate {
  id: string
  label: string
  body: string
  hasPlaceholders?: boolean
  isBuiltIn?: boolean
}

export const SELLER_REPLY_TEMPLATES: SellerReplyTemplate[] = [
  { id: 't1', label: 'Order confirmed', body: 'Thanks for your order {order_id}! It has been confirmed and will ship within 24 hours.', hasPlaceholders: true, isBuiltIn: true },
  { id: 't2', label: 'Shipping update', body: 'Your order {order_id} has been dispatched. Tracking: {tracking}. It should arrive in 1–2 days.', hasPlaceholders: true, isBuiltIn: true },
  { id: 't3', label: 'Out of stock', body: 'Sorry, this item is currently out of stock. It will be back in 3–5 days.', hasPlaceholders: false, isBuiltIn: true },
  { id: 't4', label: 'Return approved', body: 'Your return request for {order_id} has been approved. The refund will be processed in 1–2 business days.', hasPlaceholders: true, isBuiltIn: true },
  { id: 't5', label: 'Bulk discount', body: 'Yes! We offer a 10% discount on orders of 20 or more units. Let me know the quantity you need.', hasPlaceholders: false, isBuiltIn: true },
  { id: 't6', label: 'Thanks for review', body: 'Thank you so much for the kind review, {buyer_name}! We really appreciate your support.', hasPlaceholders: true, isBuiltIn: true },
]

export interface SellerQuickReply {
  id: string
  label: string
  labelNe: string
  body: string
  bodyNe: string
}

export const SELLER_QUICK_REPLIES: SellerQuickReply[] = [
  { id: 'q1', label: '👋 Hi there!', labelNe: '👋 नमस्ते!', body: 'Hi there! How can I help you today?', bodyNe: 'नमस्ते! मा कसरी मद्दत गर्न सक्छु?' },
  { id: 'q2', label: '📦 On its way', labelNe: '📦 बाटोमा छ', body: 'Your order is on the way and should arrive within 1–2 days.', bodyNe: 'तपाईंको अर्डर बाटोमा छ र १–२ दिनमा पुग्नेछ।' },
  { id: 'q3', label: '✅ In stock', labelNe: '✅ स्टकमा छ', body: 'Yes, this is in stock and ready to ship!', bodyNe: 'हो, यो स्टकमा छ र पठाउन तयार छ!' },
  { id: 'q4', label: '🙏 Thanks!', labelNe: '🙏 धन्यवाद!', body: 'Thank you for shopping with us! Please reach out anytime.', bodyNe: 'हामीसँग किनमेल गर्नुभएकोमा धन्यवाद! कुनै समय सम्पर्क गर्नुहोस्।' },
  { id: 'q5', label: '💳 Payment received', labelNe: '💳 भुक्तानी प्राप्त', body: 'Payment received for your order. We are processing it now.', bodyNe: 'तपाईंको अर्डरको भुक्तानी प्राप्त भयो। हामी अहिले प्रशोधन गरिरहेका छौं।' },
  { id: 'q6', label: '🔄 Return info', labelNe: '🔄 फिर्ता जानकारी', body: 'For returns, please share your order ID. We will guide you through the process.', bodyNe: 'फिर्ताको लागि, कृपया आफ्नो अर्डर ID साझेदारी गर्नुहोस्। हामी प्रक्रिया मार्गदर्शन गर्नेछौं।' },
]

const CANNED_BUYER_REPLIES = [
  'Okay, thank you so much!',
  'Got it. When will it arrive?',
  'That works for me, thanks!',
  'Perfect, I appreciate the quick reply.',
  'Sounds good. I will place the order now.',
  'Can you share the tracking number once it ships?',
  'Thanks! I will leave a review once I receive it.',
  'Great, please send me the invoice as well.',
]

export function mockBuyerReply(_sellerText: string): string {
  return CANNED_BUYER_REPLIES[Math.floor(Math.random() * CANNED_BUYER_REPLIES.length)]
}

export interface TemplateFillContext {
  orderRef?: string
  trackingNumber?: string
  buyerName?: string
}

export function fillTemplatePlaceholders(body: string, ctx: TemplateFillContext): string {
  return body
    .replace(/\{order_id\}/g, ctx.orderRef ?? 'your order')
    .replace(/\{tracking\}/g, ctx.trackingNumber ?? 'pending')
    .replace(/\{buyer_name\}/g, ctx.buyerName ?? 'there')
}

export function getPlaceholders(body: string): string[] {
  const matches = body.match(/\{(?:order_id|tracking|buyer_name)\}/g)
  return matches ? Array.from(new Set(matches)) : []
}

// --- Review Response Templates (SC4) ---

export interface ReviewResponseTemplate {
  id: string
  labelKey: string
  labelNe: string
  body: string
  bodyNe: string
}

export const REVIEW_RESPONSE_TEMPLATES: ReviewResponseTemplate[] = [
  {
    id: 'rt-thanks',
    labelKey: 'sellerReviews.templateThanks',
    labelNe: 'धन्यवाद',
    body: 'Thank you so much for your review! We truly appreciate your feedback and support. 🙏',
    bodyNe: 'तपाईंको समीक्षाको लागि धेरै धन्यवाद! हामी तपाईंको प्रतिक्रिया र सहयोगको कदर गर्छौं। 🙏',
  },
  {
    id: 'rt-thanks-positive',
    labelKey: 'sellerReviews.templateThanksPositive',
    labelNe: 'राम्रो समीक्षाको लागि धन्यवाद',
    body: 'We are thrilled you had a great experience! Thanks for taking the time to share it. We look forward to serving you again.',
    bodyNe: 'तपाईंलाई राम्रो अनुभव भएकोमा हामी एकदमै खुशी छौं! साझा गर्न समय दिनुभएकोमा धन्यवाद। हामी फेरि सेवा गर्न उत्साहित छौं।',
  },
  {
    id: 'rt-address-concern',
    labelKey: 'sellerReviews.templateAddressConcern',
    labelNe: 'चिन्ता सम्बोधन',
    body: 'We are sorry to hear about your experience and would like to make it right. Please reach out to us via Messages and we will resolve this for you.',
    bodyNe: 'तपाईंको अनुभवबारे सुन्न पाउँदा हामीलाई दुःख लागेको छ र हामी यसलाई सुधार्न चाहन्छौं। कृपया सन्देश मार्फत हामीलाई सम्पर्क गर्नुहोस्, हामी यस समस्याको समाधान गर्नेछौं।',
  },
  {
    id: 'rt-followup',
    labelKey: 'sellerReviews.templateFollowup',
    labelNe: 'फलोअप',
    body: 'Thank you for the feedback! We have noted your concerns and are working to improve. If there is anything else we can do, please let us know.',
    bodyNe: 'तपाईंको प्रतिक्रियाको लागि धन्यवाद! हामीले तपाईंको चिन्ता अभिलेखित गरेका छौं र सुधार गर्दैछौं। यदि हामी अरू केही गर्न सक्छौं भने कृपया जानकारी गराउनुहोस्।',
  },
  {
    id: 'rt-replacement',
    labelKey: 'sellerReviews.templateReplacement',
    labelNe: 'प्रतिस्थापन प्रस्ताव',
    body: 'We apologize for the issue. We would be happy to send a replacement or arrange a return. Please message us and we will take care of it right away.',
    bodyNe: 'यो समस्याको लागि हामी क्षमाप्रार्थी छौं। हामी प्रतिस्थापन पठाउन वा फिर्ता व्यवस्था गर्न खुशी हुनेछौं। कृपया हामीलाई सन्देश पठाउनुहोस्, हामी तुरुन्तै व्यवस्था गर्नेछौं।',
  },
]
