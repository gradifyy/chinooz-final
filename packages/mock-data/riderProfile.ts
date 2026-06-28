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

/**
 * RP3 — Rider vehicle & documents management (RG3).
 *
 * Surfaces:
 * - getRiderVehicle():  editable vehicle details + verification-affecting flag.
 * - updateRiderVehicle():  mock persist; marks verification-affecting changes.
 * - getRiderDocuments():  ID, license, registration, selfie with status/expiry.
 * - resubmitRiderDocument():  mock re-upload for rejected/expired docs.
 *
 * Document statuses map to pills (verified=success, pending=warning,
 * expired=warning, rejected=error). Expiry reminders surface when a doc
 * expires within 30 days. Document numbers are masked in the UI.
 */

export type RiderVehicleType = 'bike' | 'scooter' | 'motorcycle' | 'bicycle' | 'other'

export interface RiderVehicle {
  type: RiderVehicleType
  plate: string
  model: string
  color: string
  /** True when the vehicle is tied to active verification. */
  verificationLinked: boolean
}

export type RiderDocumentStatus = 'verified' | 'pending' | 'expired' | 'rejected'

export type RiderDocumentKind = 'id' | 'license' | 'registration' | 'selfie'

export interface RiderDocument {
  id: string
  kind: RiderDocumentKind
  /** i18n key for the document label. */
  labelKey: string
  status: RiderDocumentStatus
  /** ISO date (yyyy-mm-dd) the document was last uploaded. */
  uploadedAt: string | null
  /** ISO expiry date (yyyy-mm-dd), if applicable. */
  expiresAt: string | null
  /** Masked document number, if any. */
  maskedNumber: string | null
  /** i18n key for the rejection reason, if rejected. */
  rejectionReasonKey: string | null
  /** Thumbnail URI, if uploaded. */
  thumbnailUrl: string | null
}

export async function getRiderVehicle(): Promise<RiderVehicle> {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 180))
  return {
    type: 'bike',
    plate: 'Ba 1 Pa 2024',
    model: 'Honda CB Shine',
    color: 'Black',
    verificationLinked: true,
  }
}

export async function updateRiderVehicle(
  data: Partial<RiderVehicle>,
): Promise<{ success: boolean; requiresReverification: boolean }> {
  await new Promise(resolve => setTimeout(resolve, 380 + Math.random() * 240))
  // Plate/type changes trigger re-verification in a real system.
  const requiresReverification =
    data.plate !== undefined || data.type !== undefined
  return { success: true, requiresReverification }
}

export async function getRiderDocuments(): Promise<RiderDocument[]> {
  await new Promise(resolve => setTimeout(resolve, 220 + Math.random() * 200))
  return [
    {
      id: 'doc-id',
      kind: 'id',
      labelKey: 'rider.profile.vehicle.docs.id',
      status: 'verified',
      uploadedAt: '2024-03-12',
      expiresAt: '2032-03-11',
      maskedNumber: '●●●●●●5678',
      rejectionReasonKey: null,
      thumbnailUrl: 'https://picsum.photos/seed/rider-id/200/200',
    },
    {
      id: 'doc-license',
      kind: 'license',
      labelKey: 'rider.profile.vehicle.docs.license',
      status: 'verified',
      uploadedAt: '2024-03-12',
      expiresAt: '2026-07-12',
      maskedNumber: '●●●●●●1234',
      rejectionReasonKey: null,
      thumbnailUrl: 'https://picsum.photos/seed/rider-license/200/200',
    },
    {
      id: 'doc-registration',
      kind: 'registration',
      labelKey: 'rider.profile.vehicle.docs.registration',
      status: 'pending',
      uploadedAt: '2026-06-20',
      expiresAt: '2027-06-20',
      maskedNumber: '●●●●●●7890',
      rejectionReasonKey: null,
      thumbnailUrl: 'https://picsum.photos/seed/rider-reg/200/200',
    },
    {
      id: 'doc-selfie',
      kind: 'selfie',
      labelKey: 'rider.profile.vehicle.docs.selfie',
      status: 'rejected',
      uploadedAt: '2026-06-18',
      expiresAt: null,
      maskedNumber: null,
      rejectionReasonKey: 'rider.profile.vehicle.docs.rejectionSelfie',
      thumbnailUrl: null,
    },
  ]
}

