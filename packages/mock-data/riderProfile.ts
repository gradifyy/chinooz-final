/**
 * RP1 — Rider Profile & Settings hub mock data.
 *
 * Surfaces:
 * - getRiderProfile():  identity, rating, tier, member-since, verification.
 * - getRiderQuickLinks():  grouped quick-link rows (Performance, Wallet, etc).
 * - getRiderSettingsSections():  RG2-RG5 grouped settings rows.
 *
 * All values are static mock — the UI renders the hub from these. Tier and
 * rating are intentionally "earned-feeling" (Gold tier, 4.8 rating) so the
 * premium header reads as a reward, not a placeholder.
 */

export type RiderTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export type RiderVerificationStatus = 'verified' | 'pending' | 'rejected'

export interface RiderProfileHub {
  /** Display name. */
  name: string
  /** Phone (E.164-ish). */
  phone: string
  /** Avatar URI (nullable → initials fallback). */
  avatarUri: string | null
  /** Rider rating (0-5, one decimal). */
  rating: number
  /** Number of rated trips. */
  ratingCount: number
  /** Loyalty tier. */
  tier: RiderTier
  /** ISO date the rider joined Chinooz (yyyy-mm-dd). */
  memberSince: string
  /** ID/KYC verification status. */
  verification: RiderVerificationStatus
  /** Zone label shown under the name. */
  zone: string
}

export type RiderQuickLinkKey =
  | 'performance'
  | 'wallet'
  | 'incentives'
  | 'earnings'
  | 'support'

export interface RiderQuickLink {
  id: RiderQuickLinkKey
  /** i18n key for the label. */
  labelKey: string
  /** i18n key for the description. */
  descKey: string
  /** lucide icon name (resolved in the component). */
  icon: string
  /** Trailing value, e.g. "4.8 ★" or "NPR 18,450". */
  value: string
  /** Route to push on press. */
  route: string
  /** Optional badge count (e.g. active quests). */
  badge?: number
}

export interface RiderQuickLinkGroup {
  id: string
  /** i18n key for the group title. */
  titleKey: string
  links: RiderQuickLink[]
}

export type RiderSettingsStatusKind = 'success' | 'warning' | 'info' | 'neutral'

export interface RiderSettingsRowStatus {
  kind: RiderSettingsStatusKind
  /** i18n key for the status label. */
  labelKey: string
}

export interface RiderSettingsRow {
  id: string
  /** lucide icon name. */
  icon: string
  /** i18n key for the label. */
  labelKey: string
  /** i18n key for the description. */
  descKey: string
  status: RiderSettingsRowStatus
  /** Route to push on press. */
  route: string
}

export interface RiderSettingsSection {
  id: string
  /** i18n key for the group title. */
  titleKey: string
  rows: RiderSettingsRow[]
}

export const RIDER_TIER_LABEL_KEY: Record<RiderTier, string> = {
  bronze: 'rider.profile.tierBronze',
  silver: 'rider.profile.tierSilver',
  gold: 'rider.profile.tierGold',
  platinum: 'rider.profile.tierPlatinum',
}

export const RIDER_VERIFICATION_LABEL_KEY: Record<RiderVerificationStatus, string> = {
  verified: 'rider.profile.verificationVerified',
  pending: 'rider.profile.verificationPending',
  rejected: 'rider.profile.verificationRejected',
}

export async function getRiderProfile(): Promise<RiderProfileHub> {
  await new Promise(resolve => setTimeout(resolve, 180 + Math.random() * 220))
  return {
    name: 'Sujan Tamang',
    phone: '+977-9841234567',
    avatarUri: 'https://picsum.photos/seed/rider-sujan/200/200',
    rating: 4.8,
    ratingCount: 1284,
    tier: 'gold',
    memberSince: '2024-03-12',
    verification: 'verified',
    zone: 'Patan — Lalitpur',
  }
}

export function getRiderQuickLinks(): RiderQuickLinkGroup[] {
  return [
    {
      id: 'performance',
      titleKey: 'rider.profile.groupPerformance',
      links: [
        {
          id: 'performance',
          labelKey: 'rider.profile.linkPerformance',
          descKey: 'rider.profile.linkPerformanceDesc',
          icon: 'trending-up',
          value: '4.8 ★',
          route: '/profile/performance',
        },
        {
          id: 'incentives',
          labelKey: 'rider.profile.linkIncentives',
          descKey: 'rider.profile.linkIncentivesDesc',
          icon: 'target',
          value: '2 active',
          route: '/incentives',
          badge: 2,
        },
      ],
    },
    {
      id: 'money',
      titleKey: 'rider.profile.groupMoney',
      links: [
        {
          id: 'wallet',
          labelKey: 'rider.profile.linkWallet',
          descKey: 'rider.profile.linkWalletDesc',
          icon: 'wallet',
          value: 'NPR 1,240',
          route: '/wallet',
        },
        {
          id: 'earnings',
          labelKey: 'rider.profile.linkEarnings',
          descKey: 'rider.profile.linkEarningsDesc',
          icon: 'banknote',
          value: 'NPR 18,450',
          route: '/earnings',
        },
      ],
    },
    {
      id: 'support',
      titleKey: 'rider.profile.groupSupport',
      links: [
        {
          id: 'support',
          labelKey: 'rider.profile.linkSupport',
          descKey: 'rider.profile.linkSupportDesc',
          icon: 'life-buoy',
          value: '',
          route: '/profile/support',
        },
      ],
    },
  ]
}

