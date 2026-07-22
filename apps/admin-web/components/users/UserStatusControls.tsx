'use client'

/**
 * Marketplace-user suspend / reactivate controls (client island).
 *
 * The interactive part of the user detail page. Renders a single status-change
 * control whose action depends on the user's current status: an active account
 * can be suspended (Req 3.7), a suspended account can be reactivated (Req 3.8).
 * The control opens a confirmation modal; confirming dispatches the matching
 * `'use server'` action (`suspendUser` / `reactivateUser`), which re-checks
 * RBAC, decides the guarded transition, persists, and appends the audit record
 * server-side.
 *
 * On success the modal closes and `router.refresh()` re-fetches the detail page
 * so the new status (and the available control) reflect the change. A no-op
 * transition reported by the action (`already_in_status`) surfaces the
 * "already in status" message and leaves the displayed status unchanged
 * (Req 3.9); any other failure surfaces a generic update-error message.
 *
 * Every user-visible string is resolved against `@chinooz/i18n` by the server
 * page and passed in as props, so this island holds no hard-coded strings
 * (Req 10.1). Presentation uses `@chinooz/ui-web` primitives and
 * `@chinooz/theme` token utility classes only (Req 11.1).
 *
 * _Requirements: 3.7, 3.8, 3.9_
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Modal, Text } from '@chinooz/ui-web'

import { reactivateUser, suspendUser } from '@/app/actions/users'
import type { AccountStatus } from '@/lib/admin-core/types'

interface UserStatusControlsLabels {
  /** Suspend-action button label. */
  suspend: string
  /** Reactivate-action button label. */
  reactivate: string
  /** Suspend confirmation modal title. */
  suspendConfirmTitle: string
  /** Suspend confirmation modal message. */
  suspendConfirmMessage: string
  /** Reactivate confirmation modal title. */
  reactivateConfirmTitle: string
  /** Reactivate confirmation modal message. */
  reactivateConfirmMessage: string
  /** Confirm-button label inside the modal. */
  confirm: string
  /** Cancel-button label inside the modal. */
  cancel: string
  /** Message shown when the account is already in the requested status (Req 3.9). */
  alreadyInStatus: string
  /** Generic failure message for any other update error. */
  updateError: string
}

interface UserStatusControlsProps {
  /** Identity of the marketplace user this control acts on. */
  userId: string
  /** The user's current status, deciding which action is offered. */
  status: AccountStatus
  /** Pre-localized, user-visible labels resolved by the server page. */
  labels: UserStatusControlsLabels
}

export default function UserStatusControls({
  userId,
  status,
  labels,
}: UserStatusControlsProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // An active account is suspended; a suspended account is reactivated.
  const action: 'suspend' | 'reactivate' =
    status === 'active' ? 'suspend' : 'reactivate'

  const triggerLabel = action === 'suspend' ? labels.suspend : labels.reactivate
  const confirmTitle =
    action === 'suspend' ? labels.suspendConfirmTitle : labels.reactivateConfirmTitle
  const confirmMessage =
    action === 'suspend'
      ? labels.suspendConfirmMessage
      : labels.reactivateConfirmMessage

  const openConfirm = () => {
    setError(null)
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
    startTransition(async () => {
      const result =
        action === 'suspend'
          ? await suspendUser(userId)
          : await reactivateUser(userId)

      if (result.ok) {
        setConfirmOpen(false)
        // Re-fetch the detail page so the new status renders (Req 3.10).
        router.refresh()
        return
      }

      // A no-op transition leaves the status unchanged (Req 3.9); any other
      // failure surfaces a generic error. The confirmation closes either way.
      setError(
        result.reason === 'already_in_status'
          ? labels.alreadyInStatus
          : labels.updateError,
      )
      setConfirmOpen(false)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={action === 'suspend' ? 'destructive' : 'primary'}
        size="md"
        onPress={openConfirm}
        testID="admin-user-status-trigger"
      >
        {triggerLabel}
      </Button>

      {error !== null && (
        <Text
          variant="caption"
          className="text-error"
          testID="admin-user-status-error"
        >
          {error}
        </Text>
      )}

      <Modal
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={confirmTitle}
        testID="admin-user-status-modal"
      >
        <div className="flex flex-col gap-4">
          <Text variant="body" className="text-text-muted">
            {confirmMessage}
          </Text>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="md"
              onPress={() => setConfirmOpen(false)}
              disabled={isPending}
              testID="admin-user-status-cancel"
            >
              {labels.cancel}
            </Button>
            <Button
              variant={action === 'suspend' ? 'destructive' : 'primary'}
              size="md"
              onPress={handleConfirm}
              loading={isPending}
              disabled={isPending}
              testID="admin-user-status-confirm"
            >
              {labels.confirm}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
