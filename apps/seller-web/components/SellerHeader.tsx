'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Menu, MessageSquare, Star, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSellerSessionStore, useSellerMessagesStore } from '@chinooz/state'

export function SellerHeader() {
  const { t } = useTranslation()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const store = useSellerSessionStore(s => s.store)
  const unread = useSellerMessagesStore(s => s.unreadCount)

  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moreOpen) return
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [moreOpen])

  const moreItems: { key: string; label: string; href: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'messages', label: t('seller.messages.tab'), href: '/messages', icon: <MessageSquare size={16} aria-hidden="true" />, badge: unread },
    { key: 'reviews', label: t('seller.reviews.moreReviews'), href: '/reviews', icon: <Star size={16} aria-hidden="true" /> },
  ]

  return (
    <header className="bg-primary text-white">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg min-touch"
          aria-label={t('seller.home')}
        >
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-50"
            aria-hidden="true"
          >
            <span className="h-3 w-3 rounded-full bg-white" />
          </span>
          {t('seller.title')}
        </Link>
        <nav className="flex items-center gap-4">
          {isLoggedIn && store ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-white hover:text-primary-50 transition-colors min-touch flex items-center"
              >
                {t('seller.dashboard.tab')}
              </Link>

              {/* ☰ More */}
              <div ref={moreRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMoreOpen(o => !o)}
                  aria-label={t('seller.reviews.moreAria')}
                  aria-haspopup="menu"
                  aria-expanded={moreOpen}
                  className="inline-flex items-center justify-center min-touch rounded-md hover:bg-primary-dark/40 transition-colors"
                >
                  {moreOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
                </button>
                {moreOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-1 w-52 bg-surface text-text rounded-md shadow-lg border border-border z-50 overflow-hidden"
                  >
                    {moreItems.map(item => (
                      <Link
                        key={item.key}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-text hover:bg-background transition-colors"
                      >
                        <span className="text-primary">{item.icon}</span>
                        {item.label}
                        {item.badge && item.badge > 0 ? (
                          <span
                            className="ml-auto inline-flex items-center justify-center text-white text-xs font-semibold rounded-full min-w-[20px] h-5 px-1.5"
                            style={{ backgroundColor: '#DC2626' }}
                            aria-label={t('seller.messages.unreadAria', { count: item.badge })}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-sm text-primary-50">{store.name}</span>
            </>
          ) : (
            <Link
              href="/onboarding"
              className="text-sm font-semibold bg-white text-primary px-4 py-2 rounded-lg min-touch flex items-center"
            >
              {t('seller.login')}
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
