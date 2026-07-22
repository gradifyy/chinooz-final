/**
 * Listing detail page (Server Component) — Listing_Moderation_Module.
 *
 * Displays a single listing's details: the title, description, price in NPR,
 * images, and seller (Req 6.4). The view model (including the NPR-formatted
 * price and a copied images array) is built by the pure
 * `admin-core/listings.listingDetailViewModel`, so this page only renders it.
 *
 * The remove / reinstate control is the page's single interactive island
 * (`ListingModerationControls`); it is shown only when the acting administrator
 * holds the `listings.moderate` permission — a read-only administrator sees the
 * details without the mutating controls. The guarded moderation itself is
 * enforced server-side by `removeListing` / `reinstateListing`, so hiding the
 * control is a convenience, not the security boundary (Req 2.6, 6.5–6.7).
 *
 * Every user-visible string comes from the `@chinooz/i18n` EN/NE catalogs
 * (Req 10.1); all styling uses `@chinooz/theme` token utility classes only
 * (Req 11.1).
 *
 * _Requirements: 6.4_
 */

import { cookies } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { resources } from '@chinooz/i18n'
import { Badge, Card, Divider, EmptyState, Heading, Text } from '@chinooz/ui-web'

import { resolveLocale } from '@/lib/admin-core/i18n'
import { listingDetailViewModel } from '@/lib/admin-core/listings'
import { canPerform } from '@/lib/admin-core/rbac'
import { mockAdminApi } from '@/lib/api/mock'
import { readSession } from '@/lib/session'
import ListingModerationControls from '@/components/listings/ListingModerationControls'
import {
  moderationStatusBadgeVariant,
  moderationStatusLabel,
} from '../status-display'

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const locale = resolveLocale((await cookies()).get('chinooz-locale')?.value)
  const t = resources[locale].translation.admin
  const listings = t.listings

  const { id } = await params
  const found = await mockAdminApi.listings.get(id)

  if (!found.ok) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <EmptyState title={listings.notFound} testID="admin-listing-not-found" />
        <Link href="/listings" className="text-sm font-medium text-primary">
          {t.common.back}
        </Link>
      </div>
    )
  }

  // The NPR-formatted price and copied images array are computed by the pure
  // core view-model builder (Req 6.4).
  const listing = listingDetailViewModel(found.data, locale)

  // Show the moderation controls only with `listings.moderate` (Req 2.6); the
  // server action re-checks RBAC regardless.
  const session = await readSession()
  const canModerate =
    session !== null && canPerform(session.roles, 'listings.moderate')

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Link href="/listings" className="text-sm font-medium text-primary">
          {t.common.back}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Heading variant="h2" testID="admin-listing-detail-title">
            {listing.title}
          </Heading>
          <Badge
            label={moderationStatusLabel(listing.moderationStatus, listings)}
            variant={moderationStatusBadgeVariant(listing.moderationStatus)}
            testID="admin-listing-detail-status"
          />
        </div>
      </div>

      {/* Core details: seller, price, description (Req 6.4) */}
      <Card>
        <dl className="flex flex-col gap-3">
          <div className="flex justify-between gap-4">
            <dt className="text-sm text-text-muted">{listings.seller}</dt>
            <dd className="text-sm font-medium text-text" data-testid="admin-listing-seller">
              {listing.seller.name}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-sm text-text-muted">{listings.price}</dt>
            <dd
              className="text-sm font-medium text-text"
              data-testid="admin-listing-price"
            >
              {listing.priceFormatted}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-sm text-text-muted">{t.common.status}</dt>
            <dd className="text-sm font-medium text-text">
              {moderationStatusLabel(listing.moderationStatus, listings)}
            </dd>
          </div>
        </dl>
        <Divider />
        <div className="flex flex-col gap-2">
          <Text variant="label" className="text-text">
            {listings.description}
          </Text>
          <Text
            variant="body"
            className="text-text-muted"
            testID="admin-listing-description"
          >
            {listing.description}
          </Text>
        </div>
      </Card>

      {/* Images (Req 6.4) */}
      <Card>
        <Heading variant="h4" className="mb-3">
          {listings.images}
        </Heading>
        {listing.images.length === 0 ? (
          <Text
            variant="body"
            className="text-text-muted"
            testID="admin-listing-no-images"
          >
            {listings.noImages}
          </Text>
        ) : (
          <div className="flex flex-wrap gap-3">
            {listing.images.map((src, index) => (
              <Image
                key={src}
                src={src}
                alt={`${listing.title} ${index + 1}`}
                width={320}
                height={320}
                className="h-40 w-40 rounded-lg border border-border-light object-cover"
                data-testid={`admin-listing-image-${index}`}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Remove / reinstate island — shown only with listings.moderate (Req 2.6). */}
      {canModerate && (
        <Card>
          <Heading variant="h4" className="mb-3">
            {listing.moderationStatus === 'published'
              ? listings.remove
              : listings.reinstate}
          </Heading>
          <ListingModerationControls
            listingId={listing.id}
            status={listing.moderationStatus}
            labels={{
              remove: listings.remove,
              removing: listings.removing,
              reinstate: listings.reinstate,
              reinstating: listings.reinstating,
              removeReason: listings.removeReason,
              removeReasonPlaceholder: listings.removeReasonPlaceholder,
              removeReasonHint: listings.removeReasonHint,
              reasonTooShort: listings.removeReasonTooShort,
              reasonTooLong: listings.removeReasonTooLong,
              reinstateConfirmTitle: listings.reinstateConfirmTitle,
              reinstateConfirmMessage: listings.reinstateConfirmMessage,
              confirm: t.common.confirm,
              cancel: t.common.cancel,
              removed: listings.removed,
              reinstated: listings.reinstated,
              actionDenied: t.forbidden.actionDenied,
              auditError: listings.auditError,
              actionError: listings.actionError,
            }}
          />
        </Card>
      )}
    </div>
  )
}
