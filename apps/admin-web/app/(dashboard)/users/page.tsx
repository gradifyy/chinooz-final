/**
 * Marketplace users list page (Server Component).
 *
 * The User_Management_Module list view (Requirement 3). Server-first: it reads
 * the `page`, `type`, and `search` query parameters, re-checks the acting
 * administrator's permission (defense in depth), fetches the matching page of
 * marketplace users through the mock {@link AdminApi}, and renders the results
 * with the type filter, the search island, pagination, and the empty state.
 *
 * - Pagination at 25 records per page (Req 3.1) — the page size is owned by the
 *   API layer; this page renders previous/next navigation and a page indicator.
 * - Type filter by buyer / seller / rider (Req 3.2) — rendered as server links
 *   that set the `type` query parameter while preserving the active search.
 * - Search by name / phone / email with 2..100 length validation (Req 3.3 /
 *   3.4) — the interactive `UserSearch` island owns the input and the length
 *   message; this page also re-validates a manually-crafted `search` parameter
 *   (defense in depth) and ignores an out-of-range term, leaving the list
 *   unchanged and surfacing the allowed-length message.
 * - Empty state when no records match (Req 3.5).
 * - Each row links to the user detail page (Req 3.6).
 *
 * Defense in depth (design "Layering Rules"): although the middleware guards
 * the route, this page re-reads the session and re-checks `users.view` via the
 * pure `rbac.canPerform`, redirecting to `/login` or `/forbidden` if the check
 * fails. Every user-visible string comes from `@chinooz/i18n` (EN + NE) and all
 * styling from `@chinooz/theme` token utility classes (Req 10.1 / 11.1).
 *
 * _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
 */

import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { resources } from '@chinooz/i18n'
import { Badge, EmptyState, Heading, Text } from '@chinooz/ui-web'

import { resolveLocale } from '@/lib/admin-core/i18n'
import { canPerform } from '@/lib/admin-core/rbac'
import { validateSearchTerm } from '@/lib/admin-core/users'
import type { MarketplaceUser, UserType } from '@/lib/admin-core/types'
import { mockAdminApi } from '@/lib/api/mock'
import { readSession } from '@/lib/session'
import UserSearch from '@/components/users/UserSearch'

/** The selectable user-type filter values (Req 3.2). */
const USER_TYPES: readonly UserType[] = ['buyer', 'seller', 'rider']

/** Reads a single-valued query parameter, ignoring multi-valued inputs. */
function readSingle(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/** Coerces a raw `type` parameter to a known {@link UserType}, or undefined. */
function readType(value: string | string[] | undefined): UserType | undefined {
  const raw = readSingle(value)
  return USER_TYPES.find((type) => type === raw)
}

/** Parses the 1-based `page` parameter, defaulting to 1 for absent/invalid input. */
function readPage(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(readSingle(value) ?? '', 10)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1
}

/** Fills `{{name}}` placeholders in a localized template. */
function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) =>
    key in vars ? String(vars[key]) : `{{${key}}}`,
  )
}

