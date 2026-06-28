'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  FileText,
  FileSpreadsheet,
  Check,
  Info,
  Pencil,
  Trash2,
  Share2,
  Copy,
  X,
  Plus,
} from 'lucide-react'
import { useReducedMotion } from '@chinooz/ui-web'
import {
  type AnalyticsSection,
  type AnalyticsRangeKey,
  type AnalyticsFilter,
  type AnalyticsSectionData,
} from '@chinooz/mock-data'

export interface SavedReport {
  id: string
  name: string
  section: AnalyticsSection
  rangeKey: AnalyticsRangeKey
  categoryId?: string
  productId?: string
  compare: boolean
  scheduled: boolean
  frequency: 'daily' | 'weekly' | 'monthly'
}

type ExportFormat = 'csv' | 'pdf'
type ExportState = 'idle' | 'progress' | 'ready'

interface ExportContext {
  section: AnalyticsSection
  rangeKey: AnalyticsRangeKey
  rangeLabel: string
  filters: string
  rowCount: number
  data: AnalyticsSectionData
}

export default function ExportPanel({
  context,
  savedReports,
  onSaveReport,
  onLoadReport,
  onRenameReport,
  onDeleteReport,
  onUpdateReport,
}: {
  context: ExportContext
  savedReports: SavedReport[]
  onSaveReport: (report: SavedReport) => void
  onLoadReport: (report: SavedReport) => void
  onRenameReport: (id: string, name: string) => void
  onDeleteReport: (id: string) => void
  onUpdateReport: (id: string, updates: Partial<SavedReport>) => void
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ExportCard context={context} reduced={reduced} t={t} />
      <SavedReportsCard
        context={context}
        savedReports={savedReports}
        onSaveReport={onSaveReport}
        onLoadReport={onLoadReport}
        onRenameReport={onRenameReport}
        onDeleteReport={onDeleteReport}
        onUpdateReport={onUpdateReport}
        reduced={reduced}
        t={t}
      />
    </div>
  )
}

function ExportCard({
  context,
  reduced,
  t,
}: {
  context: ExportContext
  reduced: boolean
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const [exportState, setExportState] = useState<ExportState>('idle')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startExport = (format: ExportFormat) => {
    setExportFormat(format)
    setExportState('progress')
    setProgress(0)
    if (timerRef.current) clearInterval(timerRef.current)
    const step = reduced ? 100 : 12
    timerRef.current = setInterval(
      () => {
        setProgress(p => {
          const next = p + step
          if (next >= 100) {
            if (timerRef.current) clearInterval(timerRef.current)
            setExportState('ready')
            return 100
          }
          return next
        })
      },
      reduced ? 1 : 80,
    )
  }

  const reset = () => {
    setExportState('idle')
    setProgress(0)
  }

  const summary = context.filters
    ? t('seller.analytics.export.exportSummary', {
        section: context.section,
        range: context.rangeLabel,
        filters: context.filters,
        rows: context.rowCount,
      })
    : t('seller.analytics.export.exportSummaryNoFilters', {
        section: context.section,
        range: context.rangeLabel,
        rows: context.rowCount,
      })

  return (
    <div className="rounded-lg border border-border-light bg-surface p-5">
      <h3 className="text-sm font-semibold text-text mb-3">
        {t('seller.analytics.export.exportTitle')}
      </h3>

      {/* Summary */}
      <div
        className="rounded-md bg-background border border-border-light p-3 mb-4"
        role="status"
        aria-label={summary}
      >
        <p className="text-[12px] text-text-secondary leading-5">{summary}</p>
      </div>

      {/* Idle state — format buttons */}
      {exportState === 'idle' && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => startExport('csv')}
            aria-label={t('seller.analytics.export.exportCsvAria')}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-[13px] font-semibold text-text hover:border-primary/40 transition-colors min-touch"
          >
            <FileSpreadsheet size={16} className="text-success" aria-hidden="true" />
            {t('seller.analytics.export.exportCsv')}
          </button>
          <button
            type="button"
            onClick={() => startExport('pdf')}
            aria-label={t('seller.analytics.export.exportPdfAria')}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-[13px] font-semibold text-text hover:border-primary/40 transition-colors min-touch"
          >
            <FileText size={16} className="text-error" aria-hidden="true" />
            {t('seller.analytics.export.exportPdf')}
          </button>
        </div>
      )}

      {/* Progress state */}
      {exportState === 'progress' && (
        <div role="status" aria-live="polite" aria-label={t('seller.analytics.export.exportAria')}>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-2 rounded-full bg-background overflow-hidden">
              <motion.div
                className="h-2 rounded-full bg-primary"
                animate={{ width: `${progress}%` }}
                transition={{ duration: reduced ? 0 : 0.08 }}
              />
            </div>
            <span className="text-[12px] font-semibold text-text tabular-nums w-12 text-right">
              {progress}%
            </span>
          </div>
          <p className="text-[12px] text-text-muted">
            {t('seller.analytics.export.exportProgress', {
              format: exportFormat.toUpperCase(),
              pct: progress,
            })}
          </p>
        </div>
      )}

      {/* Ready state */}
      {exportState === 'ready' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success/15">
              <Check size={14} className="text-success" aria-hidden="true" />
            </span>
            <span className="text-[13px] font-semibold text-text">
              {t('seller.analytics.export.exportReady')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {}}
              aria-label={t('seller.analytics.export.exportDownloadAria', {
                format: exportFormat.toUpperCase(),
              })}
              className="inline-flex items-center gap-2 rounded-md bg-primary text-white px-4 py-2.5 text-[13px] font-semibold hover:opacity-90 transition-opacity min-touch"
            >
              <Download size={16} aria-hidden="true" />
              {t('seller.analytics.export.exportDownload')} ({exportFormat.toUpperCase()})
            </button>
            <button
              type="button"
              onClick={reset}
              className="text-[13px] font-medium text-text-muted hover:text-text transition-colors"
            >
              {t('seller.analytics.clearAll')}
            </button>
          </div>
        </div>
      )}

      {/* Mock note */}
      <div className="mt-3 flex items-center gap-1.5">
        <Info size={12} className="text-text-tertiary" aria-hidden="true" />
        <span className="text-[11px] text-text-tertiary">
          {t('seller.analytics.export.exportMockNote')}
        </span>
      </div>
    </div>
  )
}

