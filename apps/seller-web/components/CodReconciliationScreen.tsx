'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Download, Banknote } from 'lucide-react'
import { Container, Screen } from '@chinooz/ui-web'
import { useCodReconciliation } from '@chinooz/hooks'
import { exportCodReconciliationCSV, formatNPRAmount, type CodRemittanceStatus } from '@chinooz/mock-data'

const RANGES = [
  { days: 7, labelKey: 'seller.cod.range7' },
  { days: 30, labelKey: 'seller.cod.range30' },
]

const STATUS_STYLE: Record<CodRemittanceStatus, string> = {
  pending: 'bg-warning/15 text-warning-text',
  in_transit: 'bg-info/10 text-info',
  remitted: 'bg-success/10 text-success',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CodReconciliationScreen() {
  const { t } = useTranslation()
  const [rangeDays, setRangeDays] = useState(30)
  const { data, isLoading } = useCodReconciliation(rangeDays)
  const [exported, setExported] = useState(false)

  const handleExport = () => {
    if (!data) return
    const csv = exportCodReconciliationCSV(data)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cod-reconciliation-${rangeDays}d.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 2500)
  }

  const statusLabel = (s: CodRemittanceStatus) =>
    s === 'pending' ? t('seller.cod.statusPending') : s === 'in_transit' ? t('seller.cod.statusInTransit') : t('seller.cod.statusRemitted')

  return (
    <Screen>
      <Container className="py-6 max-w-[1000px]">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/finance" aria-label={t('common.back')} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-background transition-colors">
            <ArrowLeft size={18} className="text-text" />
          </Link>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <Banknote size={20} className="text-primary" />
            {t('seller.cod.title')}
          </h1>
        </div>
        <p className="text-sm text-text-muted ml-12 mb-5">{t('seller.cod.subtitle')}</p>

        {/* Range + export */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1 p-1 bg-surface rounded-full">
            {RANGES.map(r => (
              <button
                key={r.days}
                onClick={() => setRangeDays(r.days)}
                className={`h-8 px-4 rounded-full text-sm font-semibold transition-colors ${
                  rangeDays === r.days ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
                }`}
              >
                {t(r.labelKey)}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            disabled={!data}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-sm font-medium text-text hover:border-text-tertiary transition-colors disabled:opacity-40"
          >
            <Download size={15} />
            {exported ? t('seller.cod.exported') : t('seller.cod.export')}
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: t('seller.cod.collected'), value: data?.totalCollected, cls: 'text-text' },
            { label: t('seller.cod.commission'), value: data?.totalCommission, cls: 'text-error' },
            { label: t('seller.cod.pending'), value: data?.pendingRemittance, cls: 'text-warning-text' },
            { label: t('seller.cod.remitted'), value: data?.totalRemitted, cls: 'text-success' },
          ].map((c, i) => (
            <div key={i} className="rounded-xl border border-border-light bg-surface p-3">
              <p className="text-xs text-text-muted">{c.label}</p>
              <p className={`text-lg font-bold tabular-nums mt-0.5 ${c.cls}`}>
                {isLoading || c.value == null ? '—' : `NPR ${formatNPRAmount(c.value)}`}
              </p>
            </div>
          ))}
        </div>

        {/* Statement table */}
        <div className="bg-surface border border-border-light rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-text-muted uppercase">{t('seller.cod.colOrder')}</th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-text-muted uppercase">{t('seller.cod.colDate')}</th>
                  <th className="text-right px-4 py-2.5 text-[12px] font-semibold text-text-muted uppercase">{t('seller.cod.colCollected')}</th>
                  <th className="text-right px-4 py-2.5 text-[12px] font-semibold text-text-muted uppercase">{t('seller.cod.colCommission')}</th>
                  <th className="text-right px-4 py-2.5 text-[12px] font-semibold text-text-muted uppercase">{t('seller.cod.colNet')}</th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-text-muted uppercase">{t('seller.cod.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border-light">
                      <td colSpan={6} className="px-4 py-3"><div className="h-4 bg-border rounded animate-pulse" /></td>
                    </tr>
                  ))
                ) : (
                  data?.entries.map(e => (
                    <tr key={e.orderId} className="border-b border-border-light last:border-b-0">
                      <td className="px-4 py-2.5 text-sm font-mono text-text">{e.orderId}</td>
                      <td className="px-4 py-2.5 text-sm text-text-muted">{formatDate(e.date)}</td>
                      <td className="px-4 py-2.5 text-sm text-right tabular-nums text-text">NPR {formatNPRAmount(e.collected)}</td>
                      <td className="px-4 py-2.5 text-sm text-right tabular-nums text-error">−{formatNPRAmount(e.commission)}</td>
                      <td className="px-4 py-2.5 text-sm text-right tabular-nums font-semibold text-text">NPR {formatNPRAmount(e.netRemittable)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold ${STATUS_STYLE[e.status]}`}>
                          {statusLabel(e.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Container>
    </Screen>
  )
}
