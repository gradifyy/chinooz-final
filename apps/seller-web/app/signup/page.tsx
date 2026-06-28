'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import LanguageToggle from '@/components/LanguageToggle'

export default function SignupPage() {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute top-0 right-0 p-4">
        <LanguageToggle />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-2 text-center">
        <h1 className="text-2xl font-bold text-text">
          {t('seller.welcome.signupTitle')}
        </h1>
        <p className="text-[15px] text-text-muted">{t('seller.welcome.comingSoon')}</p>
      </div>
      <div className="pb-10 flex justify-center">
        <button
          onClick={() => router.back()}
          className="h-12 px-6 rounded-md text-primary text-[15px] font-semibold hover:bg-primary-50 transition-colors"
        >
          {t('common.back')}
        </button>
      </div>
    </div>
  )
}