function SavedReportsCard({
  context,
  savedReports,
  onSaveReport,
  onLoadReport,
  onRenameReport,
  onDeleteReport,
  onUpdateReport,
  reduced,
  t,
}: {
  context: ExportContext
  savedReports: SavedReport[]
  onSaveReport: (report: SavedReport) => void
  onLoadReport: (report: SavedReport) => void
  onRenameReport: (id: string, name: string) => void
  onDeleteReport: (id: string) => void
  onUpdateReport: (id: string, updates: Partial<SavedReport>) => void
  reduced: boolean
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [shareId, setShareId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSave = () => {
    if (!saveName.trim()) return
    const report: SavedReport = {
      id: `rpt-${Date.now()}`,
      name: saveName.trim(),
      section: context.section,
      rangeKey: context.rangeKey,
      categoryId: undefined,
      productId: undefined,
      compare: false,
      scheduled: false,
      frequency: 'weekly',
    }
    onSaveReport(report)
    setSaveName('')
    setSaveOpen(false)
  }

  const handleRename = () => {
    if (!renameId || !renameName.trim()) return
    onRenameReport(renameId, renameName.trim())
    setRenameId(null)
    setRenameName('')
  }

  const handleDelete = () => {
    if (!deleteId) return
    onDeleteReport(deleteId)
    setDeleteId(null)
  }

  const handleCopyLink = (id: string) => {
    const link = t('seller.analytics.export.sharePlaceholder', { id: id.slice(-6) })
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link).catch(() => {})
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const deleteReport = savedReports.find(r => r.id === deleteId)

  return (
    <div className="rounded-lg border border-border-light bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text">
          {t('seller.analytics.export.savedTitle')}
        </h3>
        <button
          type="button"
          onClick={() => setSaveOpen(o => !o)}
          aria-label={t('seller.analytics.export.saveCurrentAria')}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-primary-dark transition-colors"
        >
          <Plus size={14} aria-hidden="true" />
          {t('seller.analytics.export.saveCurrent')}
        </button>
      </div>

      {/* Save form */}
      <AnimatePresence>
        {saveOpen && (
          <motion.div
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="overflow-hidden mb-3"
          >
            <label className="block text-[11px] font-semibold text-text-muted mb-1">
              {t('seller.analytics.export.saveNameLabel')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder={t('seller.analytics.export.saveNamePlaceholder')}
                aria-label={t('seller.analytics.export.saveNameLabel')}
                className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-[13px] text-text outline-none focus:border-primary transition-colors"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave()
                }}
              />
              <button
                type="button"
                onClick={handleSave}
                aria-label={t('seller.analytics.export.saveApplyAria')}
                className="h-9 rounded-md bg-primary text-white px-3 text-[13px] font-semibold hover:opacity-90 transition-opacity"
              >
                {t('seller.analytics.export.saveApply')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved reports list */}
      {savedReports.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-[13px] text-text-muted">{t('seller.analytics.export.savedEmpty')}</p>
          <p className="text-[11px] text-text-tertiary mt-1">
            {t('seller.analytics.export.savedEmptyHint')}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {savedReports.map(r => {
            const meta = t('seller.analytics.export.savedMeta', {
              section: r.section,
              range: r.rangeKey,
              filters: r.categoryId ?? r.productId ?? '—',
            })
            return (
              <li
                key={r.id}
                className="flex items-center gap-2 py-3 border-b border-border-light last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  {renameId === r.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={renameName}
                        onChange={e => setRenameName(e.target.value)}
                        placeholder={t('seller.analytics.export.savedRenamePlaceholder')}
                        aria-label={t('seller.analytics.export.savedRenameAria', { name: r.name })}
                        className="flex-1 h-8 rounded-md border border-border bg-background px-2.5 text-[13px] text-text outline-none focus:border-primary"
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRename()
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleRename}
                        className="text-[12px] font-semibold text-primary"
                      >
                        {t('seller.analytics.export.savedRenameApply')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[13px] font-semibold text-text truncate">{r.name}</p>
                      <p className="text-[11px] text-text-muted truncate">{meta}</p>
                    </>
                  )}
                </div>

                {renameId !== r.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onLoadReport(r)}
                      aria-label={t('seller.analytics.export.savedLoadAria', { name: r.name })}
                      className="text-[12px] font-semibold text-primary hover:underline"
                    >
                      {t('seller.analytics.export.savedLoad')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenameId(r.id)
                        setRenameName(r.name)
                      }}
                      aria-label={t('seller.analytics.export.savedRenameAria', { name: r.name })}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-background text-text-muted hover:text-text transition-colors"
                    >
                      <Pencil size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(r.id)}
                      aria-label={t('seller.analytics.export.savedDeleteAria', { name: r.name })}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-error/10 text-text-muted hover:text-error transition-colors"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Scheduled + share for the latest or first report */}
      {savedReports.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-light space-y-3">
          {/* Scheduled report toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold text-text">
                {t('seller.analytics.export.scheduledTitle')}
              </p>
              <p className="text-[11px] text-text-tertiary">
                {t('seller.analytics.export.scheduledMockNote')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={savedReports[0].scheduled}
                aria-label={t('seller.analytics.export.scheduledAria')}
                onClick={() =>
                  onUpdateReport(savedReports[0].id, { scheduled: !savedReports[0].scheduled })
                }
                className="inline-flex items-center"
              >
                <span
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${savedReports[0].scheduled ? 'bg-primary' : 'bg-border'}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${savedReports[0].scheduled ? 'left-[22px]' : 'left-0.5'}`}
                  />
                </span>
              </button>
              {savedReports[0].scheduled && (
                <select
                  aria-label={t('seller.analytics.export.scheduledFreqAria')}
                  value={savedReports[0].frequency}
                  onChange={e =>
                    onUpdateReport(savedReports[0].id, {
                      frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                    })
                  }
                  className="h-8 rounded-md border border-border bg-background px-2 text-[12px] text-text outline-none focus:border-primary"
                >
                  <option value="daily">{t('seller.analytics.export.freqDaily')}</option>
                  <option value="weekly">{t('seller.analytics.export.freqWeekly')}</option>
                  <option value="monthly">{t('seller.analytics.export.freqMonthly')}</option>
                </select>
              )}
            </div>
          </div>

          {/* Share snapshot */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold text-text">
                {t('seller.analytics.export.shareTitle')}
              </p>
              <p className="text-[11px] text-text-tertiary">
                {t('seller.analytics.export.shareMockNote')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShareId(savedReports[0].id)
                handleCopyLink(savedReports[0].id)
              }}
              aria-label={t('seller.analytics.export.shareAria')}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[12px] font-semibold text-text hover:border-primary/40 transition-colors"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-success" aria-hidden="true" />
                  {t('seller.analytics.export.shareCopied')}
                </>
              ) : (
                <>
                  <Share2 size={13} aria-hidden="true" />
                  {t('seller.analytics.export.shareLink')}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteId && deleteReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.15 }}
            className="fixed inset-0 z-40 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label={t('seller.analytics.export.savedDeleteConfirm', {
              name: deleteReport.name,
            })}
          >
            <button
              className="absolute inset-0 bg-overlay"
              aria-label={t('seller.analytics.export.savedDeleteConfirmCancel')}
              onClick={() => setDeleteId(null)}
            />
            <div className="relative w-full max-w-sm bg-surface rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-text">
                  {t('seller.analytics.export.savedDeleteConfirm', { name: deleteReport.name })}
                </h3>
                <button
                  onClick={() => setDeleteId(null)}
                  aria-label={t('seller.analytics.export.savedDeleteConfirmCancel')}
                  className="min-touch rounded-full hover:bg-background flex items-center justify-center"
                >
                  <X size={18} className="text-text" />
                </button>
              </div>
              <p className="text-[13px] text-text-muted mb-4">
                {t('seller.analytics.export.savedDeleteConfirmBody')}
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-[13px] font-semibold text-text hover:bg-surface transition-colors"
                >
                  {t('seller.analytics.export.savedDeleteConfirmCancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-md bg-error text-white px-3 py-2 text-[13px] font-semibold hover:opacity-90 transition-opacity"
                >
                  {t('seller.analytics.export.savedDeleteConfirmApply')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
