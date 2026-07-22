/**
 * Admin-core authentication domain logic.
 *
 * Pure helpers backing the Auth_Service (Requirement 1). No I/O, no React, no
 * cookies, no fetch — plain typed inputs and outputs. Session and lockout
 * persistence live in the surrounding `AdminApi` layer; this module only
 * computes decisions and derives values.
 *
 * Time is expressed as epoch milliseconds (`now: number`) for arithmetic;
 * persisted timestamps on domain records use ISO UTC strings.
 *
 * See design.md "Auth_Service" and Correctness Properties 1, 2, 3, and 25.
 */

import type { AdminSession, AuditRecord, LockoutState } from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Idle-timeout window for a session: 30 minutes (Req 1.5). */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000

/** Sliding window in which repeated failures accumulate: 15 minutes (Req 1.7). */
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000

/** Lock duration once the failure threshold is reached: 15 minutes (Req 1.7). */
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000

/** Consecutive failures within the window that trigger a lock (Req 1.7). */
export const MAX_FAILURES = 5

/** Safe in-app destination used when a requested redirect is untrusted. */
export const DEFAULT_REDIRECT = '/'

/** Authentication event kinds recorded in the Audit_Log (Req 1.6 / 1.8). */
export type AuthAuditKind = 'login_success' | 'login_failure'

/** Empty lockout state for a fresh account. */
export const EMPTY_LOCKOUT_STATE: LockoutState = { failures: [] }

// ---------------------------------------------------------------------------
// Login route + redirect safety (Req 1.1 — Property 1)
// ---------------------------------------------------------------------------

/**
 * Builds the login route that preserves the originally requested in-app path
 * so the visitor can be returned there after authenticating (Req 1.1).
 *
 * Produces `/login?next=<encoded path>` where the path is percent-encoded so
 * it survives transport as a single query-parameter value.
 */
export function buildLoginRoute(requestedPath: string): string {
  return `/login?next=${encodeURIComponent(requestedPath)}`
}

/**
 * Validates and sanitizes a post-login `next` target down to a safe in-app
 * path, preventing open-redirect attacks (Property 1).
 *
 * `next` is expected to be the URL-decoded value of the `next` query parameter
 * (i.e. what `URLSearchParams.get('next')` returns for a route built by
 * {@link buildLoginRoute}). A value is accepted only when it is an absolute,
 * in-app path: it must begin with a single `/` and must not be a
 * protocol-relative URL (`//host`), contain a scheme (`://`), use backslashes
 * (which some browsers normalise to `/`), or contain control characters. Any
 * external or malformed target resolves to {@link DEFAULT_REDIRECT}.
 */
export function resolvePostLoginRedirect(
  next: string | null | undefined,
): string {
  if (!next) return DEFAULT_REDIRECT
  // Must be an absolute in-app path.
  if (!next.startsWith('/')) return DEFAULT_REDIRECT
  // Protocol-relative URL such as "//evil.com".
  if (next.startsWith('//')) return DEFAULT_REDIRECT
  // Backslashes can be normalised to "/" by browsers ("/\evil.com").
  if (next.includes('\\')) return DEFAULT_REDIRECT
  // Embedded scheme such as "/redirect?u=https://evil.com" is still rejected
  // as a precaution against open redirects.
  if (next.includes('://')) return DEFAULT_REDIRECT
  // Control characters are never valid in a path.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(next)) return DEFAULT_REDIRECT
  return next
}

// ---------------------------------------------------------------------------
// Session idle expiry (Req 1.5 — Property 2)
// ---------------------------------------------------------------------------

/**
 * Returns true exactly when the session has been idle for at least `idleMs`,
 * i.e. when `now - session.lastSeenAt >= idleMs` (Property 2). `now` and the
 * parsed `lastSeenAt` are epoch milliseconds.
 */
export function isSessionExpired(
  session: AdminSession,
  now: number,
  idleMs: number = IDLE_TIMEOUT_MS,
): boolean {
  const lastSeen = Date.parse(session.lastSeenAt)
  return now - lastSeen >= idleMs
}

// ---------------------------------------------------------------------------
// Login lockout (Req 1.7 — Property 3)
// ---------------------------------------------------------------------------

/**
 * Records a failed authentication attempt at `now` (epoch ms) and returns the
 * next {@link LockoutState}. The input state is not mutated.
 *
 * Failures that can no longer contribute to an active lock are pruned: any
 * failure older than one window plus one lock duration before `now` is
 * irrelevant, because the triggering failure of an active lock must lie within
 * the last lock duration and its window-mates within one further window.
 * Pruning keeps the state bounded without affecting {@link isLocked} for
 * `now` values that do not move backwards in time.
 */
export function registerFailure(state: LockoutState, now: number): LockoutState {
  const cutoff = now - (LOCKOUT_WINDOW_MS + LOCKOUT_DURATION_MS)
  const kept = state.failures.filter((t) => t >= cutoff)
  const failures = [...kept, now].sort((a, b) => a - b)
  return { failures }
}

/**
 * Returns true when the account is locked at `now` (epoch ms).
 *
 * The account is locked when some failure (the "triggering" failure) has at
 * least {@link MAX_FAILURES} failures — including itself — within the
 * preceding {@link LOCKOUT_WINDOW_MS} window, and `now` falls within the
 * lock period `[triggering, triggering + LOCKOUT_DURATION_MS)` that the
 * triggering failure opens. Timelines with fewer than {@link MAX_FAILURES}
 * failures in any window never lock (Property 3).
 */
export function isLocked(state: LockoutState, now: number): boolean {
  const failures = state.failures
  for (let j = 0; j < failures.length; j++) {
    const triggering = failures[j]
    let countInWindow = 0
    for (let i = 0; i <= j; i++) {
      if (triggering - failures[i] <= LOCKOUT_WINDOW_MS) countInWindow++
    }
    if (
      countInWindow >= MAX_FAILURES &&
      now >= triggering &&
      now < triggering + LOCKOUT_DURATION_MS
    ) {
      return true
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// Audit records for authentication events (Req 1.6 / 1.8 — Property 25)
// ---------------------------------------------------------------------------

/**
 * Formats an epoch-millisecond instant as an ISO UTC timestamp at second
 * precision with no sub-second component (e.g. `2024-01-01T00:00:00Z`).
 */
function toUtcSecondTimestamp(now: number): string {
  const truncated = Math.floor(now / 1000) * 1000
  return new Date(truncated).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/**
 * Builds an {@link AuditRecord} for an authentication event (Req 1.6 success,
 * Req 1.8 failure). The record carries the acting account identity, the action
 * type, the affected entity identifier, and a UTC second-precision timestamp
 * (Property 25). `now` is epoch milliseconds.
 */
export function buildAuthAuditRecord(
  kind: AuthAuditKind,
  identifier: string,
  now: number,
): AuditRecord {
  const timestamp = toUtcSecondTimestamp(now)
  return {
    id: `${kind}:${identifier}:${timestamp}`,
    actorId: identifier,
    actionType: kind,
    entityId: identifier,
    timestamp,
  }
}
