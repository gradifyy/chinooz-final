'use server'

/**
 * Order-management server actions (Order_Management_Module — Requirement 5).
 *
 * This is the orchestration layer described in design.md "Layering Rules" #3:
 * a server action re-checks RBAC via `admin-core/rbac`, validates input via the
 * `admin-core/orders` validators, decides the guarded transition with the pure
 * core, persists the result via the injected {@link AdminApi}, and appends an
 * audit record via `admin-core/audit` + `AdminApi.audit.append`. All
 * correctness-critical decisions live in the pure `lib/admin-core` helpers;
 * this module only sequences I/O and maps outcomes to a typed result.
 *
 * Authorization is enforced as defense-in-depth: even though `middleware.ts`
 * performs a coarse route-level guard, every mutating action re-checks
 * `rbac.canPerform(roles, 'orders.cancel')` before touching data, so a denied
 * request leaves all data unchanged (Req 2.4 / 2.6).
 *
 * Server-side only. TypeScript strict mode, no `any`.
 *
 * _Requirements: 5.6, 5.7, 5.8_
 */

import { revalidatePath } from 'next/cache'

import { buildCancellationAuditRecord, cancelOrder } from '@/lib/admin-core/orders'
import { canPerform } from '@/lib/admin-core/rbac'
import type { AdminOrder } from '@/lib/admin-core/types'
import type { AdminApi } from '@/lib/api/types'
import { mockAdminApi } from '@/lib/api/mock'
import { readSession } from '@/lib/session'

/**
 * Permission required to cancel an order. Held by `Operations_Admin` and
 * `Super_Admin` (see `ROLE_PERMISSIONS`); a `Read_Only_Admin` or `Support_Admin`
 * lacks it (Req 2.4 / 2.6).
 */
const CANCEL_PERMISSION = 'orders.cancel' as const

/**
 * Discriminated outcome of {@link cancelOrderAction}.
 *
 * On success the persisted, cancelled order is returned. Every failure carries
 * a coarse `reason` the caller maps to a user-facing message:
 * - `'unauthenticated'` — no valid admin session (the middleware normally
 *   prevents this; re-checked here as defense-in-depth).
 * - `'forbidden'` — the acting roles lack `orders.cancel`; data is unchanged
 *   (Req 2.4 / 2.6).
 * - `'not_found'` — the target order does not exist.
 * - `'invalid_reason'` — the cancellation reason was missing or not 1..500
 *   characters; the order is left unchanged (Req 5.7).
 * - `'already_completed'` — the order is in `completed` status and cannot be
 *   cancelled; it is retained as completed (Req 5.8).
 * - `'persist_failed'` — persisting the cancellation failed; previously
 *   persisted values are left unchanged (no audit record is appended).
 * - `'audit_failed'` — the cancellation was persisted but the audit record
 *   could not be appended after retries; the record is preserved for retry
 *   (Req 9.2). `order` carries the cancelled order so the UI can reflect it.
 */
export type CancelOrderActionResult =
  | { ok: true; order: AdminOrder }
  | {
      ok: false
      reason:
        | 'unauthenticated'
        | 'forbidden'
        | 'not_found'
        | 'invalid_reason'
        | 'already_completed'
        | 'persist_failed'
      message?: string
    }
  | { ok: false; reason: 'audit_failed'; order: AdminOrder; message?: string }

/**
 * Resolves the {@link AdminApi} implementation backing the action. Currently
 * the in-memory mock; a real HTTP implementation can be substituted here behind
 * the same interface without touching this action's logic.
 */
function getAdminApi(): AdminApi {
  return mockAdminApi
}

/**
 * Cancels an order on behalf of the current administrator (Req 5.6 / 5.7 / 5.8).
 *
 * Sequence:
 * 1. Read the admin session; reject unauthenticated callers.
 * 2. Re-check RBAC — the acting roles must hold `orders.cancel`; otherwise the
 *    request is denied and no data is touched (Req 2.4 / 2.6).
 * 3. Validate the cancellation reason length (1..500) up front (Req 5.7).
 * 4. Load the target order; reject when it does not exist.
 * 5. Decide the guarded cancellation with the pure {@link cancelOrder} — this
 *    blocks completed orders (Req 5.8) and re-validates the reason (Req 5.7),
 *    leaving the order unchanged on failure.
 * 6. Persist the cancelled order via `AdminApi.orders.save`; on persistence
 *    failure leave previously persisted values unchanged.
 * 7. Append the cancellation audit record (acting identity, order identity,
 *    reason, timestamp) via `AdminApi.audit.append`; surface `audit_failed`
 *    (record preserved for retry) if it cannot be persisted (Req 9.2).
 *
 * @param orderId  identifier of the order to cancel
 * @param reason   cancellation reason (validated to 1..500 characters)
 */
export async function cancelOrderAction(
  orderId: string,
  reason: string,
): Promise<CancelOrderActionResult> {
  const session = await readSession()
  if (session === null) {
    return { ok: false, reason: 'unauthenticated' }
  }

  // Defense-in-depth RBAC re-check (Req 2.4 / 2.6): a denied request must leave
  // all data unchanged, so we return before any read or mutation.
  if (!canPerform(session.roles, CANCEL_PERMISSION)) {
    return { ok: false, reason: 'forbidden' }
  }

  const api = getAdminApi()

  // Fetch the current order so the guarded transition runs against real state.
  const found = await api.orders.get(orderId)
  if (!found.ok) {
    return { ok: false, reason: 'not_found' }
  }

  // Guarded cancellation: blocks completed orders and invalid reasons, leaving
  // the order unchanged on failure (Req 5.7 / 5.8).
  const decision = cancelOrder(found.data, reason)
  if (!decision.ok) {
    return { ok: false, reason: decision.reason }
  }

  // Persist the cancelled order (Req 5.6). On failure, previously persisted
  // values remain unchanged and no audit record is appended.
  const saved = await api.orders.save(decision.order)
  if (!saved.ok) {
    return {
      ok: false,
      reason: saved.reason === 'not_found' ? 'not_found' : 'persist_failed',
    }
  }

  // Append the cancellation audit record (Req 5.6). The append retries on
  // transient failure inside the AdminApi (Req 9.2); on continued failure the
  // record is preserved and we surface an audit_failed outcome while still
  // reporting the persisted cancellation.
  const auditRecord = buildCancellationAuditRecord(
    session.adminId,
    saved.data,
    Date.now(),
  )
  const appended = await api.audit.append(auditRecord)

  // Refresh the affected views now that the order state has changed.
  revalidatePath('/orders')
  revalidatePath(`/orders/${orderId}`)

  if (!appended.ok) {
    return { ok: false, reason: 'audit_failed', order: saved.data }
  }

  return { ok: true, order: saved.data }
}
