/**
 * Admin-core listing-moderation domain logic.
 *
 * Pure helpers backing the Listing_Moderation_Module (Requirement 6). No I/O,
 * no React, no cookies, no fetch — plain typed inputs and outputs. List
 * retrieval, persistence of moderation decisions, and audit-record appension
 * live in the surrounding action / `AdminApi` layer; this module only filters
 * collections, validates removal reasons, decides the guarded moderation
 * transition on a listing, constructs the audit record emitted on a successful
 * moderation, and builds the listing-detail view model.
 *
 * Time is expressed as epoch milliseconds (`now: number`) for arithmetic;
 * persisted timestamps on domain records use ISO UTC strings at second
 * precision (consistent with `auth.ts`, `rbac.ts`, `users.ts`, `approvals.ts`,
 * `orders.ts`, and `audit.ts`). Monetary values are integer paisa; NPR display
 * strings are derived via `formatNPRFromPaisa` from `@chinooz/utils` (Req 6.4).
 *
 * See design.md "Listing_Moderation_Module" / `lib/admin-core/listings` and
 * Correctness Properties 18 and 21.
 */

import { formatNPRFromPaisa } from '@chinooz/utils'

import { buildAuditRecord } from './audit'
import { filterBy } from './shared'
import type {
  AdminListing,
  AuditRecord,
  ModerationStatus,
  ValidationResult,
} from './types'

/**
 * Locale selector for NPR formatting. Mirrors the `CurrencyLocale` accepted by
 * `formatNPRFromPaisa` in `@chinooz/utils` (`'en'` renders `NPR …`, `'ne'`
 * renders `रु. …` with Devanagari digits).
 */
export type CurrencyLocale = 'en' | 'ne'

// ---------------------------------------------------------------------------
// Moderation-status filtering (Req 6.2)
// ---------------------------------------------------------------------------

/**
 * Returns the listings matching `status`, in input order. When `status` is
 * `undefined`, no status constraint is imposed and every listing is returned
 * (Req 6.2). Sound and complete: every listing with the selected moderation
 * status is included and no other listing is. Non-mutating — the returned array
 * is always a fresh copy.
 */
export function filterByModerationStatus(
  listings: readonly AdminListing[],
  status?: ModerationStatus,
): AdminListing[] {
  if (status === undefined) return listings.slice()
  return filterBy(listings, (listing) => listing.moderationStatus === status)
}

// ---------------------------------------------------------------------------
// Removal-reason validation (Req 6.6)
// ---------------------------------------------------------------------------

/** Minimum accepted removal-reason length, inclusive (Req 6.5 / 6.6). */
export const REMOVAL_REASON_MIN_LENGTH = 10

/** Maximum accepted removal-reason length, inclusive (Req 6.5 / 6.6). */
export const REMOVAL_REASON_MAX_LENGTH = 500

/**
 * Validates that a removal reason's length lies within the inclusive bounds
 * `[REMOVAL_REASON_MIN_LENGTH, REMOVAL_REASON_MAX_LENGTH]` (10..500).
 *
 * A reason shorter than the minimum or longer than the maximum is rejected with
 * a descriptive `reason`; otherwise the reason is accepted (Req 6.6). Used to
 * block invalid removals so the listing is left unchanged.
 */