export function getRiderSettingsSections(): RiderSettingsSection[] {
  return [
    {
      id: 'personal',
      titleKey: 'rider.profile.sectionPersonal',
      rows: [
        {
          id: 'personal-profile',
          icon: 'user',
          labelKey: 'rider.profile.rowPersonalProfile',
          descKey: 'rider.profile.rowPersonalProfileDesc',
          status: { kind: 'neutral', labelKey: 'rider.profile.statusEdit' },
          route: '/profile/personal',
        },
        {
          id: 'vehicle-docs',
          icon: 'bike',
          labelKey: 'rider.profile.rowVehicleDocs',
          descKey: 'rider.profile.rowVehicleDocsDesc',
          status: { kind: 'success', labelKey: 'rider.profile.statusVerified' },
          route: '/profile/vehicle',
        },
      ],
    },
    {
      id: 'preferences',
      titleKey: 'rider.profile.sectionPreferences',
      rows: [
        {
          id: 'notifications',
          icon: 'bell',
          labelKey: 'rider.profile.rowNotifications',
          descKey: 'rider.profile.rowNotificationsDesc',
          status: { kind: 'info', labelKey: 'rider.profile.statusOn' },
          route: '/profile/notifications',
        },
      ],
    },
    {
      id: 'account',
      titleKey: 'rider.profile.sectionAccount',
      rows: [
        {
          id: 'account-security',
          icon: 'shield',
          labelKey: 'rider.profile.rowAccountSecurity',
          descKey: 'rider.profile.rowAccountSecurityDesc',
          status: { kind: 'success', labelKey: 'rider.profile.statusSecure' },
          route: '/profile/security',
        },
        {
          id: 'language',
          icon: 'globe',
          labelKey: 'rider.profile.rowLanguage',
          descKey: 'rider.profile.rowLanguageDesc',
          status: { kind: 'neutral', labelKey: 'rider.profile.statusEnglish' },
          route: '/profile/language',
        },
      ],
    },
  ]
}

export const RIDER_APP_VERSION = '1.0.0'

/**
 * RP2 — Rider personal profile edit.
 *
 * Surfaces:
 * - getRiderPersonalProfile():  editable identity fields + lock flags.
 * - updateRiderPersonalProfile():  mock persist; resolves after a short delay.
 * - requestRiderPhoneOtp():  send a code to a new number (mock).
 * - verifyRiderPhoneOtp():  validate the code (mock, dev code 123456).
 *
 * "Locked" fields require re-verification when changed (phone, zone). The
 * UI marks them clearly and gates the save behind an OTP step.
 */

export interface RiderEmergencyContact {
  name: string
  phone: string
  relation: string
}

export interface RiderPersonalProfile {
  name: string
  phone: string
  email: string
  city: string
  zone: string
  avatarUri: string | null
  emergency: RiderEmergencyContact
}

export interface RiderPersonalProfileUpdate
  extends Omit<RiderPersonalProfile, 'phone'> {
  /** New phone — only set when the rider is changing it. */
  phone?: string
}

export async function getRiderPersonalProfile(): Promise<RiderPersonalProfile> {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200))
  return {
    name: 'Sujan Tamang',
    phone: '9841234567',
    email: 'sujan.tamang@example.com',
    city: 'Lalitpur',
    zone: 'Patan — Lalitpur',
    avatarUri: 'https://picsum.photos/seed/rider-sujan/200/200',
    emergency: {
      name: 'Anita Tamang',
      phone: '9812345678',
      relation: 'Spouse',
    },
  }
}

export async function updateRiderPersonalProfile(
  data: RiderPersonalProfileUpdate,
): Promise<{ success: boolean }> {
  await new Promise(resolve => setTimeout(resolve, 420 + Math.random() * 280))
  // Always succeeds in mock. A real API would persist + re-run KYC for
  // locked fields (phone/zone). The UI treats this as the success path.
  void data
  return { success: true }
}

export async function requestRiderPhoneOtp(
  phone: string,
): Promise<{ success: boolean; message: string; alreadySent?: boolean }> {
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200))
  void phone
  return { success: true, message: 'Code sent' }
}

export async function verifyRiderPhoneOtp(
  phone: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  await new Promise(resolve => setTimeout(resolve, 320 + Math.random() * 220))
  void phone
  // Dev: 123456 always passes. Any other 6-digit code fails.
  if (code === '123456') return { success: true }
  return { success: false, error: 'Invalid code. Try again.' }
}

export const RIDER_OTP_DEV_CODE = '123456'
export const RIDER_OTP_LENGTH = 6
export const RIDER_OTP_RESEND_SECONDS = 30
