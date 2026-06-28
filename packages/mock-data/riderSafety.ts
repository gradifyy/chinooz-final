/**
 * RS2 — Rider safety toolkit mock data + mock API.
 *
 * Surfaces:
 * - RiderSafetyIncidentType:  harassment | accident | unsafeAddress | other.
 * - RiderSafetyIncident:  structured report with photos + trip context.
 * - RiderSafetyTip:  safety tips shown on the SOS / safety screen.
 * - RiderSafetyChecklistItem:  in-trip checklist items (pre-pickup, en-route, drop-off).
 * - triggerSOS():  mock SOS activation — shares location + trip + alerts safety team.
 * - reportSafetyIncident():  mock incident submission with photos + context.
 * - shareTripStatus():  mock share-trip-status link generation.
 * - getSafetyTips() / getSafetyChecklist():  static data.
 *
 * All copy (tips, checklist) is i18n-driven via label keys.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiderSafetyIncidentType =
  | 'harassment'
  | 'accident'
  | 'unsafeAddress'
  | 'other'

export interface RiderSafetyIncidentTypeMeta {
  key: RiderSafetyIncidentType
  labelKey: string
  descKey: string
  icon: string
}

export interface RiderSafetyIncidentAttachment {
  id: string
  name: string
  kind: 'photo'
}

export interface RiderSafetyIncidentContext {
  orderRef?: string
  pickup?: string
  dropoff?: string
  deliveryStatus?: string
}

export interface RiderSafetyIncident {
  id: string
  type: RiderSafetyIncidentType
  description: string
  attachments: RiderSafetyIncidentAttachment[]
  context: RiderSafetyIncidentContext
  status: 'submitted' | 'reviewing' | 'actioned'
  createdAt: number
}

export interface RiderSafetyTip {
  id: string
  /** i18n key for the tip title. */
  titleKey: string
  /** i18n key for the tip body. */
  bodyKey: string
  icon: string
}

export interface RiderSafetyChecklistItem {
  id: string
  /** i18n key for the checklist label. */
  labelKey: string
  /** Phase of the trip this checklist item belongs to. */
  phase: 'prePickup' | 'enRoute' | 'dropOff'
}

// ---------------------------------------------------------------------------
// Incident type metadata
// ---------------------------------------------------------------------------

export const RIDER_SAFETY_INCIDENT_TYPES: RiderSafetyIncidentTypeMeta[] = [
  { key: 'harassment', labelKey: 'rider.support.safety.incidentHarassment', descKey: 'rider.support.safety.incidentHarassmentDesc', icon: 'shield-alert' },
  { key: 'accident', labelKey: 'rider.support.safety.incidentAccident', descKey: 'rider.support.safety.incidentAccidentDesc', icon: 'car' },
  { key: 'unsafeAddress', labelKey: 'rider.support.safety.incidentUnsafeAddress', descKey: 'rider.support.safety.incidentUnsafeAddressDesc', icon: 'map-pin-off' },
  { key: 'other', labelKey: 'rider.support.safety.incidentOther', descKey: 'rider.support.safety.incidentOtherDesc', icon: 'circle-alert' },
]

export function getRiderSafetyIncidentTypeMeta(
  key: RiderSafetyIncidentType,
): RiderSafetyIncidentTypeMeta | undefined {
  return RIDER_SAFETY_INCIDENT_TYPES.find(t => t.key === key)
}

// ---------------------------------------------------------------------------
// Safety tips (static, i18n-driven)
// ---------------------------------------------------------------------------

export const RIDER_SAFETY_TIPS: RiderSafetyTip[] = [
  { id: 'tip1', titleKey: 'rider.support.safety.tip1Title', bodyKey: 'rider.support.safety.tip1Body', icon: 'shield' },
  { id: 'tip2', titleKey: 'rider.support.safety.tip2Title', bodyKey: 'rider.support.safety.tip2Body', icon: 'map-pin' },
  { id: 'tip3', titleKey: 'rider.support.safety.tip3Title', bodyKey: 'rider.support.safety.tip3Body', icon: 'phone' },
  { id: 'tip4', titleKey: 'rider.support.safety.tip4Title', bodyKey: 'rider.support.safety.tip4Body', icon: 'users' },
  { id: 'tip5', titleKey: 'rider.support.safety.tip5Title', bodyKey: 'rider.support.safety.tip5Body', icon: 'eye' },
]

