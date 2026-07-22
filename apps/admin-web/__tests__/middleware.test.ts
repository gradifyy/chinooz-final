import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'

import { middleware } from '../middleware'
import { SESSION_COOKIE_NAME } from '../lib/session'
import type { AdminSession, Role } from '../lib/admin-core/types'

/**
 * Unit tests for the Admin Dashboard middleware auth + RBAC route guard
 * (`apps/admin-web/middleware.ts`).
 *
 * These are example-based tests (not property tests) that exercise the guard
 * end-to-end via real `NextRequest`/`NextResponse` objects:
 *
 * - Unauthenticated requests redirect to `/login?next=<path>`, preserving the
 *   originally requested path (Requirement 1.1).
 * - Authenticated requests whose roles lack permission for the route redirect
 *   to `/forbidden` (Requirement 2.4).
 * - `/settings` is restricted to `Super_Admin` (Requirement 8.6).
 * - `/audit` is restricted to `Super_Admin` (Requirement 9.4).
 *
 * Validates: Requirements 1.1, 2.4, 8.6, 9.4
 */

const ORIGIN = 'https://admin.chinooz.test'

/** All non-`Super_Admin` roles — used to assert privileged-route restriction. */
const NON_SUPER_ROLES: readonly Role[] = [
  'Operations_Admin',
  'Support_Admin',
  'Read_Only_Admin',
]

/** Builds a valid {@link AdminSession} for the given roles. */
function makeSession(roles: Role[]): AdminSession {
  const now = new Date().toISOString()
  return {
    adminId: 'admin-1',
    roles,
    issuedAt: now,
    lastSeenAt: now,
  }
}

/**
 * Builds a {@link NextRequest} for `pathname`, optionally carrying a session
 * cookie. When `session` is omitted the request is unauthenticated.
 */
function makeRequest(pathname: string, session?: AdminSession): NextRequest {
  const headers = new Headers()
  if (session) {
    headers.set(
      'cookie',
      `${SESSION_COOKIE_NAME}=${JSON.stringify(session)}`,
    )
  }
  return new NextRequest(new URL(pathname, ORIGIN), { headers })
}

/** True when the response is a redirect (3xx with a Location header). */
function isRedirect(response: { status: number }): boolean {
  return response.status >= 300 && response.status < 400
}

/** The decoded pathname of a response's Location header. */
function redirectLocation(response: { headers: Headers }): URL {
  const location = response.headers.get('location')
  expect(location).not.toBeNull()
  return new URL(location as string)
}

describe('admin-web middleware route guard', () => {
  describe('unauthenticated requests (Requirement 1.1)', () => {
    it('redirects to /login preserving the requested path as ?next=', () => {
      const response = middleware(makeRequest('/users'))

      expect(isRedirect(response)).toBe(true)
      const target = redirectLocation(response)
      expect(target.pathname).toBe('/login')
      expect(target.searchParams.get('next')).toBe('/users')
    })

    it('preserves a deeper nested path in ?next=', () => {
      const response = middleware(makeRequest('/orders/order-123'))

      const target = redirectLocation(response)
      expect(target.pathname).toBe('/login')
      expect(target.searchParams.get('next')).toBe('/orders/order-123')
    })

    it('redirects to /login when the session cookie is malformed', () => {
      const headers = new Headers()
      headers.set('cookie', `${SESSION_COOKIE_NAME}=not-json`)
      const request = new NextRequest(new URL('/users', ORIGIN), { headers })

      const response = middleware(request)

      const target = redirectLocation(response)
      expect(target.pathname).toBe('/login')
      expect(target.searchParams.get('next')).toBe('/users')
    })
  })

  describe('role-denied requests (Requirement 2.4)', () => {
    it('redirects an authenticated user without route permission to /forbidden', () => {
      // Operations_Admin lacks settings.manage, so /settings is denied.
      const response = middleware(
        makeRequest('/settings', makeSession(['Operations_Admin'])),
      )

      expect(isRedirect(response)).toBe(true)
      expect(redirectLocation(response).pathname).toBe('/forbidden')
    })

    it('denies an account that holds no roles', () => {
      const response = middleware(makeRequest('/users', makeSession([])))

      expect(isRedirect(response)).toBe(true)
      expect(redirectLocation(response).pathname).toBe('/forbidden')
    })
  })

  describe('/settings is restricted to Super_Admin (Requirement 8.6)', () => {
    it('allows Super_Admin through to /settings', () => {
      const response = middleware(
        makeRequest('/settings', makeSession(['Super_Admin'])),
      )

      expect(isRedirect(response)).toBe(false)
      expect(response.headers.get('location')).toBeNull()
    })

    it.each(NON_SUPER_ROLES)(
      'redirects %s to /forbidden for /settings',
      (role) => {
        const response = middleware(
          makeRequest('/settings', makeSession([role])),
        )

        expect(isRedirect(response)).toBe(true)
        expect(redirectLocation(response).pathname).toBe('/forbidden')
      },
    )
  })

  describe('/audit is restricted to Super_Admin (Requirement 9.4)', () => {
    it('allows Super_Admin through to /audit', () => {
      const response = middleware(
        makeRequest('/audit', makeSession(['Super_Admin'])),
      )

      expect(isRedirect(response)).toBe(false)
      expect(response.headers.get('location')).toBeNull()
    })

    it.each(NON_SUPER_ROLES)(
      'redirects %s to /forbidden for /audit',
      (role) => {
        const response = middleware(
          makeRequest('/audit', makeSession([role])),
        )

        expect(isRedirect(response)).toBe(true)
        expect(redirectLocation(response).pathname).toBe('/forbidden')
      },
    )
  })

  describe('permitted authenticated requests pass through', () => {
    it('allows a role with the required permission to reach a feature route', () => {
      // Support_Admin holds users.view, so /users is permitted.
      const response = middleware(
        makeRequest('/users', makeSession(['Support_Admin'])),
      )

      expect(isRedirect(response)).toBe(false)
      expect(response.headers.get('location')).toBeNull()
    })

    it('allows any authenticated role to reach the dashboard root', () => {
      const response = middleware(
        makeRequest('/', makeSession(['Read_Only_Admin'])),
      )

      expect(isRedirect(response)).toBe(false)
      expect(response.headers.get('location')).toBeNull()
    })
  })
})
