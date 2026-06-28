import type {
  SellerStoreProfile,
  Payout,
  Transaction,
  StaffMember,
  SellerNotification,
  SellerStats,
  SellerStatsRange,
} from '@chinooz/types'

const now = new Date()
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString()
const daysAhead = (n: number) => new Date(Date.now() + n * 86400000).toISOString()

export const SELLER_ID = 'seller-1'

export const sellerStore: SellerStoreProfile = {
  id: 'store-1',
  sellerId: SELLER_ID,
  name: 'Himal Tech Hub',
  nameNe: 'हिमाल टेक हब',
  slug: 'himal-tech-hub',
  logo: 'https://picsum.photos/seed/seller-logo/200/200',
  banner: 'https://picsum.photos/seed/seller-banner/800/200',
  description:
    'Authentic electronics and gadgets sourced directly from authorized distributors. Serving Nepal since 2019 with genuine products, warranty, and fast delivery across the Valley.',
  descriptionNe:
    'अधिकृत वितरकहरूबाट सीधा ल्याइएका असली इलेक्ट्रोनिक्स र ग्याजेटहरू। २०१९ देखि नेपालमा सेवा दिइरहेको — असली उत्पादन, वारेन्टी, र उपत्यकाभर छिटो डेलिभरी।',
  rating: 4.8,
  reviewCount: 128,
  followerCount: 1240,
  productCount: 86,
  joinedAt: daysAgo(720),
  goLiveStatus: 'live',
  kycStatus: 'verified',
  pan: '601234567',
  email: 'contact@himaltech.com.np',
  phone: '+977-9801112222',
  address: 'New Road, Kathmandu',
  city: 'Kathmandu',
  district: 'Kathmandu',
  province: 'Bagmati',
  defaultPayoutMethod: 'khalti',
}

export const sellerPayouts: Payout[] = [
  {
    id: 'pay-1',
    sellerId: SELLER_ID,
    amount: 12400,
    currency: 'NPR',
    status: 'processing',
    method: 'khalti',
    reference: 'KLT-2024-001234',
    requestedAt: daysAgo(1),
    estimatedAt: daysAhead(2),
    fee: 124,
    net: 12276,
  },
  {
    id: 'pay-2',
    sellerId: SELLER_ID,
    amount: 28900,
    currency: 'NPR',
    status: 'completed',
    method: 'khalti',
    reference: 'KLT-2024-001189',
    requestedAt: daysAgo(8),
    processedAt: daysAgo(6),
    fee: 289,
    net: 28611,
  },
  {
    id: 'pay-3',
    sellerId: SELLER_ID,
    amount: 18200,
    currency: 'NPR',
    status: 'completed',
    method: 'esewa',
    reference: 'ESW-2024-009876',
    requestedAt: daysAgo(15),
    processedAt: daysAgo(13),
    fee: 182,
    net: 18018,
  },
  {
    id: 'pay-4',
    sellerId: SELLER_ID,
    amount: 35600,
    currency: 'NPR',
    status: 'completed',
    method: 'bank',
    reference: 'BNK-2024-004567',
    requestedAt: daysAgo(22),
    processedAt: daysAgo(19),
    fee: 100,
    net: 35500,
  },
  {
    id: 'pay-5',
    sellerId: SELLER_ID,
    amount: 22400,
    currency: 'NPR',
    status: 'failed',
    method: 'esewa',
    reference: 'ESW-2024-009123',
    requestedAt: daysAgo(30),
    processedAt: daysAgo(28),
    fee: 224,
    net: 22176,
  },
  {
    id: 'pay-6',
    sellerId: SELLER_ID,
    amount: 41200,
    currency: 'NPR',
    status: 'completed',
    method: 'khalti',
    reference: 'KLT-2024-001045',
    requestedAt: daysAgo(45),
    processedAt: daysAgo(43),
    fee: 412,
    net: 40788,
  },
]

