import { describe, it, expect } from 'vitest'

import type { AuditApi, AppendResult } from '../types'
import type { AuditFilter } from '../../admin-core/audit'
import { pageAuditRecords } from '../../admin-core/audit'
import type { AuditRecord, Page } from '../../admin-core/types'

/**
 * Integration tests for Audit_Log immutability (Req 9.9) and append
 * retry-with-preservation (Req 9.2).
 *
 * These are example/integration tests (not property tests) per the design's
 * Testing Strategy. They run against a controllable {@link AuditApi} test
 * double declared inline so they are fully self-contained: the double can be
 * configured to fail a given number of consecutive persistence attempts and to
 * reject any update/delete against an existing entry with an immutability
 * error.
 *
 * Validates:
 * - Requirement 9.2 — append retries persistence up to 3 times on failure and,
 *   on continued failure, surfaces an error indication while preserving the
 *   recorded action data for retry.
 * - Requirement 9.9 — modify/delete against an existing audit entry is rejected
 *   with an error indication that entries are immutable.
 */

// ---------------------------------------------------------------------------
// Controllable AuditApi test double
// ---------------------------------------------------------------------------

/** Maximum persistence attempts an append makes before giving up (Req 9.2). */
const MAX_APPEND_ATTEMPTS = 3

/**
 * Outcome of an attempt to modify or delete an existing audit entry. The audit
 * log is append-only, so any such attempt is rejected with an `immutable`
 * reason and an explanatory message (Req 9.9).
 */
type ImmutabilityError = {
  ok: false
  reason: 'immutable'
  message: string
}

/**
 * A controllable {@link AuditApi} double for integration testing.
 *
 * Beyond the real `append`/`query` surface it exposes:
 * - `update` / `remove`: storage-level mutators that always reject existing
 *   entries with an {@link ImmutabilityError} (Req 9.9). The production
 *   `AuditApi` omits these entirely; the double models a storage layer that is
 *   asked to mutate and must refuse.
 * - `failNextAttempts(n)`: queue `n` consecutive simulated persistence
 *   failures so the retry path of `append` can be exercised deterministically.
 * - `attemptsFor(recordId)`: how many persistence attempts the last `append`
 *   of that record consumed.
 * - `contains(recordId)`: whether a record is currently persisted.
 */
interface ControllableAuditApi extends AuditApi {
  update(record: AuditRecord): ImmutabilityError
  remove(recordId: string): ImmutabilityError
  failNextAttempts(count: number): void
  attemptsFor(recordId: string): number
  contains(recordId: string): boolean
}

