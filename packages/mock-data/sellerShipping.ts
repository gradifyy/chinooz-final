export type ShippingRule = 'flat' | 'weight'

export interface ShippingZone {
  id: string
  name: string
  areas: string
  feeNpr: number
  estimatedDays: number
  codAvailable: boolean
  carriers: string[]
}

export interface ShippingSettings {
  rule: ShippingRule
  freeShippingThresholdNpr: number
  handlingDays: number
  returnWindowDays: number
  returnPolicyText: string
  zones: ShippingZone[]
}

export const SELLER_CARRIERS: { id: string; labelKey: string }[] = [
  { id: 'chinooz-logistics', labelKey: 'seller.settings.shipping.carriers.chinoozLogistics' },
  { id: 'pathao', labelKey: 'seller.settings.shipping.carriers.pathao' },
  { id: 'daraz', labelKey: 'seller.settings.shipping.carriers.daraz' },
  { id: 'nepal-canmove', labelKey: 'seller.settings.shipping.carriers.nepalCanmove' },
  { id: 'self', labelKey: 'seller.settings.shipping.carriers.self' },
]

export const SELLER_SHIPPING_DEFAULTS: ShippingSettings = {
  rule: 'flat',
  freeShippingThresholdNpr: 5000,
  handlingDays: 1,
  returnWindowDays: 7,
  returnPolicyText:
    'Items can be returned within 7 days of delivery for a full refund. The item must be unused and in its original packaging. Return shipping is free for defective items; otherwise, the buyer covers return shipping.',
  zones: [
    {
      id: 'zone-ktm-valley',
      name: 'Kathmandu Valley',
      areas: 'Kathmandu, Lalitpur, Bhaktapur',
      feeNpr: 100,
      estimatedDays: 1,
      codAvailable: true,
      carriers: ['chinooz-logistics', 'pathao'],
    },
    {
      id: 'zone-major-cities',
      name: 'Major cities',
      areas: 'Pokhara, Chitwan, Butwal, Biratnagar, Dharan',
      feeNpr: 200,
      estimatedDays: 2,
      codAvailable: true,
      carriers: ['pathao', 'daraz'],
    },
    {
      id: 'zone-national',
      name: 'Nationwide',
      areas: 'All other areas of Nepal',
      feeNpr: 350,
      estimatedDays: 4,
      codAvailable: false,
      carriers: ['nepal-canmove'],
    },
  ],
}
