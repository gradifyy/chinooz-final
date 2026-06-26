'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { createProfileSchema } from '@chinooz/validation'
import { useSessionStore } from '@chinooz/state'
import { useUIStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import { SlideUp } from '@chinooz/ui-web'
import { getInitials } from '@chinooz/utils'

export default function CreateProfilePage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()

  const profile = useSessionStore(s => s.profile)
  const updateProfile = useSessionStore(s => s.updateProfile)
  const markProfileComplete = useSessionStore(s => s.markProfileComplete)
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const profileComplete = useSessionStore(s => s.profileComplete)
  const setLocale = useUIStore(s => s.setLocale)
  const isReturning = isLoggedIn && !profileComplete

  const [name, setName] = useState(profile.name || '')
  const [email, setEmail] = useState(profile.email || '')
  const [language, setLanguage] = useState<'en' | 'ne'>(profile.language || 'en')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const validate = useCallback(() => {
    const result = createProfileSchema.safeParse({ name, email, language })
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      result.error.issues.forEach(issue => {
        const field = issue.path[0] as string
        newErrors[field] = issue.message
      })
      setErrors(newErrors)
      return false
    }
    setErrors({})
    return true
  }, [name, email, language])

  useEffect(() => {
    validate()
  }, [name, email, language])

  const isValid = name.trim().length >= 2

  const handleSave = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 400))
      updateProfile({ name: name.trim(), email: email.trim(), language })
      markProfileComplete()
      setLocale(language)
      if (i18n.isInitialized) i18n.changeLanguage(language)
      document.cookie = 'chinooz-profile-complete=1; path=/; max-age=31536000'
      router.push('/')
    } catch {
    } finally {
      setLoading(false)
    }
  }, [name, email, language, validate, updateProfile, markProfileComplete, setLocale, router])

  const handleSkip = useCallback(() => {
    if (name.trim().length >= 2) {
      updateProfile({ name: name.trim(), language })
      markProfileComplete()
      setLocale(language)
      if (i18n.isInitialized) i18n.changeLanguage(language)
      document.cookie = 'chinooz-profile-complete=1; path=/; max-age=31536000'
    }
    router.push('/')
  }, [name, language, updateProfile, markProfileComplete, setLocale, router])

  const initials = getInitials(name || '?')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full py-8">
        {isReturning && (
          <SlideUp delay={reduced ? 0 : 0.05}>
            <div className="bg-primary-50 py-3 px-4 rounded-xl mb-6">
              <p className="text-sm text-primary font-semibold text-center">
                {t('createProfile.finishPrompt')}
              </p>
            </div>
          </SlideUp>
        )}

        <SlideUp delay={reduced ? 0 : 0.1}>
          <h1 className="text-[26px] font-bold text-text tracking-tight mb-1">
            {t('createProfile.title')}
          </h1>
          <p className="text-[15px] text-text-muted leading-relaxed mb-6">
            {t('createProfile.subtitle')}
          </p>
        </SlideUp>

        <SlideUp delay={reduced ? 0 : 0.2}>
          <form onSubmit={handleSave}>
            <div className="flex flex-col items-center mb-6">
              <motion.button
                type="button"
                whileHover={reduced ? {} : { scale: 1.03 }}
                whileTap={reduced ? {} : { scale: 0.95 }}
                className="flex flex-col items-center gap-2"
              >
                <div className={`w-24 h-24 rounded-full flex items-center justify-center border-[3px] transition-colors ${
                  name.trim() ? 'bg-primary-50 border-primary' : 'bg-primary-50 border-transparent'
                }`}>
                  <span className="text-3xl font-bold text-primary">{initials}</span>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {t('createProfile.addPhoto')}
                </span>
              </motion.button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                  {t('createProfile.fullName')} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('createProfile.fullNamePlaceholder')}
                  maxLength={100}
                  autoFocus
                  className={`w-full h-13 bg-surface rounded-xl border-[1.5px] px-4 text-base text-text outline-none transition-colors focus:border-primary ${
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
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('createProfile.emailPlaceholder')}
                  className={`w-full h-13 bg-surface rounded-xl border-[1.5px] px-4 text-base text-text outline-none transition-colors focus:border-primary ${
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
                <div className="flex gap-2">
                  {(['en', 'ne'] as const).map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`flex-1 h-12 rounded-xl border-[1.5px] font-semibold text-sm transition-colors ${
                        language === lang
                          ? 'border-primary bg-primary-50 text-primary'
                          : 'border-border bg-surface text-text-muted'
                      }`}
                    >
                      {lang === 'en' ? 'English' : 'नेपाली'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={!isValid || loading}
              whileHover={reduced || !isValid ? {} : { scale: 1.02 }}
              whileTap={reduced || !isValid ? {} : { scale: 0.97 }}
              className="w-full bg-primary text-white h-13 rounded-xl font-bold text-base mt-8 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors flex items-center justify-center"
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
            </motion.button>

            <button
              type="button"
              onClick={handleSkip}
              className="w-full text-center text-sm font-medium text-text-muted mt-3 py-2 hover:text-text transition-colors"
            >
              {t('createProfile.skip')}
            </button>
          </form>
        </SlideUp>
      </div>
    </div>
  )
}
