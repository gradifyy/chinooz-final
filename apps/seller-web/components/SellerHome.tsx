'use client'

import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { Container, Screen } from '@chinooz/ui-web'
import { useA11y } from '@/components/A11yProvider'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'

export default function SellerHome() {
  const { t } = useTranslation()
  const router = useRouter()
  const { minTouchTarget } = useA11y()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const seller = useSellerSessionStore(s => s.seller)
  const store = useSellerSessionStore(s => s.store)
  const kycStatus = useSellerSessionStore(s => s.kycStatus)
  const goLiveStatus = useSellerSessionStore(s => s.goLiveStatus)
  const devMock = useSellerSessionStore(s => s.devMock)
  const toggleDevMock = useSellerSessionStore(s => s.toggleDevMock)
  const logout = useSellerSessionStore(s => s.logout)

  useEffect(() => {
    analytics.screen({ name: 'seller-home' })
  }, [])

  useEffect(() => {
    if (!isLoggedIn) router.replace('/onboarding')
  }, [isLoggedIn, router])

  return (
    <Screen>
      <Container>
        <div className="py-8">
          <h1 className="text-2xl font-bold text-text mb-1">{t('seller.home')}</h1>
          <p className="text-text-muted mb-6">{seller.name || t('seller.title')}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="bg-surface border border-border-light rounded-xl p-4 flex items-center justify-between">
              <span className="text-text-muted font-medium">KYC</span>
              <span className="font-semibold capitalize text-text">{kycStatus}</span>
            </div>
            <div className="bg-surface border border-border-light rounded-xl p-4 flex items-center justify-between">
              <span className="text-text-muted font-medium">{t('seller.goLive')}</span>
              <span className="font-semibold capitalize text-text">{goLiveStatus}</span>
            </div>
            {store && (
              <div className="bg-surface border border-border-light rounded-xl p-4 flex items-center justify-between sm:col-span-2">
                <span className="text-text-muted font-medium">Store</span>
                <span className="font-semibold text-text">{store.name}</span>
              </div>
            )}
          </div>

          <p className="text-center text-text-tertiary my-8">{t('seller.placeholder')}</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={toggleDevMock}
              aria-label={t('seller.devToggle')}
              className="min-touch px-4 py-2.5 rounded-lg border border-border bg-surface text-text font-semibold hover:bg-background transition-colors flex items-center justify-center"
            >
              {t('seller.devToggle')}: {devMock ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => {
                logout()
                router.replace('/onboarding')
              }}
              aria-label={t('seller.logout')}
              className="min-touch px-4 py-2.5 rounded-lg bg-error text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center"
            >
              {t('seller.logout')}
            </button>
          </div>
        </div>
      </Container>
    </Screen>
  )
}
