'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { verifyOtp, requestOtp, __IS_DEV__ } from '@chinooz/mock-data'
import { useSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import { colors } from '@chinooz/theme'
import { MagneticButton } from './MagneticButton'

const EASE_OUT = [0.16, 1, 0.3, 1] as const
const OTP_LENGTH = 6
const RESEND_SECONDS = 30

interface OtpVerifyStageProps {
  phone: string
  onComplete: () => void
  onBack: () => void
}

export function OtpVerifyStage({ phone, onComplete, onBack }: OtpVerifyStageProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const login = useSessionStore(s => s.login)

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resendIn, setResendIn] = useState(RESEND_SECONDS)
  const [showVerifyButton, setShowVerifyButton] = useState(false)
  const [autoSubmitFailed, setAutoSubmitFailed] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const timer = setTimeout(() => inputRefs.current[0]?.focus(), 400)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [resendIn])

  const handleVerify = useCallback(
    async (code: string) => {
      if (loading) return
      setLoading(true)
      setError('')

      try {
        const result = await verifyOtp(phone, code)
        if (result.success) {
          setSuccess(true)
          login(result.userId || 'user-1', '')
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: result.userId || 'user-1', phone }),
          })
          setTimeout(() => onComplete(), 800)
        } else {
          setError(result.error || t('otp.invalidCode'))
          setShakeKey((k) => k + 1)
          setAutoSubmitFailed(true)
          setShowVerifyButton(true)
        }
      } catch {
        setError(t('otp.invalidCode'))
        setShakeKey((k) => k + 1)
        setAutoSubmitFailed(true)
        setShowVerifyButton(true)
      } finally {
        setLoading(false)
      }
    },
    [phone, login, onComplete, t, loading]
  )

  const handleChange = useCallback(
    (value: string, index: number) => {
      const digit = value.replace(/\D/g, '').slice(-1)
      const next = [...digits]
      next[index] = digit
      setDigits(next)
      setError('')

      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus()
      }

      const code = next.join('')
      if (code.length === OTP_LENGTH && next.every((d) => d.length === 1)) {
        if (!autoSubmitFailed) {
          handleVerify(code)
        }
      }
    },
    [digits, autoSubmitFailed, handleVerify]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
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
    },
    [digits]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
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
    },
    [autoSubmitFailed, handleVerify]
  )

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
    } catch {
      /* noop */
    }
  }, [resendIn, phone])

  const allFilled = digits.every((d) => d.length === 1)

  return (
    <motion.div
      className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-10"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.35, ease: EASE_OUT } }}
      transition={reduced ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 }}
    >
      {process.env.NODE_ENV !== 'production' && __IS_DEV__ && (
        <div className="w-full max-w-md mb-4">
          <div className="bg-warning-light border border-warning rounded-lg py-2 px-4">
            <p className="text-xs font-semibold text-warning-text text-center">
              {t('otp.devBanner')}
            </p>
          </div>
        </div>
      )}

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
            <button
              onClick={onBack}
              className="text-sm font-semibold text-primary mb-4 hover:underline"
            >
              ← {t('otp.changeNumber')}
            </button>
            <h1 className="text-2xl font-bold text-text tracking-tight mb-2">
              {t('otp.title')}
            </h1>
            <p className="text-text-muted text-sm leading-relaxed">
              {t('otp.subtitle')}{' '}
              <span className="font-semibold text-text">+977 {phone}</span>
            </p>
          </motion.div>

          <motion.div
            key={`otp-row-${shakeKey}`}
            className="flex gap-2.5 justify-center mb-3"
            onPaste={handlePaste}
            animate={reduced ? {} : error ? { x: [0, -10, 10, -6, 6, 0] } : {}}
            transition={reduced ? { duration: 0 } : { duration: 0.4 }}
          >
            {digits.map((digit, i) => (
              <div key={i} className="flex flex-col items-center">
                <motion.input
                  ref={(el) => {
                    inputRefs.current[i] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(e.target.value, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  disabled={success}
                  animate={
                    reduced
                      ? {}
                      : {
                          scale: digit ? [1, 1.05, 1] : 1,
                        }
                  }
                  transition={{ duration: reduced ? 0 : 0.2 }}
                  className="w-12 h-14 text-center text-2xl font-bold bg-background rounded-xl border-medium outline-none transition-colors"
                  style={{
                    borderColor: error
                      ? 'var(--color-error)'
                      : digit
                        ? 'var(--color-primary)'
                        : 'var(--color-border)',
                    color: error ? 'var(--color-error)' : digit ? 'var(--color-primary)' : 'var(--color-text)',
                  }}
                  aria-label={t('a11y.otpDigit', { number: i + 1 })}
                />
              </div>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-base text-error text-center mt-3 font-medium"
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke={colors.success}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-success font-semibold">
                  {t('otp.successTitle')}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {(showVerifyButton || (allFilled && autoSubmitFailed)) && !success && (
            <MagneticButton
              onClick={() => handleVerify(digits.join(''))}
              disabled={loading}
              className="w-full bg-primary text-white h-12 rounded-xl font-bold text-base mt-6 disabled:opacity-50 hover:bg-primary-dark transition-colors flex items-center justify-center"
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
            </MagneticButton>
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
        </motion.div>
      </div>
    </motion.div>
  )
}
