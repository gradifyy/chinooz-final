'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { nepaliPhoneSchema } from '@chinooz/validation'
import { requestOtp } from '@chinooz/mock-data'
import { useReducedMotion } from '@chinooz/ui-web'
import { colors } from '@chinooz/theme'
import { MagneticButton } from './MagneticButton'

const EASE_OUT = [0.16, 1, 0.3, 1] as const

interface PhoneEntryStageProps {
  onComplete: (phone: string) => void
}

export function PhoneEntryStage({ onComplete }: PhoneEntryStageProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const inputRef = useRef<HTMLInputElement>(null)

  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 400)
    return () => clearTimeout(timer)
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
  }, [])

  const isValid = phone.length === 10 && (phone.startsWith('97') || phone.startsWith('98'))

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      const validationError = validate(phone)
      if (validationError) {
        setError(validationError)
        return
      }

      setLoading(true)
      setError('')

      try {
        const result = await requestOtp(phone)
        if (result.message.includes('already sent')) {
          setError(t('phoneEntry.alreadySent'))
        } else {
          setSuccess(true)
          setTimeout(() => onComplete(phone), 700)
        }
      } catch {
        setError(t('phoneEntry.genericError'))
      } finally {
        setLoading(false)
      }
    },
    [phone, validate, onComplete, t]
  )

  return (
    <motion.div
      className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-10"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.35, ease: EASE_OUT } }}
      transition={reduced ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 }}
    >
      <div className="w-full max-w-md">
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.5, ease: EASE_OUT, delay: 0.1 }}
          className="bg-white rounded-3xl shadow-xl p-8"
        >
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.4, ease: EASE_OUT, delay: 0.2 }}
            className="mb-8"
          >
            <h1 className="text-2xl font-bold text-text tracking-tight mb-2">
              {t('phoneEntry.title')}
            </h1>
            <p className="text-text-muted text-sm leading-relaxed">
              {t('phoneEntry.subtitle')}
            </p>
          </motion.div>

          <form onSubmit={handleSubmit}>
            <motion.div
              animate={
                reduced
                  ? {}
                  : {
                      borderColor: error ? colors.error : focused ? colors.primary : 'var(--color-border)',
                    }
              }
              transition={{ duration: reduced ? 0 : 0.2 }}
              className="flex items-center bg-background rounded-xl border-medium h-14 px-4 mb-2"
            >
              <div className="flex items-center gap-2 pr-3 border-r border-border mr-3">
                <span className="text-lg">🇳🇵</span>
                <span className="text-base font-semibold text-text">+977</span>
              </div>
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={handleChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="98XXXXXXXX"
                maxLength={10}
                disabled={success}
                className="flex-1 text-base font-medium text-text bg-transparent outline-none placeholder:text-text-muted tracking-wider"
                aria-label={t('phoneEntry.inputLabel')}
                aria-invalid={!!error}
              />
              <AnimatePresence>
                {success && (
                  <motion.svg
                    key="check"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <motion.path
                      d="M5 13l4 4L19 7"
                      stroke={colors.success}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  key="error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-sm text-error mt-1"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <MagneticButton
              type="submit"
              disabled={!isValid || loading || success}
              onClick={() => handleSubmit()}
              className="w-full bg-primary text-white h-12 rounded-xl font-bold text-base mt-6 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors flex items-center justify-center"
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
                t('phoneEntry.continue')
              )}
            </MagneticButton>
          </form>

          <p className="text-xs text-text-tertiary text-center mt-4 leading-relaxed">
            {t('phoneEntry.termsPrefix')}{' '}
            <a href="/terms" className="text-primary font-medium hover:underline">
              {t('phoneEntry.terms')}
            </a>{' '}
            {t('phoneEntry.and')}{' '}
            <a href="/privacy" className="text-primary font-medium hover:underline">
              {t('phoneEntry.privacy')}
            </a>
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}
