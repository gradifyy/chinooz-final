export type SellerDateRangeKey = 'today' | '7d' | '30d' | 'custom'

export interface SellerDateRange {
  key: SellerDateRangeKey
  label: string
  days: number
  custom?: { start: string; end: string }
}

export interface SellerKpi {
  key: string
  label: string
  value: string
  deltaPct: number
  trend: 'up' | 'down' | 'flat'
  hint: string
}

export interface SellerChartPoint {
  label: string
  value: number
}

export interface SellerAlert {
  id: string
  severity: 'warning' | 'error' | 'info'
  title: string
  body: string
  cta?: string
}

export interface SellerQuickAction {
  id: string
  label: string
  icon: string
  href?: string
}

export interface SellerActivityItem {
  id: string
  kind: 'order' | 'review' | 'payout' | 'stock' | 'follower'
  title: string
  subtitle: string
  at: string
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

const KPIS: { key: string; label: string; base: number; suffix: string; hint: string }[] = [
  { key: 'revenue', label: 'Revenue', base: 18450, suffix: 'NPR', hint: 'Gross sales' },
  { key: 'orders', label: 'Orders', base: 64, suffix: '', hint: 'Confirmed orders' },
  { key: 'aov', label: 'Avg. order value', base: 288, suffix: 'NPR', hint: 'Revenue / orders' },
  { key: 'views', label: 'Store views', base: 3120, suffix: '', hint: 'Unique visitors' },
]

const CHART_LABELS: Record<number, string[]> = {
  1: ['12a', '4a', '8a', '12p', '4p', '8p'],
  7: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  30: ['W1', 'W2', 'W3', 'W4'],
}

const ALERTS: SellerAlert[] = [
  {
    id: 'reviews-needing-response',
    severity: 'warning',
    title: 'Reviews need your response',
    body: 'Several buyers left reviews waiting for a reply. Respond to build trust.',
    cta: 'View reviews',
  },
  {
    id: 'low-stock',
    severity: 'warning',
    title: '2 products are low on stock',
    body: 'Samsung Galaxy A55 and Dhaka Topi are running low.',
    cta: 'Restock',
  },
  {
    id: 'pending-payout',
    severity: 'info',
    title: 'Payout pending review',
    body: 'NPR 12,400 will be settled to your Khalti account in 1–2 days.',
  },
  {
    id: 'return-request',
    severity: 'error',
    title: '1 return request needs action',
    body: 'Order #ORD-2048 — approve or respond within 24h.',
    cta: 'Review',
  },
]

const QUICK_ACTIONS: SellerQuickAction[] = [
  { id: 'add-product', label: 'Add product', icon: 'plus', href: '/products/new' },
  { id: 'orders', label: 'Orders', icon: 'box', href: '/orders' },
  { id: 'inventory', label: 'Inventory', icon: 'layers', href: '/inventory' },
  { id: 'promotions', label: 'Promotions', icon: 'tag', href: '/promotions' },
  { id: 'payouts', label: 'Payouts', icon: 'wallet', href: '/payouts' },
]

const ACTIVITY: SellerActivityItem[] = [
  { id: 'a1', kind: 'order', title: 'New order #ORD-2051', subtitle: 'Samsung Galaxy A55 — NPR 45,999', at: '2m ago' },
  { id: 'a2', kind: 'review', title: 'New 5★ review', subtitle: '“Great service, fast delivery!”', at: '1h ago' },
  { id: 'a3', kind: 'payout', title: 'Payout settled', subtitle: 'NPR 12,400 → Khalti', at: '5h ago' },
  { id: 'a4', kind: 'stock', title: 'Stock updated', subtitle: 'Dhaka Topi: 24 → 8 units', at: 'Yesterday' },
  { id: 'a5', kind: 'follower', title: '+12 new followers', subtitle: 'Your store gained followers this week', at: '2d ago' },
]

function seeded(n: number, seed: number): number {
  const x = Math.sin(seed + n) * 10000
  return x - Math.floor(x)
}

export function getSellerDashboardMetrics(range: SellerDateRange): SellerDashboardMetrics {
  const days = range.days
  const scale = days === 1 ? 0.08 : days === 7 ? 0.55 : 1

  const kpis: SellerKpi[] = KPIS.map((k, i) => {
    const value = Math.round(k.base * scale * (0.85 + seeded(i, days) * 0.3))
    const deltaPct = Math.round((seeded(i + 1, days) - 0.4) * 40)
    return {
      key: k.key,
      label: k.label,
      value: k.suffix === 'NPR' ? `${k.suffix} ${value.toLocaleString()}` : value.toLocaleString(),
      deltaPct,
      trend: deltaPct > 3 ? 'up' : deltaPct < -3 ? 'down' : 'flat',
      hint: k.hint,
    }
  })

  const labels = CHART_LABELS[days] ?? CHART_LABELS[30]
  const chart: SellerChartPoint[] = labels.map((label, i) => ({
    label,
    value: Math.round(2000 * scale * (0.5 + seeded(i + 10, days) * 0.9)),
  }))

  return {
    range,
    kpis,
    chart,
    alerts: ALERTS,
    quickActions: QUICK_ACTIONS,
    activity: ACTIVITY,
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
