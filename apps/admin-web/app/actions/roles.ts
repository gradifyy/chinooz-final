'use server'

/**
 * Administrator role-management server action (Access_Control_Service —
 * Requirement 2.7).
 *
 * This `'use server'` action orchestrates a change to another administrator's
 * Role assignment, following design.md "Layering Rules" #3 (Server Actions):
 *
 *   1. Re-check RBAC (defense in depth). Managing administrator roles is a
 *      privileged operation reserved for `Super_Admin` — even if a route guard
 *      were bypassed, an acting administrator who does not hold `Super_Admin`
 *      is denied and no data is touched (Req 2.4 — "leave all data
 *      unchanged").
 *   2. Load the affected administrator account through the {@link AdminApi}
 *      (`accounts.get`) so the previous role set can be captured for the audit
 *      trail.
 *   3. Persist the new role assignment via `AdminApi.accounts.changeRoles`,
 *      which derives the account's `active` flag from whether any role remains
 *      (Req 2.1 / 2.2).
 *   4. Append the role-change audit record built by the pure
 *      `admin-core/rbac.buildRoleChangeAuditRecord` via `AdminApi.audit.append`
 *      (Req 2.7). The record carries the acting administrator identity, the
 *      affected administrator identity, the previous roles, the new roles, and
 *      a UTC second-precision timestamp.
 *
 * On any denial, missing account, or persistence failure the action returns a
 * typed, discriminated error result and performs no further mutation. Session
 * reading is delegated to `lib/session.ts`; the audit-record construction lives
 * in the pure `lib/admin-core/rbac` logic.
 *
 * Server-side only. TypeScript strict mode, no `any`.
 *
 * _Requirements: 2.7_
 */

import { buildRoleChangeAuditRecord } from '@/lib/admin-core/rbac'
import type { AdminAccount, AuditRecord, Role } from '@/lib/admin-core/types'
import { mockAdminApi } from '@/lib/api/mock'
import type { AdminApi } from '@/lib/api/types'
import { readSession } from '@/lib/session'

/**
 * The privileged role required to manage another administrator's role
 * assignment. Role management is restricted to `Super_Admin` (Req 2 — only the
 * highest-privilege role administers other accounts).
 */
const ROLE_MANAGER_ROLE: Role = 'Super_Admin'

/**
 * Discriminated outcome of a role-change action.
 *
 * - `ok: true` carries the persisted, role-changed administrator account.
 * - `unauthenticated` — there is no valid admin session.
 * - `forbidden` — the acting administrator does not hold `Super_Admin`; the
 *   request is denied and no data is changed (Req 2.4).
 * - `not_found` — the affected administrator account does not exist (or
 *   vanished before persist).
 * - `persist_failed` — persisting the new role assignment failed; no change
 *   took effect.
 * - `audit_failed` — the role change persisted but the audit record could not
 *   be appended after retries; the unsaved `record` is returned so it can be
 *   retried (Req 9.2).
 */
export type RoleChangeActionResult =
  | { ok: true; account: AdminAccount }
  | {
      ok: false
      reason: 'unauthenticated' | 'forbidden' | 'not_found' | 'persist_failed'
    }
  | { ok: false; reason: 'audit_failed'; record: AuditRecord }

/**
 * Changes another administrator's Role assignment (Req 2.7).
 *
 * Succeeds only when the acting administrator holds `Super_Admin`. On success
 * the new roles are persisted (the affected account's `active` flag is derived
 * from whether any role remains, Req 2.1 / 2.2) and a role-change audit record
 * — acting identity, affected identity, previous roles, new roles, and a
 * timestamp — is appended to the Audit_Log. On any denial, missing account, or
 * persistence failure no further mutation occurs and a discriminated error
 * result is returned.
 *
 * @param accountId - identity of the administrator whose roles are changing
 * @param newRoles - the new role set to assign
 * @param api - the AdminApi to use; defaults to the shared mock instance
 * @param now - epoch milliseconds for the audit timestamp; defaults to now
 */
export async function changeAdminRoles(
  accountId: string,
  newRoles: Role[],
  api: AdminApi = mockAdminApi,
  now: number = Date.now(),
): Promise<RoleChangeActionResult> {
  // 1. Authentication — there must be a valid admin session.
  const session = await readSession()
  if (session === null) {
    return { ok: false, reason: 'unauthenticated' }
  }

  // 2. RBAC re-check (defense in depth). Only a Super_Admin may manage another
  //    administrator's roles; otherwise the request is denied and no data is
  //    touched (Req 2.4).
  if (!session.roles.includes(ROLE_MANAGER_ROLE)) {
    return { ok: false, reason: 'forbidden' }
  }

  // 3. Load the affected account to capture its previous role set for the
  //    audit trail (Req 2.7).
  const current = await api.accounts.get(accountId)
  if (!current.ok) {
    return { ok: false, reason: 'not_found' }
  }
  const previousRoles = current.data.roles

  // 4. Persist the new role assignment. `active` is derived from whether any
  //    role remains assigned by the persistence layer (Req 2.1 / 2.2).
  const saved = await api.accounts.changeRoles(accountId, newRoles)
  if (!saved.ok) {
    return { ok: false, reason: saved.reason }
  }

  // 5. Append the role-change audit record (Req 2.7). The record carries the
  //    acting administrator, the affected administrator, the previous and new
  //    role sets, and a UTC second-precision timestamp.
  const record = buildRoleChangeAuditRecord(
    session.adminId,
    accountId,
    previousRoles,
    saved.data.roles,
    now,
  )
  const appended = await api.audit.append(record)
  if (!appended.ok) {
    // The role change persisted but the audit append failed after retries.
    // Surface the preserved record so it can be retried (Req 9.2).
    return { ok: false, reason: 'audit_failed', record: appended.record }
  }

  return { ok: true, account: saved.data }
}
