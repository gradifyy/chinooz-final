'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Container, Screen } from '@chinooz/ui-web'

const SECTIONS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']

export default function TermsPage() {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <Screen>
      <Container className="py-6 max-w-[800px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors" aria-label={t('common.back')}>
            <span className="text-xl text-text">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">{t('terms.title')}</h1>
        </div>

        <p className="text-xs text-text-tertiary mb-6">{t('terms.lastUpdated')}</p>

        <div className="space-y-6">
          {SECTIONS.map(sec => (
            <div key={sec}>
              <h3 className="text-lg font-semibold text-text mb-2">{t(`terms.${sec}Title`)}</h3>
              <p className="text-base text-text-muted leading-7">{t(`terms.${sec}Body`)}</p>
            </div>
          ))}
        </div>
      </Container>
    </Screen>
  )
}