export function validateRemovalReason(reason: string): ValidationResult {
  if (reason.length < REMOVAL_REASON_MIN_LENGTH) {
    return {
      ok: false,
      reason: `Removal reason must be at least ${REMOVAL_REASON_MIN_LENGTH} characters`,
    }
  }
  if (reason.length > REMOVAL_REASON_MAX_LENGTH) {
    return {
      ok: false,
      reason: `Removal reason must be at most ${REMOVAL_REASON_MAX_LENGTH} characters`,
    }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Guarded moderation (Req 6.5 / 6.7 — Property 18)
// ---------------------------------------------------------------------------

/** The moderation actions an Administrator may apply to a listing. */
export type ModerationAction = 'remove' | 'reinstate'

/**
 * Outcome of {@link moderate}. On success the updated listing (a copy with the
 * new moderation status, and `removalReason` set on removal) is returned;
 * otherwise the input is left unchanged and a discriminated failure `reason` is
 * given:
 * - `'invalid_reason'` — a removal lacked a valid 10..500 reason (Req 6.6).
 */
export type ModerationResult =
  | { ok: true; listing: AdminListing }
  | { ok: false; reason: 'invalid_reason' }

/**
 * Applies a guarded moderation action to a listing (Property 18).
 *
 * A `remove` requires a valid removal reason of 10..500 characters (validated
 * via {@link validateRemovalReason}); a missing or out-of-bounds reason is
 * blocked with `'invalid_reason'`, leaving the listing's moderation status
 * unchanged (Req 6.6). On a successful `remove` the `moderationStatus` is set to
 * `removed` and the `removalReason` is recorded on the returned listing
 * (Req 6.5). A `reinstate` sets the `moderationStatus` to `published` (Req 6.7).
 *
 * On success a fresh listing object is returned; the input is never mutated.
 * The audit record for a successful moderation is built by
 * {@link buildModerationAuditRecord} in the action layer.
 */
export function moderate(
  listing: AdminListing,
  action: ModerationAction,
  reason?: string,
): ModerationResult {
  if (action === 'remove') {
    const removalReason = reason ?? ''
    if (!validateRemovalReason(removalReason).ok) {
      return { ok: false, reason: 'invalid_reason' }
    }
    return {
      ok: true,
      listing: { ...listing, moderationStatus: 'removed', removalReason },
    }
  }

  return {
    ok: true,
    listing: { ...listing, moderationStatus: 'published' },
  }
}

// ---------------------------------------------------------------------------
// Moderation audit record (Req 6.5 / 6.7 — Property 18)
// ---------------------------------------------------------------------------

/** Action type recorded in the Audit_Log when a listing is removed (Req 6.5). */
export const LISTING_REMOVE_ACTION = 'listing_remove'

/** Action type recorded in the Audit_Log when a listing is reinstated (Req 6.7). */
export const LISTING_REINSTATE_ACTION = 'listing_reinstate'

/**
 * Builds the {@link AuditRecord} emitted on a successful listing moderation
 * (Req 6.5 remove / Req 6.7 reinstate — Property 18).
 *
 * The record carries the acting Administrator identity (`actorId`), the
 * affected Listing identity (`entityId`), the action performed (`actionType`),
 * and a UTC second-precision timestamp derived from `now` (epoch
 * milliseconds). On a removal the recorded `removalReason` is captured in
 * `details` (Req 6.5). Built via the shared {@link buildAuditRecord} helper to
 * match the record-construction pattern used by the other admin-core modules.
 *
 * `listing` should be the resulting listing from a successful {@link moderate}
 * (i.e. carrying the new moderation status and, for a removal, the
 * `removalReason`).
 */
export function buildModerationAuditRecord(
  actor: string,
  listing: AdminListing,
  action: ModerationAction,
  now: number,
): AuditRecord {
  if (action === 'remove') {
    return buildAuditRecord(actor, LISTING_REMOVE_ACTION, listing.id, now, {
      affectedId: listing.id,
      removalReason: listing.removalReason ?? '',
    })
  }

  return buildAuditRecord(actor, LISTING_REINSTATE_ACTION, listing.id, now, {
    affectedId: listing.id,
  })
}

// ---------------------------------------------------------------------------
// Listing detail view model (Req 6.4 — Property 21)
// ---------------------------------------------------------------------------

/** Seller identity surfaced on the listing-detail screen (Req 6.4). */
export interface ListingSellerRef {
  id: string
  name: string
}

/**
 * View model for the listing-detail screen (Property 21). Includes the title,
 * the description, every image, the raw integer-paisa price, the NPR-formatted
 * price, and the seller identity.
 */
export interface ListingDetailViewModel {
  id: string
  title: string
  description: string
  /** integer paisa */
  pricePaisa: number
  /** `pricePaisa` rendered as an NPR string via `@chinooz/utils`. */
  priceFormatted: string
  images: string[]
  seller: ListingSellerRef
  moderationStatus: ModerationStatus
}

/**
 * Builds the {@link ListingDetailViewModel} for a listing (Property 21).
 *
 * The model always includes the title, the description, every image, the raw
 * `pricePaisa`, and the seller (`sellerId` / `sellerName`) (Req 6.4). The price
 * is formatted in NPR via `formatNPRFromPaisa` from `@chinooz/utils`, using the
 * supplied `locale` (default `'en'`). Pure and non-mutating — the input listing
 * and its images are not modified; a fresh model with a copied images array is
 * returned.
 */
export function listingDetailViewModel(
  listing: AdminListing,
  locale: CurrencyLocale = 'en',
): ListingDetailViewModel {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    pricePaisa: listing.pricePaisa,
    priceFormatted: formatNPRFromPaisa(listing.pricePaisa, locale),
    images: listing.images.slice(),
    seller: { id: listing.sellerId, name: listing.sellerName },
    moderationStatus: listing.moderationStatus,
  }
}