/** Builds a `/users` URL with the given type, search, and page parameters. */
function buildUrl(params: {
  type?: UserType
  search?: string
  page?: number
}): string {
  const query = new URLSearchParams()
  if (params.type !== undefined) query.set('type', params.type)
  if (params.search !== undefined && params.search.length > 0) {
    query.set('search', params.search)
  }
  if (params.page !== undefined && params.page > 1) {
    query.set('page', String(params.page))
  }
  const queryString = query.toString()
  return queryString.length > 0 ? `/users?${queryString}` : '/users'
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[]
    type?: string | string[]
    search?: string | string[]
  }>
}) {
  // Defense in depth: re-check session + permission even though middleware guards.
  const session = await readSession()
  if (session === null) redirect('/login?next=/users')
  if (!canPerform(session.roles, 'users.view')) redirect('/forbidden')

  const locale = resolveLocale((await cookies()).get('chinooz-locale')?.value)
  const t = resources[locale].translation.admin
  const tu = t.users

  const params = await searchParams
  const activeType = readType(params.type)
  const rawSearch = readSingle(params.search)
  const requestedPage = readPage(params.page)

  // Re-validate a manually-crafted search parameter (Req 3.4). An out-of-range
  // term is ignored for fetching — the list is left unchanged — and the
  // allowed-length message is surfaced.
  let appliedSearch: string | undefined
  let searchError: string | null = null
  if (rawSearch !== undefined && rawSearch.length > 0) {
    const validation = validateSearchTerm(rawSearch)
    if (validation.ok) {
      appliedSearch = rawSearch
    } else {
      searchError = validation.reason === 'too_short' ? tu.searchTooShort : tu.searchTooLong
    }
  }

  const result = await mockAdminApi.users.list({
    type: activeType,
    searchTerm: appliedSearch,
    page: requestedPage,
  })

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))
  const hasPrevious = result.page > 1
  const hasNext = result.page < totalPages
  const isFiltered = activeType !== undefined || appliedSearch !== undefined

  // Localized labels per user type, for the filter row and the table cells.
  const typeLabel = (type: UserType): string =>
    type === 'buyer' ? tu.typeBuyer : type === 'seller' ? tu.typeSeller : tu.typeRider

  return (
    <div className="flex flex-col gap-6 p-6">
      <Heading variant="h2" testID="admin-users-title">
        {tu.title}
      </Heading>

      {/* Type filter (Req 3.2): server links preserving the active search. */}
      <nav aria-label={tu.filterType} className="flex flex-wrap gap-2">
        <Link
          href={buildUrl({ search: appliedSearch })}
          aria-current={activeType === undefined ? 'page' : undefined}
          className={`flex h-9 items-center rounded-full px-4 text-sm font-medium ${
            activeType === undefined
              ? 'bg-primary text-white'
              : 'bg-surface text-text-muted hover:text-text'
          }`}
        >
          {tu.typeAll}
        </Link>
        {USER_TYPES.map((type) => (
          <Link
            key={type}
            href={buildUrl({ type, search: appliedSearch })}
            aria-current={activeType === type ? 'page' : undefined}
            className={`flex h-9 items-center rounded-full px-4 text-sm font-medium ${
              activeType === type
                ? 'bg-primary text-white'
                : 'bg-surface text-text-muted hover:text-text'
            }`}
          >
            {typeLabel(type)}
          </Link>
        ))}
      </nav>

      {/* Search island (Req 3.3 / 3.4). */}
      <UserSearch
        labels={{
          placeholder: tu.searchPlaceholder,
          label: t.common.search,
          submit: tu.searchSubmit,
          clear: tu.searchClear,
          tooShort: tu.searchTooShort,
          tooLong: tu.searchTooLong,
        }}
        initialTerm={appliedSearch ?? ''}
        activeType={activeType}
      />

      {/* Server-side validation message for a manually-crafted invalid term. */}
      {searchError !== null && (
        <Text variant="caption" className="text-error" testID="admin-users-search-error">
          {searchError}
        </Text>
      )}

      {result.total === 0 ? (
        <EmptyState
          title={isFiltered ? tu.emptyFiltered : tu.empty}
          testID="admin-users-empty"
        />
      ) : (
        <>
          <Text
            variant="caption"
            className="text-text-muted"
            testID="admin-users-results-count"
          >
            {fill(tu.resultsCount, { shown: result.items.length, total: result.total })}
          </Text>

          <div className="overflow-x-auto rounded-2xl border border-border-light">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border-light bg-surface">
                  <th scope="col" className="px-4 py-3 font-semibold text-text">
                    {tu.colName}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-text">
                    {tu.colType}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-text">
                    {tu.colPhone}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-text">
                    {tu.colEmail}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-text">
                    {tu.colStatus}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((user: MarketplaceUser) => (
                  <tr
                    key={user.id}
                    className="border-b border-border-light last:border-0 hover:bg-surface"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/users/${user.id}`}
                        className="font-medium text-primary hover:underline"
                        data-testid={`admin-users-row-${user.id}`}
                      >
                        {user.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{typeLabel(user.type)}</td>
                    <td className="px-4 py-3 text-text-muted">{user.phone}</td>
                    <td className="px-4 py-3 text-text-muted">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge
                        label={
                          user.status === 'active' ? tu.statusActive : tu.statusSuspended
                        }
                        variant={user.status === 'active' ? 'success' : 'error'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination (Req 3.1). */}
          <div className="flex items-center justify-between">
            {hasPrevious ? (
              <Link
                href={buildUrl({
                  type: activeType,
                  search: appliedSearch,
                  page: result.page - 1,
                })}
                className="flex h-9 items-center rounded-md bg-surface px-4 text-sm font-medium text-text hover:bg-primary-50"
                data-testid="admin-users-prev"
              >
                {tu.previousPage}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="flex h-9 items-center rounded-md px-4 text-sm font-medium text-text-muted opacity-50"
              >
                {tu.previousPage}
              </span>
            )}

            <Text variant="caption" className="text-text-muted" testID="admin-users-page-status">
              {fill(tu.pageStatus, { page: result.page, pages: totalPages })}
            </Text>

            {hasNext ? (
              <Link
                href={buildUrl({
                  type: activeType,
                  search: appliedSearch,
                  page: result.page + 1,
                })}
                className="flex h-9 items-center rounded-md bg-surface px-4 text-sm font-medium text-text hover:bg-primary-50"
                data-testid="admin-users-next"
              >
                {tu.nextPage}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="flex h-9 items-center rounded-md px-4 text-sm font-medium text-text-muted opacity-50"
              >
                {tu.nextPage}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
