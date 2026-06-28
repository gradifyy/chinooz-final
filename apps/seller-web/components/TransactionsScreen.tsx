'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Download,
  ChevronRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Container, Screen } from '@chinooz/ui-web'
import { useReducedMotion } from '@chinooz/ui-web'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import { duration } from '@chinooz/theme'
import {
  getTransactions,
  getTransactionById,
  exportTransactionsCSV,
  formatNPRAmount,
  type Transaction,
  type TransactionFilters,
  type TransactionType,
  type TransactionDetail,
} from '@chinooz/mock-data'

const TYPE_LABEL_KEY: Record<TransactionType | 'all', string> = {
  all: 'typeAll',
  sale: 'typeSale',
  refund: 'typeRefund',
  fee: 'typeFee',
  payout: 'typePayout',
  adjustment: 'typeAdjustment',
}

const SORT_OPTIONS: { key: TransactionFilters['sort']; labelKey: string }[] = [
  { key: 'date_desc', labelKey: 'sortDateDesc' },
  { key: 'date_asc', labelKey: 'sortDateAsc' },
  { key: 'net_desc', labelKey: 'sortNetDesc' },
  { key: 'net_asc', labelKey: 'sortNetAsc' },
]

function signedNet(net: number): string {
  const sign = net > 0 ? '+' : net < 0 ? '−' : ''
  return `${sign}${formatNPRAmount(Math.abs(net))}`
}

