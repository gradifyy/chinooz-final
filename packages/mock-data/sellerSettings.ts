export type SettingsStatusKind = 'success' | 'warning' | 'info' | 'neutral'

export interface SettingsRowStatus {
  kind: SettingsStatusKind
  labelKey: string
  count?: number
}

export interface SettingsRow {
  id: string
  icon: string
  labelKey: string
  descKey: string
  status: SettingsRowStatus
}

export interface SettingsSection {
  id: string
  groupKey: string
  titleKey: string
  descriptionKey: string
  icon: string
  rows: SettingsRow[]
}

export const SELLER_STORE_RATING = 4.8
export const SELLER_STORE_REVIEW_COUNT = 128

export const SELLER_SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'storefront',
    groupKey: 'seller.settings.groupStorefront',
    titleKey: 'seller.settings.storefront.title',
    descriptionKey: 'seller.settings.storefront.description',
    icon: 'store',
    rows: [
      {
        id: 'store-profile',
        icon: 'store',
        labelKey: 'seller.settings.rows.storeProfile',
        descKey: 'seller.settings.descriptions.storeProfile',
        status: { kind: 'neutral', labelKey: 'seller.settings.status.setUp' },
      },
      {
        id: 'branding',
        icon: 'palette',
        labelKey: 'seller.settings.rows.branding',
        descKey: 'seller.settings.descriptions.branding',
        status: { kind: 'neutral', labelKey: 'seller.settings.status.logos', count: 2 },
      },
      {
        id: 'policies',
        icon: 'file-text',
        labelKey: 'seller.settings.rows.policies',
        descKey: 'seller.settings.descriptions.policies',
        status: { kind: 'warning', labelKey: 'seller.settings.status.actionNeeded' },
      },
      {
        id: 'schedule',
        icon: 'calendar-clock',
        labelKey: 'seller.settings.rows.schedule',
        descKey: 'seller.settings.descriptions.schedule',
        status: { kind: 'success', labelKey: 'seller.settings.status.set' },
      },
    ],
  },
  {
    id: 'business',
    groupKey: 'seller.settings.groupBusiness',
    titleKey: 'seller.settings.business.title',
    descriptionKey: 'seller.settings.business.description',
    icon: 'shield-check',
    rows: [
      {
        id: 'kyc',
        icon: 'shield-check',
        labelKey: 'seller.settings.rows.kyc',
        descKey: 'seller.settings.descriptions.kyc',
        status: { kind: 'success', labelKey: 'seller.settings.status.verified' },
      },
      {
        id: 'business-details',
        icon: 'building',
        labelKey: 'seller.settings.rows.businessDetails',
        descKey: 'seller.settings.descriptions.businessDetails',
        status: { kind: 'neutral', labelKey: 'seller.settings.status.complete' },
      },
      {
        id: 'tax-pan',
        icon: 'file-text',
        labelKey: 'seller.settings.rows.taxPan',
        descKey: 'seller.settings.descriptions.taxPan',
        status: { kind: 'success', labelKey: 'seller.settings.status.verified' },
      },
      {
        id: 'bank',
        icon: 'credit-card',
        labelKey: 'seller.settings.rows.bank',
        descKey: 'seller.settings.descriptions.bank',
        status: { kind: 'neutral', labelKey: 'seller.settings.status.accounts', count: 1 },
      },
    ],
  },
  {
    id: 'shipping',
    groupKey: 'seller.settings.groupShipping',
    titleKey: 'seller.settings.shipping.title',
    descriptionKey: 'seller.settings.shipping.description',
    icon: 'truck',
    rows: [
      {
        id: 'shipping-zones',
        icon: 'map-pin',
        labelKey: 'seller.settings.rows.shippingZones',
        descKey: 'seller.settings.descriptions.shippingZones',
        status: { kind: 'neutral', labelKey: 'seller.settings.status.zones', count: 2 },
      },
      {
        id: 'delivery-rates',
        icon: 'percent',
        labelKey: 'seller.settings.rows.deliveryRates',
        descKey: 'seller.settings.descriptions.deliveryRates',
        status: { kind: 'success', labelKey: 'seller.settings.status.set' },
      },
      {
        id: 'return-policy',
        icon: 'rotate-ccw',
        labelKey: 'seller.settings.rows.returnPolicy',
        descKey: 'seller.settings.descriptions.returnPolicy',
        status: { kind: 'warning', labelKey: 'seller.settings.status.actionNeeded' },
      },
      {
        id: 'pickup',
        icon: 'package',
        labelKey: 'seller.settings.rows.pickup',
        descKey: 'seller.settings.descriptions.pickup',
        status: { kind: 'neutral', labelKey: 'seller.settings.status.points', count: 1 },
      },
    ],
  },
  {
    id: 'notifications',
    groupKey: 'seller.settings.groupNotifications',
    titleKey: 'seller.settings.notifications.title',
    descriptionKey: 'seller.settings.notifications.description',
    icon: 'bell',
    rows: [
      {
        id: 'push-alerts',
        icon: 'bell',
        labelKey: 'seller.settings.rows.pushAlerts',
        descKey: 'seller.settings.descriptions.pushAlerts',
        status: { kind: 'success', labelKey: 'seller.settings.status.on' },
      },
      {
        id: 'email-updates',
        icon: 'mail',
        labelKey: 'seller.settings.rows.emailUpdates',
        descKey: 'seller.settings.descriptions.emailUpdates',
        status: { kind: 'success', labelKey: 'seller.settings.status.on' },
      },
      {
        id: 'order-alerts',
        icon: 'package',
        labelKey: 'seller.settings.rows.orderAlerts',
        descKey: 'seller.settings.descriptions.orderAlerts',
        status: { kind: 'success', labelKey: 'seller.settings.status.on' },
      },
    ],
  },
  {
    id: 'staff',
    groupKey: 'seller.settings.groupStaff',
    titleKey: 'seller.settings.staff.title',
    descriptionKey: 'seller.settings.staff.description',
    icon: 'users',
    rows: [
      {
        id: 'team',
        icon: 'users',
        labelKey: 'seller.settings.rows.team',
        descKey: 'seller.settings.descriptions.team',
        status: { kind: 'neutral', labelKey: 'seller.settings.status.members', count: 2 },
      },
      {
        id: 'permissions',
        icon: 'user-cog',
        labelKey: 'seller.settings.rows.permissions',
        descKey: 'seller.settings.descriptions.permissions',
        status: { kind: 'neutral', labelKey: 'seller.settings.status.default' },
      },
    ],
  },
  {
    id: 'account',
    groupKey: 'seller.settings.groupAccount',
    titleKey: 'seller.settings.account.title',
    descriptionKey: 'seller.settings.account.description',
    icon: 'lock',
    rows: [
      {
        id: 'login-2fa',
        icon: 'smartphone',
        labelKey: 'seller.settings.rows.login2fa',
        descKey: 'seller.settings.descriptions.login2fa',
        status: { kind: 'warning', labelKey: 'seller.settings.status.actionNeeded' },
      },
      {
        id: 'password',
        icon: 'key-round',
        labelKey: 'seller.settings.rows.password',
        descKey: 'seller.settings.descriptions.password',
        status: { kind: 'success', labelKey: 'seller.settings.status.updated' },
      },
      {
        id: 'active-sessions',
        icon: 'smartphone',
        labelKey: 'seller.settings.rows.activeSessions',
        descKey: 'seller.settings.descriptions.activeSessions',
        status: { kind: 'neutral', labelKey: 'seller.settings.status.sessions', count: 1 },
      },
      {
        id: 'language',
        icon: 'globe',
        labelKey: 'seller.settings.rows.language',
        descKey: 'seller.settings.descriptions.language',
        status: { kind: 'neutral', labelKey: 'seller.settings.status.language' },
      },
    ],
  },
]

export function getSettingsSection(id: string): SettingsSection | undefined {
  return SELLER_SETTINGS_SECTIONS.find(s => s.id === id)
}

export type StoreVerificationStatus = 'verified' | 'actionNeeded' | 'underReview'

export interface StoreVerificationInfo {
  kind: StoreVerificationStatus
  labelKey: string
}

export function getStoreVerification(
  kycStatus: string,
  goLiveStatus: string,
): StoreVerificationInfo {
  if (goLiveStatus === 'review' || kycStatus === 'pending') {
    return { kind: 'underReview', labelKey: 'seller.settings.status.underReview' }
  }
  if (kycStatus === 'verified' && goLiveStatus === 'live') {
    return { kind: 'verified', labelKey: 'seller.settings.status.verified' }
  }
  return { kind: 'actionNeeded', labelKey: 'seller.settings.status.actionNeeded' }
}