export const sellerTransactions: Transaction[] = [
  {
    id: 'txn-1',
    sellerId: SELLER_ID,
    type: 'sale',
    amount: 45999,
    currency: 'NPR',
    status: 'settled',
    description: 'Samsung Galaxy A55 5G — Order #ORD-2051',
    reference: 'ORD-2051',
    orderId: 'ORD-2051',
    createdAt: daysAgo(0),
    vatAmount: 5294,
    feeAmount: 1840,
  },
  {
    id: 'txn-2',
    sellerId: SELLER_ID,
    type: 'sale',
    amount: 1299,
    currency: 'NPR',
    status: 'settled',
    description: 'Daraz Power Bank 10000mAh — Order #ORD-2050',
    reference: 'ORD-2050',
    orderId: 'ORD-2050',
    createdAt: daysAgo(0),
    vatAmount: 150,
    feeAmount: 52,
  },
  {
    id: 'txn-3',
    sellerId: SELLER_ID,
    type: 'fee',
    amount: -1840,
    currency: 'NPR',
    status: 'settled',
    description: 'Platform fee — Order #ORD-2051 (4%)',
    reference: 'FEE-2051',
    orderId: 'ORD-2051',
    createdAt: daysAgo(0),
  },
  {
    id: 'txn-4',
    sellerId: SELLER_ID,
    type: 'payout',
    amount: -28900,
    currency: 'NPR',
    status: 'settled',
    description: 'Payout to Khalti — KLT-2024-001189',
    reference: 'KLT-2024-001189',
    payoutId: 'pay-2',
    createdAt: daysAgo(6),
  },
  {
    id: 'txn-5',
    sellerId: SELLER_ID,
    type: 'refund',
    amount: -2199,
    currency: 'NPR',
    status: 'pending',
    description: 'Refund — Order #ORD-2048 (returned item)',
    reference: 'REF-2048',
    orderId: 'ORD-2048',
    createdAt: daysAgo(3),
  },
  {
    id: 'txn-6',
    sellerId: SELLER_ID,
    type: 'sale',
    amount: 37999,
    currency: 'NPR',
    status: 'settled',
    description: 'Redmi Note 13 Pro — Order #ORD-2046',
    reference: 'ORD-2046',
    orderId: 'ORD-2046',
    createdAt: daysAgo(2),
    vatAmount: 4376,
    feeAmount: 1520,
  },
  {
    id: 'txn-7',
    sellerId: SELLER_ID,
    type: 'sale',
    amount: 2199,
    currency: 'NPR',
    status: 'pending',
    description: 'Daraz Power Bank 20000mAh — Order #ORD-2053',
    reference: 'ORD-2053',
    orderId: 'ORD-2053',
    createdAt: daysAgo(0),
    vatAmount: 253,
    feeAmount: 88,
  },
  {
    id: 'txn-8',
    sellerId: SELLER_ID,
    type: 'adjustment',
    amount: 500,
    currency: 'NPR',
    status: 'settled',
    description: 'Shipping overcharge refund — bulk adjustment',
    reference: 'ADJ-2024-001',
    createdAt: daysAgo(5),
  },
]

export const sellerStaff: StaffMember[] = [
  {
    id: 'staff-1',
    sellerId: SELLER_ID,
    name: 'Aarav Sharma',
    email: 'aarav@himaltech.com.np',
    phone: '+977-9801112222',
    role: 'owner',
    status: 'active',
    avatar: 'https://picsum.photos/seed/staff-aarav/80/80',
    permissions: ['*'],
    lastActiveAt: daysAgo(0),
    invitedAt: daysAgo(720),
  },
  {
    id: 'staff-2',
    sellerId: SELLER_ID,
    name: 'Sita Rai',
    email: 'sita@himaltech.com.np',
    phone: '+977-9812334455',
    role: 'admin',
    status: 'active',
    avatar: 'https://picsum.photos/seed/staff-sita/80/80',
    permissions: ['products', 'orders', 'promotions', 'finance', 'settings'],
    lastActiveAt: daysAgo(1),
    invitedAt: daysAgo(365),
  },
  {
    id: 'staff-3',
    sellerId: SELLER_ID,
    name: 'Bishal Thapa',
    email: 'bishal@himaltech.com.np',
    phone: '+977-9824455667',
    role: 'manager',
    status: 'active',
    avatar: 'https://picsum.photos/seed/staff-bishal/80/80',
    permissions: ['products', 'orders', 'inventory'],
    lastActiveAt: daysAgo(2),
    invitedAt: daysAgo(180),
  },
  {
    id: 'staff-4',
    sellerId: SELLER_ID,
    name: 'Gita Maharjan',
    email: 'gita@himaltech.com.np',
    phone: '+977-9845677889',
    role: 'staff',
    status: 'invited',
    avatar: 'https://picsum.photos/seed/staff-gita/80/80',
    permissions: ['orders'],
    invitedAt: daysAgo(3),
  },
]

