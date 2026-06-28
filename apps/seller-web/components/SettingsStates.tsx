'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, WifiOff, ShieldCheck, RefreshCw } from 'lucide-react'
import { Skeleton } from '@chinooz/ui-web'

// ── Skeletons ──────────────────────────────────────────────────────────────

export function SettingsHubSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading settings">
      {/* Store header skeleton */}
      <div className="flex items-center gap-4 rounded-lg border border-border-light bg-surface p-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Grouped rows skeleton */}
      <div className="rounded-lg border border-border-light bg-surface overflow-hidden">
        {[0, 1, 2].map(g => (
          <div key={g}>
            <div className="px-4 pt-4 pb-2">
              <Skeleton className="h-3 w-24" />
            </div>
            {[0, 1].map(r => (
              <div key={r} className="flex items-center gap-3 px-4 py-3 border-t border-border-light">
                <Skeleton className="h-9 w-9 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading form">
      {[0, 1].map(s => (
        <div key={s} className="rounded-lg border border-border-light bg-surface p-5 sm:p-6">
          <Skeleton className="mb-4 h-4 w-32" />
          <div className="space-y-4">
            {[0, 1, 2].map(f => (
              <div key={f}>
                <Skeleton className="mb-1 h-3.5 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Error State ────────────────────────────────────────────────────────────

export function SettingsErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center" role="alert">
      <AlertTriangle size={32} className="mb-3 text-warning" aria-hidden="true" />
      <h2 className="text-lg font-semibold text-text">{t('seller.settings.states.loadErrorTitle')}</h2>
      <p className="mt-1 max-w-sm text-sm text-text-muted">{t('seller.settings.states.loadErrorSubtitle')}</p>
      <button
        type="button"
        onClick={onRetry}
        aria-label={t('seller.settings.states.retryAria')}
        className="mt-4 inline-flex min-touch items-center gap-1.5 rounded-md border-2 border-primary px-4 py-2 text-sm font-bold text-primary hover:bg-primary-50 transition-colors"
      >
        <RefreshCw size={14} aria-hidden="true" />
        {t('seller.settings.states.retry')}
      </button>
    </div>
  )
}

// ── Save Error Banner ──────────────────────────────────────────────────────

export function SaveErrorBanner({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-md bg-error-light px-3 py-2.5">
      <span className="text-sm font-semibold text-error">{t('seller.settings.states.saveError')}</span>
      <button type="button" onClick={onRetry} aria-label={t('seller.settings.states.retry')} className="shrink-0 rounded-md border border-error px-3 py-1 text-xs font-bold text-error hover:bg-error/10 transition-colors">
        {t('seller.settings.states.retry')}
      </button>
    </div>
  )
}

// ── Offline Banner ─────────────────────────────────────────────────────────

export function SellerOfflineBanner({ blocked }: { blocked?: boolean }) {
  const { t } = useTranslation()
  return (
    <div role="status" aria-live="polite" className="sticky top-0 z-40 flex items-center gap-2 border-b border-warning bg-warning-light px-4 py-2.5">
      <WifiOff size={16} className="shrink-0 text-warning" aria-hidden="true" />
      <span className="text-sm font-semibold text-warning">{blocked ? t('seller.settings.states.offlineBlockSensitive') : t('seller.settings.states.offlineTitle')}</span>
    </div>
  )
}

// ── Permission Denied ─────────────────────────────────────────────────────

export function PermissionDenied({ ownerName }: { ownerName?: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
        <ShieldCheck size={28} className="text-primary" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold text-text">{t('seller.settings.states.permissionDeniedTitle')}</h2>
      <p className="mt-1 max-w-sm text-sm text-text-muted">{t('seller.settings.states.permissionDeniedBody')}</p>
      <div className="mt-4 rounded-md bg-background px-4 py-3 text-left">
        <p className="text-sm font-semibold text-text">{t('seller.settings.states.permissionDeniedWhoToAsk')}</p>
        <p className="mt-0.5 text-xs text-text-muted">
          {t('seller.settings.states.permissionDeniedWhoToAskHint')}
          {ownerName ? ` — ${ownerName}` : ''}
        </p>
      </div>
    </div>
  )
}

// ── Empty State with Illustration ─────────────────────────────────────────

export function SettingsEmptyState({ title, subtitle, ctaLabel, onCta }: { title: string; subtitle: string; ctaLabel: string; onCta: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-border-light">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="20" r="18" stroke="#E5E5E5" strokeWidth="2" />
          <path d="M14 20h12M20 14v12" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-text">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-text-muted">{subtitle}</p>
      <button type="button" onClick={onCta} aria-label={ctaLabel} className="mt-4 inline-flex min-touch items-center rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark transition-colors">
        {ctaLabel}
      </button>
    </div>
  )
}

// ── Upload Error Inline ───────────────────────────────────────────────────

export function UploadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div role="alert" className="flex items-center justify-between gap-2 rounded-md bg-error-light px-3 py-2">
      <span className="text-xs font-semibold text-error">{t('seller.settings.states.uploadError')}</span>
      <button type="button" onClick={onRetry} aria-label={t('seller.settings.states.uploadRetry')} className="shrink-0 text-xs font-bold text-error hover:underline">
        {t('seller.settings.states.retry')}
      </button>
    </div>
  )
}
