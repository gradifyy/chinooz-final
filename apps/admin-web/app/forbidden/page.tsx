/**
 * Authorization-denied page (Server Component).
 *
 * The middleware redirects here when an authenticated administrator requests a
 * route their role lacks permission for (Req 2.4) — for example a non-
 * Super_Admin reaching `/settings` or `/audit`. Like `/login`, it sits outside
 * the `(dashboard)` group and receives only the root layout, so it renders even
 * when the authenticated shell is not appropriate.
 *
 * It is fully static: no interactivity is required, so there is no client
 * island. The active locale is resolved from the `chinooz-locale` cookie
 * (defaulting to English) and every user-visible string comes from the
 * `@chinooz/i18n` EN/NE catalogs (Req 10.1). A link back to the dashboard home
 * lets a permitted area be reached again.
 *
 * All presentation uses `@chinooz/ui-web` primitives and `@chinooz/theme`
 * token utility classes only (Req 11.1).
 *
 * _Requirements: 2.4_
 */

import { cookies } from 'next/headers'
import Link from 'next/link'
import { resources } from '@chinooz/i18n'
import { Card, Heading, Text } from '@chinooz/ui-web'

import { resolveLocale } from '@/lib/admin-core/i18n'

export default async function ForbiddenPage() {
  const locale = resolveLocale((await cookies()).get('chinooz-locale')?.value)
  const forbidden = resources[locale].translation.admin.forbidden

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-text">
      <Card className="w-full max-w-md text-center" elevated>
        <div className="flex flex-col items-center gap-3">
          <Heading variant="h2" testID="admin-forbidden-title">
            {forbidden.title}
          </Heading>
          <Text variant="body" className="text-text-muted">
            {forbidden.message}
          </Text>
          <Link
            href="/"
            className="mt-2 inline-flex h-11 items-center rounded-xl bg-primary px-4 text-base font-semibold text-white"
            data-testid="admin-forbidden-home"
          >
            {forbidden.backToDashboard}
          </Link>
        </div>
      </Card>
    </main>
  )
}
