'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, PackageX, ChevronRight } from 'lucide-react'
import SafeImage from './SafeImage'
import type { StockAlert, StockAlertSummary } from '@chinooz/types'

export interface LowStockAlertsProps {
  summary: StockAlertSummary | undefined
  onJumpToVariant?: (variantId: string, productId: string) => void
}

export default function LowStockAlerts({ summary, onJumpToVariant }: LowStockAlertsProps) {
  const { t } = useTranslation()

  if (!summary || summary.total === 0) {
    return (
      <div className="rounded-xl border border-border-light bg-surface p-4">
        <h3 className="text-sm font-bold text-text mb-1">{t('seller.inventory.alertsTitle')}</h3>
        <p className="text-xs text-text-muted">{t('seller.inventory.alertsEmpty')}</p>
      </div>
    )
  }

  const renderSection = (title: string, alerts: StockAlert[], isOut: boolean) => {
    if (alerts.length === 0) return null
    const Icon = isOut ? PackageX : AlertTriangle
    const color = isOut ? 'text-error' : 'text-warning'
    const bg = isOut ? 'bg-error-light' : 'bg-warning-light'
    return (
      <section aria-labelledby={'alerts-section-' + (isOut ? 'out' : 'low')} className="mb-4 last:mb-0">
        <h3
          id={'alerts-section-' + (isOut ? 'out' : 'low')}
          className={'flex items-center gap-2 text-sm font-bold mb-2 ' + color}
        >
          <Icon size={16} />
          {title}
          <span className={'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ' + bg + ' ' + color} style={{ fontVariant: 'tabular-nums' }}>
            {alerts.length}
          </span>
        </h3>
        <div className="space-y-1.5">
          {alerts.map(alert => (
            <button
              key={alert.variantId}
              type="button"
              onClick={() => onJumpToVariant?.(alert.variantId, alert.productId)}
              className="w-full flex items-center gap-3 rounded-lg border border-border-light bg-surface px-3 py-2.5 hover:bg-background transition-colors text-left"
              aria-label={alert.productName + ', ' + alert.variantName + ', ' + alert.stockCount + ' units, ' + t(isOut ? 'seller.inventory.outOfStock' : 'seller.inventory.lowStock')}
            >
              <SafeImage src={alert.image} alt={alert.productName} width={32} height={32} className="w-8 h-8 rounded-md object-cover flex-shrink-0 bg-border-light" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text truncate">{alert.productName}</p>
                <p className="text-xs text-text-muted font-mono truncate">{alert.sku}</p>
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <span className={'text-sm font-bold tabular-nums ' + (isOut ? 'text-error' : 'text-warning')} style={{ fontVariant: 'tabular-nums' }}>
                  {alert.stockCount}
                </span>
                <span className="text-xs text-text-muted">min {alert.lowStockThreshold}</span>
              </div>
              <ChevronRight size={16} className="text-text-tertiary flex-shrink-0" />
            </button>
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="rounded-xl border border-border-light bg-surface p-4">
      <h3 className="text-sm font-bold text-text mb-3">{t('seller.inventory.alertsTitle')}</h3>
      <p className="text-xs text-text-muted mb-3">{t('seller.inventory.alertsSubtitle')}</p>
      {renderSection(t('seller.inventory.alertsOut'), summary.out, true)}
      {renderSection(t('seller.inventory.alertsLow'), summary.low, false)}
    </div>
  )
}
