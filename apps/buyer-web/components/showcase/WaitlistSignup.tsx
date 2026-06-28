'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { submitWaitlist, validateEmail, validatePhone, type WaitlistFormData } from '@/lib/waitlist-submit'
import { useReducedMotion } from '@chinooz/ui-web'
import { revealVariants, staggerContainerVariants, staggerItemVariants, MOTION_TOKENS, getMotionVariants } from '@/lib/motion'
import { MagneticButton } from './MagneticButton'

interface FormErrors {
  email?: string
  phone?: string
  city?: string
}

export function WaitlistSignup() {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()

  const [formData, setFormData] = useState<WaitlistFormData>({
    email: '',
    phone: '',
    city: '',
    role: 'buyer',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const confettiRef = useRef<HTMLDivElement>(null)

  // Validate individual fields
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'email':
        if (!value) return t('validation.emailRequired')
        if (!validateEmail(value)) return t('validation.emailInvalid')
        return undefined
      case 'phone':
        if (value && !validatePhone(value)) return t('validation.phoneInvalid')
        return undefined
      case 'city':
        if (value && value.length < 2) return t('validation.cityTooShort')
        return undefined
      default:
        return undefined
    }
  }

  // Handle field change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
    setSubmitError(null)
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    const emailError = validateField('email', formData.email)
    if (emailError) newErrors.email = emailError

    if (formData.phone) {
      const phoneError = validateField('phone', formData.phone)
      if (phoneError) newErrors.phone = phoneError
    }

    if (formData.city) {
      const cityError = validateField('city', formData.city)
      if (cityError) newErrors.city = cityError
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Trigger confetti animation
  const triggerConfetti = () => {
    if (prefersReducedMotion || !confettiRef.current) return

    setShowConfetti(true)
    const confettiPieces = 30

    for (let i = 0; i < confettiPieces; i++) {
      const piece = document.createElement('div')
      piece.style.position = 'fixed'
      piece.style.width = '8px'
      piece.style.height = '8px'
      piece.style.backgroundColor = ['#8A1B57', '#FF6B9D', '#FFD700', '#00D9FF'][Math.floor(Math.random() * 4)]
      piece.style.borderRadius = '50%'
      piece.style.pointerEvents = 'none'
      piece.style.zIndex = '9999'

      const startX = window.innerWidth / 2 + (Math.random() - 0.5) * 100
      const startY = window.innerHeight / 2

      piece.style.left = startX + 'px'
      piece.style.top = startY + 'px'

      document.body.appendChild(piece)

      const angle = (Math.random() * Math.PI * 2)
      const velocity = 5 + Math.random() * 5
      const vx = Math.cos(angle) * velocity
      const vy = Math.sin(angle) * velocity - 3

      let x = startX
      let y = startY
      let velY = vy
      let opacity = 1

      const animate = () => {
        x += vx
        y += velY
        velY += 0.1 // gravity
        opacity -= 0.02

        piece.style.left = x + 'px'
        piece.style.top = y + 'px'
        piece.style.opacity = opacity.toString()

        if (opacity > 0) {
          requestAnimationFrame(animate)
        } else {
          piece.remove()
        }
      }

      animate()
    }

    setTimeout(() => setShowConfetti(false), 2000)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validateForm()) return

    setIsLoading(true)

    try {
      await submitWaitlist(formData)
      setIsSuccess(true)
      triggerConfetti()
      setFormData({ email: '', phone: '', city: '', role: 'buyer' })

      // Auto-dismiss success after 5 seconds
      setTimeout(() => {
        setIsSuccess(false)
      }, 5000)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('waitlist.submitError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-pink-50">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
          >
            {t('waitlist.headline')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-lg text-gray-600"
          >
            {t('waitlist.subheadline')}
          </motion.p>
        </div>

        {/* Form Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl shadow-lg p-8 sm:p-10"
        >
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="text-center py-8"
              >
                <motion.div
                  animate={prefersReducedMotion ? {} : { scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4"
                >
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('waitlist.successTitle')}</h3>
                <p className="text-gray-600 mb-2">{t('waitlist.successMessage')}</p>
                <p className="text-sm text-gray-500">{t('waitlist.successSubtext')}</p>
              </motion.div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('waitlist.emailLabel')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    placeholder={t('waitlist.emailPlaceholder')}
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      errors.email
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-200 focus:border-magenta-500 focus:ring-magenta-500'
                    } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                  />
                  {errors.email && (
                    <motion.p
                      id="email-error"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 text-sm text-red-600"
                      role="alert"
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </div>

                {/* Phone Field */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('waitlist.phoneLabel')} <span className="text-gray-400 text-xs">{t('waitlist.optional')}</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isLoading}
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? 'phone-error' : undefined}
                    placeholder={t('waitlist.phonePlaceholder')}
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      errors.phone
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-200 focus:border-magenta-500 focus:ring-magenta-500'
                    } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                  />
                  {errors.phone && (
                    <motion.p
                      id="phone-error"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 text-sm text-red-600"
                      role="alert"
                    >
                      {errors.phone}
                    </motion.p>
                  )}
                </div>

                {/* City Field */}
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('waitlist.cityLabel')} <span className="text-gray-400 text-xs">{t('waitlist.optional')}</span>
                  </label>
                  <input
                    id="city"
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={isLoading}
                    aria-invalid={!!errors.city}
                    aria-describedby={errors.city ? 'city-error' : undefined}
                    placeholder={t('waitlist.cityPlaceholder')}
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      errors.city
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-200 focus:border-magenta-500 focus:ring-magenta-500'
                    } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                  />
                  {errors.city && (
                    <motion.p
                      id="city-error"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 text-sm text-red-600"
                      role="alert"
                    >
                      {errors.city}
                    </motion.p>
                  )}
                </div>

                {/* Role Field */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('waitlist.roleLabel')}
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-magenta-500 focus:ring-2 focus:ring-magenta-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="buyer">{t('waitlist.roleBuyer')}</option>
                    <option value="seller">{t('waitlist.roleSeller')}</option>
                    <option value="rider">{t('waitlist.roleRider')}</option>
                  </select>
                </div>

                {/* Error Message */}
                {submitError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-200 rounded-lg"
                    role="alert"
                  >
                    <p className="text-sm text-red-700">{submitError}</p>
                  </motion.div>
                )}

                {/* Submit Button */}
                <MagneticButton
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-magenta-600 hover:bg-magenta-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-magenta-500 focus:ring-offset-2 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      {t('waitlist.submitting')}
                    </span>
                  ) : (
                    t('waitlist.joinButton')
                  )}
                </MagneticButton>

                {/* Privacy Note */}
                <p className="text-xs text-gray-500 text-center">{t('waitlist.privacyNote')}</p>
              </form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Confetti container */}
        <div ref={confettiRef} />
      </div>
    </section>
  )
}
