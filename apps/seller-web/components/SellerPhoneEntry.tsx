'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { nepaliPhoneSchema } from '@chinooz/validation'
import { requestOtp } from '@chinooz/mock-data'
import { useReducedMotion } from '@chinooz/ui-web'
import { SlideUp } from '@chinooz/ui-web'
import LanguageToggle from './LanguageToggle'

interface Props {
  mode: 'signup' | 'login'
}

export default function SellerPhoneEntry({ mode }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const inputRef = useRef<HTMLInputElement>(null)

  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [alreadySent, setAlreadySent] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const titleKey = 'seller.auth.phoneTitle'
  const subtitleKey = mode === 'signup' ? 'seller.auth.phoneSignupSubtitle' : 'seller.auth.phoneLoginSubtitle'

  const validate = useCallback((value: string) => {
    const result = nepaliPhoneSchema.safeParse({ phone: value })
    if (!result.success) {
      return result.error.issues[0]?.message || 'Invalid phone number'
    }
    return ''
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(digits)
    setError('')
    setAlreadySent(false)
  }, [])

  const isValid = phone.length === 10 && (phone.startsWith('97') || phone.startsWith('98'))

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    const validationError = validate(phone)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')
    setAlreadySent(false)

    try {
      const result = await requestOtp(phone)
      if (result.message.includes('already sent')) {
        setAlreadySent(true)
      } else {
        router.push(`/otp?phone=${phone}&mode=${mode}`)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [phone, validate, router, mode])

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="absolute top-0 right-0 p-4 z-10">
        <LanguageToggle />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 max-w-[440px] mx-auto w-full">
        <SlideUp delay={reduced ? 0 : 0.1}>
          <h1 className="text-[26px] font-bold text-text tracking-tight mb-2">
            {t(titleKey)}
          </h1>
          <p className="text-[15px] text-text-muted leading-relaxed">
            {t(subtitleKey)}
          </p>
        </SlideUp>

        <SlideUp delay={reduced ? 0 : 0.2} className="mt-6">
          <form onSubmit={handleSubmit}>
            <motion.div
              animate={error && !reduced ? { x: [0, -8, 8, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center bg-surface rounded-md h-14 px-4 border-[1.5px] transition-colors ${
                focused
                  ? 'border-primary'
                  : error
                  ? 'border-error'
                  : 'border-border'
              }`}
            >
              <div className="flex items-center gap-2 pr-3 mr-3 border-r border-border">
                <span className="text-lg">🇳🇵</span>
                <span className="text-[15px] font-semibold text-text">+977</span>
              </div>
              <input
                ref={inputRef}
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={handleChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="98XXXXXXXX"
                maxLength={10}
                autoFocus
                aria-label={t('seller.auth.phoneAria')}
                className="flex-1 text-base font-medium tracking-wide text-text bg-transparent outline-none placeholder:text-text-tertiary"
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
              {alreadySent && !error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[13px] text-primary mt-2"
                >
                  {t('seller.auth.alreadySent')}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={!isValid || loading}
              whileTap={reduced ? {} : { scale: 0.97 }}
              className="w-full bg-primary text-white h-[52px] rounded-md font-semibold text-base mt-6 disabled:opacity-50 hover:bg-primary-dark transition-colors flex items-center justify-center"
              aria-label={t('seller.auth.continue')}
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
                t('seller.auth.continue')
              )}
            </motion.button>
          </form>

          <p className="text-xs text-text-tertiary text-center mt-4 leading-relaxed">
            {t('seller.auth.termsPrefix')}{' '}
            <span className="text-primary font-medium">{t('seller.auth.terms')}</span>
            {' '}{t('seller.auth.and')}{' '}
            <span className="text-primary font-medium">{t('seller.auth.privacy')}</span>
          </p>
        </SlideUp>
      </div>
    </div>
  )
}
