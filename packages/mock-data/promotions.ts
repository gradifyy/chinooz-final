export type PromotionStatus = 'active' | 'scheduled' | 'expired' | 'draft'

export type PromotionType =
  | 'percentage'
  | 'fixed'
  | 'flash_sale'
  | 'bogo'
  | 'free_shipping'

export interface Promotion {
  id: string
  name: string
  type: PromotionType
  status: PromotionStatus
  discountValue: number
  code: string
  startsAt: string
  endsAt: string
  redemptions: number
  revenue: number
  budget?: number
  productsCount: number
  createdAt: string
}

export type PromotionSort = 'newest' | 'ending_soon' | 'performance'

export interface PromotionsQuery {
  status?: PromotionStatus | 'all'
  search?: string
  type?: PromotionType | 'all'
  dateFrom?: string
  dateTo?: string
  sort?: PromotionSort
}

export const PROMOTION_TYPES: { key: PromotionType; label: string }[] = [
  { key: 'percentage', label: 'Percentage off' },
  { key: 'fixed', label: 'Fixed amount' },
  { key: 'flash_sale', label: 'Flash sale' },
  { key: 'bogo', label: 'Buy one get one' },
  { key: 'free_shipping', label: 'Free shipping' },
]

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const NOW = new Date()

function iso(daysFromNow: number): string {
  const d = new Date(NOW)
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString()
}

const PROMOTIONS: Promotion[] = [
  {
    id: 'promo-1',
    name: 'Dashain Dhamaka',
    type: 'percentage',
    status: 'active',
    discountValue: 25,
    code: 'DASHAIN25',
    startsAt: iso(-3),
    endsAt: iso(8),
    redemptions: 412,
    revenue: 184500,
    budget: 250000,
    productsCount: 86,
    createdAt: iso(-5),
  },
  {
    id: 'promo-2',
    name: 'Flash Friday',
    type: 'flash_sale',
    status: 'active',
    discountValue: 40,
    code: 'FLASH40',
    startsAt: iso(-1),
    endsAt: iso(0),
    redemptions: 1284,
    revenue: 312000,
    budget: 400000,
    productsCount: 24,
    createdAt: iso(-2),
  },
  {
    id: 'promo-3',
    name: 'New Customer Welcome',
    type: 'fixed',
    status: 'active',
    discountValue: 200,
    code: 'WELCOME200',
    startsAt: iso(-30),
    endsAt: iso(60),
    redemptions: 96,
    revenue: 54200,
    productsCount: 0,
    createdAt: iso(-31),
  },
  {
    id: 'promo-4',
    name: 'Free Shipping Weekend',
    type: 'free_shipping',
    status: 'active',
    discountValue: 150,
    code: 'FREESHIP',
    startsAt: iso(-2),
    endsAt: iso(2),
    redemptions: 318,
    revenue: 96400,
    productsCount: 0,
    createdAt: iso(-3),
  },
  {
    id: 'promo-5',
    name: 'Tihar Teaser',
    type: 'percentage',
    status: 'scheduled',
    discountValue: 20,
    code: 'TIHAR20',
    startsAt: iso(10),
    endsAt: iso(25),
    redemptions: 0,
    revenue: 0,
    budget: 180000,
    productsCount: 120,
    createdAt: iso(-1),
  },
  {
    id: 'promo-6',
    name: 'BOGO Ethnic Wear',
    type: 'bogo',
    status: 'scheduled',
    discountValue: 50,
    code: 'BOGO50',
    startsAt: iso(5),
    endsAt: iso(12),
    redemptions: 0,
    revenue: 0,
    productsCount: 38,
    createdAt: iso(-1),
  },
  {
    id: 'promo-7',
    name: 'Summer Clearance',
    type: 'percentage',
    status: 'expired',
    discountValue: 30,
    code: 'SUMMER30',
    startsAt: iso(-90),
    endsAt: iso(-60),
    redemptions: 742,
    revenue: 224000,
    productsCount: 54,
    createdAt: iso(-92),
  },
  {
    id: 'promo-8',
    name: 'Eid Special',
    type: 'fixed',
    status: 'expired',
    discountValue: 500,
    code: 'EID500',
    startsAt: iso(-45),
    endsAt: iso(-30),
    redemptions: 188,
    revenue: 142000,
    productsCount: 22,
    createdAt: iso(-46),
  },
  {
    id: 'promo-9',
    name: 'Lhosar Launch',
    type: 'flash_sale',
    status: 'expired',
    discountValue: 35,
    code: 'LHOSAR35',
    startsAt: iso(-20),
    endsAt: iso(-18),
    redemptions: 560,
    revenue: 198000,
    productsCount: 18,
    createdAt: iso(-21),
  },
  {
    id: 'promo-10',
    name: 'Winter Warmup Draft',
    type: 'percentage',
    status: 'draft',
    discountValue: 15,
    code: 'WINTER15',
    startsAt: iso(40),
    endsAt: iso(70),
    redemptions: 0,
    revenue: 0,
    budget: 120000,
    productsCount: 0,
    createdAt: iso(0),
  },
  {
    id: 'promo-11',
    name: 'Festive Hampers Draft',
    type: 'bogo',
    status: 'draft',
    discountValue: 50,
    code: 'HAMPER50',
    startsAt: iso(15),
    endsAt: iso(20),
    redemptions: 0,
    revenue: 0,
    productsCount: 12,
    createdAt: iso(0),
  },
  {
    id: 'promo-12',
    name: 'App Exclusive',
    type: 'percentage',
    status: 'active',
    discountValue: 10,
    code: 'APP10',
    startsAt: iso(-7),
    endsAt: iso(21),
    redemptions: 240,
    revenue: 67800,
    productsCount: 0,
    createdAt: iso(-8),
  },
]

function norm(s: string): string {
  return s.normalize('NFC').toLowerCase()
}

function withinDateRange(promo: Promotion, from?: string, to?: string): boolean {
  if (!from && !to) return true
  const start = new Date(promo.startsAt).getTime()
  const end = new Date(promo.endsAt).getTime()
  if (from && end < new Date(from).getTime()) return false
  if (to && start > new Date(to).getTime()) return false
  return true
}

function sortBy(list: Promotion[], sort: PromotionSort): Promotion[] {
  const copy = [...list]
  if (sort === 'ending_soon') {
    copy.sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime())
  } else if (sort === 'performance') {
    copy.sort((a, b) => b.revenue - a.revenue)
  } else {
    copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  return copy
}

export async function getPromotions(params?: PromotionsQuery): Promise<Promotion[]> {
  await delay(200 + Math.random() * 350)
  let filtered = PROMOTIONS

  if (params?.status && params.status !== 'all') {
    filtered = filtered.filter(p => p.status === params.status)
  }
  if (params?.type && params.type !== 'all') {
    filtered = filtered.filter(p => p.type === params.type)
  }
  if (params?.search) {
    const q = norm(params.search)
    filtered = filtered.filter(
      p => norm(p.name).includes(q) || norm(p.code).includes(q),
    )
  }
  filtered = filtered.filter(p => withinDateRange(p, params?.dateFrom, params?.dateTo))

  return sortBy(filtered, params?.sort ?? 'newest')
}

export function getPromotionCounts(): Record<PromotionStatus, number> {
  return {
    active: PROMOTIONS.filter(p => p.status === 'active').length,
    scheduled: PROMOTIONS.filter(p => p.status === 'scheduled').length,
    expired: PROMOTIONS.filter(p => p.status === 'expired').length,
    draft: PROMOTIONS.filter(p => p.status === 'draft').length,
  }
}
