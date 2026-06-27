'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Container, Screen } from '@chinooz/ui-web'

export default function AboutPage() {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <Screen>
      <Container className="py-6 max-w-[600px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors" aria-label={t('common.back')}>
            <span className="text-xl text-text">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">{t('about.title')}</h1>
        </div>

        <div className="flex flex-col items-center py-8 gap-2 mb-4">
          <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center">
            <span className="text-[36px]">🛍️</span>
          </div>
          <h2 className="text-2xl font-bold text-text">Chinooz</h2>
          <p className="text-sm text-text-muted">{t('about.tagline')}</p>
          <p className="text-xs text-text-tertiary">{t('about.version', { version: '1.0.0' })}</p>
        </div>

        <div className="bg-surface rounded-2xl p-4 shadow-sm mb-4">
          <p className="text-sm text-text-muted leading-6">{t('about.description')}</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-[#E5E5E5]">
            <p className="text-sm text-text">{t('about.company')}</p>
          </div>
          <div className="px-4 py-3 border-b border-[#E5E5E5]">
            <p className="text-sm text-text">{t('about.location')}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm text-text">{t('about.website')}</p>
          </div>
        </div>

        <button onClick={() => router.push('/feedback')} className="w-full h-11 rounded-lg border-[1.5px] border-primary text-primary font-semibold text-sm hover:bg-primary-50 transition-colors" aria-label={t('about.reportProblem')}>
          {t('about.reportProblem')}
        </button>
      </Container>
    </Screen>
  )
}
