/**
 * Audit-log page (Server Component) — Audit_Log (Requirement 9), Super_Admin only.
 *
 * Renders the append-only administrative action trail, most-recent-first and
 * paginated at 50 records per page (Req 9.3), with actor and date-range filters
 * (Req 9.5), an invalid-range error that does not alter the current view
 * (Req 9.6), and an empty-result indication (Req 9.7). Access is restricted to
 * Super_Admin: the `audit.view` permission is granted only to that role, so a
 * non-Super_Admin is redirected to `/forbidden` (Req 9.4).
 *
 * Server-first: the active locale, the actor / date-range filters, and the page
 * number are read from the request (cookie + `searchParams`); filtering,
 * most-recent-first ordering, and 50-per-page pagination are all performed by
 * the pure `admin-core/audit` helpers behind `AdminApi.audit.query`. The filter
 * controls are the `'use client'` {@link AuditFilters} island; the table and
 * pager are server-rendered as plain navigation links.
 *
 * Invalid date range (Req 9.6): the {@link AuditFilters} island validates the
 * range before navigating, so an invalid selection never leaves the island.
 * As defense in depth, a manually-crafted URL whose `start` is after its `end`
 * is re-validated here with the pure `validateAuditDateRange`; the date filter
 * is then dropped (the actor filter, if any, still applies) and the range error
 * is surfaced — the current view is shown rather than altered.
 *
 * Every user-visible string comes from the `@chinooz/i18n` EN/NE catalogs
 * (Req 10.1), and all styling uses `@chinooz/theme` token utility classes only
 * (Req 11.1).
 *
 * _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7_
 */

import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { resources } from '@chinooz/i18n'
import { Card, EmptyState, Heading, Text } from '@chinooz/ui-web'

import {
  type AuditFilter,
  validateAuditDateRange,
} from '@/lib/admin-core/audit'
import { resolveLocale } from '@/lib/admin-core/i18n'
import { canPerform } from '@/lib/admin-core/rbac'
import { mockAdminApi } from '@/lib/api/mock'
import { readSession } from '@/lib/session'
import AuditFilters from '@/components/AuditFilters'

/** Reads a single-valued query parameter, ignoring multi-valued inputs. */
function readSingle(value: string | string[] | undefined): string | undefined {
  const single = typeof value === 'string' ? value : undefined
  return single !== undefined && single.length > 0 ? single : undefined
}

/** Parses the 1-based `page` parameter, defaulting to 1 for absent/invalid input. */
function parsePage(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(readSingle(value) ?? '', 10)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
}

/** Builds an `/audit` href carrying the active filters and the given page. */
function auditHref(
  actor: string | undefined,
  start: string | undefined,
  end: string | undefined,
  page: number,
): string {
  const params = new URLSearchParams()
  if (actor !== undefined) params.set('actor', actor)
  if (start !== undefined) params.set('start', start)
  if (end !== undefined) params.set('end', end)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query.length > 0 ? `/audit?${query}` : '/audit'
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    actor?: string | string[]
    start?: string | string[]
    end?: string | string[]
    page?: string | string[]
  }>
}) {
  // Defense in depth: re-check session + Super_Admin-only permission even though
  // middleware guards the route (Req 9.4).
  const session = await readSession()
  if (session === null) redirect('/login?next=/audit')
  if (!canPerform(session.roles, 'audit.view')) redirect('/forbidden')

  const locale = resolveLocale((await cookies()).get('chinooz-locale')?.value)
  const t = resources[locale].translation.admin
  const audit = t.audit

  const params = await searchParams
  const actor = readSingle(params.actor)
  const start = readSingle(params.start)
  const end = readSingle(params.end)
  const requestedPage = parsePage(params.page)

  // Re-validate a manually-crafted date range (Req 9.6). When both bounds are
  // present and start is after end, drop the date filter and surface the range
  // error — the current view is shown rather than altered.
  let rangeError = false
  let applyRange = start !== undefined && end !== undefined
  if (applyRange && !validateAuditDateRange(start as string, end as string).ok) {
    rangeError = true
    applyRange = false
  }

  // Build the filter applied to the query. Actor matches exactly; the date
  // range is normalized to whole-day instant bounds so the inclusive end day is
  // fully covered.
  const filter: AuditFilter = {}
  if (actor !== undefined) filter.actorId = actor
  if (applyRange) {
    filter.start = `${start as string}T00:00:00.000Z`
    filter.end = `${end as string}T23:59:59.999Z`
  }

  // Filtering, most-recent-first ordering, and 50-per-page pagination are all
  // applied by the pure core helpers behind the AdminApi (Req 9.3 / 9.5 / 9.7).
  const result = await mockAdminApi.audit.query(filter, requestedPage)
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))
  const isFiltered = actor !== undefined || applyRange

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <Heading variant="h2" testID="admin-audit-title">
          {audit.title}
        </Heading>
        <Text variant="caption" className="text-text-muted">
          {audit.subtitle}
        </Text>
      </header>

      {/* Actor + date-range filters (Req 9.5). Invalid ranges are rejected in
          the island without navigating (Req 9.6). */}
      <AuditFilters
        labels={{
          filters: audit.filterRange,
          actor: audit.actor,
          actorPlaceholder: audit.actorPlaceholder,
          startDate: audit.startDate,
          endDate: audit.endDate,
          apply: audit.apply,
          clear: audit.clear,
          rangeError: audit.rangeError,
        }}
        initialActor={actor ?? ''}
        initialStart={start ?? ''}
        initialEnd={end ?? ''}
      />

      {/* Server-side range error for a manually-crafted invalid URL (Req 9.6). */}
      {rangeError && (
        <p
          role="alert"
          className="rounded-xl border border-error bg-error/15 px-3 py-2 text-sm text-error"
          data-testid="admin-audit-server-range-error"
        >
          {audit.rangeError}
        </p>
      )}

      {result.items.length === 0 ? (
        // Empty-result indication (Req 9.7).
        <EmptyState
          title={isFiltered ? audit.emptyFiltered : audit.empty}
          testID="admin-audit-empty"
        />
      ) : (
        <>
          <Card padded={false}>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="px-4 py-3 text-sm font-semibold text-text-muted">
                    {audit.timestamp}
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-text-muted">
                    {audit.actor}
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-text-muted">
                    {audit.action}
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-text-muted">
                    {audit.target}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-border-light last:border-0 hover:bg-background"
                  >
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {record.timestamp}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text">
                      {record.actorId}
                    </td>
                    <td className="px-4 py-3 text-sm text-text">
                      {record.actionType}
                    </td>
                    <td className="px-4 py-3 text-sm text-text">
                      {record.entityId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Pager (Req 9.3) — preserves the active filters. */}
          <div className="flex items-center justify-between">
            <Text variant="caption" className="text-text-muted">
              {t.pagination.page} {result.page} {t.pagination.of} {totalPages}
            </Text>
            <div className="flex gap-2">
              {result.page > 1 && (
                <Link
                  href={auditHref(actor, start, end, result.page - 1)}
                  className="flex h-9 items-center rounded-md bg-surface px-3 text-sm font-medium text-text hover:bg-background"
                  data-testid="admin-audit-prev"
                >
                  {t.pagination.previous}
                </Link>
              )}
              {result.page < totalPages && (
                <Link
                  href={auditHref(actor, start, end, result.page + 1)}
                  className="flex h-9 items-center rounded-md bg-surface px-3 text-sm font-medium text-text hover:bg-background"
                  data-testid="admin-audit-next"
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
