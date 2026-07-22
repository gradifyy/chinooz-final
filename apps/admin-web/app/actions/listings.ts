'use server'

/**
 * Listing-moderation server actions (Listing_Moderation_Module — Requirement 6).
 *
 * These `'use server'` actions are the orchestration layer described in
 * design.md "Layering Rules" #3: they re-check RBAC via `admin-core/rbac`,
 * validate input via the pure `admin-core/listings` validators, decide the
 * guarded moderation transition with `moderate`, persist the result through the
 * injected {@link AdminApi}, and append an audit record built by
 * `buildModerationAuditRecord` via `AdminApi.audit.append`. Every
 * correctness-critical decision stays in the pure core; this module only
 * orchestrates I/O and returns a typed, discriminated result the UI maps to a
 * message.
 *
 * Authorization is re-checked here (never trusting the middleware route guard
 * alone): a caller lacking `listings.moderate` receives `forbidden` and no
 * mutation is performed (Req 2.4 / 2.6). A removal requires a valid removal
 * reason of 10..500 characters; an invalid reason is blocked with a validation
 * message and the listing is left unchanged (Req 6.6). A successful removal
 * sets the moderation status to `removed` and records the reason (Req 6.5); a
 * reinstate sets it to `published` (Req 6.7). Both successful transitions append
 * an audit record carrying the acting Administrator identity, the affected
 * Listing identity, the action, and a timestamp.
 *
 * Server-side only. TypeScript strict mode, no `any`.
 *
 * _Requirements: 6.5, 6.6, 6.7_
 */

import { revalidatePath } from 'next/cache'

import {
  buildModerationAuditRecord,
  moderate,
  validateRemovalReason,
  type ModerationAction,
} from '@/lib/admin-core/listings'
import { canPerform } from '@/lib/admin-core/rbac'
import type { AdminListing, Permission } from '@/lib/admin-core/types'
import { mockAdminApi } from '@/lib/api/mock'
import type { AdminApi } from '@/lib/api/types'
import { readSession } from '@/lib/session'

/** Permission required to remove or reinstate a listing (Req 6.5 / 6.7). */
const MODERATE_PERMISSION: Permission = 'listings.moderate'

/**
 * Discriminated outcome of a listing-moderation action.
 *
 * - `ok: true` — the transition succeeded and was persisted; carries the
 *   updated {@link AdminListing}.
 * - `forbidden` — the caller is unauthenticated or lacks `listings.moderate`;
 *   no mutation was performed (Req 2.4 / 2.6).
 * - `invalid_reason` — a removal's reason was missing or outside 10..500
 *   characters; the listing was left unchanged and `message` describes the
 *   violation (Req 6.6).
 * - `not_found` — the target listing does not exist.
 * - `retrieval_failed` — the listing could not be retrieved.
 * - `persist_failed` — the decided change could not be persisted; previously
 *   persisted values are unchanged.
 * - `audit_failed` — the change was persisted but the audit record could not be
 *   appended after retries; the persisted `listing` is returned so the UI can
 *   surface the audit error while reflecting the new state (Req 9.2).
 */
export type ListingModerationResult =
  | { ok: true; listing: AdminListing }
  | { ok: false; reason: 'forbidden' }
  | { ok: false; reason: 'invalid_reason'; message: string }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'retrieval_failed' }
  | { ok: false; reason: 'persist_failed' }
  | { ok: false; reason: 'audit_failed'; listing: AdminListing }

/**
 * Shared orchestration for both moderation actions. Re-checks RBAC, loads the
 * listing, validates (for removals), applies the guarded transition, persists,
 * and appends the audit record. Not exported: the `'use server'` boundary
 * exposes only the two serializable-argument actions below; this helper takes
 * the {@link AdminApi} and clock so it stays pure-ish and unit-testable.
 */
async function moderateListing(
  action: ModerationAction,
  listingId: string,
  reason: string | undefined,
  now: number,
  api: AdminApi,
): Promise<ListingModerationResult> {
  // Re-check authorization; never rely on the route guard alone (Req 2.4/2.6).
  const session = await readSession()
  if (session === null || !canPerform(session.roles, MODERATE_PERMISSION)) {
    return { ok: false, reason: 'forbidden' }
  }

  // Surface a precise validation message for removals before touching state
  // (Req 6.6). `moderate` re-validates internally as the single source of truth.
  if (action === 'remove') {
    const validation = validateRemovalReason(reason ?? '')
    if (!validation.ok) {
      return { ok: false, reason: 'invalid_reason', message: validation.reason }
    }
  }

  const found = await api.listings.get(listingId)
  if (!found.ok) {
    return { ok: false, reason: found.reason }
  }

  const decision = moderate(found.data, action, reason)
  if (!decision.ok) {
    // Only `invalid_reason` is representable here; map it to a message.
    const validation = validateRemovalReason(reason ?? '')
    const message = validation.ok
      ? 'Removal reason is invalid'
      : validation.reason
    return { ok: false, reason: 'invalid_reason', message }
  }

  const persisted = await api.listings.save(decision.listing)
  if (!persisted.ok) {
    return { ok: false, reason: persisted.reason }
  }

  // Append the audit record for the successful moderation (Req 6.5 / 6.7).
  const record = buildModerationAuditRecord(
    session.adminId,
    persisted.data,
    action,
    now,
  )
  const appended = await api.audit.append(record)
  if (!appended.ok) {
    // State is already persisted; surface the audit failure with the new state
    // so the record can be retried while the UI reflects reality (Req 9.2).
    return { ok: false, reason: 'audit_failed', listing: persisted.data }
  }

  // Refresh the listing views so the new moderation status is reflected.
  revalidatePath('/listings')
  revalidatePath(`/listings/${persisted.data.id}`)

  return { ok: true, listing: persisted.data }
}

/**
 * Removes a listing with a validated removal reason (Req 6.5 / 6.6).
 *
 * Requires the `listings.moderate` permission. The `reason` must be 10..500
 * characters; otherwise the removal is blocked, the listing's moderation status
 * is left unchanged, and a validation message is returned. On success the
 * moderation status is set to `removed`, the reason is recorded, and an audit
 * record is appended.
 */
export async function removeListing(
  listingId: string,
  reason: string,
): Promise<ListingModerationResult> {
  return moderateListing('remove', listingId, reason, Date.now(), mockAdminApi)
}

/**
 * Reinstates a removed listing (Req 6.7).
 *
 * Requires the `listings.moderate` permission. On success the moderation status
 * is set to `published` and an audit record is appended.
 */
export async function reinstateListing(
  listingId: string,
): Promise<ListingModerationResult> {
  return moderateListing('reinstate', listingId, undefined, Date.now(), mockAdminApi)
}
