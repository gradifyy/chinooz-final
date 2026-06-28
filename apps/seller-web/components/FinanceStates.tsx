'use client'

import React from 'react'
import { Skeleton } from '@chinooz/ui-web'

export function HeroSkeleton() {
  return (
    <div className="md:col-span-4 rounded-lg bg-surface border border-border-light shadow-md p-5 flex flex-col" aria-busy="true" aria-label="Loading balance">
      <Skeleton width={120} height={12} borderRadius={6} />
      <div className="mt-3"><Skeleton width={180} height={32} borderRadius={8} /></div>
      <div className="mt-4 pt-4 border-t border-border-light">
        <Skeleton width={100} height={12} borderRadius={6} />
        <div className="mt-2"><Skeleton width={140} height={16} borderRadius={6} /></div>
        <div className="mt-2"><Skeleton width={180} height={10} borderRadius={4} /></div>
      </div>
      <div className="mt-5"><Skeleton width="100%" height={44} borderRadius={8} /></div>
    </div>
  )
}

export function CardsSkeleton() {
  return (
    <div className="md:col-span-8 grid grid-cols-2 xl:grid-cols-4 gap-4" aria-busy="true" aria-label="Loading summary">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="rounded-lg bg-surface border border-border-light shadow-sm p-4 flex flex-col">
          <Skeleton width={80} height={12} borderRadius={6} />
          <div className="mt-3"><Skeleton width={100} height={22} borderRadius={6} /></div>
        </div>
      ))}
    </div>
  )
}

export function FinanceEmptyState({ title, subtitle, ctaLabel, ctaAriaLabel, onCta, icon = '📭' }: { title: string; subtitle: string; ctaLabel?: string; ctaAriaLabel?: string; onCta?: () => void; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center" role="status">
      <span className="text-4xl mb-3 opacity-50" aria-hidden="true">{icon}</span>
      <p className="text-sm font-semibold text-text">{title}</p>
      <p className="text-sm text-text-muted mt-1 max-w-xs">{subtitle}</p>
      {ctaLabel && onCta && (
        <button onClick={onCta} aria-label={ctaAriaLabel ?? ctaLabel} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors">{ctaLabel}</button>
      )}
    </div>
  )
}

export function FinanceErrorState({ onRetry, retryLabel, retryAriaLabel, message }: { onRetry: () => void; retryLabel: string; retryAriaLabel?: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center" role="alert">
      <span className="text-3xl mb-3 opacity-40" aria-hidden="true">⚠️</span>
      <p className="text-sm font-semibold text-text">{message ?? 'Something went wrong'}</p>
      <button onClick={onRetry} aria-label={retryAriaLabel ?? retryLabel} className="mt-4 inline-flex items-center rounded-lg border border-primary text-primary px-4 py-2.5 text-sm font-semibold hover:bg-primary-50 transition-colors">{retryLabel}</button>
    </div>
  )
}

export function KycRequiredBanner({ title, subtitle, ctaLabel, ctaAriaLabel, onCta }: { title: string; subtitle: string; ctaLabel: string; ctaAriaLabel: string; onCta: () => void }) {
  return (
    <div className="rounded-lg bg-info-light border border-info/20 px-4 py-3 mb-4 flex items-center justify-between gap-3" role="status" aria-live="polite">
      <div>
        <p className="text-sm font-semibold text-info">{title}</p>
        <p className="text-xs text-text-muted">{subtitle}</p>
      </div>
      <button onClick={onCta} aria-label={ctaAriaLabel} className="shrink-0 inline-flex items-center rounded-lg border border-info text-info px-3 py-2 text-xs font-semibold hover:bg-info/10 transition-colors">{ctaLabel}</button>
    </div>
  )
}

export function OfflineBanner({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-lg bg-warning-light border border-warning/20 px-4 py-3 mb-4 flex items-center gap-2" role="status" aria-live="polite">
      <span className="text-warning text-lg" aria-hidden="true">📡</span>
      <div>
        <p className="text-sm font-semibold text-warning">{title}</p>
        <p className="text-xs text-text-muted">{subtitle}</p>
      </div>
    </div>
  )
}
