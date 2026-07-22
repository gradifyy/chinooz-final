'use client'

/**
 * Login form (client island).
 *
 * The only interactive part of the public login page: it owns form submission,
 * the pending state, and the authentication-error display. The surrounding
 * page shell is a Server Component.
 *
 * Submission is wired to the `login` server action (`app/actions/auth.ts`) via
 * React's `useActionState`, so credential verification, session establishment,
 * audit logging, and the post-login redirect all happen server-side. The form
 * carries the originally-requested route through a hidden `next` field so the
 * action can return the administrator there after a successful sign-in
 * (Req 1.1). The fields are uncontrolled — their `name`s are collected into the
 * `FormData` the action receives.
 *
 * On failure the action returns a single, non-revealing error key
 * (`admin.auth.errorGeneric`); this island shows the matching localized message
 * (passed in by the server) at the form level — never on a specific field — so
 * the UI cannot disclose whether the identifier or the password was wrong
 * (Req 1.3).
 *
 * Every user-visible string is resolved against `@chinooz/i18n` by the server
 * shell and passed in as props, so this island holds no hard-coded strings
 * (Req 10.1). Presentation uses `@chinooz/ui-web` primitives and
 * `@chinooz/theme` token utility classes only (Req 11.1).
 *
 * _Requirements: 1.1, 1.3_
 */

import { useActionState } from 'react'
import { Button, Input } from '@chinooz/ui-web'

import { login, type LoginState } from '@/app/actions/auth'

interface LoginFormLabels {
  /** Label for the account-identifier field. */
  identifier: string
  /** Placeholder for the account-identifier field. */
  identifierPlaceholder: string
  /** Label for the password field. */
  password: string
  /** Placeholder for the password field. */
  passwordPlaceholder: string
  /** Submit-button label at rest. */
  signIn: string
  /** Submit-button label while authentication is in flight. */
  signingIn: string
  /**
   * Generic, non-revealing authentication-error message shown for every
   * failure outcome (Req 1.3).
   */
  errorGeneric: string
}

interface LoginFormProps {
  /** Pre-localized, user-visible labels resolved by the server shell. */
  labels: LoginFormLabels
  /**
   * The sanitized originally-requested in-app path to return to after a
   * successful sign-in, carried through as a hidden field (Req 1.1).
   */
  next: string
}

/** Initial form state: no attempt made yet, so no error. */
const INITIAL_STATE: LoginState = { ok: false }

export default function LoginForm({ labels, next }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(login, INITIAL_STATE)

  // The action only ever returns the single generic key, so any present error
  // resolves to the same non-revealing message (Req 1.3).
  const hasError = !state.ok && state.errorKey !== undefined

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {hasError && (
        <p
          role="alert"
          className="rounded-xl border border-error bg-error-light px-3 py-2 text-sm text-error"
          data-testid="admin-login-error"
        >
          {labels.errorGeneric}
        </p>
      )}

      <Input
        name="identifier"
        label={labels.identifier}
        placeholder={labels.identifierPlaceholder}
        keyboardType="email"
        autoComplete="username"
        required
        testID="admin-login-identifier"
      />

      <Input
        name="password"
        label={labels.password}
        placeholder={labels.passwordPlaceholder}
        secureTextEntry
        autoComplete="current-password"
        required
        testID="admin-login-password"
      />

      {/* Preserve the originally-requested route across authentication (Req 1.1). */}
      <input type="hidden" name="next" value={next} />

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={isPending}
        testID="admin-login-submit"
      >
        {isPending ? labels.signingIn : labels.signIn}
      </Button>
    </form>
  )
}
