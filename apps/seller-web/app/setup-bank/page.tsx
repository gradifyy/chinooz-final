'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import WizardStepper from '@/components/WizardStepper'
import LanguageToggle from '@/components/LanguageToggle'

export default function SetupBankPage() {
  const { t } = useTranslation()
  const router = useRouter()

  const steps = [
    { key: 'store', label: t('seller.setup.stepStore') },
    { key: 'business', label: t('seller.setup.stepBusiness') },
    { key: 'bank', label: t('seller.setup.stepBank') },
    { key: 'review', label: t('seller.setup.stepReview') },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="absolute top-0 right-0 p-4 z-10">
        <LanguageToggle />
      </div>
      <div className="flex-1 max-w-[600px] mx-auto w-full px-6">
        <WizardStepper steps={steps} current={2} />
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center mt-20">
          <h1 className="text-[22px] font-bold text-text">{t('seller.setup.stepBank')}</h1>
          <p className="text-[15px] text-text-muted">{t('seller.setup.comingSoon')}</p>
        </div>
      </div>
      <div className="sticky bottom-0 bg-background border-t border-border-light px-6 py-3">
        <div className="max-w-[600px] mx-auto flex gap-2">
          <button onClick={() => router.back()} className="h-11 px-6 rounded-md text-primary text-[15px] font-semibold hover:bg-primary-50 transition-colors">
            {t('seller.setup.back')}
          </button>
          <button onClick={() => router.push('/setup-review')} className="flex-1 h-[52px] rounded-md bg-primary text-white text-base font-semibold hover:bg-primary-dark transition-colors">
            {t('seller.setup.continue')}
          </button>
        </div>
      </div>
    </div>
  )
}
