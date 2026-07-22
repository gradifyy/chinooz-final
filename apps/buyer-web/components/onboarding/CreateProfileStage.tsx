'use client'

import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { createProfileSchema } from '@chinooz/validation'
import { useSessionStore, useUIStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import { getInitials } from '@chinooz/utils'
import { MagneticButton } from './MagneticButton'

const EASE_OUT = [0.16, 1, 0.3, 1] as const

interface CreateProfileStageProps {
  onComplete: () => void
}

export function CreateProfileStage({ onComplete }: CreateProfileStageProps) {
  const { t, i18n } = useTranslation()
  const reduced = useReducedMotion()

  const profile = useSessionStore((s) => s.profile)
  const updateProfile = useSessionStore((s) => s.updateProfile)
  const markProfileComplete = useSessionStore((s) => s.markProfileComplete)
  const isLoggedIn = useSessionStore((s) => s.isLoggedIn)
  const profileComplete = useSessionStore((s) => s.profileComplete)
  const setLocale = useUIStore((s) => s.setLocale)
  const isReturning = isLoggedIn && !profileComplete

  const [name, setName] = useState(profile.name || '')
  const [email, setEmail] = useState(profile.email || '')
  const [language, setLanguage] = useState<'en' | 'ne'>(profile.language || 'en')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const isValid = name.trim().length >= 2

  const handleSave = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!isValid) {
        setErrors({ name: t('createProfile.nameRequired') })
        return
      }

      const result = createProfileSchema.safeParse({ name, email, language })
      if (!result.success) {
        const newErrors: Record<string, string> = {}
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as string
          newErrors[field] = issue.message
        })
        setErrors(newErrors)
        return
      }

      setLoading(true)
      try {
        await new Promise((r) => setTimeout(r, 400))
        updateProfile({ name: name.trim(), email: email.trim(), language })
        markProfileComplete()
        setLocale(language)
        if (i18n.isInitialized) i18n.changeLanguage(language)
        await fetch('/api/auth/session', { method: 'PATCH' })
        onComplete()
      } catch {
        /* noop */
      } finally {
        setLoading(false)
      }
    },
    [name, email, language, isValid, t, updateProfile, markProfileComplete, setLocale, i18n, onComplete]
  )

  const handleSkip = useCallback(() => {
    if (name.trim().length >= 2) {
      updateProfile({ name: name.trim(), language })
      markProfileComplete()
      setLocale(language)
      if (i18n.isInitialized) i18n.changeLanguage(language)
      void fetch('/api/auth/session', { method: 'PATCH' })
    }
    onComplete()
  }, [name, language, updateProfile, markProfileComplete, setLocale, i18n, onComplete])

  const initials = getInitials(name || '?')

  return (
    <motion.div
      className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-10 overflow-y-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.4, ease: EASE_OUT } }}
      transition={reduced ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 }}
    >
      <div className="w-full max-w-md">
        {isReturning && (
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.4, ease: EASE_OUT }}
            className="bg-white/10 border border-white/20 rounded-xl mb-4 py-3 px-4"
          >
            <p className="text-sm text-white font-semibold text-center">
              {t('createProfile.finishPrompt')}
            </p>
          </motion.div>
        )}

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
            className="mb-6"
          >
            <h1 className="text-2xl font-bold text-text tracking-tight mb-1">
              {t('createProfile.title')}
            </h1>
            <p className="text-text-muted text-sm leading-relaxed">
              {t('createProfile.subtitle')}
            </p>
          </motion.div>

          <form onSubmit={handleSave}>
            <div className="flex flex-col items-center mb-6">
              <motion.div
                animate={reduced ? {} : { scale: name ? [1, 1.05, 1] : 1 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
                className={`w-20 h-20 rounded-full flex items-center justify-center border-[3px] transition-colors ${
                  name.trim() ? 'bg-primary-50 border-primary' : 'bg-primary-50 border-transparent'
                }`}
              >
                <span className="text-2xl font-bold text-primary">{initials}</span>
              </motion.div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                  {t('createProfile.fullName')} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (errors.name) setErrors({})
                  }}
                  placeholder={t('createProfile.fullNamePlaceholder')}
                  maxLength={100}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  className={`w-full h-12 bg-background rounded-xl border-medium px-4 text-base text-text outline-none transition-colors focus:border-primary ${
                    errors.name ? 'border-error' : 'border-border'
                  }`}
                  aria-label={t('createProfile.fullName')}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-error mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                  {t('createProfile.email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) setErrors({})
                  }}
                  placeholder={t('createProfile.emailPlaceholder')}
                  className={`w-full h-12 bg-background rounded-xl border-medium px-4 text-base text-text outline-none transition-colors focus:border-primary ${
                    errors.email ? 'border-error' : 'border-border'
                  }`}
                  aria-label={t('createProfile.email')}
                />
                {errors.email && (
                  <p className="text-xs text-error mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                  {t('createProfile.language')}
                </label>
                <div className="flex gap-2 p-1 bg-background rounded-xl">
                  {(['en', 'ne'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className="flex-1 h-11 rounded-lg font-semibold text-sm relative"
                    >
                      {language === lang && (
                        <motion.div
                          layoutId="lang-indicator"
                          className="absolute inset-0 rounded-lg bg-white shadow-sm"
                          transition={{
                            type: 'spring',
                            damping: 25,
                            stiffness: 300,
                          }}
                        />
                      )}
                      <span
                        className={`relative z-10 transition-colors ${
                          language === lang ? 'text-primary' : 'text-text-muted'
                        }`}
                      >
                        {lang === 'en' ? 'English' : 'नेपाली'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <MagneticButton
              type="submit"
              disabled={!isValid || loading}
              onClick={() => handleSave()}
              className="w-full bg-primary text-white h-12 rounded-xl font-bold text-base mt-8 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors flex items-center justify-center"
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
                t('createProfile.save')
              )}
            </MagneticButton>

            <button
              type="button"
              onClick={handleSkip}
              className="w-full text-center text-sm font-medium text-text-muted mt-3 py-2 hover:text-text transition-colors"
            >
              {t('createProfile.skip')}
            </button>
          </form>
        </motion.div>
      </div>
    </motion.div>
  )
}
