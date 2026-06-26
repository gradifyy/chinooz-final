'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { nepaliPhoneSchema } from '@chinooz/validation'
import { requestOtp } from '@chinooz/mock-data'
import { useReducedMotion } from '@chinooz/ui-web'
import { SlideUp } from '@chinooz/ui-web'

export default function PhoneEntryPage() {
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
        router.push(`/otp?phone=${phone}`)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [phone, validate, router])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
        <SlideUp delay={reduced ? 0 : 0.1} className="mb-8">
          <h1 className="text-[26px] font-bold text-text tracking-tight mb-2">
            {t('phoneEntry.title')}
          </h1>
          <p className="text-[15px] text-text-muted leading-relaxed">
            {t('phoneEntry.subtitle')}
          </p>
        </SlideUp>

        <SlideUp delay={reduced ? 0 : 0.2}>
          <form onSubmit={handleSubmit}>
            <motion.div
              animate={{
                borderColor: error ? '#DC2626' : focused ? '#8A1B57' : '#E5E5E5',
              }}
              transition={{ duration: reduced ? 0 : 0.2, ease: 'easeOut' }}
              className="flex items-center bg-surface rounded-xl border-[1.5px] h-14 px-4 mb-2"
            >
              <div className="flex items-center gap-2 pr-3 border-r border-border mr-3">
                <span className="text-lg">🇳🇵</span>
                <span className="text-base font-semibold text-text">+977</span>
              </div>
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={handleChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="98XXXXXXXX"
                maxLength={10}
                className="flex-1 text-base font-medium text-text bg-transparent outline-none placeholder:text-text-tertiary tracking-wider"
                aria-label="Phone number"
                aria-invalid={!!error}
              />
            </motion.div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  key="error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-[13px] text-error mt-1"
                >
                  {error}
                </motion.p>
              )}
              {alreadySent && !error && (
                <motion.p
                  key="sent"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-[13px] text-primary mt-1"
                >
                  {t('phoneEntry.alreadySent')}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={!isValid || loading}
              whileHover={reduced || !isValid ? {} : { scale: 1.02 }}
              whileTap={reduced || !isValid ? {} : { scale: 0.97 }}
              className="w-full bg-primary text-white h-13 rounded-xl font-bold text-base mt-6 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center gap-1.5">
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                    className="w-2 h-2 rounded-full bg-white/60"
                  />
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 rounded-full bg-white/60"
                  />
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                    className="w-2 h-2 rounded-full bg-white/60"
                  />
                </div>
              ) : (
                t('phoneEntry.continue')
              )}
            </motion.button>
          </form>

          <p className="text-xs text-text-tertiary text-center mt-4 leading-relaxed">
            {t('phoneEntry.termsPrefix')}{' '}
            <a href="/terms" className="text-primary font-medium hover:underline">{t('phoneEntry.terms')}</a>
            {' '}{t('phoneEntry.and')}{' '}
            <a href="/privacy" className="text-primary font-medium hover:underline">{t('phoneEntry.privacy')}</a>
          </p>
        </SlideUp>
      </div>
    </div>
  )
}
