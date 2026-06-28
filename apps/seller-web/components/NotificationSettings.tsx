'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Container, Screen } from '@chinooz/ui-web'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import {
  SELLER_NOTIFICATION_DEFAULTS,
  SELLER_NOTIFICATION_CATEGORIES,
  SELLER_NOTIFICATION_CHANNELS,
  SELLER_LANDING_TABS,
  SELLER_CURRENCIES,
  type NotificationPreferences,
  type NotificationChannel,
  type NotificationCategory,
} from '@chinooz/mock-data'

function cloneDefaults(): NotificationPreferences {
  return JSON.parse(JSON.stringify(SELLER_NOTIFICATION_DEFAULTS))
}

export default function NotificationSettings() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const updateSeller = useSellerSessionStore(s => s.updateSeller)
  const sellerLanguage = useSellerSessionStore(s => s.seller.language)

  const [prefs, setPrefs] = useState<NotificationPreferences>(() => ({
    ...cloneDefaults(),
    language: sellerLanguage || 'en',
  }))
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirtyDialog, setDirtyDialog] = useState<null | (() => void)>(null)
  const [announce, setAnnounce] = useState('')

  const initialRef = useRef<NotificationPreferences>(prefs)

  useEffect(() => {
    analytics.screen({ name: 'seller-settings-notifications' })
  }, [])

  const dirty = useMemo(() => JSON.stringify(prefs) !== JSON.stringify(initialRef.current), [prefs])

  const toggleChannel = useCallback((cat: string, ch: NotificationChannel) => {
    setPrefs(prev => ({
      ...prev,
      toggles: {
        ...prev.toggles,
        [cat]: { ...prev.toggles[cat], [ch]: !prev.toggles[cat][ch] },
      },
    }))
    setSaved(false)
  }, [])

  const setField = useCallback(<K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  const handleLanguageChange = useCallback((lang: 'en' | 'ne') => {
    setField('language', lang)
    i18n.changeLanguage(lang)
    updateSeller({ language: lang })
    const label = lang === 'ne' ? t('seller.settings.notifications.languageNe') : t('seller.settings.notifications.languageEn')
    setAnnounce(t('seller.settings.notifications.languageAnnounce', { lang: label }))
    setTimeout(() => setAnnounce(''), 2000)
  }, [i18n, updateSeller, t, setField])

  const handleSave = useCallback(() => {
    setSaving(true)
    setTimeout(() => {
      initialRef.current = prefs
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }, 600)
  }, [prefs])

  const guardedNav = useCallback((fn: () => void) => {
    if (dirty) setDirtyDialog(() => fn)
    else fn()
  }, [dirty])

  return (
    <Screen>
      <Container>
        <div className="py-6 md:py-8">
          <div className="xl:mx-auto xl:max-w-4xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <Link
                href="/settings"
                onClick={(e) => { e.preventDefault(); guardedNav(() => router.push('/settings')) }}
                className="inline-flex min-touch items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-text-muted hover:bg-background hover:text-text transition-colors"
              >
                <ChevronLeft size={18} aria-hidden="true" />
                <span>{t('seller.settings.notifications.backToSettings')}</span>
              </Link>
              <h1 className="text-lg font-semibold text-text md:text-xl">{t('seller.settings.notifications.editTitle')}</h1>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${dirty ? 'text-warning' : 'text-text-tertiary'}`}>
                {dirty && <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />}
                {dirty ? t('seller.settings.notifications.dirtyIndicator') : ''}
              </span>
            </div>

            {/* Live region for announcements */}
            <div className="sr-only" aria-live="assertive" role="status">{announce}</div>

            <div className="space-y-6">
              {/* Toggle matrix */}
              <Section title={t('seller.settings.notifications.sectionToggles')}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                        <th scope="col" className="py-2 pr-3 font-semibold">{t('seller.settings.notifications.colCategory')}</th>
                        {SELLER_NOTIFICATION_CHANNELS.map(ch => (
                          <th key={ch.id} scope="col" className="py-2 px-3 text-center font-semibold">{t(ch.labelKey)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {SELLER_NOTIFICATION_CATEGORIES.map(cat => (
                        <tr key={cat.id} className="border-b border-border-light last:border-0">
                          <td className="py-3 pr-3 font-medium text-text">{t(cat.labelKey)}</td>
                          {SELLER_NOTIFICATION_CHANNELS.map(ch => {
                            const on = prefs.toggles[cat.id]?.[ch.id] ?? false
                            return (
                              <td key={ch.id} className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={on}
                                  aria-label={t('seller.settings.notifications.toggleAria', { category: t(cat.labelKey), channel: t(ch.labelKey) })}
                                  onClick={() => toggleChannel(cat.id, ch.id)}
                                  className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-border'}`}
                                >
                                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'left-[22px]' : 'left-0.5'}`} />
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* Quiet hours */}
              <Section title={t('seller.settings.notifications.sectionQuietHours')}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('seller.settings.notifications.quietStart')} hint={t('seller.settings.notifications.quietStartHint')}>
                    <input
                      type="time"
                      value={prefs.quietHoursStart}
                      onChange={(e) => setField('quietHoursStart', e.target.value)}
                      aria-label={t('seller.settings.notifications.quietAriaStart')}
                      className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                    />
                  </Field>
                  <Field label={t('seller.settings.notifications.quietEnd')} hint={t('seller.settings.notifications.quietEndHint')}>
                    <input
                      type="time"
                      value={prefs.quietHoursEnd}
                      onChange={(e) => setField('quietHoursEnd', e.target.value)}
                      aria-label={t('seller.settings.notifications.quietAriaEnd')}
                      className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                    />
                  </Field>
                </div>
              </Section>

              {/* Summary digests */}
              <Section title={t('seller.settings.notifications.sectionSummary')}>
                <ToggleRow
                  label={t('seller.settings.notifications.dailySummary')}
                  hint={t('seller.settings.notifications.dailySummaryHint')}
                  on={prefs.dailySummary}
                  onToggle={() => setField('dailySummary', !prefs.dailySummary)}
                  ariaLabel={t('seller.settings.notifications.summaryAria', { label: t('seller.settings.notifications.dailySummary') })}
                />
                <ToggleRow
                  label={t('seller.settings.notifications.weeklySummary')}
                  hint={t('seller.settings.notifications.weeklySummaryHint')}
                  on={prefs.weeklySummary}
                  onToggle={() => setField('weeklySummary', !prefs.weeklySummary)}
                  ariaLabel={t('seller.settings.notifications.summaryAria', { label: t('seller.settings.notifications.weeklySummary') })}
                />
              </Section>

              {/* App preferences */}
              <Section title={t('seller.settings.notifications.sectionPreferences')}>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-text">{t('seller.settings.notifications.language')}</label>
                  <div className="flex gap-3">
                    {(['en', 'ne'] as const).map(lang => {
                      const active = prefs.language === lang
                      const label = lang === 'ne' ? t('seller.settings.notifications.languageNe') : t('seller.settings.notifications.languageEn')
                      return (
                        <button
                          key={lang}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={t('seller.settings.notifications.languageAria', { lang: label })}
                          onClick={() => handleLanguageChange(lang)}
                          className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors ${active ? 'border-primary bg-primary-50 text-primary' : 'border-border bg-surface text-text hover:bg-background'}`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{t('seller.settings.notifications.languageHint')}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('seller.settings.notifications.landingTab')} hint={t('seller.settings.notifications.landingTabHint')}>
                    <select
                      value={prefs.landingTab}
                      onChange={(e) => setField('landingTab', e.target.value as NotificationPreferences['landingTab'])}
                      aria-label={t('seller.settings.notifications.landingTab')}
                      className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                    >
                      {SELLER_LANDING_TABS.map(tab => (
                        <option key={tab.id} value={tab.id}>{t(tab.labelKey)}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t('seller.settings.notifications.currency')} hint={t('seller.settings.notifications.currencyHint')}>
                    <select
                      value={prefs.currency}
                      onChange={(e) => setField('currency', e.target.value as NotificationPreferences['currency'])}
                      aria-label={t('seller.settings.notifications.currency')}
                      className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                    >
                      {SELLER_CURRENCIES.map(c => (
                        <option key={c.id} value={c.id}>{t(c.labelKey)}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </Section>
            </div>
          </div>
        </div>
      </Container>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-border-light bg-surface/95 backdrop-blur">
        <Container>
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-2">
              {saved ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                  <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                  {t('seller.settings.notifications.saved')}
                </span>
              ) : dirty ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-warning">
                  <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
                  {t('seller.settings.notifications.dirtyIndicator')}
                </span>
              ) : (
                <span className="text-sm text-text-tertiary">{t('seller.settings.notifications.editSubtitle')}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setPrefs(initialRef.current); setSaved(false) }} disabled={!dirty || saving} aria-label={t('seller.settings.notifications.discard')} className="inline-flex min-touch items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-background transition-colors disabled:opacity-40">
                {t('seller.settings.notifications.discard')}
              </button>
              <button type="button" onClick={handleSave} disabled={!dirty || saving} aria-label={t('seller.settings.notifications.save')} className="inline-flex min-touch items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-dark transition-colors disabled:opacity-40">
                {saving ? t('seller.settings.notifications.saving') : t('seller.settings.notifications.save')}
              </button>
            </div>
          </div>
        </Container>
      </div>

      {/* Dirty guard */}
      {dirtyDialog && (
        <div className="fixed inset-0 z-modal flex items-center justify-center" role="dialog" aria-modal="true" aria-label={t('seller.settings.storefront.dirtyDialogTitle')}>
          <button className="absolute inset-0 bg-overlay" onClick={() => setDirtyDialog(null)} aria-label={t('seller.settings.storefront.dirtyDialogStay')} />
          <div className="relative mx-4 max-w-sm rounded-lg bg-surface p-5 shadow-xl">
            <h2 className="mb-2 text-base font-semibold text-text">{t('seller.settings.storefront.dirtyDialogTitle')}</h2>
            <p className="mb-4 text-sm text-text-secondary">{t('seller.settings.storefront.dirtyDialogBody')}</p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => { const fn = dirtyDialog; setDirtyDialog(null); handleSave(); fn?.() }} className="inline-flex min-touch items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors">{t('seller.settings.storefront.dirtyDialogSave')}</button>
              <button type="button" onClick={() => { const fn = dirtyDialog; setDirtyDialog(null); fn?.() }} className="inline-flex min-touch items-center justify-center rounded-md border border-error px-4 py-2.5 text-sm font-semibold text-error hover:bg-error-light transition-colors">{t('seller.settings.storefront.dirtyDialogDiscard')}</button>
              <button type="button" onClick={() => setDirtyDialog(null)} className="inline-flex min-touch items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-text-muted hover:text-text transition-colors">{t('seller.settings.storefront.dirtyDialogStay')}</button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border-light bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-text">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-text">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  )
}

function ToggleRow({ label, hint, on, onToggle, ariaLabel }: { label: string; hint?: string; on: boolean; onToggle: () => void; ariaLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <span className="text-sm font-medium text-text">{label}</span>
        {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={ariaLabel}
        onClick={onToggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-border'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}
