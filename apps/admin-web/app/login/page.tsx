/**
 * Public login page (Server Component shell).
 *
 * This route sits outside the `(dashboard)` group, so it receives only the
 * root layout (fonts + `I18nProvider`) and none of the authenticated chrome —
 * it is reachable without a session. The middleware redirects unauthenticated
 * requests here as `/login?next=<path>`, preserving the originally-requested
 * route (Req 1.1).
 *
 * The shell is server-rendered: it resolves the active locale from the
 * `chinooz-locale` cookie (defaulting to English) and pulls every user-visible
 * string from the `@chinooz/i18n` EN/NE catalogs (Req 10.1). The interactive
 * concerns — submission, pending state, and the generic authentication-error
 * display (Req 1.3) — live in the `LoginForm` client island, to which the
 * resolved labels and the sanitized `next` target are passed as props.
 *
 * All presentation uses `@chinooz/ui-web` primitives and `@chinooz/theme`
 * token utility classes only (Req 11.1).
 *
 * _Requirements: 1.1, 1.3_
 */

import { cookies } from 'next/headers'
import { resources } from '@chinooz/i18n'
import { Card, Heading, Text } from '@chinooz/ui-web'

import { resolveLocale } from '@/lib/admin-core/i18n'
import { resolvePostLoginRedirect } from '@/lib/admin-core/auth'
import LoginForm from '@/components/LoginForm'

/**
 * Reads the single-valued `next` query parameter, if present. Multi-valued or
 * absent parameters resolve to `null` and are handled downstream by
 * {@link resolvePostLoginRedirect}.
 */
function readNextParam(
  value: string | string[] | undefined,
): string | null {
  return typeof value === 'string' ? value : null
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const locale = resolveLocale((await cookies()).get('chinooz-locale')?.value)
  const auth = resources[locale].translation.admin.auth

  // Sanitize the requested redirect to a safe in-app path up front so the
  // hidden field can never carry an open-redirect target (Req 1.1).
  const { next } = await searchParams
  const safeNext = resolvePostLoginRedirect(readNextParam(next))

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-text">
      <Card className="w-full max-w-md" elevated>
        <div className="flex flex-col gap-2">
          <Heading variant="h2" testID="admin-login-title">
            {auth.title}
          </Heading>
          <Text variant="caption" className="text-text-muted">
            {auth.subtitle}
          </Text>
        </div>

        <div className="mt-6">
          <LoginForm
            next={safeNext}
            labels={{
              identifier: auth.email,
              identifierPlaceholder: auth.emailPlaceholder,
              password: auth.password,
              passwordPlaceholder: auth.passwordPlaceholder,
              signIn: auth.signIn,
              signingIn: auth.signingIn,
              errorGeneric: auth.errorGeneric,
            }}
          />
        </div>
      </Card>
    </main>
  )
}
