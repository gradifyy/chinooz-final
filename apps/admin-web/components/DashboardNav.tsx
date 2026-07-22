'use client'

/**
 * Authenticated-shell primary navigation (client island).
 *
 * The dashboard shell layout is a Server Component; only the active-link
 * highlight needs the browser router, so that concern is isolated here. The
 * server resolves every label against `@chinooz/i18n` (EN + NE) and passes the
 * fully-localized {@link DashboardNavItem} list in as props — this island holds
 * no strings of its own, keeping all user-visible text token-localized
 * (Req 10.1). All styling uses `@chinooz/theme` token utility classes only; no
 * hard-coded color/spacing/radius/typography literals (Req 11.1).
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** A single navigation entry with its route and pre-localized label. */
export interface DashboardNavItem {
  /** In-app route segment, e.g. `/users`. The dashboard home is `/`. */
  href: string
  /** Localized, user-visible label resolved by the server layout. */
  label: string
}

interface DashboardNavProps {
  /** Pre-localized navigation entries, in display order. */
  items: DashboardNavItem[]
  /** Localized accessible name for the navigation landmark. */
  ariaLabel: string
}

export default function DashboardNav({ items, ariaLabel }: DashboardNavProps) {
  const pathname = usePathname()

  // The dashboard home matches exactly; every other segment matches itself and
  // its detail sub-routes (e.g. `/users/[id]`).
  const isActive = (href: string): boolean =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav aria-label={ariaLabel} className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {items.map(item => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex h-11 items-center rounded-md px-3 text-base font-medium transition-colors ${
              active
                ? 'bg-primary text-white'
                : 'text-text-muted hover:bg-surface hover:text-text'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
