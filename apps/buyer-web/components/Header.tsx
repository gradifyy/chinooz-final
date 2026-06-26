'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { CartBadge } from './CartBadge'

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
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary'
                    : 'text-text-secondary hover:bg-background hover:text-text'
                }`}
              >
                {t(link.labelKey)}
              </Link>
            )
          })}
        </nav>

        <div className="flex-1 max-w-md mx-4">
          <Link
            href="/search"
            className="flex items-center bg-background rounded-xl px-3 h-10 border border-border text-text-muted text-sm hover:border-primary/30 transition-colors"
          >
            {t('common.searchPlaceholder')}
          </Link>
        </div>

        <Link
          href="/cart"
          className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors"
        >
          <span className="text-xl">🛒</span>
          <CartBadge />
        </Link>
      </div>
    </header>
  )
}
