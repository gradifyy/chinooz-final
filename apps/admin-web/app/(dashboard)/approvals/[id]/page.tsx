/**
 * Approval detail page (Server Component) — Approval_Module detail view.
 *
 * Displays the submitted details and documents for a selected
 * Verification_Request (Req 4.2) and, while the request is still `pending`,
 * surfaces the approve/reject controls via the `ApprovalDecision` client
 * island.
 *
 * Document-retrieval failure handling (Req 4.3): the documents are fetched
 * separately through `AdminApi.approvals.getDocuments`. When that retrieval
 * fails (or the documents cannot be located), the page renders an error
 * indication in place of the document list and otherwise leaves the request
 * untouched — no decision is made, so the request stays in its `pending`
 * status. The submitted details and the decision controls remain available.
 *
 * Server-first: only the decision controls are a client island. The active
 * locale is resolved from the `chinooz-locale` cookie (defaulting to English)
 * and every user-visible string comes from the `@chinooz/i18n` EN/NE catalogs
 * (Req 10.1). All presentation uses `@chinooz/ui-web` primitives and
 * `@chinooz/theme` token utility classes only — no hard-coded literals
 * (Req 11.1).
 *
 * _Requirements: 4.1, 4.2, 4.3_
 */

import { cookies } from 'next/headers'
import Link from 'next/link'
import { resources } from '@chinooz/i18n'
import { Badge, Card, Heading, Text } from '@chinooz/ui-web'

import { resolveLocale, type Locale } from '@/lib/admin-core/i18n'
import { mockAdminApi } from '@/lib/api/mock'
import type {
  RequesterType,
  VerificationStatus,
} from '@/lib/admin-core/types'
import ApprovalDecision from '@/components/ApprovalDecision'

/**
 * Formats an ISO-UTC timestamp as a stable, locale-independent display string
 * (`YYYY-MM-DD HH:mm UTC`), matching the list page so the two views agree.
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

/** Resolves the localized label for a requester type (Req 4.1 / 4.2). */
function requesterTypeLabel(
  type: RequesterType,
  labels: { typeSeller: string; typeRider: string },
): string {
  return type === 'seller' ? labels.typeSeller : labels.typeRider
}

/** Resolves the localized label and badge variant for a request status. */
function statusDisplay(
  status: VerificationStatus,
  labels: {
    statusPending: string
    statusApproved: string
    statusRejected: string
  },
): { label: string; variant: 'warning' | 'success' | 'error' } {
  if (status === 'approved') {
    return { label: labels.statusApproved, variant: 'success' }
  }
  if (status === 'rejected') {
    return { label: labels.statusRejected, variant: 'error' }
  }
  return { label: labels.statusPending, variant: 'warning' }
}

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const locale: Locale = resolveLocale(
    (await cookies()).get('chinooz-locale')?.value,
  )
  const t = resources[locale].translation.admin.approvals
  const common = resources[locale].translation.admin.common

  const { id } = await params
  const found = await mockAdminApi.approvals.get(id)

  // Request itself could not be retrieved (missing or retrieval failure).
  if (!found.ok) {
    return (
      <section className="flex flex-col gap-6 p-6">
        <BackLink href="/approvals" label={t.backToList} />
        <Card testID="admin-approval-not-found">
          <Text variant="body" className="text-text-muted">
            {t.notFound}
          </Text>
        </Card>
      </section>
    )
  }

  const request = found.data
  const status = statusDisplay(request.status, t)

  // Documents are fetched separately so a retrieval failure shows an error
  // indication without affecting the request's pending status (Req 4.3).
  const docs = await mockAdminApi.approvals.getDocuments(id)

  return (
    <section
      className="flex flex-col gap-6 p-6"
      aria-labelledby="approval-detail-title"
    >
      <BackLink href="/approvals" label={t.backToList} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading variant="h2" testID="admin-approval-detail-title">
          <span id="approval-detail-title">{t.detailTitle}</span>
        </Heading>
        <Badge
          variant={status.variant}
          label={status.label}
          testID="admin-approval-status"
        />
      </div>

      {/* Submitted details (Req 4.2) */}
      <Card testID="admin-approval-details">
        <Heading variant="h4" className="mb-3">
          {t.submittedDetails}
        </Heading>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailField label={t.requester} value={request.requesterId} />
          <DetailField
            label={t.requesterType}
            value={requesterTypeLabel(request.requesterType, t)}
          />
          <DetailField label={common.id} value={request.id} />
          <DetailField
            label={t.submittedOn}
            value={formatSubmittedAt(request.submittedAt)}
          />
        </dl>
        {request.status === 'rejected' &&
          request.rejectionReason !== undefined && (
            <div className="mt-4">
              <DetailField
                label={t.rejectReason}
                value={request.rejectionReason}
              />
            </div>
          )}
      </Card>

      {/* Documents (Req 4.2) with retrieval-failure error state (Req 4.3) */}
      <Card testID="admin-approval-documents">
        <Heading variant="h4" className="mb-3">
          {t.documents}
        </Heading>
        {!docs.ok ? (
          <p
            role="alert"
            className="rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error"
            data-testid="admin-approval-documents-error"
          >
            {t.documentsError}
          </p>
        ) : docs.data.length === 0 ? (
          <Text variant="body" className="text-text-muted">
            {t.noDocuments}
          </Text>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="admin-approval-documents-list">
            {docs.data.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border-light px-3 py-2"
              >
                <Text variant="body" className="text-text">
                  {doc.label}
                </Text>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-primary underline"
                  data-testid={`admin-approval-document-${doc.id}`}
                >
                  {t.viewDocument}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Decision controls — only while pending (Req 4.4–4.7) */}
      {request.status === 'pending' ? (
        <Card testID="admin-approval-actions">
          <ApprovalDecision
            requestId={request.id}
            labels={{
              approve: t.approve,
              reject: t.reject,
              rejectSubmit: t.rejectSubmit,
              rejectReason: t.rejectReason,
              rejectReasonPlaceholder: t.rejectReasonPlaceholder,
              cancel: common.cancel,
              reasonRequired:
                resources[locale].translation.admin.validation.reasonRequired,
              reasonTooLong:
                resources[locale].translation.admin.validation.reasonTooLong,
              alreadyProcessed: t.alreadyProcessed,
              actionError: t.actionError,
            }}
          />
        </Card>
      ) : (
        <Card testID="admin-approval-processed">
          <Text variant="body" className="text-text-muted">
            {t.alreadyProcessed}
          </Text>
        </Card>
      )}
    </section>
  )
}

/** A single labeled detail field rendered as a definition-list pair. */
function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm font-medium text-text-muted">{label}</dt>
      <dd className="text-base text-text">{value}</dd>
    </div>
  )
}

/** Back-to-list link styled with tokens only. */
function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center text-sm font-semibold text-primary hover:underline"
      data-testid="admin-approval-back"
    >
      {label}
    </Link>
  )
}
