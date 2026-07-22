import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import {
  DEFAULT_REDIRECT,
  IDLE_TIMEOUT_MS,
  LOCKOUT_DURATION_MS,
  LOCKOUT_WINDOW_MS,
  MAX_FAILURES,
  EMPTY_LOCKOUT_STATE,
  buildLoginRoute,
  isLocked,
  isSessionExpired,
  registerFailure,
  resolvePostLoginRedirect,
} from '../auth'
import { adminSessionArb } from './arbitraries'

/**
 * Property tests for the admin-core auth route helpers (`buildLoginRoute`,
 * `resolvePostLoginRedirect`).
 *
 * Each property runs a minimum of 100 iterations per the design Testing
 * Strategy.
 */

const RUNS = 100

// ---------------------------------------------------------------------------
// Route-specific arbitraries (auth open-redirect domain)
// ---------------------------------------------------------------------------

/** Characters that are safe inside a single in-app path segment. */
const segmentCharArb: fc.Arbitrary<string> = fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.~'.split(
    '',
  ),
)

/** A non-empty path segment (no `/`, `\`, `:`, or control characters). */
const pathSegmentArb: fc.Arbitrary<string> = fc
  .array(segmentCharArb, { minLength: 1, maxLength: 12 })
  .map((chars) => chars.join(''))

/** Characters allowed inside the optional query string. */
const queryCharArb: fc.Arbitrary<string> = fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyz0123456789=&-_. '.split(''),
)

/** An optional `?...` query string built from safe characters. */
const optionalQueryArb: fc.Arbitrary<string> = fc.option(
  fc
    .array(queryCharArb, { minLength: 1, maxLength: 24 })
    .map((chars) => `?${chars.join('')}`),
  { nil: '' },
)

/**
 * A safe, absolute in-app path: begins with a single `/`, never `//`, and
 * contains no scheme, backslash, or control characters. `/` (the bare root) is
 * included. These are exactly the values `resolvePostLoginRedirect` accepts
 * verbatim.
 */
const inAppPathArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.array(pathSegmentArb, { minLength: 0, maxLength: 5 }),
    optionalQueryArb,
  )
  .map(([segments, query]) => `/${segments.join('/')}${query}`)

/** A host-like token for building external targets. */
const hostArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
    minLength: 1,
    maxLength: 10,
  })
  .map((chars) => `${chars.join('')}.com`)

/** An absolute URL with an explicit scheme (e.g. `https://evil.com/x`). */
const absoluteUrlArb: fc.Arbitrary<string> = fc
  .tuple(fc.constantFrom('http', 'https', 'ftp'), hostArb, pathSegmentArb)
  .map(([scheme, host, seg]) => `${scheme}://${host}/${seg}`)

/** A protocol-relative URL (e.g. `//evil.com/x`). */
const protocolRelativeArb: fc.Arbitrary<string> = fc
  .tuple(hostArb, pathSegmentArb)
  .map(([host, seg]) => `//${host}/${seg}`)

/** A relative, non-app path that does not begin with `/` (e.g. `evil.com/x`). */
const nonAppPathArb: fc.Arbitrary<string> = fc
  .array(pathSegmentArb, { minLength: 1, maxLength: 4 })
  .map((segments) => segments.join('/'))

/** A leading-slash path whose second character is a backslash (`/\evil.com`). */
const backslashPathArb: fc.Arbitrary<string> = hostArb.map(
  (host) => `/\\${host}`,
)

/**
 * Any externally-formed / unsafe redirect target: absolute URL,
 * protocol-relative URL, non-app relative path, or a backslash-prefixed path.
 * Every one of these must resolve to the safe default rather than the external
 * destination.
 */
const externalTargetArb: fc.Arbitrary<string> = fc.oneof(
  absoluteUrlArb,
  protocolRelativeArb,
  nonAppPathArb,
  backslashPathArb,
)

/**
 * Reads the (URL-decoded) `next` query-parameter value out of a login route,
 * matching what `URLSearchParams.get('next')` yields for a route produced by
 * `buildLoginRoute`.
 */
function extractNext(loginRoute: string): string | null {
  const queryIndex = loginRoute.indexOf('?')
  const query = queryIndex === -1 ? '' : loginRoute.slice(queryIndex + 1)
  return new URLSearchParams(query).get('next')
}

// ---------------------------------------------------------------------------
// Property 1: Login route round-trip and redirect safety
// ---------------------------------------------------------------------------

