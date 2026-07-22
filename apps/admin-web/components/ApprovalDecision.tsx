'use client'

/**
 * Approval decision controls (client island).
 *
 * The interactive part of the approval detail page: it owns the approve and
 * reject actions, the reject-reason input with validation messaging, and the
 * pending/error UI state. The surrounding detail page is a Server Component and
 * only renders this island while the request is still `pending`.
 *
 * Approve and reject are wired to the `approveRequest` / `rejectRequest` server
 * actions (`app/actions/approvals.ts`), which re-check RBAC, decide the guarded
 * status transition (blocking already-processed requests, Req 4.7), persist the
 * decision (Req 4.4 / 4.5), and append the Audit_Log record. After a successful
 * decision the router is refreshed so the server re-renders the new status and
 * the request leaves the pending list (Req 4.8).
 *
 * The rejection reason is validated client-side with the same pure
 * `validateRejectionReason` helper the action enforces (1..500 characters), so
 * an empty or over-long reason is blocked with a localized message and the
 * request is left pending (Req 4.6). The action re-validates server-side as the
 * authoritative guard.
 *
 * Every user-visible string is resolved against `@chinooz/i18n` by the server
 * page and passed in as props, so this island holds no hard-coded strings
 * (Req 10.1). Presentation uses `@chinooz/ui-web` primitives and
 * `@chinooz/theme` token utility classes only (Req 11.1).
 *
 * _Requirements: 4.4, 4.5, 4.6, 4.7_
 */

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@chinooz/ui-web'

import {
  REJECTION_REASON_MAX_LENGTH,
  REJECTION_REASON_MIN_LENGTH,
  validateRejectionReason,
} from '@/lib/admin-core/approvals'
import {
  approveRequest,
  rejectRequest,
  type ApprovalActionResult,
} from '@/app/actions/approvals'

interface ApprovalDecisionLabels {
  /** Approve-button label. */
  approve: string
  /** Reveal-reject-form button label. */
  reject: string
  /** Submit-rejection button label. */
  rejectSubmit: string
  /** Label for the rejection-reason input. */
  rejectReason: string
  /** Placeholder for the rejection-reason input. */
  rejectReasonPlaceholder: string
  /** Cancel-rejection button label. */
  cancel: string
  /** Validation message shown when no reason is given (Req 4.6). */
  reasonRequired: string
  /** Validation message shown when the reason exceeds 500 characters (Req 4.6). */
  reasonTooLong: string
  /** Message shown when acting on an already-processed request (Req 4.7). */
  alreadyProcessed: string
  /** Generic message shown when an action cannot be completed. */
  actionError: string
}

interface ApprovalDecisionProps {
  /** Identity of the Verification_Request being decided. */
  requestId: string
  /** Pre-localized, user-visible labels resolved by the server page. */
  labels: ApprovalDecisionLabels
}

/** Maps a failed action outcome to the matching localized message. */
function messageForFailure(
  reason: Exclude<ApprovalActionResult, { ok: true }>['reason'],
  labels: ApprovalDecisionLabels,
): string {
  if (reason === 'already_processed') return labels.alreadyProcessed
  if (reason === 'invalid_rejection_reason') return labels.reasonRequired
  return labels.actionError
}

export default function ApprovalDecision({
  requestId,
  labels,
}: ApprovalDecisionProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Applies the result of a server action: refresh on success so the server
  // re-renders the new status (and drops the request from the pending list,
  // Req 4.8), otherwise surface the matching localized error.
  const applyResult = useCallback(
    (result: ApprovalActionResult) => {
      if (result.ok) {
        setError(null)
        setRejecting(false)
        setReason('')
        router.refresh()
        return
      }
      setError(messageForFailure(result.reason, labels))
    },
    [labels, router],
  )

  const handleApprove = useCallback(() => {
    setError(null)
    startTransition(async () => {
      applyResult(await approveRequest(requestId))
    })
  }, [applyResult, requestId])

  const handleRejectSubmit = useCallback(() => {
    // Mirror the server-side guard: block an empty or over-long reason and
    // leave the request pending, with a localized message (Req 4.6).
    if (!validateRejectionReason(reason).ok) {
      setError(
        reason.length < REJECTION_REASON_MIN_LENGTH
          ? labels.reasonRequired
          : labels.reasonTooLong,
      )
      return
    }
    setError(null)
    startTransition(async () => {
      applyResult(await rejectRequest(requestId, reason))
    })
  }, [applyResult, labels, reason, requestId])

  const handleCancelReject = useCallback(() => {
    setRejecting(false)
    setReason('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4" data-testid="admin-approval-decision">
      {error !== null && (
        <p
          role="alert"
          className="rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error"
          data-testid="admin-approval-error"
        >
          {error}
        </p>
      )}

      {rejecting ? (
        <div className="flex flex-col gap-3">
          <Input
            name="rejectionReason"
            label={labels.rejectReason}
            placeholder={labels.rejectReasonPlaceholder}
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={REJECTION_REASON_MAX_LENGTH}
            error={error ?? undefined}
            testID="admin-approval-reject-reason"
          />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="destructive"
              onPress={handleRejectSubmit}
              disabled={isPending}
              loading={isPending}
              testID="admin-approval-reject-submit"
            >
              {labels.rejectSubmit}
            </Button>
            <Button
              variant="ghost"
              onPress={handleCancelReject}
              disabled={isPending}
              testID="admin-approval-reject-cancel"
            >
              {labels.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onPress={handleApprove}
            disabled={isPending}
            loading={isPending}
            testID="admin-approval-approve"
          >
            {labels.approve}
          </Button>
          <Button
            variant="destructive"
            onPress={() => {
              setError(null)
              setRejecting(true)
            }}
            disabled={isPending}
            testID="admin-approval-reject"
          >
            {labels.reject}
          </Button>
        </div>
      )}
    </div>
  )
}
