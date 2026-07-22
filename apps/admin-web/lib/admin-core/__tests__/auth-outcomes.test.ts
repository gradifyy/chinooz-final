import { describe, it, expect } from 'vitest'
import { resources } from '@chinooz/i18n'

import { createMockAdminApi } from '../../api/mock'
import type { AuthResult } from '../../api/types'
import type { Locale } from '../i18n'

/**
 * Unit tests for authentication outcomes (task 4.5).
 *
 * These are example-based unit tests (the universal session/lockout/redirect
 * behaviours are covered by the property tests in `auth.test.ts`). They pin
 * down the observable auth outcomes at the `AdminApi` `AuthService` boundary —
 * the implemented seam where credential verification actually happens — plus
 * the single generic, non-revealing error key surfaced by the UI.
 *
 * The headline guarantee (Req 1.3) is that an **unknown identifier** and a
 * **wrong password** are indistinguishable: they produce the *same* failure
 * outcome and are surfaced through the *same* i18n key
 * (`admin.auth.errorGeneric`), so the response never discloses which field was
 * wrong.
 *
 * Each test uses a fresh `createMockAdminApi()` so per-identifier lockout state
 * never leaks between cases.
 *
 * _Requirements: 1.2, 1.3, 1.4_
 */

// ---------------------------------------------------------------------------
// Seed credentials (mirrors lib/api/mock.ts seedAdmins)
// ---------------------------------------------------------------------------

/** A valid Super_Admin account. */
const VALID = { identifier: 'super@chinooz.com', password: 'super-secret' } as const

/** Valid credentials for a zero-role (inactive) account — yields `no_role`. */
const ZERO_ROLE = { identifier: 'norole@chinooz.com', password: 'norole-secret' } as const

/** An identifier that does not match any seeded administrator. */
const UNKNOWN = { identifier: 'ghost@chinooz.com', password: 'irrelevant' } as const

/** A real identifier paired with the wrong password. */
const WRONG_PASSWORD = { identifier: VALID.identifier, password: 'definitely-wrong' } as const

/**
 * The single, non-revealing authentication error key the login UI surfaces for
 * *every* failure outcome (see `app/actions/auth.ts`). Unknown identifier,
 * wrong password, locked account, and zero-role account all collapse to this
 * one key so the response never discloses which credential field was wrong
 * (Req 1.3).
 */
const GENERIC_AUTH_ERROR_KEY = 'admin.auth.errorGeneric'

/**
 * Mirrors the UI/server-action contract: every non-ok {@link AuthResult},
 * regardless of its discriminated `reason`, is surfaced through the single
 * generic error key. Returns `null` for a successful result (no error shown).
 */
function surfaceErrorKey(result: AuthResult): string | null {
  return result.ok ? null : GENERIC_AUTH_ERROR_KEY
}

/** Resolves the admin `auth` string catalog for a locale from `@chinooz/i18n`. */
function authCatalog(locale: Locale) {
  return resources[locale].translation.admin.auth
}

// ---------------------------------------------------------------------------
// Req 1.2 — valid credentials establish a session
// ---------------------------------------------------------------------------

