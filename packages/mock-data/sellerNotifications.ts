export type NotificationChannel = 'push' | 'email' | 'sms'
export type NotificationCategory = 'orders' | 'lowStock' | 'reviews' | 'messages' | 'payouts' | 'promotions'
export type LandingTab = 'dashboard' | 'products' | 'orders' | 'messages'
export type CurrencyDisplay = 'NPR' | 'USD'

export interface NotificationToggles {
  [category: string]: {
    push: boolean
    email: boolean
    sms: boolean
  }
}

export interface NotificationPreferences {
  toggles: NotificationToggles
  quietHoursStart: string
  quietHoursEnd: string
  dailySummary: boolean
  weeklySummary: boolean
  language: 'en' | 'ne'
  landingTab: LandingTab
  currency: CurrencyDisplay
}

export const SELLER_NOTIFICATION_CATEGORIES: { id: NotificationCategory; labelKey: string; icon: string }[] = [
  { id: 'orders', labelKey: 'seller.settings.notifications.categories.orders', icon: 'orders' },
  { id: 'lowStock', labelKey: 'seller.settings.notifications.categories.lowStock', icon: 'stock' },
  { id: 'reviews', labelKey: 'seller.settings.notifications.categories.reviews', icon: 'reviews' },
  { id: 'messages', labelKey: 'seller.settings.notifications.categories.messages', icon: 'messages' },
  { id: 'payouts', labelKey: 'seller.settings.notifications.categories.payouts', icon: 'payouts' },
  { id: 'promotions', labelKey: 'seller.settings.notifications.categories.promotions', icon: 'promotions' },
]

export const SELLER_NOTIFICATION_CHANNELS: { id: NotificationChannel; labelKey: string }[] = [
  { id: 'push', labelKey: 'seller.settings.notifications.channels.push' },
  { id: 'email', labelKey: 'seller.settings.notifications.channels.email' },
  { id: 'sms', labelKey: 'seller.settings.notifications.channels.sms' },
]

export const SELLER_LANDING_TABS: { id: LandingTab; labelKey: string }[] = [
  { id: 'dashboard', labelKey: 'seller.settings.notifications.landingTabs.dashboard' },
  { id: 'products', labelKey: 'seller.settings.notifications.landingTabs.products' },
  { id: 'orders', labelKey: 'seller.settings.notifications.landingTabs.orders' },
  { id: 'messages', labelKey: 'seller.settings.notifications.landingTabs.messages' },
]

export const SELLER_CURRENCIES: { id: CurrencyDisplay; labelKey: string }[] = [
  { id: 'NPR', labelKey: 'seller.settings.notifications.currencies.npr' },
  { id: 'USD', labelKey: 'seller.settings.notifications.currencies.usd' },
]

export const SELLER_NOTIFICATION_DEFAULTS: NotificationPreferences = {
  toggles: {
    orders: { push: true, email: true, sms: false },
    lowStock: { push: true, email: true, sms: false },
    reviews: { push: true, email: false, sms: false },
    messages: { push: true, email: true, sms: false },
    payouts: { push: true, email: true, sms: false },
    promotions: { push: false, email: true, sms: false },
  },
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  dailySummary: true,
  weeklySummary: false,
  language: 'en',
  landingTab: 'dashboard',
  currency: 'NPR',
}
