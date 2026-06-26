'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CartBadge } from './CartBadge'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/categories', label: 'Categories' },
  { href: '/deals', label: 'Deals' },
  { href: '/inbox', label: 'Inbox' },
  { href: '/profile', label: 'Profile' },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-navbar bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <Link href="/" className="text-xl font-bold text-primary shrink-0">
          Chinooz
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {navLinks.map(link => {
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
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex-1 max-w-md mx-4">
          <Link
            href="/search"
            className="flex items-center bg-background rounded-xl px-3 h-10 border border-border text-text-muted text-sm hover:border-primary/30 transition-colors"
          >
            Search products...
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
