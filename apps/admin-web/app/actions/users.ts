'use server'

/**
 * User-management server actions (User_Management_Module — Requirements 3.7,
 * 3.8, 3.9).
 *
 * These `'use server'` actions orchestrate the suspend / reactivate of a
 * marketplace user, following design.md "Layering Rules" #3 (Server Actions):
 *
 *   1. Re-check RBAC (defense in depth) via `canPerform` with the acting
 *      administrator's session roles — even if a route guard were bypassed, a
 *      caller lacking `users.manage` is denied and no data is touched (Req 2.4
 *      / 2.6 — "leave data unchanged").
 *   2. Decide the guarded transition with the pure
 *      `admin-core/users.applyStatusChange` (Req 3.7 / 3.8 / 3.9). A no-op
 *      transition (suspend an already-suspended user, reactivate an
 *      already-active user) is rejected with no mutation.
 *   3. Persist the resulting record through the {@link AdminApi} (`users.save`).
 *   4. Append the status-change audit record built by
 *      `admin-core/users.buildStatusChangeAuditRecord` via `AdminApi.audit`
 *      (Req 3.7 / 3.8 audit entry).
 *
 * On any denial, no-op transition, or retrieval/persistence failure the action
 * returns a typed, discriminated error result and performs no further
 * mutation. Session reading is delegated to `lib/session.ts`; all
 * correctness-critical decisions live in the pure `lib/admin-core` logic.
 *
 * Server-side only. TypeScript strict mode, no `any`.
 *
 * _Requirements: 3.7, 3.8, 3.9_
 */

import { canPerform } from '@/lib/admin-core/rbac'
import type { AuditRecord, MarketplaceUser } from '@/lib/admin-core/types'
import {
  applyStatusChange,
  buildStatusChangeAuditRecord,
  type StatusChangeAction,
} from '@/lib/admin-core/users'
import { mockAdminApi } from '@/lib/api/mock'
import type { AdminApi } from '@/lib/api/types'
import { readSession } from '@/lib/session'

/**
 * Discriminated outcome of a suspend / reactivate action.
 *
 * - `ok: true` carries the persisted, status-changed user.
 * - `unauthenticated` — there is no valid admin session.
 * - `forbidden` — the acting roles lack the `users.manage` permission; the
 *   request is denied and no data is changed (Req 2.4 / 2.6).
 * - `not_found` — the target user does not exist (or vanished before persist).
 * - `already_in_status` — the requested transition is a no-op; the status is
 *   left unchanged (Req 3.9).
 * - `persist_failed` — persisting the status change failed; no change took
 *   effect.
 * - `audit_failed` — the status change persisted but the audit record could
 *   not be appended after retries; the unsaved `record` is returned so it can
 *   be retried (Req 9.2).
 */
export type UserStatusActionResult =
  | { ok: true; user: MarketplaceUser }
  | {
      ok: false
      reason:
        | 'unauthenticated'
        | 'forbidden'
        | 'not_found'
        | 'already_in_status'
        | 'persist_failed'
    }
  | { ok: false; reason: 'audit_failed'; record: AuditRecord }

/**
 * Shared orchestration for both status-change actions. Kept internal (not
 * exported) so this `'use server'` module exposes only server actions.
 *
 * @param userId - identity of the marketplace user to act on
 * @param action - `'suspend'` or `'reactivate'`
 * @param api - the AdminApi to use; defaults to the shared mock instance
 * @param now - epoch milliseconds for the audit timestamp; defaults to now
 */
async function applyUserStatusAction(
  userId: string,
  action: StatusChangeAction,
  api: AdminApi = mockAdminApi,
  now: number = Date.now(),
): Promise<UserStatusActionResult> {
  // 1. Authentication — there must be a valid admin session.
  const session = await readSession()
  if (session === null) {
    return { ok: false, reason: 'unauthenticated' }
  }

  // 2. RBAC re-check (defense in depth). Without `users.manage` the request is
  //    denied and no data is touched (Req 2.4 / 2.6).
  if (!canPerform(session.roles, 'users.manage')) {
    return { ok: false, reason: 'forbidden' }
  }

  // 3. Load the current user record.
  const current = await api.users.get(userId)
  if (!current.ok) {
    return { ok: false, reason: 'not_found' }
  }

  // 4. Decide the guarded transition (Req 3.7 / 3.8 / 3.9). A no-op transition
  //    is rejected and leaves the status unchanged — no mutation occurs.
  const decision = applyStatusChange(current.data, action)
  if (!decision.ok) {
    return { ok: false, reason: 'already_in_status' }
  }

  // 5. Persist the resulting record.
  const saved = await api.users.save(decision.user)
  if (!saved.ok) {
    return { ok: false, reason: saved.reason }
  }

  // 6. Append the status-change audit record (Req 3.7 / 3.8 audit entry). The
  //    record carries the acting admin, the affected user, the action, and a
  //    UTC second-precision timestamp.
  const record = buildStatusChangeAuditRecord(
    session.adminId,
    saved.data,
    action,
    now,
  )
  const appended = await api.audit.append(record)
  if (!appended.ok) {
    // The status change persisted but the audit append failed after retries.
    // Surface the preserved record so it can be retried (Req 9.2).
    return { ok: false, reason: 'audit_failed', record: appended.record }
  }

  return { ok: true, user: saved.data }
}

/**
 * Suspends a marketplace user (Req 3.7). Succeeds only when the acting admin
 * holds `users.manage` and the user is currently active; an already-suspended
 * user yields `{ ok: false, reason: 'already_in_status' }` with no mutation.
 */
export async function suspendUser(
  userId: string,
): Promise<UserStatusActionResult> {
  return applyUserStatusAction(userId, 'suspend')
}

/**
 * Reactivates a marketplace user (Req 3.8). Succeeds only when the acting admin
 * holds `users.manage` and the user is currently suspended; an already-active
 * user yields `{ ok: false, reason: 'already_in_status' }` with no mutation.
 */
export async function reactivateUser(
  userId: string,
): Promise<UserStatusActionResult> {
  return applyUserStatusAction(userId, 'reactivate')
}
