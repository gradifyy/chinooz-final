/**
 * Admin-core marketplace-user management domain logic.
 *
 * Pure helpers backing the User_Management_Module (Requirement 3). No I/O, no
 * React, no cookies, no fetch — plain typed inputs and outputs. List retrieval,
 * persistence of status changes, and audit-record appension live in the
 * surrounding action / `AdminApi` layer; this module only filters and searches
 * collections, validates search terms, decides guarded status transitions, and
 * constructs the audit record emitted on a successful transition.
 *
 * Time is expressed as epoch milliseconds (`now: number`) for arithmetic;
 * persisted timestamps on domain records use ISO UTC strings at second
 * precision (consistent with `auth.ts`, `rbac.ts`, and `audit.ts`).
 *
 * See design.md "User_Management_Module" / `lib/admin-core/users` and
 * Correctness Properties 11 and 14.
 */

import { buildAuditRecord } from './audit'
import { filterBy } from './shared'
import type { AuditRecord, MarketplaceUser, UserType } from './types'

// ---------------------------------------------------------------------------
// Type filtering (Req 3.2)
// ---------------------------------------------------------------------------

/**
 * Returns the marketplace users matching `type`, in input order. When `type`
 * is `undefined`, no type constraint is imposed and every user is returned
 * (Req 3.2). Non-mutating — the returned array is always a fresh copy.
 */
export function filterByType(
  users: readonly MarketplaceUser[],
  type?: UserType,
): MarketplaceUser[] {
  if (type === undefined) return users.slice()
  return filterBy(users, (user) => user.type === type)
}

// ---------------------------------------------------------------------------
// Search-term validation (Req 3.4)
// ---------------------------------------------------------------------------

/** Minimum accepted search-term length, inclusive (Req 3.4). */
export const SEARCH_TERM_MIN_LENGTH = 2

/** Maximum accepted search-term length, inclusive (Req 3.4). */
export const SEARCH_TERM_MAX_LENGTH = 100

/** Outcome of validating a user search term against the allowed length bounds. */
export type SearchTermValidation =
  | { ok: true }
  | { ok: false; reason: 'too_short' | 'too_long' }

/**
 * Validates that a search term's length lies within the inclusive bounds
 * `[SEARCH_TERM_MIN_LENGTH, SEARCH_TERM_MAX_LENGTH]` (2..100). A term shorter
 * than the minimum is rejected as `'too_short'`; one longer than the maximum is
 * rejected as `'too_long'`; otherwise the term is accepted (Req 3.4).
 */
export function validateSearchTerm(term: string): SearchTermValidation {
  if (term.length < SEARCH_TERM_MIN_LENGTH) {
    return { ok: false, reason: 'too_short' }
  }
  if (term.length > SEARCH_TERM_MAX_LENGTH) {
    return { ok: false, reason: 'too_long' }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Search (Req 3.3 — Property 11)
// ---------------------------------------------------------------------------

/**
 * Returns exactly the users whose `name`, `phone`, or `email` contains `term`
 * under case-insensitive substring comparison, in input order (Property 11).
 *
 * Matching is sound and complete: every user with the term in any of the three
 * fields is included and no other user is. Comparison folds case by
 * lower-casing both the candidate fields and the term. Non-mutating. Satisfies
 * Req 3.3.
 */
export function searchUsers(
  users: readonly MarketplaceUser[],
  term: string,
): MarketplaceUser[] {
  const needle = term.toLowerCase()
  return filterBy(users, (user) => {
    return (
      user.name.toLowerCase().includes(needle) ||
      user.phone.toLowerCase().includes(needle) ||
      user.email.toLowerCase().includes(needle)
    )
  })
}

// ---------------------------------------------------------------------------
// Guarded status transitions (Req 3.7 / 3.8 / 3.9 — Property 14)
// ---------------------------------------------------------------------------

/** The status-change actions an Administrator may apply to a user. */
export type StatusChangeAction = 'suspend' | 'reactivate'

/**
 * Outcome of {@link applyStatusChange}. On success the updated user (a copy
 * with the flipped status) is returned; a no-op transition is rejected with
 * `'already_in_status'` and the input is left unchanged.
 */
export type StatusChangeResult =
  | { ok: true; user: MarketplaceUser }
  | { ok: false; reason: 'already_in_status' }

/**
 * Applies a guarded status transition to a marketplace user (Property 14).
 *
 * `suspend` targets `suspended` and `reactivate` targets `active`. The
 * transition succeeds only when the user is not already in the target status:
 * `active → suspended` for suspend (Req 3.7) and `suspended → active` for
 * reactivate (Req 3.8). A no-op transition — suspending an already-suspended
 * user or reactivating an already-active user — is rejected with
 * `'already_in_status'` (Req 3.9). On success a fresh user object with the
 * flipped status is returned; the input is never mutated. The audit record for
 * a successful change is built by {@link buildStatusChangeAuditRecord} in the
 * action layer.
 */
export function applyStatusChange(
  user: MarketplaceUser,
  action: StatusChangeAction,
): StatusChangeResult {
  const targetStatus = action === 'suspend' ? 'suspended' : 'active'
  if (user.status === targetStatus) {
    return { ok: false, reason: 'already_in_status' }
  }
  return { ok: true, user: { ...user, status: targetStatus } }
}

// ---------------------------------------------------------------------------
// Status-change audit record (Req 3.7 / 3.8 — Property 14)
// ---------------------------------------------------------------------------

/** Action type recorded in the Audit_Log when a user is suspended (Req 3.7). */
export const USER_SUSPEND_ACTION = 'user_suspend'

/** Action type recorded in the Audit_Log when a user is reactivated (Req 3.8). */
export const USER_REACTIVATE_ACTION = 'user_reactivate'

/**
 * Builds the {@link AuditRecord} emitted on a successful user status change
 * (Req 3.7 suspend / Req 3.8 reactivate — Property 14).
 *
 * The record carries the acting Administrator identity (`actorId`), the
 * affected Marketplace_User identity (`entityId`), the action performed
 * (`actionType`), and a UTC second-precision timestamp derived from `now`
 * (epoch milliseconds). The previous and new status are captured in `details`.
 * Built via the shared {@link buildAuditRecord} helper to match the
 * record-construction pattern used by the other admin-core modules.
 *
 * `user` should be the resulting user from a successful {@link applyStatusChange}
 * (i.e. carrying the new status).
 */
export function buildStatusChangeAuditRecord(
  actor: string,
  user: MarketplaceUser,
  action: StatusChangeAction,
  now: number,
): AuditRecord {
  const actionType =
    action === 'suspend' ? USER_SUSPEND_ACTION : USER_REACTIVATE_ACTION
  const previousStatus = action === 'suspend' ? 'active' : 'suspended'
  return buildAuditRecord(actor, actionType, user.id, now, {
    affectedId: user.id,
    previousStatus,
    newStatus: user.status,
  })
}
