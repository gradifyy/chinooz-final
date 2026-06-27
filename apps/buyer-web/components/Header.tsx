'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { CartBadge } from './CartBadge'
import { InboxBadge } from './InboxBadge'

const navItems = [
  { href: '/', labelKey: 'nav.home' },
  { href: '/categories', labelKey: 'nav.categories' },
  { href: '/deals', labelKey: 'nav.deals' },
  { href: '/inbox', labelKey: 'nav.inbox' },
  { href: '/profile', labelKey: 'nav.profile' },
]

export function Header() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-navbar bg-white border-b border-border transition-shadow duration-200 ${
        scrolled ? 'shadow-md' : 'shadow-none'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-5 lg:px-6 h-16 flex items-center gap-4">
        <Link href="/" className="text-xl font-bold text-primary shrink-0">
          {t('common.appName')}
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {navItems.map(link => {
            const isActive = pathname === link.href || (link.href === '/inbox' && pathname.startsWith('/inbox'))
            const isInbox = link.href === '/inbox'
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary'
                    : 'text-text-secondary hover:bg-background hover:text-text'
                }`}
              >
                {t(link.labelKey)}
                {isInbox && <InboxBadge />}
              </Link>
            )
          })}
        </nav>

        <div className="flex-1 max-w-md mx-4">
          <Link
            href="/search"
            className="flex items-center bg-surface rounded-lg px-3 h-12 border border-border text-text-muted hover:border-primary/30 transition-colors group"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="text-text-muted mr-2 shrink-0"
            >
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
              <path
                d="M13.5 13.5L17 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-base font-normal group-hover:text-text-secondary transition-colors">
              {t('search.inputPlaceholder')}
            </span>
          </Link>
        </div>

        <Link
          href="/cart"
          className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors"
        >
          <span className="text-xl">{'\u{1F6D2}'}</span>
          <CartBadge />
        </Link>
      </div>
    </header>
  )
}
