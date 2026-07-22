'use client'

/**
 * Order cancellation control (client island).
 *
 * The only interactive part of the order-detail page (Order_Management_Module,
 * Requirement 5). It owns the cancellation-reason input, client-side length
 * validation, the pending state, and the success / error display. The
 * surrounding detail page is a Server Component.
 *
 * Submission is wired to the `cancelOrderAction` server action
 * (`app/actions/orders.ts`), which re-checks RBAC, decides the guarded
 * cancellation with the pure `admin-core/orders.cancelOrder` (blocking
 * completed orders, Req 5.8, and re-validating the reason, Req 5.7), persists
 * the result, and appends the audit record. This island additionally validates
 * the reason length up front (1..500, Req 5.7) so an obviously-invalid reason
 * never round-trips, and surfaces a validation message without mutating the
 * order. On success the router is refreshed so the server-rendered status and
 * line items reflect the cancellation.
 *
 * Every user-visible string is resolved against `@chinooz/i18n` by the server
 * page and passed in as props, so this island holds no hard-coded strings
 * (Req 10.1). Presentation uses `@chinooz/ui-web` primitives and
 * `@chinooz/theme` token utility classes only — no hard-coded color/dimension
 * literals (Req 11.1).
 *
 * _Requirements: 5.6, 5.7, 5.8_
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@chinooz/ui-web'

import { cancelOrderAction } from '@/app/actions/orders'
import {
  CANCELLATION_REASON_MAX_LENGTH,
  CANCELLATION_REASON_MIN_LENGTH,
} from '@/lib/admin-core/orders'

interface CancelOrderFormLabels {
  /** Section / submit-button label for cancelling the order. */
  cancel: string
  /** Submit-button label while the cancellation is in flight. */
  cancelling: string
  /** Label for the cancellation-reason field. */
  reason: string
  /** Placeholder for the cancellation-reason field. */
  reasonPlaceholder: string
  /** Validation message shown when the reason is missing/empty (Req 5.7). */
  reasonRequired: string
  /** Validation message shown when the reason exceeds 500 characters (Req 5.7). */
  reasonTooLong: string
  /** Success message shown once the order is cancelled (Req 5.6). */
  cancelled: string
  /** Error shown when the order is already completed and cannot be cancelled (Req 5.8). */
  alreadyCompleted: string
  /** Authorization error shown when the acting role lacks `orders.cancel`. */
  actionDenied: string
  /** Generic fallback error for not-found / persistence / audit failures. */
  cancelError: string
}

interface CancelOrderFormProps {
  /** Identifier of the order to cancel. */
  orderId: string
  /** Pre-localized, user-visible labels resolved by the server page. */
  labels: CancelOrderFormLabels
}

export default function CancelOrderForm({ orderId, labels }: CancelOrderFormProps) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)

    // Up-front length validation (1..500) so an invalid reason never round-trips
    // and the order is left unchanged (Req 5.7).
    if (reason.length < CANCELLATION_REASON_MIN_LENGTH) {
      setError(labels.reasonRequired)
      return
    }
    if (reason.length > CANCELLATION_REASON_MAX_LENGTH) {
      setError(labels.reasonTooLong)
      return
    }

    startTransition(async () => {
      const result = await cancelOrderAction(orderId, reason)
      if (result.ok) {
        setDone(true)
        router.refresh()
        return
      }

      switch (result.reason) {
        case 'invalid_reason':
          setError(
            reason.length > CANCELLATION_REASON_MAX_LENGTH
              ? labels.reasonTooLong
              : labels.reasonRequired,
          )
          break
        case 'already_completed':
          setError(labels.alreadyCompleted)
          break
        case 'forbidden':
          setError(labels.actionDenied)
          break
        default:
          setError(labels.cancelError)
          break
      }
    })
  }

  if (done) {
    return (
      <p
        role="status"
        className="rounded-xl border border-success bg-success/15 px-3 py-2 text-sm text-success"
        data-testid="admin-order-cancelled"
      >
        {labels.cancelled}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        name="cancelReason"
        label={labels.reason}
        placeholder={labels.reasonPlaceholder}
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={CANCELLATION_REASON_MAX_LENGTH}
        error={error ?? undefined}
        testID="admin-order-cancel-reason"
      />

      <Button
        variant="destructive"
        size="md"
        disabled={isPending}
        loading={isPending}
        onPress={handleSubmit}
        testID="admin-order-cancel-submit"
      >
        {isPending ? labels.cancelling : labels.cancel}
      </Button>
    </div>
  )
}
