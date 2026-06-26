'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { otpSchema } from '@chinooz/validation'
import { verifyOtp } from '@chinooz/mock-data'
import { useSessionStore } from '@chinooz/state'
import { useReducedMotion, SlideUp } from '@chinooz/ui-web'

const OTP_LENGTH = 6

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
  const [resendIn, setResendIn] = useState(60)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setInterval(() => setResendIn(s => s - 1), 1000)
    return () => clearInterval(timer)
  }, [resendIn])

  const handleChange = useCallback((value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setError('')

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    if (next.every(d => d.length === 1)) {
      handleSubmit(next.join(''))
    }
  }, [digits])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }, [digits])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (pasted.length === OTP_LENGTH) {
      const next = pasted.split('')
      setDigits(next)
      setError('')
      handleSubmit(pasted)
    }
  }, [])

  const handleSubmit = useCallback(async (code: string) => {
    const validation = otpSchema.safeParse({ otp: code })
    if (!validation.success) {
      setError(t('otp.invalidCode'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await verifyOtp(phone, code)
      if (result.success) {
        login(result.userId || 'user-1', 'Ayush Chaudhary')
        document.cookie = 'chinooz-logged-in=1; path=/; max-age=31536000'
        router.push('/')
      } else {
        setError(t('otp.invalidCode'))
        setDigits(Array(OTP_LENGTH).fill(''))
        inputRefs.current[0]?.focus()
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [phone, login, router, t])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
        <SlideUp delay={reduced ? 0 : 0.1} className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-sm font-semibold text-primary mb-4 hover:underline"
          >
            ← {t('otp.changeNumber')}
          </button>
          <h1 className="text-[26px] font-bold text-text tracking-tight mb-2">
            {t('otp.title')}
          </h1>
          <p className="text-[15px] text-text-muted leading-relaxed">
            {t('otp.subtitle')} +977 {phone}
          </p>
        </SlideUp>

        <SlideUp delay={reduced ? 0 : 0.2}>
          <div className="flex gap-2 justify-center mb-3" onPaste={handlePaste}>
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
                animate={{
                  borderColor: digit ? '#8A1B57' : '#E5E5E5',
                  backgroundColor: digit ? '#F8EAF1' : '#FFFFFF',
                }}
                transition={{ duration: reduced ? 0 : 0.15 }}
                className="w-12 h-14 rounded-xl border-[1.5px] text-center text-xl font-bold text-text bg-surface outline-none focus:border-primary"
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[13px] text-error text-center mb-3"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            onClick={() => handleSubmit(digits.join(''))}
            disabled={digits.some(d => !d) || loading}
            whileHover={reduced ? {} : { scale: 1.02 }}
            whileTap={reduced ? {} : { scale: 0.97 }}
            className="w-full bg-primary text-white h-13 rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors flex items-center justify-center"
          >
            {loading ? (
              <div className="flex items-center gap-1.5">
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0 }} className="w-2 h-2 rounded-full bg-white/60" />
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 rounded-full bg-white/60" />
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 rounded-full bg-white/60" />
              </div>
            ) : (
              t('otp.verify')
            )}
          </motion.button>

          <div className="text-center mt-4">
            {resendIn > 0 ? (
              <p className="text-sm text-text-tertiary">{t('otp.resendIn', { seconds: resendIn })}</p>
            ) : (
              <button onClick={() => setResendIn(60)} className="text-sm font-semibold text-primary hover:underline">
                {t('otp.resend')}
              </button>
            )}
          </div>
        </SlideUp>
      </div>
    </div>
  )
}
