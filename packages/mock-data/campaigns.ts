export type CampaignStatus = 'upcoming' | 'applied' | 'approved' | 'live' | 'ended'

export interface Campaign {
  id: string
  name: string
  description: string
  startsAt: string
  endsAt: string
  minDiscount: number
  maxDiscount: number
  discountType: 'percentage'
  rules: string[]
  bannerGradient: string
  expectedExposure: number
  eligibleCategoryIds?: string[]
  participation?: CampaignParticipation
}

export interface CampaignParticipation {
  status: CampaignStatus
  productIds: string[]
  discountValue: number
  appliedAt: string
  approvedAt?: string
}

export interface CampaignOptInInput {
  campaignId: string
  productIds: string[]
  discountValue: number
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function iso(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString()
}

const CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-dashain',
    name: 'Dashain Sale',
    description: 'The biggest shopping festival of Nepal. Join thousands of sellers for 10 days of deals.',
    startsAt: iso(5),
    endsAt: iso(15),
    minDiscount: 10,
    maxDiscount: 50,
    discountType: 'percentage',
    rules: [
      'Discount must be between 10% and 50%',
      'Only active products are eligible',
      'Free shipping recommended for orders over NPR 2,000',
      'Platform will feature top deals on the homepage',
    ],
    bannerGradient: 'from-gold/20 via-gold/5 to-background',
    expectedExposure: 50000,
    participation: {
      status: 'upcoming',
      productIds: [],
      discountValue: 0,
      appliedAt: '',
    },
  },
  {
    id: 'camp-flash-fri',
    name: 'Flash Friday',
    description: 'Weekly 24-hour flash sale. Lightning deals every Friday from 6 AM to midnight.',
    startsAt: iso(2),
    endsAt: iso(3),
    minDiscount: 15,
    maxDiscount: 60,
    discountType: 'percentage',
    rules: [
      'Discount must be between 15% and 60%',
      'Limited stock encouraged — creates urgency',
      'Deals appear in the buyer Flash Deals carousel',
      'Max 20 products per seller',
    ],
    bannerGradient: 'from-primary/15 via-primary/5 to-background',
    expectedExposure: 25000,
    participation: {
      status: 'applied',
      productIds: ['p1', 'p3'],
      discountValue: 25,
      appliedAt: iso(-1),
    },
  },
  {
    id: 'camp-tihar',
    name: 'Tihar Lights Festival',
    description: 'Festival of lights celebration. Home decor, gifts, and sweets shine brightest.',
    startsAt: iso(20),
    endsAt: iso(30),
    minDiscount: 5,
    maxDiscount: 40,
    discountType: 'percentage',
    rules: [
      'Discount must be between 5% and 40%',
      'Decor, gift, and sweets categories prioritized',
      'Combo deals encouraged',
      'Platform homepage banner for top-rated sellers',
    ],
    bannerGradient: 'from-gold/20 via-gold/5 to-background',
    expectedExposure: 35000,
    participation: {
      status: 'approved',
      productIds: ['p2', 'p5', 'p8'],
      discountValue: 20,
      appliedAt: iso(-3),
      approvedAt: iso(-1),
    },
  },
  {
    id: 'camp-summer',
    name: 'Summer Clearance',
    description: 'Clear your summer inventory with platform-wide discounts. End of season mega sale.',
    startsAt: iso(-10),
    endsAt: iso(-2),
    minDiscount: 20,
    maxDiscount: 70,
    discountType: 'percentage',
    rules: [
      'Discount must be between 20% and 70%',
      'All product categories eligible',
      'Clearance items marked as limited stock',
      'Platform-wide push notifications to buyers',
    ],
    bannerGradient: 'from-gold/15 via-gold/5 to-background',
    expectedExposure: 40000,
    participation: {
      status: 'live',
      productIds: ['p1', 'p4', 'p7'],
      discountValue: 30,
      appliedAt: iso(-15),
      approvedAt: iso(-12),
    },
  },
  {
    id: 'camp-newyear',
    name: 'New Year Blowout',
    description: 'Ring in the Nepali New Year with the biggest deals of the season.',
    startsAt: iso(-30),
    endsAt: iso(-20),
    minDiscount: 15,
    maxDiscount: 55,
    discountType: 'percentage',
    rules: [
      'Discount must be between 15% and 55%',
      'Festive and gift categories prioritized',
      'Free shipping over NPR 1,500',
    ],
    bannerGradient: 'from-gold/15 via-gold/5 to-background',
    expectedExposure: 30000,
    participation: {
      status: 'ended',
      productIds: ['p2', 'p6'],
      discountValue: 25,
      appliedAt: iso(-35),
      approvedAt: iso(-33),
    },
  },
]

export async function getCampaigns(): Promise<Campaign[]> {
  await delay(200 + Math.random() * 300)
  return [...CAMPAIGNS]
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  await delay(150 + Math.random() * 200)
  return CAMPAIGNS.find(c => c.id === id) ?? null
}

export async function optIntoCampaign(input: CampaignOptInInput): Promise<Campaign | null> {
  await delay(400 + Math.random() * 300)
  const camp = CAMPAIGNS.find(c => c.id === input.campaignId)
  if (!camp) return null
  camp.participation = {
    status: 'applied',
    productIds: input.productIds,
    discountValue: input.discountValue,
    appliedAt: new Date().toISOString(),
  }
  return { ...camp }
}

export async function withdrawFromCampaign(campaignId: string): Promise<{ success: boolean }> {
  await delay(300 + Math.random() * 200)
  const camp = CAMPAIGNS.find(c => c.id === campaignId)
  if (!camp) return { success: false }
  camp.participation = {
    status: 'upcoming',
    productIds: [],
    discountValue: 0,
    appliedAt: '',
  }
  return { success: true }
}

export function getCampaignStatusPill(status: CampaignStatus): { label: string; color: string; bg: string } {
  switch (status) {
    case 'upcoming':
      return { label: 'seller.promotions.campaigns.statusUpcoming', color: '#6B7280', bg: 'rgba(107,114,128,0.10)' }
    case 'applied':
      return { label: 'seller.promotions.campaigns.statusApplied', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' }
    case 'approved':
      return { label: 'seller.promotions.campaigns.statusApproved', color: '#2563EB', bg: 'rgba(37,99,235,0.10)' }
    case 'live':
      return { label: 'seller.promotions.campaigns.statusLive', color: '#16A34A', bg: 'rgba(22,163,74,0.10)' }
    case 'ended':
      return { label: 'seller.promotions.campaigns.statusEnded', color: '#6B7280', bg: 'rgba(107,114,128,0.10)' }
  }
}
