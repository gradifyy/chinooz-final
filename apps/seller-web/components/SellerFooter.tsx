'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { getClientEnv } from '@/lib/env'

export function SellerFooter() {
  const { t } = useTranslation()
  const env = getClientEnv()
  return (
    <footer className="border-t border-border bg-surface text-text-muted text-sm">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          {t('seller.title')} · {env.NEXT_PUBLIC_APP_NAME}
        </span>
        <span className="text-text-tertiary">{t('seller.placeholder')}</span>
      </div>
    </footer>
  )
}
