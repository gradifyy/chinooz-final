'use server'

/**
 * Authentication server actions for the Admin Dashboard (design.md "Layering
 * Rules" #3 — `app/actions`).
 *
 * These are the orchestration layer between the login UI and the lower layers:
 * they call the {@link AdminApi} `AuthService` (the I/O boundary, `lib/api`),
 * persist the session via the cookie helpers in `lib/session.ts`, and append
 * an authentication audit record built by the pure
 * {@link buildAuthAuditRecord} helper in `lib/admin-core/auth.ts`. No domain
 * decisions are made here — credential verification, lockout, and audit-record
 * construction all live in the layers below.
 *
 * Failures are reported to the caller with a single, non-revealing i18n key
 * (`admin.auth.errorGeneric`) so the outcome never indicates whether the
 * identifier or the password was wrong (Req 1.3). The login UI resolves that
 * key against the `@chinooz/i18n` EN/NE catalogs.
 *
 * Server-side only (`'use server'`). TypeScript strict mode, no `any`.
 *
 * _Requirements: 1.2, 1.3, 1.4, 1.6, 1.8_
 */

import { redirect } from 'next/navigation'

import { buildAuthAuditRecord, resolvePostLoginRedirect } from '@/lib/admin-core/auth'
import type { AdminApi } from '@/lib/api/types'
import { mockAdminApi } from '@/lib/api/mock'
import { clearSession, issueSession, readSession } from '@/lib/session'

/**
 * The non-revealing authentication error key surfaced for every login failure
 * — unknown identifier, wrong password, locked account, or zero-role account
 * are all reported identically so the response never discloses which field
 * was wrong (Req 1.3). Resolved by the UI against the `admin.auth` catalog.
 */
const GENERIC_AUTH_ERROR_KEY = 'admin.auth.errorGeneric'

/** The login route the administrator is returned to after signing out (Req 1.4). */
const LOGIN_ROUTE = '/login'

/**
 * The concrete {@link AdminApi} the actions run against. The mock in-memory
 * implementation today; a real HTTP implementation can later be substituted
 * behind the same interface without touching this layer.
 */
const api: AdminApi = mockAdminApi

/**
 * Result of the {@link login} action, suitable for the `useActionState`
 * pattern in the login form.
 *
 * - `ok: true` — authentication succeeded (the action then redirects, so this
 *   state is observed by callers only when a redirect is not performed).
 * - `ok: false` with `errorKey` — authentication failed; `errorKey` is always
 *   the single generic, non-revealing key (Req 1.3).
 */
export interface LoginState {
  ok: boolean
  errorKey?: string
}

/**
 * Reads a string form field, returning the empty string when the field is
 * absent or not a text value (e.g. a `File`).
 */
function readField(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

/**
 * Authenticates an administrator from submitted form credentials (Req 1.2).
 *
 * On success: establishes the session cookie via {@link issueSession}, appends
 * a `login_success` audit record carrying the account identifier and a
 * timestamp (Req 1.6), and redirects to the sanitized post-login destination
 * (the `next` form field validated by {@link resolvePostLoginRedirect}, falling
 * back to a safe in-app default).
 *
 * On failure: appends a `login_failure` audit record for the submitted
 * identifier (Req 1.8), retains no session, and returns the single generic,
 * non-revealing error key so the UI cannot disclose which field was wrong
 * (Req 1.3). The discriminated failure reason from the `AuthService` (invalid
 * credentials, locked account, or zero-role account) is intentionally collapsed
 * to one outcome here.
 *
 * Shaped for the `useActionState` form pattern: the previous state is accepted
 * and ignored, and a {@link LoginState} is returned on the failure path.
 */
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const identifier = readField(formData, 'identifier')
  const password = readField(formData, 'password')
  const nextField = formData.get('next')
  const next = typeof nextField === 'string' ? nextField : null

  const result = await api.auth.authenticate({ identifier, password })
  const now = Date.now()

  if (!result.ok) {
    // Record the failed attempt (Req 1.8); the append layer retries/preserves
    // the record on its own. The login outcome is not blocked on audit I/O.
    await api.audit.append(buildAuthAuditRecord('login_failure', identifier, now))
    return { ok: false, errorKey: GENERIC_AUTH_ERROR_KEY }
  }

  // Establish the session (Req 1.2) before recording the successful event.
  await issueSession(result.session)
  await api.audit.append(buildAuthAuditRecord('login_success', identifier, now))

  // Return to the originally requested in-app path when it is safe, otherwise
  // a safe in-app default (open-redirect protection, Req 1.1).
  redirect(resolvePostLoginRedirect(next))
}

/**
 * Signs the current administrator out (Req 1.4).
 *
 * Terminates the session through the {@link AdminApi} `AuthService` (idempotent)
 * when a session is present, clears the session cookie, and redirects to the
 * login route. Safe to call when no session exists — the cookie clear is a
 * no-op and the administrator is still sent to the login route.
 */
export async function signOut(): Promise<void> {
  const session = await readSession()
  if (session !== null) {
    await api.auth.signOut(session)
  }
  await clearSession()
  redirect(LOGIN_ROUTE)
}
