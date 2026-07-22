'use client'

/**
 * Listing remove / reinstate controls (client island).
 *
 * The only interactive part of the listing-detail page
 * (Listing_Moderation_Module, Requirement 6). The control offered depends on
 * the listing's current moderation status: a published listing can be removed
 * (Req 6.5) — which requires a removal reason of 10..500 characters (Req 6.6) —
 * and a removed listing can be reinstated (Req 6.7) via a simple confirmation.
 * The surrounding detail page is a Server Component.
 *
 * Submission is wired to the `removeListing` / `reinstateListing` server
 * actions (`app/actions/listings.ts`), which re-check RBAC, decide the guarded
 * moderation transition with the pure `admin-core/listings.moderate`, persist
 * the result, and append the audit record. This island additionally validates
 * the removal-reason length up front (10..500, Req 6.6) so an obviously-invalid
 * reason never round-trips, and surfaces a validation message without mutating
 * the listing. On success the router is refreshed so the server-rendered
 * moderation status reflects the change.
 *
 * Every user-visible string is resolved against `@chinooz/i18n` by the server
 * page and passed in as props, so this island holds no hard-coded strings
 * (Req 10.1). Presentation uses `@chinooz/ui-web` primitives and
 * `@chinooz/theme` token utility classes only — no hard-coded color/dimension
 * literals (Req 11.1).
 *
 * _Requirements: 6.5, 6.6, 6.7_
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Modal, Text } from '@chinooz/ui-web'

import { reinstateListing, removeListing } from '@/app/actions/listings'
import {
  REMOVAL_REASON_MAX_LENGTH,
  REMOVAL_REASON_MIN_LENGTH,
} from '@/lib/admin-core/listings'
import type { ModerationStatus } from '@/lib/admin-core/types'

interface ListingModerationControlsLabels {
  /** Remove-action button label. */
  remove: string
  /** Submit-button label while a removal is in flight. */
  removing: string
  /** Reinstate-action button label. */
  reinstate: string
  /** Submit-button label while a reinstate is in flight. */
  reinstating: string
  /** Label for the removal-reason field. */
  removeReason: string
  /** Placeholder for the removal-reason field. */
  removeReasonPlaceholder: string
  /** Helper hint describing the accepted removal-reason length. */
  removeReasonHint: string
  /** Validation message shown when the reason is shorter than 10 chars (Req 6.6). */
  reasonTooShort: string
  /** Validation message shown when the reason exceeds 500 chars (Req 6.6). */
  reasonTooLong: string
  /** Reinstate confirmation modal title. */
  reinstateConfirmTitle: string
  /** Reinstate confirmation modal message. */
  reinstateConfirmMessage: string
  /** Confirm-button label inside the reinstate modal. */
  confirm: string
  /** Cancel-button label inside the reinstate modal. */
  cancel: string
  /** Success message shown once the listing is removed (Req 6.5). */
  removed: string
  /** Success message shown once the listing is reinstated (Req 6.7). */
  reinstated: string
  /** Authorization error shown when the acting role lacks `listings.moderate`. */
  actionDenied: string
  /** Error shown when the change saved but the audit record could not be written. */
  auditError: string
  /** Generic fallback error for not-found / persistence / other failures. */
  actionError: string
}

interface ListingModerationControlsProps {
  /** Identifier of the listing this control acts on. */
  listingId: string
  /** The listing's current moderation status, deciding which action is offered. */
  status: ModerationStatus
  /** Pre-localized, user-visible labels resolved by the server page. */
  labels: ListingModerationControlsLabels
}

export default function ListingModerationControls({
  listingId,
  status,
  labels,
}: ListingModerationControlsProps) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  /** Maps a server failure reason to its localized message. */
  function messageForFailure(reason: string): string {
    switch (reason) {
      case 'forbidden':
        return labels.actionDenied
      case 'audit_failed':
        return labels.auditError
      default:
        return labels.actionError
    }
  }

  function handleRemove() {
    setError(null)
    setSuccess(null)

    // Up-front length validation (10..500) so an invalid reason never
    // round-trips and the listing is left unchanged (Req 6.6).
    if (reason.length < REMOVAL_REASON_MIN_LENGTH) {
      setError(labels.reasonTooShort)
      return
    }
    if (reason.length > REMOVAL_REASON_MAX_LENGTH) {
      setError(labels.reasonTooLong)
      return
    }

    startTransition(async () => {
      const result = await removeListing(listingId, reason)
      if (result.ok) {
        setSuccess(labels.removed)
        router.refresh()
        return
      }
      if (result.reason === 'invalid_reason') {
        setError(
          reason.length > REMOVAL_REASON_MAX_LENGTH
            ? labels.reasonTooLong
            : labels.reasonTooShort,
        )
        return
      }
      if (result.reason === 'audit_failed') {
        // State was persisted; surface the audit error and refresh so the new
        // moderation status is reflected (Req 9.2).
        setError(labels.auditError)
        router.refresh()
        return
      }
      setError(messageForFailure(result.reason))
    })
  }

  function handleReinstate() {
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await reinstateListing(listingId)
      if (result.ok) {
        setConfirmOpen(false)
        setSuccess(labels.reinstated)
        router.refresh()
        return
      }
      if (result.reason === 'audit_failed') {
        setConfirmOpen(false)
        setError(labels.auditError)
        router.refresh()
        return
      }
      setConfirmOpen(false)
      setError(messageForFailure(result.reason))
    })
  }

  // Reinstate flow — a removed listing only needs a confirmation (Req 6.7).
  if (status === 'removed') {
    return (
      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          size="md"
          onPress={() => {
            setError(null)
            setSuccess(null)
            setConfirmOpen(true)
          }}
          testID="admin-listing-reinstate-trigger"
        >
          {labels.reinstate}
        </Button>

        {error !== null && (
          <Text
            variant="caption"
            className="text-error"
            testID="admin-listing-moderation-error"
          >
            {error}
          </Text>
        )}

        {success !== null && (
          <Text
            variant="caption"
            className="text-success"
            testID="admin-listing-reinstated"
          >
            {success}
          </Text>
        )}

        <Modal
          visible={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title={labels.reinstateConfirmTitle}
          testID="admin-listing-reinstate-modal"
        >
          <div className="flex flex-col gap-4">
            <Text variant="body" className="text-text-muted">
              {labels.reinstateConfirmMessage}
            </Text>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="md"
                onPress={() => setConfirmOpen(false)}
                disabled={isPending}
                testID="admin-listing-reinstate-cancel"
              >
                {labels.cancel}
              </Button>
              <Button
                variant="primary"
                size="md"
                onPress={handleReinstate}
                loading={isPending}
                disabled={isPending}
                testID="admin-listing-reinstate-confirm"
              >
                {labels.confirm}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  // Remove flow — a published listing requires a validated reason (Req 6.5/6.6).
  if (success !== null) {
    return (
      <p
        role="status"
        className="rounded-xl border border-success bg-success/15 px-3 py-2 text-sm text-success"
        data-testid="admin-listing-removed"
      >
        {success}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        name="removeReason"
        label={labels.removeReason}
        placeholder={labels.removeReasonPlaceholder}
        hint={labels.removeReasonHint}
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={REMOVAL_REASON_MAX_LENGTH}
        error={error ?? undefined}
        testID="admin-listing-remove-reason"
      />

      <Button
        variant="destructive"
        size="md"
        disabled={isPending}
        loading={isPending}
        onPress={handleRemove}
        testID="admin-listing-remove-submit"
      >
        {isPending ? labels.removing : labels.remove}
      </Button>
    </div>
  )
}
