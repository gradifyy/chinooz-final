'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { verifyOtp, requestOtp, __IS_DEV__ } from '@chinooz/mock-data'
import { useSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import { SlideUp } from '@chinooz/ui-web'

const OTP_LENGTH = 6
const RESEND_SECONDS = 30

export default function OtpPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') || ''
  const reduced = useReducedMotion()
  const login = useSessionStore(s => s.login)

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

  const handleVerify = useCallback(async (code: string, isAutoSubmit: boolean) => {
    if (loading) return
    setLoading(true)
    setError('')

    try {
      const result = await verifyOtp(phone, code)
      if (result.success) {
        setSuccess(true)
        login(result.userId || 'user-1', 'Ayush Chaudhary')
        document.cookie = 'chinooz-logged-in=1; path=/; max-age=31536000'
        setTimeout(() => router.push('/'), 800)
      } else {
        setError(result.error || t('otp.invalidCode'))
        setAutoSubmitFailed(true)
        setShowVerifyButton(true)
      }
    } catch {
      setError(t('otp.invalidCode'))
      setAutoSubmitFailed(true)
      setShowVerifyButton(true)
    } finally {
      setLoading(false)
    }
  }, [phone, login, router, t, loading])

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
        handleVerify(code, true)
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
        handleVerify(pasted, true)
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
    router.push('/phone-entry')
  }, [router])

  const allFilled = digits.every(d => d.length === 1)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {__IS_DEV__ && (
        <div className="bg-warning-light border-b border-warning py-2 px-4">
          <p className="text-xs font-semibold text-[#92400E] text-center">
            {t('otp.devBanner')}
          </p>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
        <SlideUp delay={reduced ? 0 : 0.1} className="mb-8">
          <button
            onClick={handleChangeNumber}
            className="text-sm font-semibold text-primary mb-4 hover:underline"
          >
            ← {t('otp.changeNumber')}
          </button>
          <h1 className="text-[26px] font-bold text-text tracking-tight mb-2">
            {t('otp.title')}
          </h1>
          <button onClick={handleChangeNumber} className="text-left">
            <p className="text-[15px] text-text-muted leading-relaxed">
              {t('otp.subtitle')}{' '}
              <span className="font-semibold text-text">+977 {phone}</span>
            </p>
          </button>
        </SlideUp>

        <SlideUp delay={reduced ? 0 : 0.2}>
          <div
            className="flex gap-3 justify-center mb-3"
            onPaste={handlePaste}
          >
            {digits.map((digit, i) => (
              <div key={i} className="flex flex-col items-center">
                <motion.input
                  ref={el => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(e.target.value, i)}
                  onKeyDown={e => handleKeyDown(e, i)}
                  disabled={success}
                  animate={{
                    scale: digit ? [1, 1.05, 1] : 1,
                    color: error ? '#DC2626' : digit ? '#8A1B57' : '#1F2937',
                  }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                  className="w-12 h-13 text-center text-2xl font-bold bg-transparent outline-none"
                  aria-label={`OTP digit ${i + 1}`}
                />
                <motion.div
                  animate={{
                    backgroundColor: error ? '#DC2626' : digit ? '#8A1B57' : '#E5E5E5',
                    scaleX: digit || error ? 1 : 0.6,
                  }}
                  transition={{ duration: reduced ? 0 : 0.2, ease: 'easeOut' }}
                  className="h-[3px] w-12 rounded-full"
                />
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
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
                className="flex items-center justify-center gap-2 mt-3"
              >
                <span className="text-success text-lg font-bold">✓</span>
                <span className="text-success font-semibold">{t('otp.successTitle')}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {(showVerifyButton || (allFilled && !autoSubmitFailed)) && !success && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleVerify(digits.join(''), false)}
              disabled={loading}
              className="w-full bg-primary text-white h-13 rounded-xl font-bold text-base mt-6 disabled:opacity-50 hover:bg-primary-dark transition-colors flex items-center justify-center"
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
                t('otp.verify')
              )}
            </motion.button>
          )}

          <div className="text-center mt-5">
            {resendIn > 0 ? (
              <motion.p
                key={resendIn}
                initial={{ opacity: 0.5, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-sm text-text-tertiary"
              >
                {t('otp.resendIn', { seconds: resendIn })}
              </motion.p>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleResend}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {t('otp.resend')}
              </motion.button>
            )}
          </div>
        </SlideUp>
      </div>
    </div>
  )
}
