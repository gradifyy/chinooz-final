'use client'

/**
 * Listing remove/reinstate controls (client island).
 *
 * The only interactive part of the listing-detail screen. The surrounding page
 * is a Server Component that resolves every label against `@chinooz/i18n` and
 * passes them in as props, so this island holds no hard-coded strings
 * (Req 10.1) and uses `@chinooz/ui-web` primitives + `@chinooz/theme` token
 * utility classes only (Req 11.1).
 *
 * Behavior mirrors the guarded transition decided server-side
 * (`app/actions/listings.ts` → `admin-core/listings.moderate`):
 * - When the listing is published, a removal-reason textarea and a Remove
 *   button are shown. The reason must be 10..500 characters; an invalid reason
 *   is blocked client-side with a validation message (and re-validated by the
 *   server action as the source of truth, Req 6.6). On success the listing's
 *   moderation status becomes `removed` (Req 6.5).
 * - When the listing is removed, a Reinstate button is shown; pressing it sets
 *   the moderation status back to `published` (Req 6.7).
 *
 * Both actions run server-side via the imported server actions; on success the
 * router is refreshed so the server-rendered detail reflects the new status.
 *
 * _Requirements: 6.5, 6.6, 6.7_
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Text } from '@chinooz/ui-web'

import {
  REMOVAL_REASON_MAX_LENGTH,
  REMOVAL_REASON_MIN_LENGTH,
  validateRemovalReason,
} from '@/lib/admin-core/listings'
import {
  reinstateListing,
  removeListing,
  type ListingModerationResult,
} from '@/app/actions/listings'
import type { ModerationStatus } from '@/lib/admin-core/types'

interface ListingModerationLabels {
  /** "Remove" action label. */
  remove: string
  /** "Reinstate" action label. */
  reinstate: string
  /** Removal-reason field label. */
  removeReason: string
  /** Removal-reason field placeholder. */
  removeReasonPlaceholder: string
  /** Hint describing the accepted 10..500 reason length. */
  removeReasonHint: string
  /** Success message after a removal. */
  removed: string
  /** Success message after a reinstatement. */
  reinstated: string
  /** Authorization-denied message. */
  forbidden: string
  /** Not-found message. */
  notFound: string
  /** Generic action-failure message. */
  actionError: string
  /** Audit-append-failure message (the change was saved). */
  auditError: string
}

interface ListingModerationControlsProps {
  /** The listing being moderated. */
  listingId: string
  /** Current moderation status, deciding which control is shown. */
  moderationStatus: ModerationStatus
  /** Pre-localized, user-visible labels resolved by the server shell. */
  labels: ListingModerationLabels
}

/** A resolved, user-visible status message with its severity. */
interface StatusMessage {
  text: string
  tone: 'success' | 'error'
}

export default function ListingModerationControls({
  listingId,
  moderationStatus,
  labels,
}: ListingModerationControlsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [reason, setReason] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [message, setMessage] = useState<StatusMessage | null>(null)

  /** Maps a failed action result to a user-visible message. */
  function messageForFailure(
    result: Extract<ListingModerationResult, { ok: false }>,
  ): StatusMessage {
    switch (result.reason) {
      case 'forbidden':
        return { text: labels.forbidden, tone: 'error' }
      case 'invalid_reason':
        return { text: result.message, tone: 'error' }
      case 'not_found':
        return { text: labels.notFound, tone: 'error' }
      case 'audit_failed':
        // The change WAS persisted; surface the audit issue but refresh state.
        return { text: labels.auditError, tone: 'error' }
      default:
        return { text: labels.actionError, tone: 'error' }
    }
  }

  function handleResult(result: ListingModerationResult, successText: string): void {
    if (result.ok) {
      setMessage({ text: successText, tone: 'success' })
      setReason('')
      setValidationError(null)
      router.refresh()
      return
    }
    setMessage(messageForFailure(result))
    // An audit failure still changed the underlying state — reflect it.
    if (result.reason === 'audit_failed') router.refresh()
  }

  function handleRemove(): void {
    // Client-side guard for immediate feedback; the server re-validates (Req 6.6).
    const validation = validateRemovalReason(reason)
    if (!validation.ok) {
      setValidationError(validation.reason)
      return
    }
    setValidationError(null)
    startTransition(async () => {
      const result = await removeListing(listingId, reason)
      handleResult(result, labels.removed)
    })
  }

  function handleReinstate(): void {
    startTransition(async () => {
      const result = await reinstateListing(listingId)
      handleResult(result, labels.reinstated)
    })
  }

  return (
    <div className="flex flex-col gap-3" data-testid="admin-listing-moderation">
      {message && (
        <p
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border px-3 py-2 text-sm ${
            message.tone === 'error'
              ? 'border-error bg-error-light text-error'
              : 'border-success bg-success-light text-success'
          }`}
          data-testid="admin-listing-moderation-message"
        >
          {message.text}
        </p>
      )}

      {moderationStatus === 'published' ? (
        <div className="flex flex-col gap-3">
          <Input
            name="removalReason"
            label={labels.removeReason}
            placeholder={labels.removeReasonPlaceholder}
            hint={labels.removeReasonHint}
            error={validationError ?? undefined}
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={REMOVAL_REASON_MAX_LENGTH}
            testID="admin-listing-remove-reason"
          />
          <div>
            <Button
              variant="destructive"
              onPress={handleRemove}
              disabled={isPending || reason.length < REMOVAL_REASON_MIN_LENGTH}
              testID="admin-listing-remove-submit"
            >
              {labels.remove}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button
            variant="primary"
            onPress={handleReinstate}
            disabled={isPending}
            testID="admin-listing-reinstate-submit"
          >
            {labels.reinstate}
          </Button>
        </div>
      )}

      {/* Length bounds surfaced for assistive tech even before interaction. */}
      <Text variant="caption" className="sr-only">
        {`${REMOVAL_REASON_MIN_LENGTH}–${REMOVAL_REASON_MAX_LENGTH}`}
      </Text>
    </div>
  )
}
