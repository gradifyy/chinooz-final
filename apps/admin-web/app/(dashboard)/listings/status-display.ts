/**
 * Presentational mapping for listing moderation statuses
 * (Listing_Moderation_Module).
 *
 * Pure, server-safe helpers shared by the listings list and detail pages: the
 * canonical moderation-status ordering used by the status filter, the
 * `@chinooz/ui-web` `Badge` variant for each status, and a label resolver that
 * maps a status to its pre-resolved `@chinooz/i18n` string. Keeping this here
 * avoids duplicating the status→label / status→variant switches across the two
 * routes while holding no hard-coded user-visible strings (the caller passes
 * the resolved labels) and no design literals.
 */

import type { ModerationStatus } from '@/lib/admin-core/types'

/** `@chinooz/ui-web` `Badge` variants used for moderation statuses. */
export type ListingBadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'

/**
 * Canonical moderation-status ordering, used to render the status filter
 * options. Mirrors the `ModerationStatus` union in `lib/admin-core/types`.
 */
export const MODERATION_STATUSES: readonly ModerationStatus[] = [
  'published',
  'removed',
]

/** The subset of `admin.listings` i18n strings naming each moderation status. */
export interface ListingStatusLabels {
  statusLive: string
  statusRemoved: string
}

/** Maps a moderation status to its localized label. */
export function moderationStatusLabel(
  status: ModerationStatus,
  labels: ListingStatusLabels,
): string {
  switch (status) {
    case 'published':
      return labels.statusLive
    case 'removed':
      return labels.statusRemoved
  }
}

/** Maps a moderation status to a `Badge` variant for visual emphasis. */
export function moderationStatusBadgeVariant(
  status: ModerationStatus,
): ListingBadgeVariant {
  switch (status) {
    case 'published':
      return 'success'
    case 'removed':
      return 'error'
  }
}

/**
 * Narrows an arbitrary string (e.g. a `status` search param) to a
 * {@link ModerationStatus}, returning `undefined` when it is absent or not a
 * valid moderation status. Used to validate the status filter before querying.
 */
export function parseModerationStatus(
  value: string | undefined,
): ModerationStatus | undefined {
  if (value === undefined) return undefined
  return (MODERATION_STATUSES as readonly string[]).includes(value)
    ? (value as ModerationStatus)
    : undefined
}
