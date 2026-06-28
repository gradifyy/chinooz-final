'use client'

import React from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useSellerSessionStore } from '@chinooz/state'

export function SellerHeader() {
  const { t } = useTranslation()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const store = useSellerSessionStore(s => s.store)

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