function txColor(type: TransactionType): string {
  if (type === 'sale' || type === 'adjustment') return 'text-success'
  return 'text-error'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export default function TransactionsScreen() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)

  const [filters, setFilters] = useState<TransactionFilters>({
    type: 'all',
    dateRange: 'all',
    sort: 'date_desc',
  })
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [items, setItems] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<TransactionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [exportToast, setExportToast] = useState(false)

  useEffect(() => {
    analytics.screen({ name: 'seller-finance-transactions' })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 250)
    return () => clearTimeout(timer)
  }, [searchInput])

  const effectiveFilters = useMemo(
    () => ({ ...filters, orderId: debouncedSearch || undefined }),
    [filters, debouncedSearch],
  )

  useEffect(() => {
    if (!isLoggedIn) return
    setLoading(true)
    setError(false)
    let active = true
    getTransactions(effectiveFilters)
      .then(data => {
        if (!active) return
        setItems(data.items)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError(true)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [effectiveFilters, isLoggedIn])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    let active = true
    getTransactionById(selectedId).then(d => {
      if (!active) return
      setDetail(d)
      setDetailLoading(false)
    })
    return () => {
      active = false
    }
  }, [selectedId])

  const handleExport = useCallback(() => {
    const csv = exportTransactionsCSV(items)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportToast(true)
    setTimeout(() => setExportToast(false), 2500)
  }, [items])

  const updateFilter = useCallback((patch: Partial<TransactionFilters>) => {
    setFilters(prev => ({ ...prev, ...patch }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({ type: 'all', dateRange: 'all', sort: 'date_desc' })
    setSearchInput('')
  }, [])

  const hasActiveFilters =
    filters.type !== 'all' || filters.dateRange !== 'all' || debouncedSearch !== ''

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const tx of items) {
      const key = tx.date.slice(0, 10)
      const arr = map.get(key) ?? []
      arr.push(tx)
      map.set(key, arr)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [items])

  return (
    <Screen>
      <div className="sticky top-0 z-sticky bg-surface border-b border-border-light shadow-sm">
        <Container className="py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/finance"
              className="inline-flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-text min-touch shrink-0"
              aria-label={t('seller.finance.tx.back')}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('seller.finance.tx.back')}</span>
            </Link>

            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder={t('seller.finance.tx.search')}
                aria-label={t('seller.finance.tx.searchAria')}
                className="w-full min-touch pl-9 pr-4 rounded-lg border border-border bg-background text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-tertiary hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(s => !s)}
              aria-pressed={showFilters}
              aria-label={t('seller.finance.tx.filterAria')}
              className={`min-touch inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                showFilters || hasActiveFilters
                  ? 'border-primary bg-primary-50 text-primary'
                  : 'border-border bg-background text-text-muted hover:text-text'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('seller.finance.tx.filter')}</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowSort(s => !s)}
                aria-label={t('seller.finance.tx.sortAria')}
                className="min-touch inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-text-muted hover:text-text"
              >
                <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
              </button>
              <AnimatePresence>
                {showSort && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                    <motion.div
                      initial={reduced ? false : { opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduced ? undefined : { opacity: 0, y: -4 }}
                      className="absolute right-0 top-full mt-1 z-20 rounded-lg border border-border bg-surface shadow-lg py-1 min-w-[180px]"
                    >
                      {SORT_OPTIONS.map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => {
                            updateFilter({ sort: opt.key })
                            setShowSort(false)
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-background ${
                            filters.sort === opt.key
                              ? 'font-semibold text-primary'
                              : 'text-text-muted'
                          }`}
                        >
                          {t(`seller.finance.tx.${opt.labelKey}`)}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={handleExport}
              aria-label={t('seller.finance.tx.exportAria')}
              className="min-touch inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('seller.finance.tx.export')}</span>
            </button>
          </div>

          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div
                initial={reduced ? false : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={reduced ? undefined : { height: 0, opacity: 0 }}
                transition={reduced ? { duration: 0 } : { duration: duration.normal / 1000 }}
                className="overflow-hidden"
              >
                <div className="pt-3 flex flex-wrap gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(['all', 'sale', 'refund', 'fee', 'payout', 'adjustment'] as const).map(typ => (
                      <button
                        key={typ}
                        onClick={() => updateFilter({ type: typ })}
                        aria-pressed={filters.type === typ}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                          filters.type === typ
                            ? 'bg-primary text-white'
                            : 'bg-background text-text-muted border border-border hover:text-text'
                        }`}
                      >
                        {t(`seller.finance.tx.${TYPE_LABEL_KEY[typ]}`)}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(['all', '7d', '30d', 'custom'] as const).map(dr => (
                      <button
                        key={dr}
                        onClick={() => updateFilter({ dateRange: dr })}
                        aria-pressed={filters.dateRange === dr}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                          filters.dateRange === dr
                            ? 'bg-primary text-white'
                            : 'bg-background text-text-muted border border-border hover:text-text'
                        }`}
                      >
                        {dr === 'all'
                          ? t('seller.finance.tx.dateAll')
                          : dr === '7d'
                            ? t('seller.finance.tx.date7d')
                            : dr === '30d'
                              ? t('seller.finance.tx.date30d')
                              : t('seller.finance.tx.dateCustom')}
                      </button>
                    ))}
                  </div>

                  {filters.dateRange === 'custom' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={filters.dateFrom ?? ''}
                        onChange={e => updateFilter({ dateFrom: e.target.value })}
                        aria-label={t('seller.finance.tx.dateFrom')}
                        className="min-touch rounded-lg border border-border bg-background px-2 py-1 text-xs text-text"
                      />
                      <input
                        type="date"
                        value={filters.dateTo ?? ''}
                        onChange={e => updateFilter({ dateTo: e.target.value })}
                        aria-label={t('seller.finance.tx.dateTo')}
                        className="min-touch rounded-lg border border-border bg-background px-2 py-1 text-xs text-text"
                      />
                    </div>
                  )}

                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {t('seller.finance.tx.reset')}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Container>
      </div>

      <Container className="py-4 md:py-6">
        <h1 className="text-xl font-bold text-text mb-1">{t('seller.finance.tx.title')}</h1>
        <p className="text-sm text-text-muted mb-4">{t('seller.finance.tx.subtitle')}</p>

        {loading ? (
          <div aria-busy="true" aria-label={t('seller.finance.tx.loading')}>
            <div className="md:hidden flex flex-col gap-3">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className="h-20 rounded-lg bg-surface border border-border-light animate-pulse"
                />
              ))}
            </div>
            <div className="hidden md:block overflow-hidden rounded-lg border border-border-light">
              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-14 border-b border-border-light bg-surface animate-pulse" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-semibold text-text">{t('seller.finance.tx.error')}</p>
            <button
              onClick={() => setFilters(f => ({ ...f }))}
              className="mt-3 px-4 py-2 rounded-lg border border-primary text-primary font-semibold text-sm hover:bg-primary-50"
            >
              {t('seller.finance.tx.retry')}
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-semibold text-text">{t('seller.finance.tx.emptyTitle')}</p>
            <p className="text-sm text-text-muted mt-1">{t('seller.finance.tx.emptySubtitle')}</p>
          </div>
        ) : (
          <>
            <span className="sr-only" aria-live="polite">
              {t('seller.finance.tx.count', { count: items.length })}
            </span>

            {/* Mobile: grouped cards by date */}
            <div className="md:hidden flex flex-col gap-4">
              {grouped.map(([date, txs]) => (
                <div key={date}>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 px-1">
                    {formatDate(date)}
                  </p>
                  <div className="rounded-lg bg-surface border border-border-light overflow-hidden">
                    {txs.map((tx, i) => (
                      <button
                        key={tx.id}
                        onClick={() => setSelectedId(tx.id)}
                        aria-label={
                          tx.orderId
                            ? t('seller.finance.tx.rowAria', {
                                type: t(`seller.finance.tx.${TYPE_LABEL_KEY[tx.type]}`),
                                order: tx.orderId,
                                net: `NPR ${formatNPRAmount(Math.abs(tx.net))}`,
                                date: formatDate(tx.date),
                              })
                            : t('seller.finance.tx.rowAriaNoOrder', {
                                type: t(`seller.finance.tx.${TYPE_LABEL_KEY[tx.type]}`),
                                net: `NPR ${formatNPRAmount(Math.abs(tx.net))}`,
                                date: formatDate(tx.date),
                              })
                        }
                        className={`w-full text-left flex items-center gap-3 px-4 min-h-[56px] py-3 hover:bg-background transition-colors ${
                          i > 0 ? 'border-t border-border-light' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-text">
                              {t(`seller.finance.tx.${TYPE_LABEL_KEY[tx.type]}`)}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                tx.direction === 'credit'
                                  ? 'bg-success-light text-success'
                                  : 'bg-error-light text-error'
                              }`}
                            >
                              {tx.direction === 'credit'
                                ? t('seller.finance.tx.credit')
                                : t('seller.finance.tx.debit')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {tx.orderId && (
                              <span className="font-mono text-xs text-text-muted">{tx.orderId}</span>
                            )}
                            <span className="text-xs text-text-tertiary">
                              {formatDateShort(tx.date)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`text-sm font-bold tabular-nums ${txColor(tx.type)}`}
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            {signedNet(tx.net)}
                          </p>
                          <p
                            className="text-xs text-text-muted tabular-nums"
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            NPR {formatNPRAmount(tx.runningBalance)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Web: dense table */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-border-light bg-surface">
              <table className="w-full border-collapse" role="table">
                <thead className="sticky top-[49px] z-sticky bg-surface">
                  <tr className="border-b border-[#E5E5E5]">
                    {[
                      { key: 'type', label: 'colType', cls: 'text-left' },
                      { key: 'order', label: 'colOrder', cls: 'text-left' },
                      { key: 'date', label: 'colDate', cls: 'text-left' },
                      { key: 'gross', label: 'colGross', cls: 'text-right' },
                      { key: 'fees', label: 'colFees', cls: 'text-right hidden lg:table-cell' },
                      { key: 'net', label: 'colNet', cls: 'text-right' },
                      { key: 'balance', label: 'colBalance', cls: 'text-right' },
                    ].map(col => (
                      <th
                        key={col.key}
                        scope="col"
                        className={`px-4 py-2.5 text-[12px] font-semibold text-text-muted ${col.cls}`}
                      >
                        {t(`seller.finance.tx.${col.label}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(tx => (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedId(tx.id)}
                      className="border-b border-[#E5E5E5] last:border-b-0 cursor-pointer hover:bg-background transition-colors min-h-[56px]"
                      role="button"
                      tabIndex={0}
                      aria-label={
                        tx.orderId
                          ? t('seller.finance.tx.rowAria', {
                              type: t(`seller.finance.tx.${TYPE_LABEL_KEY[tx.type]}`),
                              order: tx.orderId,
                              net: `NPR ${formatNPRAmount(Math.abs(tx.net))}`,
                              date: formatDate(tx.date),
                            })
                          : t('seller.finance.tx.rowAriaNoOrder', {
                              type: t(`seller.finance.tx.${TYPE_LABEL_KEY[tx.type]}`),
                              net: `NPR ${formatNPRAmount(Math.abs(tx.net))}`,
                              date: formatDate(tx.date),
                            })
                      }
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedId(tx.id)
                        }
                      }}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text">
                            {t(`seller.finance.tx.${TYPE_LABEL_KEY[tx.type]}`)}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              tx.direction === 'credit'
                                ? 'bg-success-light text-success'
                                : 'bg-error-light text-error'
                            }`}
                          >
                            {tx.direction === 'credit'
                              ? t('seller.finance.tx.credit')
                              : t('seller.finance.tx.debit')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {tx.orderId ? (
                          <span className="font-mono text-sm text-text-secondary">
                            {tx.orderId}
                          </span>
                        ) : (
                          <span className="text-sm text-text-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-text-muted">
                        {formatDate(tx.date)}
                      </td>
                      <td
                        className="px-4 py-3.5 text-sm text-right tabular-nums text-text"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        NPR {formatNPRAmount(tx.gross)}
                      </td>
                      <td
                        className="px-4 py-3.5 text-sm text-right tabular-nums text-text-muted hidden lg:table-cell"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {tx.fees > 0 ? `NPR ${formatNPRAmount(tx.fees)}` : '—'}
                      </td>
                      <td
                        className={`px-4 py-3.5 text-sm text-right tabular-nums font-bold ${txColor(tx.type)}`}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {signedNet(tx.net)}
                      </td>
                      <td
                        className="px-4 py-3.5 text-sm text-right tabular-nums text-text-muted"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        NPR {formatNPRAmount(tx.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Container>

      {/* Detail sheet */}
      <AnimatePresence>
        {selectedId && (
          <>
            <motion.div
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              onClick={() => setSelectedId(null)}
              className="fixed inset-0 z-modal bg-overlay"
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t('seller.finance.tx.detailTitle')}
              className="fixed inset-0 z-modal flex items-center justify-center p-4 pointer-events-none"
            >
              <motion.div
                initial={reduced ? false : { opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, scale: 0.95, y: 10 }}
                transition={reduced ? { duration: 0 } : { duration: duration.normal / 1000 }}
                className="pointer-events-auto w-full max-w-md rounded-lg bg-surface border border-border-light shadow-xl p-5 max-h-[80vh] overflow-y-auto"
              >
                {detailLoading ? (
                  <div className="py-8 text-center text-sm text-text-muted">
                    {t('seller.finance.tx.loading')}
                  </div>
                ) : detail ? (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <h2 className="text-lg font-bold text-text">
                        {t('seller.finance.tx.detailTitle')}
                      </h2>
                      <button
                        onClick={() => setSelectedId(null)}
                        aria-label={t('seller.finance.tx.detailClose')}
                        className="p-1 text-text-muted hover:text-text"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-text-muted">{t('seller.finance.tx.detailType')}</dt>
                        <dd className="font-semibold text-text">
                          {t(`seller.finance.tx.${TYPE_LABEL_KEY[detail.type]}`)}
                          <span
                            className={`ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              detail.direction === 'credit'
                                ? 'bg-success-light text-success'
                                : 'bg-error-light text-error'
                            }`}
                          >
                            {detail.direction === 'credit'
                              ? t('seller.finance.tx.credit')
                              : t('seller.finance.tx.debit')}
                          </span>
                        </dd>
                      </div>
                      {detail.orderId && (
                        <div className="flex justify-between">
                          <dt className="text-text-muted">{t('seller.finance.tx.detailOrder')}</dt>
                          <dd className="font-mono font-semibold text-text">{detail.orderId}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-text-muted">{t('seller.finance.tx.detailDate')}</dt>
                        <dd className="text-text">{formatDate(detail.date)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-text-muted">{t('seller.finance.tx.detailGross')}</dt>
                        <dd className="tabular-nums text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          NPR {formatNPRAmount(detail.gross)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-text-muted">{t('seller.finance.tx.detailFees')}</dt>
                        <dd className="tabular-nums text-text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {detail.fees > 0 ? `NPR ${formatNPRAmount(detail.fees)}` : '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border-light">
                        <dt className="font-semibold text-text">{t('seller.finance.tx.detailNet')}</dt>
                        <dd
                          className={`tabular-nums font-bold ${txColor(detail.type)}`}
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {signedNet(detail.net)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-text-muted">{t('seller.finance.tx.detailBalance')}</dt>
                        <dd className="tabular-nums text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          NPR {formatNPRAmount(detail.runningBalance)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 pt-4 border-t border-border-light">
                      <p className="text-xs font-semibold text-text-muted mb-2">
                        {t('seller.finance.tx.detailBreakdown')}
                      </p>
                      <div className="space-y-1.5">
                        {detail.breakdown.map((b, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-text-muted">{b.label}</span>
                            <span
                              className={`tabular-nums font-medium ${
                                b.direction === 'credit' ? 'text-success' : 'text-error'
                              }`}
                              style={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {b.direction === 'credit' ? '+' : '−'}
                              {formatNPRAmount(Math.abs(b.amount))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {detail.orderId && (
                      <Link
                        href={`/orders/${detail.orderId}`}
                        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                      >
                        {t('seller.finance.tx.detailViewOrder')}
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center text-sm text-text-muted">
                    {t('seller.finance.tx.error')}
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {exportToast && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 20 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-toast rounded-lg bg-text text-white px-4 py-2 text-sm font-semibold shadow-lg"
            role="status"
            aria-live="polite"
          >
            {t('seller.finance.tx.exportDone')}
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  )
}
