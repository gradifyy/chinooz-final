'use client'

/**
 * Audit-log filter controls (client island) — Audit_Log (Requirement 9).
 *
 * The interactive surface of the audit route. The surrounding page is a Server
 * Component that re-checks the Super_Admin-only `audit.view` permission, reads
 * the actor / date-range / page parameters from the request, and renders the
 * most-recent-first, 50-per-page table server-side (Req 9.3 / 9.5). This island
 * owns only the filter inputs and how a filter selection is applied:
 *
 * - Actor and date-range filters (Req 9.5): the actor identity, start day, and
 *   end day are bound to inputs; applying them navigates to `/audit` with the
 *   selected query parameters (resetting to page 1), which re-runs the server
 *   query.
 * - Invalid range (Req 9.6): when the start day is after the end day, the
 *   selection is rejected with an inline error message and NO navigation is
 *   issued — so the current server-rendered view is left unaltered.
 * - Clear: removes all filters by navigating to `/audit`.
 *
 * The range validity check reuses the pure `validateAuditDateRange` from
 * `lib/admin-core/audit` — the single source of truth, never re-encoded here.
 * Every user-visible string is resolved against `@chinooz/i18n` by the server
 * page and passed in as props, so this island holds no hard-coded strings
 * (Req 10.1). Presentation uses `@chinooz/ui-web` primitives and
 * `@chinooz/theme` token utility classes only — no hard-coded
 * color/dimension literals (Req 11.1).
 *
 * _Requirements: 9.5, 9.6_
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@chinooz/ui-web'

import { validateAuditDateRange } from '@/lib/admin-core/audit'

interface AuditFilterLabels {
  /** Legend for the filter fieldset. */
  filters: string
  /** Label/placeholder for the actor-identity input. */
  actor: string
  /** Placeholder text for the actor-identity input. */
  actorPlaceholder: string
  /** Label for the start-day field. */
  startDate: string
  /** Label for the end-day field. */
  endDate: string
  /** Apply-filters button label. */
  apply: string
  /** Clear-filters button label. */
  clear: string
  /** Invalid-range error message, shown when start day is after end day (Req 9.6). */
  rangeError: string
}

interface AuditFiltersProps {
  /** Pre-localized, user-visible labels resolved by the server page. */
  labels: AuditFilterLabels
  /** The actor filter currently reflected in the URL (empty when unset). */
  initialActor: string
  /** The start-day filter currently reflected in the URL (empty when unset). */
  initialStart: string
  /** The end-day filter currently reflected in the URL (empty when unset). */
  initialEnd: string
}

/**
 * Builds an `/audit` href carrying the selected actor / date-range filters.
 * Applying a filter always resets to page 1, so the page parameter is omitted.
 */
function auditHref(actor: string, start: string, end: string): string {
  const params = new URLSearchParams()
  if (actor.length > 0) params.set('actor', actor)
  if (start.length > 0) params.set('start', start)
  if (end.length > 0) params.set('end', end)
  const query = params.toString()
  return query.length > 0 ? `/audit?${query}` : '/audit'
}

export default function AuditFilters({
  labels,
  initialActor,
  initialStart,
  initialEnd,
}: AuditFiltersProps) {
  const router = useRouter()
  const [actor, setActor] = useState(initialActor)
  const [start, setStart] = useState(initialStart)
  const [end, setEnd] = useState(initialEnd)
  const [rangeError, setRangeError] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleApply() {
    // Reuse the pure validator (single source of truth for start ≤ end). When
    // both bounds are supplied and the range is invalid, reject without
    // navigating so the current server-rendered view is left unaltered (Req 9.6).
    if (start.length > 0 && end.length > 0) {
      const validation = validateAuditDateRange(start, end)
      if (!validation.ok) {
        setRangeError(true)
        return
      }
    }
    setRangeError(false)
    startTransition(() => {
      router.push(auditHref(actor.trim(), start, end))
    })
  }

  function handleClear() {
    setActor('')
    setStart('')
    setEnd('')
    setRangeError(false)
    startTransition(() => {
      router.push('/audit')
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-wrap items-end gap-4 rounded-2xl border border-border-light bg-surface p-4">
        <legend className="px-1 text-sm font-semibold text-text">
          {labels.filters}
        </legend>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">{labels.actor}</span>
          <input
            type="text"
            value={actor}
            placeholder={labels.actorPlaceholder}
            onChange={(event) => setActor(event.target.value)}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary"
            data-testid="admin-audit-actor"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">{labels.startDate}</span>
          <input
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary"
            data-testid="admin-audit-start"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">{labels.endDate}</span>
          <input
            type="date"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary"
            data-testid="admin-audit-end"
          />
        </label>

        <div className="flex gap-2">
          <Button
            variant="primary"
            size="md"
            disabled={isPending}
            loading={isPending}
            onPress={handleApply}
            testID="admin-audit-apply"
          >
            {labels.apply}
          </Button>
          <Button
            variant="secondary"
            size="md"
            disabled={isPending}
            onPress={handleClear}
            testID="admin-audit-clear"
          >
            {labels.clear}
          </Button>
        </div>
      </fieldset>

      {/* Invalid-range error (Req 9.6) — the current view below is left unaltered. */}
      {rangeError && (
        <p
          role="alert"
          className="rounded-xl border border-error bg-error/15 px-3 py-2 text-sm text-error"
          data-testid="admin-audit-range-error"
        >
          {labels.rangeError}
        </p>
      )}
    </div>
  )
}
