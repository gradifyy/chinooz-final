'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Container, Screen, Avatar } from '@chinooz/ui-web'
import { useSessionStore } from '@chinooz/state'
import { createProfileSchema } from '@chinooz/validation'
import Snackbar from '../../../components/Snackbar'

export default function EditProfilePage() {
  const { t } = useTranslation()
  const router = useRouter()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const profile = useSessionStore(s => s.profile)
  const updateProfile = useSessionStore(s => s.updateProfile)

  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showSnackbar, setShowSnackbar] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) router.replace('/phone-entry')
  }, [isLoggedIn])

  const handleSave = useCallback(() => {
    const result = createProfileSchema.safeParse({ name, email, language: 'en' })
    if (!result.success) {
      const e: Record<string, string> = {}
      result.error.issues.forEach(i => {
        if (i.path[0] === 'name') e.name = t('editProfile.nameRequired')
        if (i.path[0] === 'email') e.email = t('editProfile.invalidEmail')
      })
      setErrors(e)
      return
    }
    setErrors({})
    setSaving(true)
    setTimeout(() => {
      updateProfile({ name: name.trim(), email: email.trim() })
      setSaving(false)
      setShowSnackbar(true)
    }, 500)
  }, [name, email, updateProfile, t])

  const isValid = name.trim().length >= 2

  if (!isLoggedIn) return null

  return (
    <Screen>
      <Container className="py-6 max-w-[600px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors" aria-label={t('common.back')}>
            <span className="text-xl text-text">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">{t('editProfile.title')}</h1>
        </div>

        <div className="flex flex-col items-center gap-3 mb-6">
          <Avatar source={profile.avatarUri} name={profile.name} size="xl" />
          <button className="text-sm font-semibold text-primary hover:underline" aria-label={t('editProfile.changePhoto')}>
            {t('editProfile.changePhoto')}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('editProfile.fullName')} *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('editProfile.fullNamePlaceholder')}
              className={`w-full h-12 bg-surface rounded-lg border-[1.5px] px-3 text-base text-text outline-none focus:border-primary transition-colors ${errors.name ? 'border-error' : 'border-border'}`}
              aria-label={t('editProfile.fullName')}
            />
            {errors.name && <p className="text-xs text-error mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('editProfile.email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('editProfile.emailPlaceholder')}
              className={`w-full h-12 bg-surface rounded-lg border-[1.5px] px-3 text-base text-text outline-none focus:border-primary transition-colors ${errors.email ? 'border-error' : 'border-border'}`}
              aria-label={t('editProfile.email')}
            />
            {errors.email && <p className="text-xs text-error mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('editProfile.phone')}</label>
            <div className="w-full h-12 bg-background rounded-lg border-[1.5px] border-border px-3 flex items-center">
              <span className="text-base text-text-muted">{profile.name ? '+977-9841234567' : '—'}</span>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="w-full h-12 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            aria-label={saving ? t('editProfile.saving') : t('editProfile.save')}
          >
            {saving ? t('editProfile.saving') : t('editProfile.save')}
          </button>
        </div>
      </Container>

      <Snackbar visible={showSnackbar} message={t('editProfile.saved')} onDismiss={() => setShowSnackbar(false)} />
    </Screen>
  )
}
