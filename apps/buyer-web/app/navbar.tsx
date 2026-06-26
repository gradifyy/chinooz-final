'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { SearchBarWeb, CartBadgeWeb } from '@chinooz/ui-web'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [search, setSearch] = useState('')

  const links = [
    { href: '/', label: 'Home' },
    { href: '/categories', label: 'Categories' },
    { href: '/deals', label: 'Deals' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-6">
        <Link href="/" className="text-xl font-bold text-[#8A1B57] shrink-0">
          Chinooz
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href ? 'text-[#8A1B57]' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex-1 max-w-md mx-auto">
          <SearchBarWeb
            value={search}
            onChange={setSearch}
            onSubmit={() => {
              if (search.trim()) {
                router.push(`/search?q=${encodeURIComponent(search.trim())}`)
              }
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            Sign In
          </Link>
          <CartBadgeWeb />
        </div>
      </div>
    </nav>
  )
}
