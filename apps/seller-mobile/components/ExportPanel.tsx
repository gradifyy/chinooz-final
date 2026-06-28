import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Switch,
  ViewStyle,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  Download,
  FileText,
  FileSpreadsheet,
  Check,
  Info,
  Pencil,
  Trash2,
  Share2,
  Plus,
  X,
} from 'lucide-react-native'
import { colors, spacing, radii, shadows } from '@chinooz/theme'
import { type AnalyticsSection, type AnalyticsRangeKey } from '@chinooz/mock-data'

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
  const [exportState, setExportState] = useState<ExportState>('idle')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [progress, setProgress] = useState(0)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
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
    timerRef.current = setInterval(() => {
      setProgress(p => {
        const next = p + 12
        if (next >= 100) {
          if (timerRef.current) clearInterval(timerRef.current)
          setExportState('ready')
          return 100
        }
        return next
      })
    }, 80)
  }

  const reset = () => {
    setExportState('idle')
    setProgress(0)
  }

  const handleSave = () => {
    if (!saveName.trim()) return
    onSaveReport({
      id: `rpt-${Date.now()}`,
      name: saveName.trim(),
      section: context.section,
      rangeKey: context.rangeKey,
      compare: false,
      scheduled: false,
      frequency: 'weekly',
    })
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
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  const deleteReport = savedReports.find(r => r.id === deleteId)

  return (
    <View accessibilityRole="summary" accessibilityLabel={t('seller.analytics.export.title')}>
      {/* Export card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('seller.analytics.export.exportTitle')}</Text>

        <View style={styles.summaryBox} accessibilityRole="text" accessibilityLabel={summary}>
          <Text style={styles.summaryText}>{summary}</Text>
        </View>

        {exportState === 'idle' && (
          <View style={styles.exportBtnRow}>
            <TouchableOpacity
              onPress={() => startExport('csv')}
              accessibilityRole="button"
              accessibilityLabel={t('seller.analytics.export.exportCsvAria')}
              style={styles.exportBtn}
              activeOpacity={0.8}
            >
              <FileSpreadsheet size={16} color={colors.success} />
              <Text style={styles.exportBtnText}>{t('seller.analytics.export.exportCsv')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => startExport('pdf')}
              accessibilityRole="button"
              accessibilityLabel={t('seller.analytics.export.exportPdfAria')}
              style={styles.exportBtn}
              activeOpacity={0.8}
            >
              <FileText size={16} color={colors.error} />
              <Text style={styles.exportBtnText}>{t('seller.analytics.export.exportPdf')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {exportState === 'progress' && (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={t('seller.analytics.export.exportAria')}
          >
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {t('seller.analytics.export.exportProgress', {
                format: exportFormat.toUpperCase(),
                pct: progress,
              })}
            </Text>
          </View>
        )}

        {exportState === 'ready' && (
          <View>
            <View style={styles.readyRow}>
              <View style={styles.readyIcon}>
                <Check size={14} color={colors.success} />
              </View>
              <Text style={styles.readyText}>{t('seller.analytics.export.exportReady')}</Text>
            </View>
            <View style={styles.exportBtnRow}>
              <TouchableOpacity
                onPress={() => {}}
                accessibilityRole="button"
                accessibilityLabel={t('seller.analytics.export.exportDownloadAria', {
                  format: exportFormat.toUpperCase(),
                })}
                style={styles.downloadBtn}
                activeOpacity={0.8}
              >
                <Download size={16} color={colors.white} />
                <Text style={styles.downloadBtnText}>
                  {t('seller.analytics.export.exportDownload')} ({exportFormat.toUpperCase()})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={reset} hitSlop={8}>
                <Text style={styles.resetText}>{t('seller.analytics.clearAll')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.mockNoteRow}>
          <Info size={12} color={colors.textTertiary} />
          <Text style={styles.mockNoteText}>{t('seller.analytics.export.exportMockNote')}</Text>
        </View>
      </View>

      {/* Saved reports card */}
      <View style={styles.card}>
        <View style={styles.savedHeader}>
          <Text style={styles.cardTitle}>{t('seller.analytics.export.savedTitle')}</Text>
          <TouchableOpacity
            onPress={() => setSaveOpen(o => !o)}
            accessibilityRole="button"
            accessibilityLabel={t('seller.analytics.export.saveCurrentAria')}
            hitSlop={8}
          >
            <View style={styles.saveBtnRow}>
              <Plus size={14} color={colors.primary} />
              <Text style={styles.saveBtnText}>{t('seller.analytics.export.saveCurrent')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {saveOpen && (
          <View style={styles.saveForm}>
            <TextInput
              value={saveName}
              onChangeText={setSaveName}
              placeholder={t('seller.analytics.export.saveNamePlaceholder')}
              accessibilityLabel={t('seller.analytics.export.saveNameLabel')}
              style={styles.saveInput}
              onSubmitEditing={handleSave}
            />
            <TouchableOpacity
              onPress={handleSave}
              style={styles.saveApplyBtn}
              accessibilityRole="button"
              accessibilityLabel={t('seller.analytics.export.saveApplyAria')}
            >
              <Text style={styles.saveApplyText}>{t('seller.analytics.export.saveApply')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {savedReports.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{t('seller.analytics.export.savedEmpty')}</Text>
            <Text style={styles.emptyHint}>{t('seller.analytics.export.savedEmptyHint')}</Text>
          </View>
        ) : (
          <View>
            {savedReports.map((r, i) => (
              <View key={r.id} style={[styles.savedRow, i > 0 && styles.savedRowBorder]}>
                {renameId === r.id ? (
                  <View style={styles.renameRow}>
                    <TextInput
                      value={renameName}
                      onChangeText={setRenameName}
                      placeholder={t('seller.analytics.export.savedRenamePlaceholder')}
                      accessibilityLabel={t('seller.analytics.export.savedRenameAria', {
                        name: r.name,
                      })}
                      style={styles.renameInput}
                      onSubmitEditing={handleRename}
                      autoFocus
                    />
                    <TouchableOpacity onPress={handleRename} hitSlop={8}>
                      <Text style={styles.renameApply}>
                        {t('seller.analytics.export.savedRenameApply')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.savedBody}>
                      <Text style={styles.savedName} numberOfLines={1}>
                        {r.name}
                      </Text>
                      <Text style={styles.savedMeta} numberOfLines={1}>
                        {t('seller.analytics.export.savedMeta', {
                          section: r.section,
                          range: r.rangeKey,
                          filters: r.categoryId ?? r.productId ?? '—',
                        })}
                      </Text>
                    </View>
                    <View style={styles.savedActions}>
                      <TouchableOpacity
                        onPress={() => onLoadReport(r)}
                        accessibilityRole="button"
                        accessibilityLabel={t('seller.analytics.export.savedLoadAria', {
                          name: r.name,
                        })}
                        hitSlop={8}
                      >
                        <Text style={styles.loadText}>
                          {t('seller.analytics.export.savedLoad')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setRenameId(r.id)
                          setRenameName(r.name)
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t('seller.analytics.export.savedRenameAria', {
                          name: r.name,
                        })}
                        hitSlop={8}
                        style={styles.iconBtn}
                      >
                        <Pencil size={13} color={colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setDeleteId(r.id)}
                        accessibilityRole="button"
                        accessibilityLabel={t('seller.analytics.export.savedDeleteAria', {
                          name: r.name,
                        })}
                        hitSlop={8}
                        style={styles.iconBtn}
                      >
                        <Trash2 size={13} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ))}

            {/* Scheduled + share for first report */}
            {savedReports.length > 0 && (
              <View style={styles.extraSection}>
                <View style={styles.scheduledRow}>
                  <View style={styles.extraLeft}>
                    <Text style={styles.extraTitle}>
                      {t('seller.analytics.export.scheduledTitle')}
                    </Text>
                    <Text style={styles.extraHint}>
                      {t('seller.analytics.export.scheduledMockNote')}
                    </Text>
                  </View>
                  <Switch
                    value={savedReports[0].scheduled}
                    onValueChange={v => onUpdateReport(savedReports[0].id, { scheduled: v })}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.white}
                    accessibilityRole="switch"
                    accessibilityLabel={t('seller.analytics.export.scheduledAria')}
                  />
                </View>
                {savedReports[0].scheduled && (
                  <View style={styles.freqRow}>
                    <Text style={styles.freqLabel}>
                      {t('seller.analytics.export.scheduledFreq')}
                    </Text>
                    {(['daily', 'weekly', 'monthly'] as const).map(f => (
                      <TouchableOpacity
                        key={f}
                        onPress={() => onUpdateReport(savedReports[0].id, { frequency: f })}
                        accessibilityRole="button"
                        accessibilityLabel={t('seller.analytics.export.scheduledFreqAria')}
                        style={[
                          styles.freqPill,
                          savedReports[0].frequency === f && styles.freqPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.freqText,
                            savedReports[0].frequency === f && styles.freqTextActive,
                          ]}
                        >
                          {t(
                            `seller.analytics.export.freq${f.charAt(0).toUpperCase() + f.slice(1)}`,
                          )}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <View style={styles.shareRow}>
                  <View style={styles.extraLeft}>
                    <Text style={styles.extraTitle}>{t('seller.analytics.export.shareTitle')}</Text>
                    <Text style={styles.extraHint}>
                      {t('seller.analytics.export.shareMockNote')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleCopyLink(savedReports[0].id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('seller.analytics.export.shareAria')}
                    style={styles.shareBtn}
                    activeOpacity={0.8}
                  >
                    {copied ? (
                      <>
                        <Check size={13} color={colors.success} />
                        <Text style={styles.shareBtnText}>
                          {t('seller.analytics.export.shareCopied')}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Share2 size={13} color={colors.text} />
                        <Text style={styles.shareBtnText}>
                          {t('seller.analytics.export.shareLink')}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Delete confirm modal */}
      {deleteId && deleteReport && (
        <Modal transparent visible onRequestClose={() => setDeleteId(null)} animationType="fade">
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setDeleteId(null)}
            accessibilityLabel={t('seller.analytics.export.savedDeleteConfirmCancel')}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('seller.analytics.export.savedDeleteConfirm', { name: deleteReport.name })}
              </Text>
              <TouchableOpacity
                onPress={() => setDeleteId(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('seller.analytics.export.savedDeleteConfirmCancel')}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBody}>
              {t('seller.analytics.export.savedDeleteConfirmBody')}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setDeleteId(null)}
                style={styles.modalCancelBtn}
                accessibilityRole="button"
                accessibilityLabel={t('seller.analytics.export.savedDeleteConfirmCancel')}
              >
                <Text style={styles.modalCancelText}>
                  {t('seller.analytics.export.savedDeleteConfirmCancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={styles.modalDeleteBtn}
                accessibilityRole="button"
                accessibilityLabel={t('seller.analytics.export.savedDeleteConfirmApply')}
              >
                <Text style={styles.modalDeleteText}>
                  {t('seller.analytics.export.savedDeleteConfirmApply')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing[2.5] },
  summaryBox: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  summaryText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  exportBtnRow: { flexDirection: 'row', gap: spacing[2] },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
  },
  exportBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
  progressTrack: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: radii.full,
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  progressFill: { height: 8, backgroundColor: colors.primary, borderRadius: radii.full },
  progressText: { fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    marginBottom: spacing[2.5],
  },
  readyIcon: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.success + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyText: { fontSize: 13, fontWeight: '600', color: colors.text },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
  },
  downloadBtnText: { fontSize: 13, fontWeight: '600', color: colors.white },
  resetText: { fontSize: 13, fontWeight: '500', color: colors.textMuted, marginLeft: spacing[2] },
  mockNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[2.5],
  },
  mockNoteText: { fontSize: 11, color: colors.textTertiary },
  savedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2.5],
  },
  saveBtnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  saveBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  saveForm: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] },
  saveInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: 13,
    color: colors.text,
  },
  saveApplyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  saveApplyText: { fontSize: 13, fontWeight: '600', color: colors.white },
  emptyBox: { alignItems: 'center', paddingVertical: spacing[5] },
  emptyText: { fontSize: 13, color: colors.textMuted },
  emptyHint: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: spacing[1],
    textAlign: 'center',
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2.5],
    gap: spacing[2],
  },
  savedRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  savedBody: { flex: 1, gap: 2 },
  savedName: { fontSize: 13, fontWeight: '600', color: colors.text },
  savedMeta: { fontSize: 11, color: colors.textMuted },
  savedActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  loadText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  iconBtn: { padding: spacing[1] },
  renameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  renameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    fontSize: 13,
    color: colors.text,
  },
  renameApply: { fontSize: 12, fontWeight: '600', color: colors.primary },
  extraSection: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing[2.5],
  },
  scheduledRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  extraLeft: { flex: 1, gap: 2 },
  extraTitle: { fontSize: 12, fontWeight: '600', color: colors.text },
  extraHint: { fontSize: 11, color: colors.textTertiary },
  freqRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  freqLabel: { fontSize: 11, fontWeight: '500', color: colors.textMuted, marginRight: spacing[1] },
  freqPill: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  freqPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  freqText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  freqTextActive: { color: colors.white },
  shareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
  },
  shareBtnText: { fontSize: 12, fontWeight: '600', color: colors.text },
  modalOverlay: { position: 'absolute', inset: 0, backgroundColor: colors.overlay },
  modalCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    padding: spacing[5],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  modalBody: { fontSize: 13, color: colors.textMuted, marginBottom: spacing[4], lineHeight: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[2] },
  modalCancelBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
  },
  modalCancelText: { fontSize: 13, fontWeight: '600', color: colors.text },
  modalDeleteBtn: {
    backgroundColor: colors.error,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
  },
  modalDeleteText: { fontSize: 13, fontWeight: '600', color: colors.white },
})
