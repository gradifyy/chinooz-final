'use server'

/**
 * Verification-approval Server Actions (Approval_Module — Requirement 4).
 *
 * These `'use server'` mutations orchestrate the approve/reject flow for a
 * Verification_Request, following the action-layer contract in design.md
 * ("Layering Rules" #3): re-check RBAC via `admin-core/rbac`, validate input
 * via the pure `admin-core/approvals` validators, decide the guarded status
 * transition (blocking already-processed requests), persist the resulting
 * record through the {@link AdminApi}, and append an Audit_Log record built by
 * the pure core helper.
 *
 * Authorization is defense-in-depth: even though the middleware performs a
 * coarse route-level guard, every mutation re-checks `approvals.decide` here so
 * a bypassed route guard still leaves data unchanged (design.md "Security
 * Considerations"). All correctness-critical decisions are delegated to the
 * pure helpers in `lib/admin-core`; this module owns only I/O orchestration.
 *
 * Server-side only. TypeScript strict mode, no `any`.
 *
 * _Requirements: 4.4, 4.5, 4.6, 4.7_
 */

import { revalidatePath } from 'next/cache'

import { mockAdminApi } from '@/lib/api/mock'
import type { AdminApi } from '@/lib/api/types'
import {
  buildDecisionAuditRecord,
  decide,
  validateRejectionReason,
  type Decision,
} from '@/lib/admin-core/approvals'
import { canPerform } from '@/lib/admin-core/rbac'
import type { VerificationRequest } from '@/lib/admin-core/types'
import { readSession } from '@/lib/session'

/** Permission required to decide (approve/reject) a Verification_Request. */
const DECIDE_PERMISSION = 'approvals.decide' as const

/** Path whose cached data is refreshed after a successful decision. */
const APPROVALS_PATH = '/approvals'

/**
 * Discriminated outcome of an approval/rejection Server Action.
 *
 * On success the persisted, decided {@link VerificationRequest} is returned. On
 * failure a coarse `reason` lets the caller render the appropriate message
 * while leaving domain state unchanged:
 * - `'unauthenticated'` — no valid admin session (re-authenticate).
 * - `'forbidden'` — the session lacks `approvals.decide` (Req 4 / 2.4).
 * - `'invalid_rejection_reason'` — a rejection lacked a valid 1..500 reason;
 *   the request is left pending (Req 4.6).
 * - `'not_found'` — the request no longer exists.
 * - `'retrieval_failed'` — the request could not be retrieved (Req 4.3).
 * - `'already_processed'` — the request was already approved/rejected (Req 4.7).
 * - `'persist_failed'` — the decision could not be persisted; prior state is
 *   retained (Req 8.5-style preservation).
 * - `'audit_failed'` — the decision persisted but the Audit_Log append did not
 *   succeed after retries; the record is preserved for a later retry (Req 9.2).
 */
export type ApprovalActionResult =
  | { ok: true; request: VerificationRequest }
  | {
      ok: false
      reason:
        | 'unauthenticated'
        | 'forbidden'
        | 'invalid_rejection_reason'
        | 'not_found'
        | 'retrieval_failed'
        | 'already_processed'
        | 'persist_failed'
        | 'audit_failed'
    }

/**
 * Approves a pending Verification_Request (Req 4.4).
 *
 * Re-checks `approvals.decide`, blocks acting on an already-processed request
 * (Req 4.7), persists the `approved` status, and appends a
 * `verification_approve` audit record carrying the acting identity, affected
 * request identity, and a UTC timestamp.
 */
export async function approveRequest(
  requestId: string,
): Promise<ApprovalActionResult> {
  return runDecision(mockAdminApi, requestId, 'approve')
}

/**
 * Rejects a pending Verification_Request with a reason (Req 4.5 / 4.6).
 *
 * Re-checks `approvals.decide`, validates the rejection reason is 1..500
 * characters (blocking and leaving the request pending otherwise, Req 4.6),
 * blocks acting on an already-processed request (Req 4.7), persists the
 * `rejected` status with the reason, and appends a `verification_reject` audit
 * record carrying the acting identity, affected request identity, rejection
 * reason, and a UTC timestamp.
 */
export async function rejectRequest(
  requestId: string,
  reason: string,
): Promise<ApprovalActionResult> {
  // Validate up-front so an invalid reason is rejected before any I/O, leaving
  // the request untouched in its pending status (Req 4.6).
  if (!validateRejectionReason(reason).ok) {
    return { ok: false, reason: 'invalid_rejection_reason' }
  }
  return runDecision(mockAdminApi, requestId, 'reject', reason)
}

/**
 * Shared orchestration for both decisions. Kept private to this module so the
 * two exported actions stay thin and the RBAC re-check, guarded transition,
 * persistence, and audit append happen in exactly one place.
 */
async function runDecision(
  api: AdminApi,
  requestId: string,
  decision: Decision,
  reason?: string,
): Promise<ApprovalActionResult> {
  // 1. Defense-in-depth RBAC re-check (Req 2.4 / 4).
  const session = await readSession()
  if (session === null) {
    return { ok: false, reason: 'unauthenticated' }
  }
  if (!canPerform(session.roles, DECIDE_PERMISSION)) {
    return { ok: false, reason: 'forbidden' }
  }

  // 2. Retrieve the current request (Req 4.3 retrieval failure handling).
  const found = await api.approvals.get(requestId)
  if (!found.ok) {
    return { ok: false, reason: found.reason }
  }

  // 3. Decide the guarded transition — blocks already-processed requests
  //    (Req 4.7) and re-validates the rejection reason (Req 4.6).
  const outcome = decide(found.data, decision, reason)
  if (!outcome.ok) {
    return { ok: false, reason: outcome.reason }
  }

  // 4. Persist the already-decided record (Req 4.4 / 4.5).
  const persisted = await api.approvals.save(outcome.request)
  if (!persisted.ok) {
    return { ok: false, reason: persisted.reason }
  }

  // 5. Append the Audit_Log record built by the pure core helper.
  const record = buildDecisionAuditRecord(
    session.adminId,
    persisted.data,
    decision,
    Date.now(),
  )
  const appended = await api.audit.append(record)
  if (!appended.ok) {
    return { ok: false, reason: 'audit_failed' }
  }

  // 6. Refresh the pending list now that this request has left it (Req 4.8).
  revalidatePath(APPROVALS_PATH)

  return { ok: true, request: persisted.data }
}
