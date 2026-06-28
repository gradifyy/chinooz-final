'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSellerSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import { SlideUp } from '@chinooz/ui-web'
import LanguageToggle from './LanguageToggle'

export default function SellerAccountSetup() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') || ''
  const reduced = useReducedMotion()
  const login = useSellerSessionStore(s => s.login)
  const updateSeller = useSellerSessionStore(s => s.updateSeller)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const handleFinish = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (name.trim().length < 2) {
      setError(t('seller.auth.nameRequired'))
      return
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('seller.auth.emailInvalid'))
      return
    }

    setLoading(true)
    setError('')

    try {
      updateSeller({
        name: name.trim(),
        email: email.trim(),
        phone,
      })
      login('seller-1', name.trim())
      document.cookie = 'chinooz-seller-logged-in=1; path=/; max-age=31536000'
      setTimeout(() => router.push('/setup-store'), 400)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [name, email, phone, login, updateSeller, router, t])

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="absolute top-0 right-0 p-4 z-10">
        <LanguageToggle />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 max-w-[440px] mx-auto w-full">
        <SlideUp delay={reduced ? 0 : 0.1}>
          <h1 className="text-[26px] font-bold text-text tracking-tight mb-2">
            {t('seller.auth.accountTitle')}
          </h1>
          <p className="text-[15px] text-text-muted leading-relaxed">
            {t('seller.auth.accountSubtitle')}
          </p>
        </SlideUp>

        <SlideUp delay={reduced ? 0 : 0.2} className="mt-6">
          <form onSubmit={handleFinish}>
            <motion.div
              animate={error && !reduced ? { x: [0, -8, 8, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="block text-sm font-semibold text-text mb-2">
                {t('seller.auth.nameLabel')}
              </label>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                placeholder={t('seller.auth.namePlaceholder')}
                className="w-full h-14 px-4 rounded-md border-[1.5px] border-border bg-surface text-base text-text outline-none focus:border-primary transition-colors placeholder:text-text-tertiary"
                aria-label={t('seller.auth.nameLabel')}
              />

              <label className="block text-sm font-semibold text-text mb-2 mt-4">
                {t('seller.auth.emailLabel')}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder={t('seller.auth.emailPlaceholder')}
                className="w-full h-14 px-4 rounded-md border-[1.5px] border-border bg-surface text-base text-text outline-none focus:border-primary transition-colors placeholder:text-text-tertiary"
                aria-label={t('seller.auth.emailLabel')}
              />
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  role="alert"
                  className="text-[13px] text-error mt-2"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={reduced ? {} : { scale: 0.97 }}
              className="w-full bg-primary text-white h-[52px] rounded-md font-semibold text-base mt-6 disabled:opacity-50 hover:bg-primary-dark transition-colors flex items-center justify-center"
              aria-label={t('seller.auth.finishSetup')}
            >
              {loading ? (
                <div className="flex items-center gap-1.5">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay }}
                      className="w-2 h-2 rounded-full bg-white/60"
                    />
                  ))}
                </div>
              ) : (
                t('seller.auth.finishSetup')
              )}
            </motion.button>
          </form>
        </SlideUp>
      </div>
    </div>
  )
}
