/**
 * Admin-core audit-logging domain logic.
 *
 * Pure helpers backing the Audit_Log (Requirement 9). No I/O, no React, no
 * cookies, no fetch — plain typed inputs and outputs. Append persistence,
 * retry-with-preservation, retention, and append-only immutability live in the
 * surrounding `AuditApi` layer; this module only constructs records, formats
 * timestamps, validates date ranges, and derives filtered/paged views.
 *
 * Instants used for arithmetic are epoch milliseconds (`now: number`); the
 * persisted `timestamp` on an {@link AuditRecord} is an ISO UTC string at
 * second precision. Filter range bounds are compared via `Date.parse` so that
 * inclusivity is well-defined regardless of the bound's precision.
 *
 * See design.md "Audit_Log" and Correctness Properties 8, 9, 10, 13, and 25.
 */

import { paginate, sortByTimestampDesc } from './shared'
import type { AuditRecord, Page, ValidationResult } from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Page size for paginated audit-log views: 50 records per page (Req 9.3). */
export const AUDIT_PAGE_SIZE = 50

// ---------------------------------------------------------------------------
// Timestamp formatting (Req 9.1 — Property 25)
// ---------------------------------------------------------------------------

/**
 * Formats an instant as an ISO UTC timestamp at second precision with no
 * sub-second component (e.g. `2024-01-01T00:00:00Z`).
 *
 * Accepts either a {@link Date} or an epoch-millisecond `number`. The instant
 * is truncated down to the whole second before formatting, so equal seconds
 * always produce identical strings regardless of their millisecond remainder.
 * Satisfies Req 9.1 (Property 25).
 */
export function formatUtcSecond(date: Date | number): string {
  const ms = typeof date === 'number' ? date : date.getTime()
  const truncated = Math.floor(ms / 1000) * 1000
  return new Date(truncated).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

// ---------------------------------------------------------------------------
// Record construction (Req 9.1 — Property 25)
// ---------------------------------------------------------------------------

/**
 * Builds an {@link AuditRecord} for an administrative action.
 *
 * The record carries the acting account identity (`actorId`), the action type,
 * the affected entity identifier, and a UTC second-precision timestamp derived
 * from `now` (epoch milliseconds) via {@link formatUtcSecond} (Property 25).
 * The optional `details` map is included only when provided, mirroring the
 * shape of the persisted record. The `id` is composed deterministically from
 * the action type, entity, and timestamp, matching the pattern used by
 * `buildAuthAuditRecord` in `auth.ts`. Satisfies Req 9.1.
 */
export function buildAuditRecord(
  actorId: string,
  actionType: string,
  entityId: string,
  now: number,
  details?: Record<string, string>,
): AuditRecord {
  const timestamp = formatUtcSecond(now)
  const record: AuditRecord = {
    id: `${actionType}:${entityId}:${timestamp}`,
    actorId,
    actionType,
    entityId,
    timestamp,
  }
  if (details !== undefined) {
    record.details = details
  }
  return record
}

// ---------------------------------------------------------------------------
// Date-range validation (Req 9.6 — Property 13)
// ---------------------------------------------------------------------------

/**
 * Validates an inclusive audit date range. Returns `{ ok: true }` if and only
 * if `start` is on or before `end`; otherwise returns `{ ok: false, reason }`
 * describing the invalid range (Property 13).
 *
 * `start` and `end` are ISO date or datetime strings, compared as instants via
 * `Date.parse`. An unparseable bound is reported as invalid. Satisfies Req 9.6.
 */
export function validateAuditDateRange(
  start: string,
  end: string,
): ValidationResult {
  const startMs = Date.parse(start)
  const endMs = Date.parse(end)
  if (Number.isNaN(startMs)) {
    return { ok: false, reason: `Invalid start date: ${start}` }
  }
  if (Number.isNaN(endMs)) {
    return { ok: false, reason: `Invalid end date: ${end}` }
  }
  if (startMs > endMs) {
    return {
      ok: false,
      reason: `Start date ${start} is after end date ${end}`,
    }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Filtering (Req 9.5 — Properties 9 & 10)
// ---------------------------------------------------------------------------

/**
 * Optional criteria for narrowing an audit-record collection. Any subset of
 * fields may be supplied; an absent field imposes no constraint.
 */
export interface AuditFilter {
  /** When set, keep only records whose `actorId` equals this value exactly. */
  actorId?: string
  /** Inclusive lower bound (ISO date/datetime); keep records at or after it. */
  start?: string
  /** Inclusive upper bound (ISO date/datetime); keep records at or before it. */
  end?: string
}

/**
 * Returns exactly the audit records matching `filter`, ordered most-recent
 * first.
 *
 * A record matches when it satisfies every supplied criterion:
 * - `actorId` — the record's `actorId` equals the filter value.
 * - `start` — the record's instant is greater than or equal to `start`.
 * - `end` — the record's instant is less than or equal to `end`.
 *
 * Range bounds are compared as instants via `Date.parse`, so inclusivity is
 * well-defined irrespective of bound precision: a date-only bound such as
 * `2024-01-01` resolves to that day's midnight UTC, so it includes
 * `2024-01-01T00:00:00Z` and (as an `end`) excludes later times that day. An
 * unparseable bound matches nothing. Filtering is sound and complete — every
 * match is included and no non-match is included (Property 10) — and the
 * result is ordered most-recent-first by reusing {@link sortByTimestampDesc}
 * (Property 9). Non-mutating. Satisfies Req 9.5.
 */
export function filterRecords(
  records: readonly AuditRecord[],
  filter: AuditFilter,
): AuditRecord[] {
  const startMs = filter.start !== undefined ? Date.parse(filter.start) : undefined
  const endMs = filter.end !== undefined ? Date.parse(filter.end) : undefined

  const matched = records.filter((record) => {
    if (filter.actorId !== undefined && record.actorId !== filter.actorId) {
      return false
    }
    if (startMs !== undefined || endMs !== undefined) {
      const recordMs = Date.parse(record.timestamp)
      if (Number.isNaN(recordMs)) return false
      if (startMs !== undefined && (Number.isNaN(startMs) || recordMs < startMs)) {
        return false
      }
      if (endMs !== undefined && (Number.isNaN(endMs) || recordMs > endMs)) {
        return false
      }
    }
    return true
  })

  return sortByTimestampDesc(matched, 'timestamp')
}

// ---------------------------------------------------------------------------
// Paged views (Req 9.3 / 9.5 / 9.7 — Properties 8 & 9)
// ---------------------------------------------------------------------------

/**
 * Produces a most-recent-first, paginated view of audit records at
 * {@link AUDIT_PAGE_SIZE} (50) records per page (Req 9.3).
 *
 * When a `filter` is supplied, {@link filterRecords} is applied first (which
 * also sorts most-recent-first); otherwise the full collection is sorted via
 * {@link sortByTimestampDesc}. The sorted records are then paginated with the
 * shared {@link paginate} helper, which uses 1-based page numbering and clamps
 * `page` into the valid range. An empty (or fully filtered-out) collection
 * yields a page with zero items (Req 9.7). Non-mutating. Satisfies Req 9.3,
 * 9.5, and 9.7.
 */
export function pageAuditRecords(
  records: readonly AuditRecord[],
  page: number,
  filter?: AuditFilter,
): Page<AuditRecord> {
  const ordered =
    filter !== undefined
      ? filterRecords(records, filter)
      : sortByTimestampDesc(records, 'timestamp')
  return paginate(ordered, page, AUDIT_PAGE_SIZE)
}
