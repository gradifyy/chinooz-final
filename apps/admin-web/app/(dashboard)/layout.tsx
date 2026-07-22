/**
 * Authenticated dashboard shell layout (Server Component).
 *
 * Wraps every protected route segment (users, approvals, orders, listings,
 * analytics, settings, audit) in the persistent admin chrome: a branded
 * sidebar with primary navigation, the language toggle, and the sign-out
 * control. Server-first by design — only the active-link highlight, language
 * toggle, and sign-out are client islands.
 *
 * Localization (Req 10.1, 10.5): the active locale is read from the
 * `chinooz-locale` cookie via the pure `resolveLocale` helper (defaulting to
 * English), and every user-visible string is resolved from the `@chinooz/i18n`
 * EN/NE catalogs — none are hard-coded.
 *
 * Design-system compliance (Req 11.1): all color, spacing, radius, and
 * typography values come from `@chinooz/theme` token utility classes via the
 * shared Tailwind preset. There are no hard-coded color/dimension literals.
 *
 * _Requirements: 10.1, 10.5, 11.1_
 */

import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { resources } from '@chinooz/i18n'

import { resolveLocale } from '@/lib/admin-core/i18n'
import DashboardNav, { type DashboardNavItem } from '@/components/DashboardNav'
import LanguageToggle from '@/components/LanguageToggle'
import SignOutButton from '@/components/SignOutButton'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const locale = resolveLocale((await cookies()).get('chinooz-locale')?.value)
  const admin = resources[locale].translation.admin

  // Primary navigation — one entry per dashboard route segment. Labels are
  // resolved server-side so the client nav island carries no strings.
  const navItems: DashboardNavItem[] = [
    { href: '/', label: admin.nav.dashboard },
    { href: '/users', label: admin.nav.users },
    { href: '/approvals', label: admin.nav.approvals },
    { href: '/orders', label: admin.nav.orders },
    { href: '/listings', label: admin.nav.listings },
    { href: '/analytics', label: admin.nav.analytics },
    { href: '/settings', label: admin.nav.settings },
    { href: '/audit', label: admin.nav.audit },
  ]

  return (
    <div className="flex min-h-screen bg-background text-text">
      <aside
        className="flex w-64 shrink-0 flex-col border-r border-border-light bg-surface"
        aria-label={admin.nav.menu}
      >
        {/* Brand / dashboard home */}
        <div className="flex h-14 shrink-0 items-center border-b border-border-light px-4">
          <Link href="/" className="text-lg font-bold text-primary">
            {admin.common.appName}
          </Link>
        </div>

        {/* Primary navigation (active-link highlight is a client island) */}
        <DashboardNav items={navItems} ariaLabel={admin.nav.menu} />

        {/* Footer: language toggle + sign-out */}
        <div className="flex flex-col gap-3 border-t border-border-light p-4">
          <LanguageToggle
            labels={{
              aria: admin.language.toggle,
              english: admin.language.english,
              nepali: admin.language.nepali,
            }}
          />
          <SignOutButton label={admin.auth.signOut} />
        </div>
      </aside>

      <main id="main-content" className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