export async function resubmitRiderDocument(
  docId: string,
): Promise<{ success: boolean }> {
  await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 300))
  void docId
  return { success: true }
}

/**
 * Days until expiry (negative if already expired). Returns null when the
 * document has no expiry date.
 */
export function daysUntilExpiry(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = d.getTime() - today.getTime()
  return Math.round(diff / 86400000)
}

/** Threshold (days) below which an expiry reminder is shown. */
export const RIDER_DOC_EXPIRY_REMIND_DAYS = 30

/**
 * RP4 — Rider notifications & app preferences (RG4) + job preferences.
 *
 * Surfaces:
 * - getRiderPreferences():  notification toggles, app prefs, job prefs.
 * - updateRiderPreferences():  mock persist (partial updates).
 *
 * The COD-vs-prepaid preference respects the COD float limit: when the rider
 * is at the limit, COD-only is disabled and the UI notes the limit.
 */

export type RiderNavApp = 'google' | 'apple' | 'osm' | 'none'
export type RiderDistanceUnit = 'km' | 'mile'
export type RiderSoundLevel = 'off' | 'low' | 'medium' | 'high'
export type RiderHapticsLevel = 'off' | 'low' | 'medium' | 'high'
export type RiderMapStyle = 'standard' | 'satellite' | 'dark'
export type RiderCodPreference = 'any' | 'cod' | 'prepaid'

export interface RiderNotificationPrefs {
  jobOffers: boolean
  jobOffersSound: boolean
  jobOffersVibration: boolean
  earnings: boolean
  incentives: boolean
  ratings: boolean
  announcements: boolean
  quietHoursEnabled: boolean
  /** "HH:mm" 24h. */
  quietHoursStart: string
  /** "HH:mm" 24h. */
  quietHoursEnd: string
}

export interface RiderAppPrefs {
  navApp: RiderNavApp
  distanceUnit: RiderDistanceUnit
  soundLevel: RiderSoundLevel
  hapticsLevel: RiderHapticsLevel
  batterySaver: boolean
  dataSaver: boolean
  mapStyle: RiderMapStyle
}

export interface RiderJobPrefs {
  /** Zone IDs the rider prefers. */
  preferredZones: string[]
  /** Max acceptance radius in km. */
  maxDistanceKm: number
  codPreference: RiderCodPreference
}

export interface RiderPreferences {
  notifications: RiderNotificationPrefs
  app: RiderAppPrefs
  job: RiderJobPrefs
}

export const RIDER_PREFERENCE_ZONES: { id: string; labelKey: string }[] = [
  { id: 'patan', labelKey: 'rider.prefs.zones.patan' },
  { id: 'ktm-central', labelKey: 'rider.prefs.zones.ktmCentral' },
  { id: 'bkt', labelKey: 'rider.prefs.zones.bkt' },
  { id: 'kirtipur', labelKey: 'rider.prefs.zones.kirtipur' },
  { id: 'bhaktapur', labelKey: 'rider.prefs.zones.bhaktapur' },
]

export const RIDER_MAX_DISTANCE_OPTIONS = [2, 5, 10, 15, 20]

export async function getRiderPreferences(): Promise<RiderPreferences> {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 180))
  return {
    notifications: {
      jobOffers: true,
      jobOffersSound: true,
      jobOffersVibration: true,
      earnings: true,
      incentives: true,
      ratings: false,
      announcements: true,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    },
    app: {
      navApp: 'google',
      distanceUnit: 'km',
      soundLevel: 'medium',
      hapticsLevel: 'medium',
      batterySaver: false,
      dataSaver: false,
      mapStyle: 'standard',
    },
    job: {
      preferredZones: ['patan', 'ktm-central'],
      maxDistanceKm: 10,
      codPreference: 'any',
    },
  }
}

export async function updateRiderPreferences(
  data: Partial<{
    notifications: Partial<RiderNotificationPrefs>
    app: Partial<RiderAppPrefs>
    job: Partial<RiderJobPrefs>
  }>,
): Promise<{ success: boolean }> {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 160))
  void data
  return { success: true }
}
