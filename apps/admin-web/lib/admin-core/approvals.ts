/**
 * Admin-core verification-approval domain logic.
 *
 * Pure helpers backing the Approval_Module (Requirement 4). No I/O, no React,
 * no cookies, no fetch — plain typed inputs and outputs. List retrieval,
 * document fetching, persistence of decisions, and audit-record appension live
 * in the surrounding action / `AdminApi` layer; this module only derives the
 * pending list, validates rejection reasons, decides guarded status
 * transitions on a request, and constructs the audit record emitted on a
 * successful decision.
 *
 * Time is expressed as epoch milliseconds (`now: number`) for arithmetic;
 * persisted timestamps on domain records use ISO UTC strings at second
 * precision (consistent with `auth.ts`, `rbac.ts`, `users.ts`, and `audit.ts`).
 *
 * See design.md "Approval_Module" / `lib/admin-core/approvals` and Correctness
 * Property 15.
 */

import { buildAuditRecord } from './audit'
import { filterBy } from './shared'
import type {
  AuditRecord,
  ValidationResult,
  VerificationRequest,
} from './types'

// ---------------------------------------------------------------------------
// Pending list (Req 4.1 / 4.8 — Property 15)
// ---------------------------------------------------------------------------

/**
 * Returns exactly the verification requests with a `pending` status, in input
 * order (Property 15).
 *
 * Once a request is decided — approved or rejected — its status is no longer
 * `pending`, so it is excluded from the result (Req 4.8). Sound and complete:
 * every pending request is included and no non-pending request is. Non-mutating
 * — the returned array is always a fresh copy. Satisfies Req 4.1.
 */
export function pendingOnly(
  requests: readonly VerificationRequest[],
): VerificationRequest[] {
  return filterBy(requests, (request) => request.status === 'pending')
}

// ---------------------------------------------------------------------------
// Rejection-reason validation (Req 4.6)
// ---------------------------------------------------------------------------

/** Minimum accepted rejection-reason length, inclusive (Req 4.5 / 4.6). */
export const REJECTION_REASON_MIN_LENGTH = 1

/** Maximum accepted rejection-reason length, inclusive (Req 4.5 / 4.6). */
export const REJECTION_REASON_MAX_LENGTH = 500

/**
 * Validates that a rejection reason's length lies within the inclusive bounds
 * `[REJECTION_REASON_MIN_LENGTH, REJECTION_REASON_MAX_LENGTH]` (1..500).
 *
 * A missing/empty reason (length below the minimum) or one longer than the
 * maximum is rejected with a descriptive `reason`; otherwise the reason is
 * accepted (Req 4.6). Used to block invalid rejections so the request is left
 * pending.
 */
export function validateRejectionReason(reason: string): ValidationResult {
  if (reason.length < REJECTION_REASON_MIN_LENGTH) {
    return { ok: false, reason: 'Rejection reason is required' }
  }
  if (reason.length > REJECTION_REASON_MAX_LENGTH) {
    return {
      ok: false,
      reason: `Rejection reason must be at most ${REJECTION_REASON_MAX_LENGTH} characters`,
    }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Guarded decisions (Req 4.4 / 4.5 / 4.6 / 4.7 — Property 15)
// ---------------------------------------------------------------------------

/** The decisions an Administrator may apply to a verification request. */
export type Decision = 'approve' | 'reject'

/**
 * Outcome of {@link decide}. On success the updated request (a copy with the
 * new status, and `rejectionReason` set on rejection) is returned; otherwise
 * the input is left unchanged and a discriminated failure `reason` is given:
 * - `'already_processed'` — the request was already approved or rejected.
 * - `'invalid_rejection_reason'` — a rejection lacked a valid 1..500 reason.
 */
export type DecisionResult =
  | { ok: true; request: VerificationRequest }
  | { ok: false; reason: 'already_processed' | 'invalid_rejection_reason' }

/**
 * Applies a guarded decision to a verification request (Property 15).
 *
 * The decision succeeds only when the request is still `pending`; acting on an
 * already-approved or already-rejected request is blocked with
 * `'already_processed'` and the input is left unchanged (Req 4.7). On a
 * successful `approve` the status is set to `approved` (Req 4.4). A `reject`
 * additionally requires a valid rejection reason of 1..500 characters
 * (validated via {@link validateRejectionReason}); a missing or over-long
 * reason is blocked with `'invalid_rejection_reason'`, leaving the request
 * pending (Req 4.6). On a successful `reject` the status is set to `rejected`
 * and the `rejectionReason` is recorded on the returned request (Req 4.5).
 *
 * On success a fresh request object is returned; the input is never mutated.
 * The audit record for a successful decision is built by
 * {@link buildDecisionAuditRecord} in the action layer.
 */
export function decide(
  request: VerificationRequest,
  decision: Decision,
  reason?: string,
): DecisionResult {
  if (request.status !== 'pending') {
    return { ok: false, reason: 'already_processed' }
  }

  if (decision === 'approve') {
    return { ok: true, request: { ...request, status: 'approved' } }
  }

  const rejectionReason = reason ?? ''
  if (!validateRejectionReason(rejectionReason).ok) {
    return { ok: false, reason: 'invalid_rejection_reason' }
  }

  return {
    ok: true,
    request: { ...request, status: 'rejected', rejectionReason },
  }
}

// ---------------------------------------------------------------------------
// Decision audit record (Req 4.4 / 4.5 — Property 15)
// ---------------------------------------------------------------------------

/** Action type recorded in the Audit_Log when a request is approved (Req 4.4). */
export const VERIFICATION_APPROVE_ACTION = 'verification_approve'

/** Action type recorded in the Audit_Log when a request is rejected (Req 4.5). */
export const VERIFICATION_REJECT_ACTION = 'verification_reject'

/**
 * Builds the {@link AuditRecord} emitted on a successful verification decision
 * (Req 4.4 approve / Req 4.5 reject — Property 15).
 *
 * The record carries the acting Administrator identity (`actorId`), the
 * affected Verification_Request identity (`entityId`), the action performed
 * (`actionType`), and a UTC second-precision timestamp derived from `now`
 * (epoch milliseconds). On a rejection the recorded `rejectionReason` is
 * captured in `details` (Req 4.5). Built via the shared {@link buildAuditRecord}
 * helper to match the record-construction pattern used by the other admin-core
 * modules.
 *
 * `request` should be the resulting request from a successful {@link decide}
 * (i.e. carrying the new status and, for a rejection, the `rejectionReason`).
 */
export function buildDecisionAuditRecord(
  actor: string,
  request: VerificationRequest,
  decision: Decision,
  now: number,
): AuditRecord {
  if (decision === 'approve') {
    return buildAuditRecord(
      actor,
      VERIFICATION_APPROVE_ACTION,
      request.id,
      now,
      { affectedId: request.id },
    )
  }

  return buildAuditRecord(actor, VERIFICATION_REJECT_ACTION, request.id, now, {
    affectedId: request.id,
    rejectionReason: request.rejectionReason ?? '',
  })
}
