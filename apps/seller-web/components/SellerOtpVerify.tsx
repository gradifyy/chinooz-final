'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { verifyOtp, requestOtp, __IS_DEV__ } from '@chinooz/mock-data'
import { useSellerSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import { SlideUp } from '@chinooz/ui-web'
import LanguageToggle from './LanguageToggle'

const OTP_LENGTH = 6
const RESEND_SECONDS = 60

export default function SellerOtpVerify() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') || ''
  const mode = searchParams.get('mode') || 'signup'
  const reduced = useReducedMotion()
  const login = useSellerSessionStore(s => s.login)

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resendIn, setResendIn] = useState(RESEND_SECONDS)
  const [showVerifyButton, setShowVerifyButton] = useState(false)
  const [autoSubmitFailed, setAutoSubmitFailed] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setInterval(() => setResendIn(s => s - 1), 1000)
    return () => clearInterval(timer)
  }, [resendIn])

  const handleVerify = useCallback(async (code: string) => {
    if (loading) return
    setLoading(true)
    setError('')

    try {
      const result = await verifyOtp(phone, code)
      if (result.success) {
        setSuccess(true)
        if (mode === 'login') {
          login(result.userId || 'seller-1', 'Chinooz Seller')
          document.cookie = 'chinooz-seller-logged-in=1; path=/; max-age=31536000'
          setTimeout(() => router.push('/dashboard'), 800)
        } else {
          document.cookie = 'chinooz-seller-verified=1; path=/; max-age=600'
          setTimeout(() => router.push(`/account-setup?phone=${phone}`), 800)
        }
      } else {
        setError(result.error || t('seller.auth.invalidCode'))
        setAutoSubmitFailed(true)
        setShowVerifyButton(true)
      }
    } catch {
      setError(t('seller.auth.invalidCode'))
      setAutoSubmitFailed(true)
      setShowVerifyButton(true)
    } finally {
      setLoading(false)
    }
  }, [phone, mode, login, router, t, loading])

  const handleChange = useCallback((value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setError('')

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    const code = next.join('')
    if (code.length === OTP_LENGTH && next.every(d => d.length === 1)) {
      if (!autoSubmitFailed) {
        handleVerify(code)
      }
    }
  }, [digits, autoSubmitFailed, handleVerify])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
      setAutoSubmitFailed(false)
      setShowVerifyButton(false)
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }, [digits])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (pasted.length === OTP_LENGTH) {
      const next = pasted.split('')
      setDigits(next)
      setError('')
      if (!autoSubmitFailed) {
        handleVerify(pasted)
      }
    }
  }, [autoSubmitFailed, handleVerify])

  const handleResend = useCallback(async () => {
    if (resendIn > 0) return
    try {
      await requestOtp(phone)
      setResendIn(RESEND_SECONDS)
      setDigits(Array(OTP_LENGTH).fill(''))
      setError('')
      setAutoSubmitFailed(false)
      setShowVerifyButton(false)
      inputRefs.current[0]?.focus()
    } catch {}
  }, [resendIn, phone])

  const handleChangeNumber = useCallback(() => {
    router.push(mode === 'login' ? '/login' : '/signup')
  }, [router, mode])

  const allFilled = digits.every(d => d.length === 1)
  const subtitleKey = mode === 'login' ? 'seller.auth.otpLoginSubtitle' : 'seller.auth.otpSignupSubtitle'
  const successKey = mode === 'login' ? 'seller.auth.successLogin' : 'seller.auth.successSignup'

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="absolute top-0 right-0 p-4 z-10">
        <LanguageToggle />
      </div>

      {__IS_DEV__ && (
        <div className="bg-warning-light border-b border-warning py-2 px-4">
          <p className="text-xs font-semibold text-[#92400E] text-center">
            {t('seller.auth.devBanner')}
          </p>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center px-6 max-w-[440px] mx-auto w-full">
        <SlideUp delay={reduced ? 0 : 0.1}>
          <button
            onClick={handleChangeNumber}
            className="text-sm font-semibold text-primary mb-4 hover:underline"
          >
            ← {t('seller.auth.changeNumber')}
          </button>
          <h1 className="text-[26px] font-bold text-text tracking-tight mb-2">
            {t('seller.auth.otpTitle')}
          </h1>
          <button onClick={handleChangeNumber} className="text-left">
            <p className="text-[15px] text-text-muted leading-relaxed">
              {t(subtitleKey)}{' '}
              <span className="font-semibold text-text">+977 {phone}</span>
            </p>
          </button>
        </SlideUp>

        <SlideUp delay={reduced ? 0 : 0.2}>
          <motion.div
            animate={error && !reduced ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex gap-2.5 justify-center mt-5"
            onPaste={handlePaste}
          >
            {digits.map((digit, i) => (
              <motion.input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(e.target.value, i)}
                onKeyDown={e => handleKeyDown(e, i)}
                disabled={success}
                animate={{
                  scale: digit && !reduced ? [1, 1.08, 1] : 1,
                }}
                transition={{ duration: reduced ? 0 : 0.2 }}
                className={`w-12 h-12 text-center text-2xl font-bold rounded-md border-2 bg-surface outline-none transition-colors ${
                  error
                    ? 'border-error text-error'
                    : digit
                    ? 'border-primary text-primary'
                    : 'border-border text-text'
                }`}
                aria-label={t('seller.auth.digitAria', { n: i + 1 })}
              />
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                role="alert"
                className="text-[14px] text-error text-center mt-3 font-medium"
              >
                {error}
              </motion.p>
            )}
            {success && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                role="alert"
                className="flex items-center justify-center gap-2 mt-3"
              >
                <span className="text-success text-lg font-bold">✓</span>
                <span className="text-success font-semibold">{t(successKey)}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {(showVerifyButton || (allFilled && !autoSubmitFailed)) && !success && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleVerify(digits.join(''))}
              disabled={loading}
              className="w-full bg-primary text-white h-[52px] rounded-md font-semibold text-base mt-6 disabled:opacity-50 hover:bg-primary-dark transition-colors flex items-center justify-center"
              aria-label={t('seller.auth.verify')}
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
                t('seller.auth.verify')
              )}
            </motion.button>
          )}

          <div className="text-center mt-5">
            {resendIn > 0 ? (
              <motion.p
                key={resendIn}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                className="text-xs font-medium text-text-muted"
                aria-label={t('seller.auth.resendDisabled', { seconds: resendIn })}
              >
                {t('seller.auth.resendIn', { seconds: resendIn })}
              </motion.p>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleResend}
                className="text-sm font-semibold text-primary hover:underline"
                aria-label={t('seller.auth.resendAria')}
              >
                {t('seller.auth.resend')}
              </motion.button>
            )}
          </div>
        </SlideUp>
      </div>
    </div>
  )
}