export const sellerNotifications: SellerNotification[] = [
  {
    id: 'sn-1',
    sellerId: SELLER_ID,
    type: 'order',
    title: 'New order #ORD-2051',
    body: 'Samsung Galaxy A55 5G — NPR 45,999. Cash on delivery.',
    read: false,
    createdAt: daysAgo(0),
    link: '/orders',
    priority: 'high',
  },
  {
    id: 'sn-2',
    sellerId: SELLER_ID,
    type: 'order',
    title: 'New order #ORD-2050',
    body: 'Daraz Power Bank 10000mAh — NPR 1,299. Prepaid.',
    read: false,
    createdAt: daysAgo(0),
    link: '/orders',
    priority: 'high',
  },
  {
    id: 'sn-3',
    sellerId: SELLER_ID,
    type: 'review',
    title: 'New 5★ review',
    body: '“Great service, fast delivery!” — Suman Shrestha',
    read: false,
    createdAt: daysAgo(1),
    link: '/reviews',
    priority: 'normal',
  },
  {
    id: 'sn-4',
    sellerId: SELLER_ID,
    type: 'stock',
    title: 'Low stock alert',
    body: 'Dhaka Topi is running low (8 units remaining).',
    read: false,
    createdAt: daysAgo(1),
    link: '/inventory',
    priority: 'normal',
  },
  {
    id: 'sn-5',
    sellerId: SELLER_ID,
    type: 'payout',
    title: 'Payout processing',
    body: 'NPR 12,400 will be settled to your Khalti account in 1–2 days.',
    read: true,
    createdAt: daysAgo(1),
    link: '/finance',
    priority: 'low',
  },
  {
    id: 'sn-6',
    sellerId: SELLER_ID,
    type: 'order',
    title: 'Return request needs action',
    body: 'Order #ORD-2048 — approve or respond within 24h.',
    read: true,
    createdAt: daysAgo(2),
    link: '/orders',
    priority: 'high',
  },
  {
    id: 'sn-7',
    sellerId: SELLER_ID,
    type: 'promotion',
    title: 'Dashain Dhamaka is live',
    body: 'Your promotion DASHAIN25 is now active and has 412 redemptions.',
    read: true,
    createdAt: daysAgo(3),
    link: '/promotions',
    priority: 'low',
  },
  {
    id: 'sn-8',
    sellerId: SELLER_ID,
    type: 'message',
    title: 'New message from buyer',
    body: 'Aarav Sharma asked about warranty on Galaxy A55.',
    read: true,
    createdAt: daysAgo(2),
    link: '/messages',
    priority: 'normal',
  },
  {
    id: 'sn-9',
    sellerId: SELLER_ID,
    type: 'system',
    title: 'Store verification complete',
    body: 'Your KYC has been verified. You can now go live.',
    read: true,
    createdAt: daysAgo(30),
    priority: 'low',
  },
  {
    id: 'sn-10',
    sellerId: SELLER_ID,
    type: 'stock',
    title: 'Out of stock',
    body: 'Organic Honey 500g is now out of stock.',
    read: true,
    createdAt: daysAgo(5),
    link: '/inventory',
    priority: 'normal',
  },
]

// --- Seller Stats ---