describe('auth.buildLoginRoute / resolvePostLoginRedirect', () => {
  // Feature: admin-dashboard, Property 1: Login route round-trip and redirect safety
  // Validates: Requirements 1.1
  it('round-trips any in-app path through buildLoginRoute → resolvePostLoginRedirect, and resolves any external target to a safe in-app default', () => {
    fc.assert(
      fc.property(inAppPathArb, externalTargetArb, (inAppPath, external) => {
        // Half 1 — round-trip: the originally requested in-app path survives
        // being encoded into the login route's `next` parameter and decoded
        // back out, and `resolvePostLoginRedirect` returns it unchanged.
        const loginRoute = buildLoginRoute(inAppPath)
        expect(loginRoute.startsWith('/login?next=')).toBe(true)

        const next = extractNext(loginRoute)
        expect(next).toBe(inAppPath)
        expect(resolvePostLoginRedirect(next)).toBe(inAppPath)

        // Half 2 — redirect safety: an externally-formed target never leaks
        // through; it resolves to the safe in-app default instead.
        const resolved = resolvePostLoginRedirect(external)
        expect(resolved).toBe(DEFAULT_REDIRECT)
        // The default is itself a safe, absolute in-app path.
        expect(resolved.startsWith('/')).toBe(true)
        expect(resolved.startsWith('//')).toBe(false)
        expect(resolved).not.toBe(external)
      }),
      { numRuns: RUNS },
    )
  })
})

// ---------------------------------------------------------------------------
// Property 2: Session idle expiry boundary
// ---------------------------------------------------------------------------

/**
 * Idle windows to exercise: the production default (30 minutes) plus a spread
 * of other positive durations so the boundary logic is checked independently
 * of any single `idleMs`.
 */
const idleMsArb: fc.Arbitrary<number> = fc.oneof(
  fc.constant(IDLE_TIMEOUT_MS),
  fc.integer({ min: 1, max: 7 * 24 * 60 * 60 * 1000 }),
)