// ---------------------------------------------------------------------------
// In-trip safety checklist (static, i18n-driven)
// ---------------------------------------------------------------------------

export const RIDER_SAFETY_CHECKLIST: RiderSafetyChecklistItem[] = [
  { id: 'chk1', labelKey: 'rider.support.safety.chk1', phase: 'prePickup' },
  { id: 'chk2', labelKey: 'rider.support.safety.chk2', phase: 'prePickup' },
  { id: 'chk3', labelKey: 'rider.support.safety.chk3', phase: 'prePickup' },
  { id: 'chk4', labelKey: 'rider.support.safety.chk4', phase: 'enRoute' },
  { id: 'chk5', labelKey: 'rider.support.safety.chk5', phase: 'enRoute' },
  { id: 'chk6', labelKey: 'rider.support.safety.chk6', phase: 'dropOff' },
  { id: 'chk7', labelKey: 'rider.support.safety.chk7', phase: 'dropOff' },
]

export function getSafetyChecklistByPhase(phase: RiderSafetyChecklistItem['phase']): RiderSafetyChecklistItem[] {
  return RIDER_SAFETY_CHECKLIST.filter(item => item.phase === phase)
}

// ---------------------------------------------------------------------------
// Mock API
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export interface SosResult {
  success: boolean
  sosId: string
  sharedWith: string[]
  safetyAgentEtaMinutes: number
  error?: string
}

/** Trigger SOS — shares live location + trip details with trusted contacts + Chinooz safety. */
export async function triggerSOS(opts: {
  orderRef?: string
  pickup?: string
  dropoff?: string
  trustedContacts: { name: string; phone: string }[]
}): Promise<SosResult> {
  await delay(400 + Math.random() * 400)
  const sosId = `SOS-${Date.now().toString(36).toUpperCase()}`
  const sharedWith: string[] = []
  if (opts.trustedContacts.length > 0) {
    sharedWith.push(...opts.trustedContacts.map(c => c.name))
  }
  sharedWith.push('Chinooz Safety Team')
  return {
    success: true,
    sosId,
    sharedWith,
    safetyAgentEtaMinutes: 2 + Math.floor(Math.random() * 4),
  }
}

export interface ShareTripResult {
  success: boolean
  link: string
  expiresAt: number
  error?: string
}

/** Share trip status — generates a mock live-tracking link. */
export async function shareTripStatus(_opts: {
  orderRef?: string
  contactName?: string
  contactPhone?: string
}): Promise<ShareTripResult> {
  await delay(300 + Math.random() * 300)
  const token = Math.random().toString(36).slice(2, 10)
  const link = `https://chinooz.app/t/${token}`
  return {
    success: true,
    link,
    expiresAt: Date.now() + 3600_000, // 1 hour
  }
}

export interface ReportIncidentInput {
  type: RiderSafetyIncidentType
  description: string
  attachments: RiderSafetyIncidentAttachment[]
  context: RiderSafetyIncidentContext
}

export interface ReportIncidentResult {
  success: boolean
  incident: RiderSafetyIncident
  error?: string
}

/** Report a safety incident with structured details + photos. */
export async function reportSafetyIncident(input: ReportIncidentInput): Promise<ReportIncidentResult> {
  await delay(600 + Math.random() * 600)
  const id = `INC-${Date.now().toString(36).toUpperCase()}`
  const incident: RiderSafetyIncident = {
    id,
    type: input.type,
    description: input.description,
    attachments: input.attachments,
    context: input.context,
    status: 'submitted',
    createdAt: Date.now(),
  }
  return { success: true, incident }
}

/** Get safety tips (static). */
export async function getSafetyTips(): Promise<RiderSafetyTip[]> {
  await delay(100 + Math.random() * 100)
  return RIDER_SAFETY_TIPS
}

/** Get safety checklist (static). */
export async function getSafetyChecklist(): Promise<RiderSafetyChecklistItem[]> {
  await delay(100 + Math.random() * 100)
  return RIDER_SAFETY_CHECKLIST
}