function seeded(n: number, seed: number): number {
  const x = Math.sin(seed + n * 99.13) * 10000
  return x - Math.floor(x)
}

const CHART_LABELS: Record<number, string[]> = {
  1: ['12a', '4a', '8a', '12p', '4p', '8p'],
  7: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  30: ['W1', 'W2', 'W3', 'W4'],
  90: ['M1', 'M2', 'M3'],
}

function scaleFor(days: number): number {
  if (days <= 1) return 0.08
  if (days <= 7) return 0.55
  if (days <= 30) return 1
  return 2.6
}

export function buildSellerStats(range: SellerStatsRange): SellerStats {
  const daysMap: Record<SellerStatsRange, number> = {
    today: 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    custom: 30,
  }
  const days = daysMap[range]
  const scale = scaleFor(days)
  const seed = days

  const kpiDefs = [
    { key: 'revenue', label: 'Revenue', base: 18450, hint: 'Gross sales', isMoney: true },
    { key: 'orders', label: 'Orders', base: 64, hint: 'Confirmed orders', isMoney: false },
    { key: 'aov', label: 'Avg. order value', base: 288, hint: 'Revenue / orders', isMoney: true },
    { key: 'views', label: 'Store views', base: 3120, hint: 'Unique visitors', isMoney: false },
    { key: 'conversion', label: 'Conversion rate', base: 2.8, hint: 'Orders / views', isMoney: false, isPct: true },
    { key: 'returns', label: 'Returns', base: 2, hint: 'Returned orders', isMoney: false },
  ]

  const kpis = kpiDefs.map((k, i) => {
    const value = k.base * scale * (0.82 + seeded(i, seed) * 0.34)
    const deltaPct = Math.round((seeded(i + 1, seed) - 0.42) * 44)
    const trend: 'up' | 'down' | 'flat' = deltaPct > 3 ? 'up' : deltaPct < -3 ? 'down' : 'flat'
    const formattedValue = k.isMoney
      ? `NPR ${Math.round(value).toLocaleString()}`
      : k.isPct
        ? `${(Math.round(value * 10) / 10)}%`
        : Math.round(value).toLocaleString()
    return {
      key: k.key,
      label: k.label,
      value: Math.round(value),
      formattedValue,
      deltaPct,
      trend,
      hint: k.hint,
    }
  })

  const labels = CHART_LABELS[days] ?? CHART_LABELS[30]
  const chart = labels.map((label, i) => {
    const current = Math.round(2200 * scale * (0.45 + seeded(i + 10, seed) * 0.95))
    const previous = Math.round(2200 * scale * (0.4 + seeded(i + 20, seed + 1) * 0.85))
    return { label, value: current, previous }
  })

  const topProducts = [
    { id: 'prod-1', name: 'Samsung Galaxy A55 5G', revenue: 42000, units: 12 },
    { id: 'prod-8', name: 'Redmi Note 13 Pro', revenue: 38000, units: 8 },
    { id: 'prod-5', name: 'Daraz Power Bank 10000mAh', revenue: 5200, units: 24 },
    { id: 'prod-1b', name: 'Samsung Galaxy A55 — Lavender', revenue: 51999, units: 6 },
    { id: 'prod-5b', name: 'Daraz Power Bank 20000mAh', revenue: 4400, units: 16 },
  ]

  const recentOrders = [
    { id: 'ORD-2051', buyer: 'Aarav Sharma', total: 45999, status: 'new', at: daysAgo(0) },
    { id: 'ORD-2050', buyer: 'Sita Rai', total: 1299, status: 'new', at: daysAgo(0) },
    { id: 'ORD-2053', buyer: 'Bishal Thapa', total: 2199, status: 'new', at: daysAgo(0) },
    { id: 'ORD-2046', buyer: 'Gita Maharjan', total: 37999, status: 'to_pack', at: daysAgo(2) },
    { id: 'ORD-2048', buyer: 'Rohan Tamang', total: 2199, status: 'returned', at: daysAgo(3) },
  ]

  return { range, kpis, chart, topProducts, recentOrders }
}
