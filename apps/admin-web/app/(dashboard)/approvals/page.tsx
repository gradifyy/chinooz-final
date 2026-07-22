/**
 * Approvals list page (Server Component) — Approval_Module list view.
 *
 * Renders the pending Verification_Request records, each showing the requester
 * identity, requester type, and submission timestamp (Req 4.1). Requests that
 * have been approved or rejected are excluded by the pure `pendingOnly` helper
 * applied inside `AdminApi.approvals.listPending`, so a decided request leaves
 * the list (Req 4.8). Each row links to the detail page where the request can
 * be reviewed and decided.
 *
 * Server-first: this segment performs no client interactivity of its own — the
 * approve/reject controls live on the detail page as a client island. The
 * active locale is resolved from the `chinooz-locale` cookie (defaulting to
 * English) and every user-visible string comes from the `@chinooz/i18n` EN/NE
 * catalogs (Req 10.1). All presentation uses `@chinooz/ui-web` primitives and
 * `@chinooz/theme` token utility classes only — no hard-coded literals
 * (Req 11.1).
 *
 * _Requirements: 4.1, 4.2_
 */

import { cookies } from 'next/headers'
import Link from 'next/link'
import { resources } from '@chinooz/i18n'
import { Badge, Card, EmptyState, Heading, Text } from '@chinooz/ui-web'

import { resolveLocale, type Locale } from '@/lib/admin-core/i18n'
import { mockAdminApi } from '@/lib/api/mock'
import type { RequesterType } from '@/lib/admin-core/types'

/** First (and, for the mock seed, only) page of the pending list. */
const FIRST_PAGE = 1

/**
 * Formats an ISO-UTC timestamp as a stable, locale-independent display string
 * (`YYYY-MM-DD HH:mm UTC`). Deterministic so the server render never depends on
 * the host's ICU data or timezone, avoiding any hydration drift.
 */
function formatSubmittedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const pad = (n: number): string => String(n).padStart(2, '0')
  const y = date.getUTCFullYear()
  const mo = pad(date.getUTCMonth() + 1)
  const d = pad(date.getUTCDate())
  const h = pad(date.getUTCHours())
  const mi = pad(date.getUTCMinutes())
  return `${y}-${mo}-${d} ${h}:${mi} UTC`
}

/** Resolves the localized label for a requester type (Req 4.1). */
function requesterTypeLabel(
  type: RequesterType,
  labels: { typeSeller: string; typeRider: string },
): string {
  return type === 'seller' ? labels.typeSeller : labels.typeRider
}

export default async function ApprovalsPage() {
  const locale: Locale = resolveLocale(
    (await cookies()).get('chinooz-locale')?.value,
  )
  const t = resources[locale].translation.admin.approvals

  const page = await mockAdminApi.approvals.listPending(FIRST_PAGE)
  const requests = page.items

  return (
    <section className="flex flex-col gap-6 p-6" aria-labelledby="approvals-title">
      <Heading variant="h2" testID="admin-approvals-title">
        <span id="approvals-title">{t.pendingTitle}</span>
      </Heading>

      {requests.length === 0 ? (
        <EmptyState title={t.empty} testID="admin-approvals-empty" />
      ) : (
        <ul className="flex flex-col gap-3" data-testid="admin-approvals-list">
          {requests.map((request) => (
            <li key={request.id}>
              <Link
                href={`/approvals/${request.id}`}
                className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid={`admin-approvals-row-${request.id}`}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1">
                      <Text variant="label" className="text-text">
                        {request.requesterId}
                      </Text>
                      <Text variant="caption" className="text-text-muted">
                        {t.submittedOn} {formatSubmittedAt(request.submittedAt)}
                      </Text>
                    </div>
                    <Badge
                      variant="info"
                      label={requesterTypeLabel(request.requesterType, t)}
                      testID={`admin-approvals-type-${request.id}`}
                    />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