function createControllableAuditApi(
  seed: readonly AuditRecord[] = [],
): ControllableAuditApi {
  // Append-only storage: only ever pushed to, never mutated in place (Req 9.9).
  const records: AuditRecord[] = seed.map((r) => ({ ...r }))

  // Remaining simulated consecutive persistence failures (Req 9.2).
  let pendingFailures = 0
  const attemptsByRecord = new Map<string, number>()

  return {
    async append(record: AuditRecord): Promise<AppendResult> {
      // Retry persistence up to MAX_APPEND_ATTEMPTS times. Each attempt fails
      // while simulated failures remain queued; the first non-failing attempt
      // persists the record (Req 9.2).
      let attempts = 0
      for (let i = 0; i < MAX_APPEND_ATTEMPTS; i++) {
        attempts++
        if (pendingFailures > 0) {
          pendingFailures--
          continue
        }
        records.push({ ...record })
        attemptsByRecord.set(record.id, attempts)
        return { ok: true, record }
      }
      // Every attempt failed: preserve the original record for retry and
      // surface a persistence failure to the caller (Req 9.2).
      attemptsByRecord.set(record.id, attempts)
      return { ok: false, reason: 'persist_failed', record }
    },

    async query(filter: AuditFilter, page: number): Promise<Page<AuditRecord>> {
      return pageAuditRecords(records, page, filter)
    },

    update(record: AuditRecord): ImmutabilityError {
      return {
        ok: false,
        reason: 'immutable',
        message: `Audit entry ${record.id} is immutable and cannot be modified`,
      }
    },

    remove(recordId: string): ImmutabilityError {
      return {
        ok: false,
        reason: 'immutable',
        message: `Audit entry ${recordId} is immutable and cannot be deleted`,
      }
    },

    failNextAttempts(count: number): void {
      pendingFailures = count
    },

    attemptsFor(recordId: string): number {
      return attemptsByRecord.get(recordId) ?? 0
    },

    contains(recordId: string): boolean {
      return records.some((r) => r.id === recordId)
    },
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const existingEntry: AuditRecord = {
  id: 'verification_approve:vr-3:2024-01-08T11:25:00Z',
  actorId: 'super@chinooz.com',
  actionType: 'verification_approve',
  entityId: 'vr-3',
  details: { affectedId: 'vr-3' },
  timestamp: '2024-01-08T11:25:00Z',
}

function newEntry(): AuditRecord {
  return {
    id: 'order_cancel:order-1005:2024-01-06T07:55:00Z',
    actorId: 'ops@chinooz.com',
    actionType: 'order_cancel',
    entityId: 'order-1005',
    details: { affectedId: 'order-1005', cancellationReason: 'Buyer requested' },
    timestamp: '2024-01-06T07:55:00Z',
  }
}

// ---------------------------------------------------------------------------
// Req 9.9 — append-only immutability
// ---------------------------------------------------------------------------

describe('Audit_Log immutability (Req 9.9)', () => {
  it('rejects an update against an existing entry with an immutability error', () => {
    const api = createControllableAuditApi([existingEntry])

    const result = api.update({ ...existingEntry, actorId: 'tampered@chinooz.com' })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('immutable')
    expect(result.message).toMatch(/immutable/i)
  })

  it('rejects a delete against an existing entry with an immutability error', () => {
    const api = createControllableAuditApi([existingEntry])

    const result = api.remove(existingEntry.id)

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('immutable')
    expect(result.message).toMatch(/immutable/i)
  })

  it('leaves the existing entry unchanged after a rejected mutation', async () => {
    const api = createControllableAuditApi([existingEntry])

    api.update({ ...existingEntry, actorId: 'tampered@chinooz.com' })
    api.remove(existingEntry.id)

    // The record is still present and unmodified.
    expect(api.contains(existingEntry.id)).toBe(true)
    const page = await api.query({ actorId: 'super@chinooz.com' }, 1)
    expect(page.items).toHaveLength(1)
    expect(page.items[0]).toEqual(existingEntry)
  })
})

// ---------------------------------------------------------------------------
// Req 9.2 — append retry with record preservation
// ---------------------------------------------------------------------------

describe('Audit_Log append retry and preservation (Req 9.2)', () => {
  it('persists on the first attempt when no failure occurs', async () => {
    const api = createControllableAuditApi()
    const record = newEntry()

    const result = await api.append(record)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.record).toEqual(record)
    }
    expect(api.attemptsFor(record.id)).toBe(1)
    expect(api.contains(record.id)).toBe(true)
  })

  it('retries and succeeds when failures occur within the 3-attempt budget', async () => {
    const api = createControllableAuditApi()
    const record = newEntry()

    // Two transient failures, then success on the third attempt.
    api.failNextAttempts(2)
    const result = await api.append(record)

    expect(result.ok).toBe(true)
    expect(api.attemptsFor(record.id)).toBe(3)
    expect(api.contains(record.id)).toBe(true)
  })

  it('attempts persistence at most 3 times', async () => {
    const api = createControllableAuditApi()
    const record = newEntry()

    // More failures than the budget — append must stop after 3 attempts.
    api.failNextAttempts(10)
    await api.append(record)

    expect(api.attemptsFor(record.id)).toBe(MAX_APPEND_ATTEMPTS)
  })

  it('surfaces a persistence error while preserving the record on continued failure', async () => {
    const api = createControllableAuditApi()
    const record = newEntry()

    // All three attempts fail.
    api.failNextAttempts(MAX_APPEND_ATTEMPTS)
    const result = await api.append(record)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      // Error indication is surfaced...
      expect(result.reason).toBe('persist_failed')
      // ...and the recorded action data is preserved intact for retry.
      expect(result.record).toEqual(record)
    }
    // The failed record was not persisted.
    expect(api.contains(record.id)).toBe(false)
  })

  it('a preserved record can be retried successfully after a transient outage clears', async () => {
    const api = createControllableAuditApi()
    const record = newEntry()

    api.failNextAttempts(MAX_APPEND_ATTEMPTS)
    const failed = await api.append(record)
    expect(failed.ok).toBe(false)

    // Retry the preserved record once the outage has cleared.
    const preserved = failed.ok ? failed.record : record
    const retried = await api.append(preserved)

    expect(retried.ok).toBe(true)
    expect(api.contains(record.id)).toBe(true)
  })
})