describe('auth.isSessionExpired', () => {
  // Feature: admin-dashboard, Property 2: Session idle expiry boundary
  // Validates: Requirements 1.5
  it('returns true exactly when now - lastSeenAt >= idleMs, and false otherwise', () => {
    fc.assert(
      fc.property(adminSessionArb, idleMsArb, (session, idleMs) => {
        const lastSeen = Date.parse(session.lastSeenAt)

        // A delta (in ms) added to lastSeenAt to obtain `now`, sampled across
        // the regions that matter: the exact boundary (== idleMs => expired),
        // just below it (not expired), just above it, the origin (0), and
        // values well above / below (including negatives, i.e. clock skew where
        // lastSeenAt is in the future).
        const deltaArb: fc.Arbitrary<number> = fc.oneof(
          fc.constant(idleMs), // exact boundary -> expired
          fc.constant(idleMs - 1), // just below -> not expired
          fc.constant(idleMs + 1), // just above -> expired
          fc.constant(0), // no idle time -> not expired
          fc.integer({ min: idleMs, max: idleMs + 60 * 60 * 1000 }), // well above
          fc.integer({ min: -60 * 60 * 1000, max: idleMs - 1 }), // below (incl. negative)
        )

        return fc.assert(
          fc.property(deltaArb, (delta) => {
            const now = lastSeen + delta
            const expected = now - lastSeen >= idleMs
            expect(isSessionExpired(session, now, idleMs)).toBe(expected)
            // Restated against the raw delta to make the boundary explicit:
            // expiry holds iff the idle gap has reached idleMs.
            expect(isSessionExpired(session, now, idleMs)).toBe(delta >= idleMs)
          }),
          { numRuns: RUNS },
        )
      }),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 2: Session idle expiry boundary
  // Validates: Requirements 1.5
  it('uses the 30-minute default idleMs when none is supplied', () => {
    fc.assert(
      fc.property(adminSessionArb, (session) => {
        const lastSeen = Date.parse(session.lastSeenAt)
        // At the exact 30-minute boundary the session is expired; one ms before
        // it is not.
        expect(isSessionExpired(session, lastSeen + IDLE_TIMEOUT_MS)).toBe(true)
        expect(isSessionExpired(session, lastSeen + IDLE_TIMEOUT_MS - 1)).toBe(
          false,
        )
      }),
      { numRuns: RUNS },
    )
  })
})

// ---------------------------------------------------------------------------
// Property 3: Login lockout after repeated failures
// ---------------------------------------------------------------------------

/**
 * Independent reference implementation of the lock condition, derived directly
 * from the Auth_Service specification (Req 1.7) rather than from the production
 * loop in `auth.ts`.
 *
 * An account is locked at `now` when some failure (the "triggering" failure)
 * has at least {@link MAX_FAILURES} failures — counting itself and every
 * earlier failure within the preceding {@link LOCKOUT_WINDOW_MS} window — and
 * `now` lies in the half-open lock period `[triggering, triggering + DURATION)`
 * that the triggering failure opens. Timelines that never accumulate
 * {@link MAX_FAILURES} failures inside any window never lock.
 */
function referenceLocked(failures: number[], now: number): boolean {
  for (const triggering of failures) {
    let countInWindow = 0
    for (const g of failures) {
      if (g <= triggering && triggering - g <= LOCKOUT_WINDOW_MS) {
        countInWindow++
      }
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

/** Folds a sequence of failure instants into a single `LockoutState`. */
function buildState(timeline: number[]) {
  return timeline.reduce(
    (state, t) => registerFailure(state, t),
    EMPTY_LOCKOUT_STATE,
  )
}

// ---------------------------------------------------------------------------
// Lockout-specific arbitraries
// ---------------------------------------------------------------------------

/** A base epoch-millisecond instant (years 2000..2030). */
const baseInstantArb: fc.Arbitrary<number> = fc.integer({
  min: Date.UTC(2000, 0, 1),
  max: Date.UTC(2030, 11, 31),
})

/**
 * A gap (ms) between consecutive failures, biased so that runs of failures
 * frequently cluster inside a single 15-minute window (small gaps) while still
 * sometimes spreading out beyond it (larger gaps). This makes locks occur for a
 * meaningful fraction of generated timelines without hand-tuning.
 */
const failureGapArb: fc.Arbitrary<number> = fc.oneof(
  { weight: 3, arbitrary: fc.integer({ min: 0, max: Math.floor(LOCKOUT_WINDOW_MS / 4) }) },
  { weight: 1, arbitrary: fc.integer({ min: 0, max: LOCKOUT_WINDOW_MS * 2 }) },
)

/**
 * An ascending timeline of failure instants: a base instant followed by a
 * cumulative sum of gaps. May be empty (no failures).
 */
const failureTimelineArb: fc.Arbitrary<number[]> = fc
  .tuple(baseInstantArb, fc.array(failureGapArb, { minLength: 0, maxLength: 12 }))
  .map(([base, gaps]) => {
    const failures: number[] = []
    let t = base
    for (const gap of gaps) {
      failures.push(t)
      t += gap
    }
    return failures
  })

/**
 * An offset (ms) used to anchor a sampled `now` around a chosen failure. Probes
 * the regions that matter: just before/at a failure, well inside the lock
 * period, and exactly around both edges of the lock window
 * `triggering + DURATION`.
 */
const lockOffsetArb: fc.Arbitrary<number> = fc.oneof(
  fc.constant(-1),
  fc.constant(0),
  fc.constant(1),
  fc.constant(LOCKOUT_DURATION_MS - 1),
  fc.constant(LOCKOUT_DURATION_MS),
  fc.constant(LOCKOUT_DURATION_MS + 1),
  fc.constant(-LOCKOUT_DURATION_MS),
  fc.integer({ min: 0, max: LOCKOUT_DURATION_MS }),
)

describe('auth.registerFailure / isLocked', () => {
  // Feature: admin-dashboard, Property 3: Login lockout after repeated failures
  // Validates: Requirements 1.7
  it('matches the spec lock condition for any folded failure timeline at any instant', () => {
    fc.assert(
      fc.property(
        failureTimelineArb,
        fc.nat(),
        lockOffsetArb,
        (timeline, idxSeed, offset) => {
          const state = buildState(timeline)

          // `registerFailure` never mutates its input.
          expect(EMPTY_LOCKOUT_STATE.failures).toEqual([])

          // Anchor `now` around one of the retained failures (or 0 when empty)
          // so the boundary offsets land on meaningful instants.
          const anchor =
            state.failures.length > 0
              ? state.failures[idxSeed % state.failures.length]
              : 0
          const now = anchor + offset

          // `isLocked` must agree with the independent reference computed over
          // exactly the failures the state retains.
          expect(isLocked(state, now)).toBe(referenceLocked(state.failures, now))

          // Forward in time (now at/after the last failure) pruning is required
          // to be observationally transparent: the lock decision computed over
          // the full original timeline must match the folded state.
          if (timeline.length > 0) {
            const last = timeline[timeline.length - 1]
            if (now >= last) {
              expect(isLocked(state, now)).toBe(referenceLocked(timeline, now))
            }
          }
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 3: Login lockout after repeated failures
  // Validates: Requirements 1.7
  it('locks for exactly [triggering, triggering + DURATION) once 5 failures fall inside a 15-minute window', () => {
    // Exactly MAX_FAILURES failures, all inside one 15-minute window (each
    // offset in [0, WINDOW] so the span never exceeds WINDOW). The latest
    // failure is the sole triggering failure and opens the only lock period.
    const offsetsArb = fc.array(
      fc.integer({ min: 0, max: LOCKOUT_WINDOW_MS }),
      { minLength: MAX_FAILURES, maxLength: MAX_FAILURES },
    )

    fc.assert(
      fc.property(
        baseInstantArb,
        offsetsArb,
        fc.integer({ min: 0, max: LOCKOUT_DURATION_MS - 1 }),
        (base, offsets, insideOffset) => {
          const failures = offsets.map((o) => base + o)
          const state = buildState(failures)
          const triggering = Math.max(...failures)

          // Before the triggering failure the account is not yet locked.
          expect(isLocked(state, triggering - 1)).toBe(false)

          // Locked at the triggering instant, anywhere strictly inside the
          // lock period, and at the final millisecond of that period.
          expect(isLocked(state, triggering)).toBe(true)
          expect(isLocked(state, triggering + insideOffset)).toBe(true)
          expect(isLocked(state, triggering + LOCKOUT_DURATION_MS - 1)).toBe(true)

          // Unlocked exactly at and after the end of the lock period (no later
          // failure re-triggers it).
          expect(isLocked(state, triggering + LOCKOUT_DURATION_MS)).toBe(false)
          expect(isLocked(state, triggering + LOCKOUT_DURATION_MS + 1)).toBe(false)
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 3: Login lockout after repeated failures
  // Validates: Requirements 1.7
  it('never locks when fewer than 5 failures fall within any 15-minute window', () => {
    // A timeline of clusters: each cluster holds 1..(MAX_FAILURES - 1) failures
    // packed inside a sub-window span, and consecutive clusters are separated by
    // more than one full window so no 15-minute window can ever span two
    // clusters. Hence every window holds at most MAX_FAILURES - 1 failures.
    const clusterArb = fc.record({
      size: fc.integer({ min: 1, max: MAX_FAILURES - 1 }),
      intraGaps: fc.array(
        fc.integer({ min: 0, max: Math.floor(LOCKOUT_WINDOW_MS / 8) }),
        { maxLength: MAX_FAILURES - 1 },
      ),
      separation: fc.integer({
        min: LOCKOUT_WINDOW_MS + 1,
        max: LOCKOUT_WINDOW_MS + LOCKOUT_DURATION_MS,
      }),
    })

    const sparseTimelineArb = fc
      .tuple(baseInstantArb, fc.array(clusterArb, { minLength: 1, maxLength: 5 }))
      .map(([base, clusters]) => {
        const failures: number[] = []
        let cursor = base
        for (const cluster of clusters) {
          let t = cursor
          let lastInCluster = cursor
          for (let i = 0; i < cluster.size; i++) {
            failures.push(t)
            lastInCluster = t
            // Stay well under one window across the whole cluster.
            t += cluster.intraGaps[i] ?? 0
          }
          // Next cluster starts strictly more than one window after the last
          // failure of this cluster, so windows never bridge two clusters.
          cursor = lastInCluster + cluster.separation
        }
        return failures.sort((a, b) => a - b)
      })

    fc.assert(
      fc.property(sparseTimelineArb, lockOffsetArb, fc.nat(), (timeline, offset, idxSeed) => {
        const state = buildState(timeline)

        // Cross-check the construction: the reference confirms no window ever
        // reaches the threshold.
        const anchor = timeline[idxSeed % timeline.length]
        const now = anchor + offset
        expect(referenceLocked(timeline, now)).toBe(false)

        // The real property: such a timeline is never locked, at any sampled
        // instant — including right at each failure and across what would have
        // been a lock period.
        expect(isLocked(state, now)).toBe(false)
        for (const f of timeline) {
          expect(isLocked(state, f)).toBe(false)
          expect(isLocked(state, f + LOCKOUT_DURATION_MS - 1)).toBe(false)
        }
      }),
      { numRuns: RUNS },
    )
  })
})
