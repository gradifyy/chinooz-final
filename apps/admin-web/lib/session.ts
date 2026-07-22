/**
 * Admin Dashboard session cookie helpers.
 *
 * Thin I/O layer that persists an {@link AdminSession} in an httpOnly cookie,
 * following the `seller-web` cookie/`next/headers` pattern. This is the only
 * place that reads or writes the session cookie; all session decision logic
 * (idle expiry, lockout, redirect safety) lives in the pure
 * `lib/admin-core/auth` module and is reused here.
 *
 * Server-side only — relies on `next/headers` `cookies()` and therefore must
 * run inside a Server Component, Route Handler, Server Action, or middleware
 * context.
 *
 * See design.md "Auth_Service" / `lib/session.ts` and Requirements 1.2, 1.4.
 */

import { cookies } from 'next/headers'

import { IDLE_TIMEOUT_MS } from './admin-core/auth'
import { ROLE_PERMISSIONS } from './admin-core/rbac'
import type { AdminSession, Role } from './admin-core/types'

/**
 * Name of the admin session cookie. Distinct from `chinooz-locale` and any
 * marketplace-app session so the dashboard session is isolated.
 */
export const SESSION_COOKIE_NAME = 'chinooz-admin-session'

/**
 * Base attributes for the session cookie.
 *
 * - `httpOnly` keeps the session out of reach of client-side JavaScript.
 * - `sameSite: 'lax'` mitigates CSRF while allowing top-level navigations.
 * - `secure` is enabled outside development so the cookie is only sent over
 *   HTTPS in deployed environments.
 * - `path: '/'` scopes the cookie to the whole dashboard.
 * - `maxAge` mirrors the idle-timeout window so an abandoned cookie expires at
 *   the browser even if the server never sees another request.
 */
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: Math.floor(IDLE_TIMEOUT_MS / 1000),
} as const

/** Runtime set of valid roles, derived from the RBAC source of truth. */
const VALID_ROLES = new Set<string>(Object.keys(ROLE_PERMISSIONS))

/** Type guard: a value is a known {@link Role}. */
function isRole(value: unknown): value is Role {
  return typeof value === 'string' && VALID_ROLES.has(value)
}

/**
 * Validates that an arbitrary parsed value matches the {@link AdminSession}
 * shape: a string `adminId`, an array of known roles, and ISO-string
 * `issuedAt` / `lastSeenAt` timestamps. Returns the narrowed session or
 * `null` when the value is malformed.
 */
function parseSession(value: unknown): AdminSession | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>

  const { adminId, roles, issuedAt, lastSeenAt } = candidate
  if (typeof adminId !== 'string') return null
  if (typeof issuedAt !== 'string') return null
  if (typeof lastSeenAt !== 'string') return null
  if (!Array.isArray(roles) || !roles.every(isRole)) return null

  // Reject timestamps that are not parseable ISO instants.
  if (Number.isNaN(Date.parse(issuedAt))) return null
  if (Number.isNaN(Date.parse(lastSeenAt))) return null

  return { adminId, roles, issuedAt, lastSeenAt }
}

/**
 * Reads and parses the current admin session from the request cookies.
 *
 * Returns the {@link AdminSession} when a well-formed cookie is present, or
 * `null` when the cookie is absent, empty, not valid JSON, or does not match
 * the expected shape. This never throws on malformed input.
 */
export async function readSession(): Promise<AdminSession | null> {
  const raw = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  return parseSession(parsed)
}

/**
 * Issues (sets) the session cookie for `session`, serializing it as JSON with
 * the httpOnly / SameSite=Lax attributes (Req 1.2). Replaces any existing
 * session cookie.
 */
export async function issueSession(session: AdminSession): Promise<void> {
  ;(await cookies()).set(
    SESSION_COOKIE_NAME,
    JSON.stringify(session),
    SESSION_COOKIE_OPTIONS,
  )
}

/**
 * Clears the session cookie, terminating the session (Req 1.4). Safe to call
 * when no session cookie exists.
 */
export async function clearSession(): Promise<void> {
  ;(await cookies()).delete(SESSION_COOKIE_NAME)
}

/**
 * Returns a copy of `session` with `lastSeenAt` advanced to `now`, expressed
 * as an ISO UTC string. Pure helper exposed for reuse and testing; it does not
 * touch cookies.
 */
export function withTouchedLastSeen(
  session: AdminSession,
  now: number = Date.now(),
): AdminSession {
  return { ...session, lastSeenAt: new Date(now).toISOString() }
}

/**
 * Touches the current session's `lastSeenAt` to `now` and re-issues the cookie
 * so the idle-timeout window slides forward on activity (supports Req 1.5's
 * inactivity tracking). Returns the updated session, or `null` when there is
 * no valid session to touch.
 */
export async function touchSession(
  now: number = Date.now(),
): Promise<AdminSession | null> {
  const session = await readSession()
  if (!session) return null

  const touched = withTouchedLastSeen(session, now)
  await issueSession(touched)
  return touched
}
