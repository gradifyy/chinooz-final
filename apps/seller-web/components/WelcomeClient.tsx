'use client'

import React, { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, type Transition } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MapPin, LayoutGrid, Wallet, BarChart3, type LucideIcon } from 'lucide-react'
import { duration, easing } from '@chinooz/theme'
import { useSellerSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import SellerIllustration from './SellerIllustration'
import LanguageToggle from './LanguageToggle'

const ENTER_MS = duration.slow // 400
const ENTER_OFFSET = 8

interface Benefit {
  icon: LucideIcon
  labelKey: string
  subKey: string
}

const BENEFITS: Benefit[] = [
  { icon: MapPin, labelKey: 'seller.welcome.benefitReachLabel', subKey: 'seller.welcome.benefitReachSub' },
  { icon: LayoutGrid, labelKey: 'seller.welcome.benefitListingsLabel', subKey: 'seller.welcome.benefitListingsSub' },
  { icon: Wallet, labelKey: 'seller.welcome.benefitPayoutsLabel', subKey: 'seller.welcome.benefitPayoutsSub' },
  { icon: BarChart3, labelKey: 'seller.welcome.benefitInsightsLabel', subKey: 'seller.welcome.benefitInsightsSub' },
]

const STATS = [
  { value: '12,000+', labelKey: 'seller.welcome.statSellers' },
  { value: '38', labelKey: 'seller.welcome.statCities' },
  { value: '1.2M', labelKey: 'seller.welcome.statOrders' },
]

type EnterProps = {
  initial: { opacity: number; y: number }
  animate: { opacity: number; y: number }
  transition: Transition
}

function enter(delay: number, reduced: boolean): EnterProps {
  return {
    initial: { opacity: 0, y: reduced ? 0 : ENTER_OFFSET },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduced ? 0 : ENTER_MS / 1000,
      ease: easing.easeOut as any,
      delay: reduced ? 0 : delay / 1000,
    },
  }
}

export default function WelcomeClient() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const markOnboardingSeen = useSellerSessionStore(s => s.markOnboardingSeen)

  const handleStartSelling = useCallback(() => {
    markOnboardingSeen()
    router.push('/signup')
  }, [markOnboardingSeen, router])

  const handleLogin = useCallback(() => {
    router.push('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="absolute top-0 right-0 p-4 z-10">
        <LanguageToggle />
      </div>

      <main className="flex-1 flex items-center justify-center px-6 py-10 md:py-16">
        <div className="w-full max-w-[1000px] grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <motion.div {...enter(0, reduced)} className="order-1 flex flex-col items-center md:items-start gap-6">
            <div className="hidden md:flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center font-sansBold text-base font-bold">
                C
              </div>
              <span className="text-lg font-semibold text-text tracking-tight">Chinooz Seller</span>
            </div>
            <SellerIllustration alt={t('seller.welcome.illustrationAlt')} />
          </motion.div>

          <div className="order-2 flex flex-col gap-6 md:gap-7 pb-28 md:pb-0">
            <motion.div {...enter(80, reduced)}>
              <h1 className="text-[28px] leading-[34px] md:text-[32px] md:leading-[38px] font-bold text-text tracking-tight text-center md:text-left">
                {t('seller.welcome.headline')}
              </h1>
              <p className="mt-2 text-[15px] text-text-muted text-center md:text-left max-w-md md:max-w-none">
                {t('seller.welcome.subtitle')}
              </p>
            </motion.div>

            <ul className="flex flex-col gap-3 md:gap-3.5">
              {BENEFITS.map((b, i) => {
                const Icon = b.icon
                return (
                  <motion.li
                    key={b.labelKey}
                    {...enter(200 + i * 50, reduced)}
                    className="flex items-center gap-3 bg-surface px-4 py-3.5 rounded-xl border border-border-light"
                    aria-label={t(b.labelKey)}
                  >
                    <span className="w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                      <Icon size={24} color="#8A1B57" strokeWidth={2} />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[16px] font-semibold text-text leading-snug">
                        {t(b.labelKey)}
                      </span>
                      <span className="text-[14px] font-normal text-text-muted leading-5">
                        {t(b.subKey)}
                      </span>
                    </span>
                  </motion.li>
                )
              })}
            </ul>

            <motion.div {...enter(420, reduced)} className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
              {STATS.map((s, i) => (
                <div key={s.labelKey} className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold text-text">{s.value}</span>
                  <span className="text-[12px] font-medium text-text-muted">{t(s.labelKey)}</span>
                  {i < STATS.length - 1 && <span className="w-px h-3.5 bg-border" aria-hidden="true" />}
                </div>
              ))}
            </motion.div>

            <motion.div
              {...enter(480, reduced)}
              className="hidden md:flex flex-col gap-2.5 items-stretch mt-1"
            >
              <CtaButtons
                onStart={handleStartSelling}
                onLogin={handleLogin}
                startLabel={t('seller.welcome.startSelling')}
                startAria={t('seller.welcome.startSellingAria')}
                loginLabel={t('seller.welcome.haveStore')}
                loginAria={t('seller.welcome.haveStoreAria')}
              />
            </motion.div>
          </div>
        </div>
      </main>

      <div
        className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border-light px-6 pt-4 flex flex-col gap-2.5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <CtaButtons
          onStart={handleStartSelling}
          onLogin={handleLogin}
          startLabel={t('seller.welcome.startSelling')}
          startAria={t('seller.welcome.startSellingAria')}
          loginLabel={t('seller.welcome.haveStore')}
          loginAria={t('seller.welcome.haveStoreAria')}
        />
      </div>
    </div>
  )
}

function CtaButtons({
  onStart,
  onLogin,
  startLabel,
  startAria,
  loginLabel,
  loginAria,
}: {
  onStart: () => void
  onLogin: () => void
  startLabel: string
  startAria: string
  loginLabel: string
  loginAria: string
}) {
  return (
    <>
      <button
        onClick={onStart}
        aria-label={startAria}
        className="h-[52px] w-full rounded-md bg-primary text-white text-[16px] font-semibold transition-transform duration-100 active:scale-[0.98] hover:opacity-95"
      >
        {startLabel}
      </button>
      <button
        onClick={onLogin}
        aria-label={loginAria}
        className="h-12 w-full rounded-md text-primary text-[15px] font-semibold hover:bg-primary-50 transition-colors"
      >
        {loginLabel}
      </button>
    </>
  )
}
