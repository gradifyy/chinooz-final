'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Container, Screen } from '@chinooz/ui-web'
import { useA11y } from '@/components/A11yProvider'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'

export default function SellerOnboardingPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { minTouchTarget } = useA11y()
  const markOnboardingSeen = useSellerSessionStore(s => s.markOnboardingSeen)
  const toggleLogin = useSellerSessionStore(s => s.toggleLogin)
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)

  useEffect(() => {
    analytics.screen({ name: 'seller-onboarding' })
  }, [])

  const handleContinue = () => {
    markOnboardingSeen()
    if (!isLoggedIn) toggleLogin()
    router.replace('/')
  }

  return (
    <Screen>
      <Container>
        <div className="py-12 max-w-md mx-auto text-center">
          <div
            className="mx-auto mb-6 h-16 w-16 rounded-full bg-primary-50 flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="h-6 w-6 rounded-full bg-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text mb-1">{t('seller.title')}</h1>
          <p className="text-text-muted mb-2">{t('seller.tagline')}</p>
          <p className="text-text-tertiary mb-8">{t('seller.placeholder')}</p>
          <button
            onClick={handleContinue}
            aria-label={t('seller.goLive')}
            className="min-touch w-full px-4 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors"
          >
            {t('seller.goLive')}
          </button>
        </div>
      </Container>
    </Screen>
  )
}