describe('AuthService.authenticate — valid credentials (Req 1.2)', () => {
  it('establishes a session for valid credentials', async () => {
    const api = createMockAdminApi()

    const result = await api.auth.authenticate(VALID)

    expect(result.ok).toBe(true)
    // Narrow the discriminated union for the session assertions.
    if (!result.ok) throw new Error('expected authentication to succeed')

    const { session } = result
    expect(session.adminId).toBe('admin-super')
    expect(session.roles).toContain('Super_Admin')
    // A fresh session starts its idle window at issue time.
    expect(session.issuedAt).toBe(session.lastSeenAt)
    expect(Number.isNaN(Date.parse(session.issuedAt))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Req 1.3 — generic, non-revealing failure for unknown user vs wrong password
// ---------------------------------------------------------------------------

describe('AuthService.authenticate — non-revealing failures (Req 1.3)', () => {
  it('returns the generic invalid-credentials outcome for an unknown identifier', async () => {
    const api = createMockAdminApi()

    const result = await api.auth.authenticate(UNKNOWN)

    // Exactly { ok, reason } and nothing else — in particular no session is
    // retained on failure.
    expect(result).toEqual({ ok: false, reason: 'invalid_credentials' })
  })

  it('returns the generic invalid-credentials outcome for a wrong password', async () => {
    const api = createMockAdminApi()

    const result = await api.auth.authenticate(WRONG_PASSWORD)

    expect(result).toEqual({ ok: false, reason: 'invalid_credentials' })
  })

  it('produces an identical outcome for unknown identifier and wrong password (does not reveal which field was wrong)', async () => {
    // Independent instances so neither attempt influences the other's lockout
    // state — the only thing that should differ is the input, and even that
    // must not change the result.
    const unknownResult = await createMockAdminApi().auth.authenticate(UNKNOWN)
    const wrongPasswordResult =
      await createMockAdminApi().auth.authenticate(WRONG_PASSWORD)

    // Deep equality proves nothing distinguishes an unknown user from a wrong
    // password: same shape, same reason, no session on either.
    expect(unknownResult).toEqual(wrongPasswordResult)
    expect(unknownResult.ok).toBe(false)
  })

  it('retains no session on either failure outcome', async () => {
    const unknownResult = await createMockAdminApi().auth.authenticate(UNKNOWN)
    const wrongPasswordResult =
      await createMockAdminApi().auth.authenticate(WRONG_PASSWORD)

    expect('session' in unknownResult).toBe(false)
    expect('session' in wrongPasswordResult).toBe(false)
  })

  it('surfaces the same generic i18n error key for unknown identifier and wrong password', async () => {
    const unknownResult = await createMockAdminApi().auth.authenticate(UNKNOWN)
    const wrongPasswordResult =
      await createMockAdminApi().auth.authenticate(WRONG_PASSWORD)

    const unknownKey = surfaceErrorKey(unknownResult)
    const wrongPasswordKey = surfaceErrorKey(wrongPasswordResult)

    expect(unknownKey).toBe(GENERIC_AUTH_ERROR_KEY)
    expect(wrongPasswordKey).toBe(GENERIC_AUTH_ERROR_KEY)
    // The whole point: the surfaced key is identical for both cases.
    expect(unknownKey).toBe(wrongPasswordKey)
  })

  it('collapses every distinct failure reason to the one generic key', async () => {
    // Unknown identifier / wrong password -> invalid_credentials, and valid
    // credentials for a zero-role account -> no_role. Both must surface the
    // single generic key, so the failure reason is never leaked to the UI.
    const invalidCreds = await createMockAdminApi().auth.authenticate(WRONG_PASSWORD)
    const noRole = await createMockAdminApi().auth.authenticate(ZERO_ROLE)

    expect(invalidCreds).toEqual({ ok: false, reason: 'invalid_credentials' })
    expect(noRole).toEqual({ ok: false, reason: 'no_role' })

    // Distinct internal reasons, identical surfaced key.
    expect(surfaceErrorKey(invalidCreds)).toBe(GENERIC_AUTH_ERROR_KEY)
    expect(surfaceErrorKey(noRole)).toBe(GENERIC_AUTH_ERROR_KEY)
  })
})

// ---------------------------------------------------------------------------
// Generic error key is defined and localized in both catalogs (Req 1.3 / 10.4)
// ---------------------------------------------------------------------------

describe('generic authentication error key catalog', () => {
  it('resolves to a non-empty string in both English and Nepali', () => {
    const en = authCatalog('en').errorGeneric
    const ne = authCatalog('ne').errorGeneric

    expect(typeof en).toBe('string')
    expect(en.length).toBeGreaterThan(0)
    expect(typeof ne).toBe('string')
    expect(ne.length).toBeGreaterThan(0)

    // The constant the UI maps every failure to matches the catalog path used
    // to look the message up.
    expect(GENERIC_AUTH_ERROR_KEY).toBe('admin.auth.errorGeneric')
  })
})

// ---------------------------------------------------------------------------
// Req 1.4 — sign out terminates the session
// ---------------------------------------------------------------------------

describe('AuthService.signOut (Req 1.4)', () => {
  it('terminates an established session without error', async () => {
    const api = createMockAdminApi()

    const result = await api.auth.authenticate(VALID)
    if (!result.ok) throw new Error('expected authentication to succeed')

    await expect(api.auth.signOut(result.session)).resolves.toBeUndefined()
  })

  it('is idempotent — signing out an already-terminated session is safe', async () => {
    const api = createMockAdminApi()

    const result = await api.auth.authenticate(VALID)
    if (!result.ok) throw new Error('expected authentication to succeed')

    await api.auth.signOut(result.session)
    await expect(api.auth.signOut(result.session)).resolves.toBeUndefined()
  })
})
