'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Container, Screen } from '@chinooz/ui-web'
import { useSessionStore, useUIStore } from '@chinooz/state'
import type { Locale } from '@chinooz/state'
import { i18n } from '@chinooz/i18n'

function DeleteConfirmDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  const { t } = useTranslation()
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  useEffect(() => { if (open) setTimeout(() => cancelRef.current?.focus(), 50) }, [open])
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl p-6 w-full max-w-[360px] shadow-xl">
        <h2 className="text-lg font-semibold text-text mb-2">{t('settings.deleteTitle')}</h2>
        <p className="text-sm text-text-muted leading-5 mb-6">{t('settings.deleteMsg')}</p>
        <div className="flex gap-3">
          <button ref={cancelRef} onClick={onClose} className="flex-1 h-11 rounded-xl bg-background text-sm font-semibold text-text hover:bg-border-light transition-colors" aria-label={t('common.cancel')}>
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} className="flex-1 h-11 rounded-xl bg-error text-white text-sm font-semibold hover:bg-red-700 transition-colors" aria-label={t('settings.deleteConfirm')}>
            {t('settings.deleteConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const logout = useSessionStore(s => s.logout)
  const locale = useUIStore(s => s.locale)
  const setLocale = useUIStore(s => s.setLocale)

  const [ordersNotif, setOrdersNotif] = useState(true)
  const [dealsNotif, setDealsNotif] = useState(true)
  const [messagesNotif, setMessagesNotif] = useState(true)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) router.replace('/phone-entry')
  }, [isLoggedIn])

  const handleLanguageChange = useCallback((lang: Locale) => {
    setLocale(lang)
    i18n.changeLanguage(lang)
  }, [setLocale])

  const handleDeleteAccount = useCallback(() => {
    setShowDelete(false)
    logout()
    router.replace('/onboarding')
  }, [logout, router])

  if (!isLoggedIn) return null

  return (
    <Screen>
      <Container className="py-6 max-w-[600px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors" aria-label={t('common.back')}>
            <span className="text-xl text-text">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">{t('settings.title')}</h1>
        </div>

        <div className="space-y-5">
          {/* Language */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase pl-4 mb-2">{t('settings.language').toUpperCase()}</p>
            <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3">
                <p className="text-base font-medium text-text">{t('settings.language')}</p>
                <p className="text-sm text-text-muted">{t('settings.languageDesc')}</p>
              </div>
              <div className="px-4 pb-3">
                <div className="flex bg-background rounded-full h-10">
                  {([['en', 'English'], ['ne', 'नेपाली']] as [Locale, string][]).map(([key, label]) => {
                    const isActive = locale === key
                    return (
                      <button
                        key={key}
                        onClick={() => handleLanguageChange(key)}
                        className={`flex-1 rounded-full text-sm font-semibold transition-colors ${isActive ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}
                        role="tab"
                        aria-selected={isActive}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase pl-4 mb-2">{t('settings.notifications').toUpperCase()}</p>
            <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
              {[
                { key: 'orders', label: t('settings.ordersNotif'), desc: t('settings.ordersNotifDesc'), value: ordersNotif, setter: setOrdersNotif },
                { key: 'deals', label: t('settings.dealsNotif'), desc: t('settings.dealsNotifDesc'), value: dealsNotif, setter: setDealsNotif },
                { key: 'messages', label: t('settings.messagesNotif'), desc: t('settings.messagesNotifDesc'), value: messagesNotif, setter: setMessagesNotif },
              ].map((item, i) => (
                <React.Fragment key={item.key}>
                  {i > 0 && <div className="h-px bg-[#E5E5E5] ml-4" />}
                  <div className="flex items-center justify-between px-4 py-3 min-h-[56px]">
                    <div className="flex-1 mr-3">
                      <p className="text-base font-medium text-text">{item.label}</p>
                      <p className="text-sm text-text-muted">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => item.setter(!item.value)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${item.value ? 'bg-primary' : 'bg-border'}`}
                      role="switch"
                      aria-checked={item.value}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${item.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Appearance */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase pl-4 mb-2">{t('settings.appearance').toUpperCase()}</p>
            <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 min-h-[56px] opacity-50">
                <p className="text-base font-medium text-text">🌙 {t('settings.darkMode')}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">{t('settings.comingSoon')}</span>
                  <div className="relative w-11 h-6 rounded-full bg-border">
                    <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-text-tertiary shadow" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase pl-4 mb-2">{t('settings.account').toUpperCase()}</p>
            <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
              <button onClick={() => router.push('/phone-entry')} className="flex items-center justify-between w-full h-14 px-4 hover:bg-background transition-colors text-left" aria-label={t('settings.changePhone')}>
                <span className="text-base font-medium text-text">{t('settings.changePhone')}</span>
                <span className="text-lg text-text-tertiary font-light">›</span>
              </button>
              <div className="h-px bg-[#E5E5E5] ml-4" />
              <button onClick={() => setShowDelete(true)} className="flex items-center justify-between w-full h-14 px-4 hover:bg-red-50 transition-colors text-left" aria-label={t('settings.deleteAccount')}>
                <span className="text-base font-medium text-error">{t('settings.deleteAccount')}</span>
                <span className="text-lg text-text-tertiary font-light">›</span>
              </button>
            </div>
          </div>
        </div>
      </Container>

      <DeleteConfirmDialog open={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDeleteAccount} />
    </Screen>
  )
}
