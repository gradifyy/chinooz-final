/**
 * Listings list page (Server Component) — Listing_Moderation_Module.
 *
 * Renders a page of listings paginated at most 50 records per page (Req 6.1),
 * with a moderation-status filter (Req 6.2) and an empty-state message (Req
 * 6.3). Server-first: the active locale, moderation-status filter, and page
 * number are read from the request (cookie + `searchParams`), and the
 * moderation-status filtering / ≤50-per-page pagination are performed by the
 * pure `admin-core` helpers behind `AdminApi.listings.list`. There is no client
 * island on this route — the status filter and pager are plain navigation
 * links that re-run the server query.
 *
 * Prices are displayed in NPR via `@chinooz/utils` (Req 6.4). Every
 * user-visible string comes from the `@chinooz/i18n` EN/NE catalogs (Req 10.1),
 * and all styling uses `@chinooz/theme` token utility classes only (Req 11.1).
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4_
 */

import { cookies } from 'next/headers'
import Link from 'next/link'
import { resources } from '@chinooz/i18n'
import { formatNPRFromPaisa } from '@chinooz/utils'
import { Badge, Card, EmptyState, Heading, Text } from '@chinooz/ui-web'

import { resolveLocale } from '@/lib/admin-core/i18n'
import { mockAdminApi } from '@/lib/api/mock'
import type { ModerationStatus } from '@/lib/admin-core/types'
import {
  MODERATION_STATUSES,
  moderationStatusBadgeVariant,
  moderationStatusLabel,
  parseModerationStatus,
} from './status-display'

/** Parses the 1-based `page` search param, defaulting to page 1. */
function parsePage(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
}

/** Builds a `/listings` href carrying the given status filter and page. */
function listingsHref(
  status: ModerationStatus | undefined,
  page: number,
): string {
  const params = new URLSearchParams()
  if (status !== undefined) params.set('status', status)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query.length > 0 ? `/listings?${query}` : '/listings'
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; page?: string | string[] }>
}) {
  const locale = resolveLocale((await cookies()).get('chinooz-locale')?.value)
  const t = resources[locale].translation.admin
  const listings = t.listings

  const params = await searchParams
  const statusParam = typeof params.status === 'string' ? params.status : undefined
  const pageParam = typeof params.page === 'string' ? params.page : undefined

  const status = parseModerationStatus(statusParam)
  const requestedPage = parsePage(pageParam)

  // Moderation-status filtering and ≤50-per-page pagination are applied by the
  // pure core helpers behind the AdminApi (Req 6.1 / 6.2).
  const result = await mockAdminApi.listings.list({
    moderationStatus: status,
    page: requestedPage,
  })
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))

  return (
    <div className="flex flex-col gap-6 p-6">
      <Heading variant="h2" testID="admin-listings-title">
        {listings.title}
      </Heading>

      {/* Moderation-status filter (Req 6.2) — plain navigation links. */}
      <nav aria-label={listings.filterStatus} className="flex flex-wrap gap-2">
        <Link
          href={listingsHref(undefined, 1)}
          aria-current={status === undefined ? 'true' : undefined}
          className={`flex h-9 items-center rounded-full px-3 text-sm font-medium transition-colors ${
            status === undefined
              ? 'bg-primary text-white'
              : 'bg-surface text-text-muted hover:text-text'
          }`}
        >
          {listings.filterAll}
        </Link>
        {MODERATION_STATUSES.map((option) => {
          const active = status === option
          return (
            <Link
              key={option}
              href={listingsHref(option, 1)}
              aria-current={active ? 'true' : undefined}
              className={`flex h-9 items-center rounded-full px-3 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-muted hover:text-text'
              }`}
            >
              {moderationStatusLabel(option, listings)}
            </Link>
          )
        })}
      </nav>

      {result.items.length === 0 ? (
        // Empty result indication (Req 6.3) — distinguishes a filtered result.
        <EmptyState
          title={status === undefined ? listings.empty : listings.emptyFiltered}
          testID="admin-listings-empty"
        />
      ) : (
        <>
          <Card padded={false}>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="px-4 py-3 text-sm font-semibold text-text-muted">
                    {listings.colTitle}
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-text-muted">
                    {listings.seller}
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-text-muted">
                    {listings.price}
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-text-muted">
                    {t.common.status}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((listing) => (
                  <tr
                    key={listing.id}
                    className="border-b border-border-light last:border-0 hover:bg-background"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/listings/${listing.id}`}
                        className="text-sm font-medium text-primary"
                        data-testid={`admin-listing-link-${listing.id}`}
                      >
                        {listing.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-text">
                      {listing.sellerName}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text">
                      {formatNPRFromPaisa(listing.pricePaisa, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={moderationStatusLabel(
                          listing.moderationStatus,
                          listings,
                        )}
                        variant={moderationStatusBadgeVariant(
                          listing.moderationStatus,
                        )}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Pager (Req 6.1) — preserves the active status filter. */}
          <div className="flex items-center justify-between">
            <Text variant="caption" className="text-text-muted">
              {t.pagination.page} {result.page} {t.pagination.of} {totalPages}
            </Text>
            <div className="flex gap-2">
              {result.page > 1 && (
                <Link
                  href={listingsHref(status, result.page - 1)}
                  className="flex h-9 items-center rounded-md bg-surface px-3 text-sm font-medium text-text hover:bg-background"
                  data-testid="admin-listings-prev"
                >
                  {t.pagination.previous}
                </Link>
              )}
              {result.page < totalPages && (
                <Link
                  href={listingsHref(status, result.page + 1)}
                  className="flex h-9 items-center rounded-md bg-surface px-3 text-sm font-medium text-text hover:bg-background"
                  data-testid="admin-listings-next"
                >
                  {t.pagination.next}
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
