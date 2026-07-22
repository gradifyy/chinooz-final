/**
 * Admin Dashboard route guard (Next.js middleware, edge runtime).
 *
 * Enforces authentication and coarse role-based access control on every
 * protected dashboard route before the request reaches a page:
 *
 * - Unauthenticated requests (no valid session cookie) are redirected to the
 *   login page with the originally requested path preserved as `?next=`
 *   (Req 1.1), via the pure {@link buildLoginRoute} helper.
 * - Authenticated requests whose roles lack permission for the target route
 *   are redirected to `/forbidden` (Req 2.4 / 8.6 / 9.4). The decision is
 *   delegated entirely to {@link canAccessRoute}, which maps routes to the
 *   required permission — including the `Super_Admin`-only restriction on
 *   `/settings` and `/audit` (Req 8.6 / 9.4).
 *
 * Middleware runs in the edge runtime and therefore cannot use the
 * `next/headers` `cookies()` API that `lib/session.ts` uses on the server.
 * Instead it reads the same session cookie ({@link SESSION_COOKIE_NAME}) from
 * the {@link NextRequest} and parses it into the shared {@link AdminSession}
 * shape. Public routes (login, forbidden, API, static assets) are excluded by
 * the `config.matcher` below and are never guarded.
 *
 * See design.md "middleware.ts" and Requirements 1.1, 2.3, 2.4, 8.6, 9.4.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { buildLoginRoute } from './lib/admin-core/auth'
import { ROLE_PERMISSIONS, canAccessRoute } from './lib/admin-core/rbac'
import type { AdminSession, Role } from './lib/admin-core/types'
import { SESSION_COOKIE_NAME } from './lib/session'

/** Runtime set of valid roles, derived from the RBAC source of truth. */
const VALID_ROLES = new Set<string>(Object.keys(ROLE_PERMISSIONS))

/** Type guard: a value is a known {@link Role}. */
function isRole(value: unknown): value is Role {
  return typeof value === 'string' && VALID_ROLES.has(value)
}

/**
 * Parses the raw session cookie value into an {@link AdminSession}, mirroring
 * the validation in `lib/session.ts` but operating on the cookie string read
 * from the edge `NextRequest`. Returns `null` when the cookie is absent,
 * empty, not valid JSON, or does not match the expected shape; never throws.
 */
function parseSessionCookie(raw: string | undefined): AdminSession | null {
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null) return null
  const candidate = parsed as Record<string, unknown>

  const { adminId, roles, issuedAt, lastSeenAt } = candidate
  if (typeof adminId !== 'string') return null
  if (typeof issuedAt !== 'string') return null
  if (typeof lastSeenAt !== 'string') return null
  if (!Array.isArray(roles) || !roles.every(isRole)) return null
  if (Number.isNaN(Date.parse(issuedAt))) return null
  if (Number.isNaN(Date.parse(lastSeenAt))) return null

  return { adminId, roles, issuedAt, lastSeenAt }
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  const session = parseSessionCookie(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  )

  // Unauthenticated → bounce to login, preserving the requested path (Req 1.1).
  if (session === null) {
    return NextResponse.redirect(
      new URL(buildLoginRoute(pathname), request.url),
    )
  }

  // Authenticated but the role set lacks access to this route → forbidden
  // (Req 2.4 / 8.6 / 9.4). `/settings` and `/audit` are Super_Admin-only via
  // the route→permission mapping inside canAccessRoute.
  if (!canAccessRoute(session.roles, pathname)) {
    return NextResponse.redirect(new URL('/forbidden', request.url))
  }

  return NextResponse.next()
}

/**
 * Guard every route except Next.js internals, static assets, and the public
 * pages (`/login`, `/forbidden`) and API routes, which must remain reachable
 * without a session.
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|forbidden|admin-icon.svg|admin-manifest.webmanifest).*)',
  ],
}
