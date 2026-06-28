import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import {
  ChevronLeft,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  FileText,
  Upload,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import {
  SELLER_BUSINESS_DETAILS,
  SELLER_BUSINESS_TYPES,
  SELLER_KYC_DOCUMENTS,
  getOverallKycStatus,
  getGoLiveRequirements,
  type KycDocument,
  type KycDocumentStatus,
  type BusinessType,
} from '@chinooz/mock-data'

interface FormState {
  legalName: string
  businessType: BusinessType
  panNumber: string
  regNumber: string
  addressLine: string
  city: string
  district: string
  province: string
}

type Errors = Partial<Record<keyof FormState, string>>

const DOC_STATUS_COLOR: Record<KycDocumentStatus, { bg: string; text: string; dot: string }> = {
  verified: { bg: colors.successLight, text: colors.success, dot: colors.success },
  pending: { bg: colors.warningLight, text: colors.warning, dot: colors.warning },
  rejected: { bg: colors.errorLight, text: colors.error, dot: colors.error },
  missing: { bg: colors.borderLight, text: colors.textMuted, dot: colors.textTertiary },
}

const BANNER_COLOR = {
  verified: { bg: colors.successLight, text: colors.success },
  actionNeeded: { bg: colors.warningLight, text: colors.warning },
  underReview: { bg: colors.infoLight, text: colors.info },
} as const

function toForm(): FormState {
  return {
    legalName: SELLER_BUSINESS_DETAILS.legalName,
    businessType: SELLER_BUSINESS_DETAILS.businessType,
    panNumber: SELLER_BUSINESS_DETAILS.panNumber,
    regNumber: SELLER_BUSINESS_DETAILS.regNumber,
    addressLine: SELLER_BUSINESS_DETAILS.addressLine,
    city: SELLER_BUSINESS_DETAILS.city,
    district: SELLER_BUSINESS_DETAILS.district,
    province: SELLER_BUSINESS_DETAILS.province,
  }
}

export default function BusinessSettings() {
  const { t } = useTranslation()
  const router = useRouter()
  const kycStatus = useSellerSessionStore(s => s.kycStatus)

  const [form, setForm] = useState<FormState>(toForm)
  const [errors, setErrors] = useState<Errors>({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [docs, setDocs] = useState<KycDocument[]>(SELLER_KYC_DOCUMENTS)
  const [editingLocked, setEditingLocked] = useState<string | null>(null)
  const [resubmitDoc, setResubmitDoc] = useState<KycDocument | null>(null)
  const [confirmEdit, setConfirmEdit] = useState<string | null>(null)
  const [dirtyDialog, setDirtyDialog] = useState(false)
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const initialRef = useRef<FormState>(form)

  useEffect(() => {
    analytics.screen({ name: 'seller-settings-business' })
  }, [])

  const isVerified = kycStatus === 'verified'
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialRef.current), [form])
  const overall = getOverallKycStatus(docs)
  const goLiveReqs = getGoLiveRequirements(docs)
  const bannerColor = BANNER_COLOR[overall.kind]

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  const validate = useCallback((): Errors => {
    const errs: Errors = {}
    if (form.legalName.trim().length < 2) errs.legalName = t('seller.settings.business.fieldLegalNameError')
    if (!/^\d{9}$/.test(form.panNumber)) errs.panNumber = t('seller.settings.business.fieldPanError')
    if (form.businessType === 'registered' && form.regNumber.trim().length < 3) errs.regNumber = t('seller.settings.business.fieldRegNumberError')
    if (form.addressLine.trim().length < 5) errs.addressLine = t('seller.settings.business.fieldAddressError')
    if (form.city.trim().length < 2) errs.city = t('seller.settings.business.fieldCityError')
    if (form.district.trim().length < 2) errs.district = t('seller.settings.business.fieldDistrictError')
    if (form.province.trim().length < 2) errs.province = t('seller.settings.business.fieldProvinceError')
    return errs
  }, [form, t])

  const handleSave = useCallback(() => {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    setTimeout(() => {
      initialRef.current = form
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }, 600)
  }, [form, validate])

  const guardedNav = useCallback((fn: () => void) => {
    if (dirty) { setPendingNav(() => fn); setDirtyDialog(true) }
    else fn()
  }, [dirty])

  const simulateUpload = () => {
    setUploadProgress(0)
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null) { clearInterval(interval); return null }
        const next = prev + 15
        if (next >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            setUploadProgress(null)
            if (resubmitDoc) {
              setDocs(prev2 => prev2.map(d => d.id === resubmitDoc.id ? { ...d, status: 'pending' as KycDocumentStatus, rejectionReasonKey: undefined } : d))
              setResubmitDoc(null)
            }
          }, 300)
          return 100
        }
        return next
      })
    }, 120)
  }

  const isFieldLocked = (field: string) => isVerified && !editingLocked?.includes(field)

  const requestEdit = (field: string) => {
    setConfirmEdit(field)
  }

  const confirmEditField = () => {
    if (confirmEdit) {
      setEditingLocked(prev => prev ? `${prev},${confirmEdit}` : confirmEdit)
    }
    setConfirmEdit(null)
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => guardedNav(() => router.back())}
          accessibilityRole="button"
          accessibilityLabel={t('seller.settings.business.backToSettings')}
          hitSlop={8}
          style={styles.topBarBtn}
        >
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>{t('seller.settings.business.editTitle')}</Text>
        <View style={styles.topBarDirty}>
          {dirty ? (
            <View style={styles.dirtyDotRow}>
              <View style={styles.dirtyDot} />
              <Text style={styles.dirtyText}>{t('seller.settings.business.dirtyIndicator')}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.banner, { backgroundColor: bannerColor.bg }]} accessibilityLiveRegion="polite">
          <View style={styles.bannerRow}>
            {overall.kind === 'verified' ? <CheckCircle2 size={20} color={bannerColor.text} /> : overall.kind === 'actionNeeded' ? <AlertTriangle size={20} color={bannerColor.text} /> : <Info size={20} color={bannerColor.text} />}
            <Text style={[styles.bannerText, { color: bannerColor.text }]}>
              {overall.kind === 'verified' ? t('seller.settings.business.bannerVerified') : overall.kind === 'actionNeeded' ? t('seller.settings.business.bannerActionNeeded') : t('seller.settings.business.bannerUnderReview')}
            </Text>
          </View>
        </View>

        <FormSection title={t('seller.settings.business.sectionBusiness')}>
          {isVerified && !editingLocked && (
            <View style={styles.lockedNote}>
              <Lock size={12} color={colors.textMuted} />
              <Text style={styles.lockedNoteText}>{t('seller.settings.business.lockedNote')}</Text>
            </View>
          )}

          <Field label={t('seller.settings.business.fieldLegalName')} hint={t('seller.settings.business.fieldLegalNameHint')} error={errors.legalName} locked={isFieldLocked('legalName')} onUnlock={() => requestEdit('legalName')} t={t} fieldLabel={t('seller.settings.business.fieldLegalName')}>
            <TextInput value={form.legalName} onChangeText={(v) => set('legalName', v)} accessibilityLabel={t('seller.settings.business.fieldLegalName')} editable={!isFieldLocked('legalName')} style={[styles.input, errors.legalName && styles.inputError, isFieldLocked('legalName') && styles.inputLocked]} />
          </Field>

          <Field label={t('seller.settings.business.fieldBusinessType')} hint={t('seller.settings.business.fieldBusinessTypeHint')} locked={isFieldLocked('businessType')} onUnlock={() => requestEdit('businessType')} t={t} fieldLabel={t('seller.settings.business.fieldBusinessType')}>
            <View style={styles.typeRow}>
              {SELLER_BUSINESS_TYPES.map(bt => {
                const active = form.businessType === bt.value
                const disabledType = isFieldLocked('businessType')
                return (
                  <TouchableOpacity
                    key={bt.value}
                    onPress={() => !disabledType && set('businessType', bt.value)}
                    disabled={disabledType}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={[styles.typeBtn, active && styles.typeBtnActive, disabledType && styles.inputLocked]}
                  >
                    <Text style={[styles.typeBtnText, active && styles.typeBtnTextActive]}>{t(bt.labelKey)}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </Field>

          <Field label={t('seller.settings.business.fieldPan')} hint={t('seller.settings.business.fieldPanHint')} error={errors.panNumber} locked={isFieldLocked('panNumber')} onUnlock={() => requestEdit('panNumber')} t={t} fieldLabel={t('seller.settings.business.fieldPan')}>
            <TextInput value={form.panNumber} onChangeText={(v) => set('panNumber', v)} keyboardType="number-pad" accessibilityLabel={t('seller.settings.business.fieldPan')} editable={!isFieldLocked('panNumber')} style={[styles.input, errors.panNumber && styles.inputError, isFieldLocked('panNumber') && styles.inputLocked]} />
          </Field>

          <Field label={t('seller.settings.business.fieldRegNumber')} hint={t('seller.settings.business.fieldRegNumberHint')} error={errors.regNumber} locked={isFieldLocked('regNumber')} onUnlock={() => requestEdit('regNumber')} t={t} fieldLabel={t('seller.settings.business.fieldRegNumber')}>
            <TextInput value={form.regNumber} onChangeText={(v) => set('regNumber', v)} accessibilityLabel={t('seller.settings.business.fieldRegNumber')} editable={!isFieldLocked('regNumber')} style={[styles.input, errors.regNumber && styles.inputError, isFieldLocked('regNumber') && styles.inputLocked]} />
          </Field>

          <Field label={t('seller.settings.business.fieldAddress')} hint={t('seller.settings.business.fieldAddressHint')} error={errors.addressLine} locked={isFieldLocked('addressLine')} onUnlock={() => requestEdit('addressLine')} t={t} fieldLabel={t('seller.settings.business.fieldAddress')}>
            <TextInput value={form.addressLine} onChangeText={(v) => set('addressLine', v)} accessibilityLabel={t('seller.settings.business.fieldAddress')} editable={!isFieldLocked('addressLine')} style={[styles.input, errors.addressLine && styles.inputError, isFieldLocked('addressLine') && styles.inputLocked]} />
          </Field>

          <View style={styles.row3}>
            <Field label={t('seller.settings.business.fieldCity')} error={errors.city} locked={isFieldLocked('city')} onUnlock={() => requestEdit('city')} t={t} fieldLabel={t('seller.settings.business.fieldCity')}>
              <TextInput value={form.city} onChangeText={(v) => set('city', v)} accessibilityLabel={t('seller.settings.business.fieldCity')} editable={!isFieldLocked('city')} style={[styles.input, errors.city && styles.inputError, isFieldLocked('city') && styles.inputLocked]} />
            </Field>
            <Field label={t('seller.settings.business.fieldDistrict')} error={errors.district} locked={isFieldLocked('district')} onUnlock={() => requestEdit('district')} t={t} fieldLabel={t('seller.settings.business.fieldDistrict')}>
              <TextInput value={form.district} onChangeText={(v) => set('district', v)} accessibilityLabel={t('seller.settings.business.fieldDistrict')} editable={!isFieldLocked('district')} style={[styles.input, errors.district && styles.inputError, isFieldLocked('district') && styles.inputLocked]} />
            </Field>
            <Field label={t('seller.settings.business.fieldProvince')} error={errors.province} locked={isFieldLocked('province')} onUnlock={() => requestEdit('province')} t={t} fieldLabel={t('seller.settings.business.fieldProvince')}>
              <TextInput value={form.province} onChangeText={(v) => set('province', v)} accessibilityLabel={t('seller.settings.business.fieldProvince')} editable={!isFieldLocked('province')} style={[styles.input, errors.province && styles.inputError, isFieldLocked('province') && styles.inputLocked]} />
            </Field>
          </View>
        </FormSection>

        <FormSection title={t('seller.settings.business.sectionDocuments')}>
          <View style={styles.docList}>
            {docs.map(doc => (
              <DocumentCardMobile key={doc.id} doc={doc} t={t} onResubmit={() => setResubmitDoc(doc)} />
            ))}
          </View>
        </FormSection>

        <FormSection title={t('seller.settings.business.goLiveTitle')}>
          <Text style={styles.goLiveHint}>{t('seller.settings.business.goLiveHint')}</Text>
          <View style={styles.goLiveList}>
            {goLiveReqs.map(req => (
              <View key={req.id} style={styles.goLiveItem}>
                {req.done ? <CheckCircle2 size={18} color={colors.success} /> : <View style={styles.goLiveCircle} />}
                <Text style={[styles.goLiveText, req.done && styles.goLiveTextDone]}>{t(req.labelKey)}</Text>
              </View>
            ))}
          </View>
        </FormSection>

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.saveBar}>
        <View style={styles.saveBarLeft}>
          {saved ? (
            <View style={styles.savedRow}><View style={styles.savedDot} /><Text style={styles.savedText}>{t('seller.settings.business.saved')}</Text></View>
          ) : dirty ? (
            <View style={styles.savedRow}><View style={styles.dirtyDot} /><Text style={styles.dirtyText}>{t('seller.settings.business.dirtyIndicator')}</Text></View>
          ) : (
            <Text style={styles.saveBarIdle}>{t('seller.settings.business.editSubtitle')}</Text>
          )}
        </View>
        <View style={styles.saveBarRight}>
          <TouchableOpacity onPress={() => { setForm(initialRef.current); setErrors({}); setSaved(false) }} disabled={!dirty || saving} accessibilityRole="button" accessibilityLabel={t('seller.settings.business.discard')} style={[styles.discardBtn, (!dirty || saving) && styles.btnDisabled]}>
            <Text style={styles.discardText}>{t('seller.settings.business.discard')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} disabled={!dirty || saving} accessibilityRole="button" accessibilityLabel={t('seller.settings.business.save')} style={[styles.saveBtn, (!dirty || saving) && styles.btnDisabled]}>
            <Text style={styles.saveBtnText}>{saving ? t('seller.settings.business.saving') : t('seller.settings.business.save')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={dirtyDialog} transparent animationType="fade" onRequestClose={() => setDirtyDialog(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDirtyDialog(false)} />
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>{t('seller.settings.storefront.dirtyDialogTitle')}</Text>
          <Text style={styles.dialogBody}>{t('seller.settings.storefront.dirtyDialogBody')}</Text>
          <TouchableOpacity onPress={() => { setDirtyDialog(false); handleSave(); pendingNav?.(); setPendingNav(null) }} accessibilityRole="button" style={styles.dialogSaveBtn}>
            <Text style={styles.dialogSaveText}>{t('seller.settings.storefront.dirtyDialogSave')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setDirtyDialog(false); pendingNav?.(); setPendingNav(null) }} accessibilityRole="button" style={styles.dialogDiscardBtn}>
            <Text style={styles.dialogDiscardText}>{t('seller.settings.storefront.dirtyDialogDiscard')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setDirtyDialog(false); setPendingNav(null) }} accessibilityRole="button" style={styles.dialogStayBtn}>
            <Text style={styles.dialogStayText}>{t('seller.settings.storefront.dirtyDialogStay')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={!!confirmEdit} transparent animationType="fade" onRequestClose={() => setConfirmEdit(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmEdit(null)} />
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>{t('seller.settings.business.editLockedConfirmTitle')}</Text>
          <Text style={styles.dialogBody}>{t('seller.settings.business.editLockedConfirmBody')}</Text>
          <View style={styles.confirmBtnRow}>
            <TouchableOpacity onPress={() => setConfirmEdit(null)} accessibilityRole="button" style={styles.confirmCancelBtn}>
              <Text style={styles.confirmCancelText}>{t('seller.settings.business.editLockedCancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmEditField} accessibilityRole="button" style={styles.confirmSaveBtn}>
              <Text style={styles.confirmSaveText}>{t('seller.settings.business.editLockedConfirmBtn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!resubmitDoc} transparent animationType="fade" onRequestClose={() => setResubmitDoc(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setResubmitDoc(null)} />
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>{t('seller.settings.business.resubmitTitle')}</Text>
          <Text style={styles.dialogBody}>{t('seller.settings.business.resubmitHint')}</Text>
          {resubmitDoc?.rejectionReasonKey && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionText}>{t(resubmitDoc.rejectionReasonKey)}</Text>
            </View>
          )}
          {uploadProgress !== null ? (
            <View style={styles.uploadProgressBox}>
              <View style={styles.uploadProgressTrack} accessibilityLiveRegion="polite">
                <View style={[styles.uploadProgressFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.uploadProgressText}>{t('seller.settings.business.uploadProgress', { pct: uploadProgress })}</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={simulateUpload} accessibilityRole="button" accessibilityLabel={t('seller.settings.business.docUpload')} style={styles.uploadArea}>
              <Upload size={24} color={colors.textMuted} />
              <Text style={styles.uploadAreaText}>{t('seller.settings.business.docUpload')}</Text>
            </TouchableOpacity>
          )}
          <View style={styles.confirmBtnRow}>
            <TouchableOpacity onPress={() => setResubmitDoc(null)} accessibilityRole="button" style={styles.confirmCancelBtn}>
              <Text style={styles.confirmCancelText}>{t('seller.settings.business.resubmitCancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

function Field({ label, hint, error, locked, onUnlock, t, fieldLabel, children }: {
  label: string
  hint?: string
  error?: string
  locked?: boolean
  onUnlock?: () => void
  t: (k: string, o?: Record<string, unknown>) => string
  fieldLabel: string
  children: React.ReactNode
}) {
  return (
    <View>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {locked && (
          <View style={styles.lockedRow}>
            <Lock size={12} color={colors.textMuted} />
            <TouchableOpacity onPress={onUnlock} accessibilityRole="button" accessibilityLabel={t('seller.settings.business.lockedAria', { field: fieldLabel })}>
              <Text style={styles.editLockedText}>{t('seller.settings.business.editLocked')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {children}
      {error ? <Text style={styles.fieldError} accessibilityRole="alert">{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  )
}

function DocumentCardMobile({ doc, t, onResubmit }: { doc: KycDocument; t: (k: string, o?: Record<string, unknown>) => string; onResubmit: () => void }) {
  const s = DOC_STATUS_COLOR[doc.status]
  const statusLabel = doc.status === 'verified' ? t('seller.settings.business.docVerified') : doc.status === 'pending' ? t('seller.settings.business.docPending') : doc.status === 'rejected' ? t('seller.settings.business.docRejected') : t('seller.settings.business.docMissing')
  const reason = doc.rejectionReasonKey ? t(doc.rejectionReasonKey) : ''
  const ariaLabel = t('seller.settings.business.docAria', { doc: t(doc.labelKey), status: statusLabel, reason: reason ? `. ${reason}` : '' })

  return (
    <View style={styles.docCard} accessibilityLabel={ariaLabel}>
      <View style={styles.docThumb}>
        <FileText size={20} color={colors.textTertiary} />
      </View>
      <View style={styles.docBody}>
        <View style={styles.docTitleRow}>
          <Text style={styles.docTitle}>{t(doc.labelKey)}</Text>
          <View style={[styles.docPill, { backgroundColor: s.bg }]}>
            <View style={[styles.docPillDot, { backgroundColor: s.dot }]} />
            <Text style={[styles.docPillText, { color: s.text }]}>{statusLabel}</Text>
          </View>
        </View>
        {doc.uploadedAt ? <Text style={styles.docDate}>{t('seller.settings.business.docUploaded', { date: doc.uploadedAt })}</Text> : null}
        {doc.status === 'rejected' && doc.rejectionReasonKey && (
          <View style={styles.rejectionInline}>
            <Text style={styles.rejectionInlineText}>{reason}</Text>
            <TouchableOpacity onPress={onResubmit} accessibilityRole="button" accessibilityLabel={`${t('seller.settings.business.docResubmit')} — ${t(doc.labelKey)}`}>
              <Text style={styles.resubmitLink}>{t('seller.settings.business.docResubmit')} →</Text>
            </TouchableOpacity>
          </View>
        )}
        {doc.status === 'missing' && (
          <TouchableOpacity onPress={onResubmit} accessibilityRole="button" accessibilityLabel={`${t('seller.settings.business.docUpload')} — ${t(doc.labelKey)}`}>
            <Text style={styles.resubmitLink}>{t('seller.settings.business.docUpload')} →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[3], paddingVertical: spacing[3], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  topBarBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: fontSize.lg[0], fontWeight: '600', color: colors.text, flex: 1, textAlign: 'center' },
  topBarDirty: { width: 100, alignItems: 'flex-end' },
  dirtyDotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  dirtyDot: { width: 6, height: 6, borderRadius: radii.full, backgroundColor: colors.warning },
  dirtyText: { fontSize: 10, fontWeight: '600', color: colors.warning },
  scroll: { padding: spacing[4], gap: spacing[3] },
  banner: { borderRadius: radii.lg, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  bannerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2.5] },
  bannerText: { fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 20 },
  section: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[4] },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing[3] },
  sectionBody: { gap: spacing[4] },
  lockedNote: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], backgroundColor: colors.background, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], marginBottom: spacing[2] },
  lockedNoteText: { fontSize: 12, color: colors.textMuted, flex: 1 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[1] },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  fieldHint: { fontSize: 12, color: colors.textMuted, marginTop: spacing[1] },
  fieldError: { fontSize: 12, color: colors.error, marginTop: spacing[1] },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], fontSize: 14, color: colors.text },
  inputError: { borderColor: colors.error },
  inputLocked: { backgroundColor: colors.background, color: colors.textMuted },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  editLockedText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  typeRow: { flexDirection: 'row', gap: spacing[2] },
  typeBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingVertical: spacing[2.5], alignItems: 'center' },
  typeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
  typeBtnTextActive: { color: colors.primary },
  row3: { flexDirection: 'row', gap: spacing[2] },
  docList: { gap: spacing[3] },
  docCard: { flexDirection: 'row', gap: spacing[3], borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.lg, padding: spacing[3] },
  docThumb: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  docBody: { flex: 1, gap: 4 },
  docTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  docTitle: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  docPill: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: spacing[0.5], borderRadius: radii.full },
  docPillDot: { width: 6, height: 6, borderRadius: radii.full },
  docPillText: { fontSize: 11, fontWeight: '600' },
  docDate: { fontSize: 12, color: colors.textMuted },
  rejectionInline: { backgroundColor: colors.errorLight + '80', borderRadius: radii.md, paddingHorizontal: spacing[2.5], paddingVertical: spacing[2], marginTop: spacing[1], gap: spacing[1] },
  rejectionInlineText: { fontSize: 12, color: colors.error },
  resubmitLink: { fontSize: 12, fontWeight: '700', color: colors.primary, marginTop: spacing[0.5] },
  goLiveHint: { fontSize: 14, color: colors.textMuted, marginBottom: spacing[3] },
  goLiveList: { gap: spacing[2.5] },
  goLiveItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5] },
  goLiveCircle: { width: 18, height: 18, borderRadius: radii.full, borderWidth: 2, borderColor: colors.border },
  goLiveText: { fontSize: 14, fontWeight: '500', color: colors.text },
  goLiveTextDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  saveBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight },
  saveBarLeft: { flex: 1 },
  saveBarIdle: { fontSize: 12, color: colors.textTertiary },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  savedDot: { width: 6, height: 6, borderRadius: radii.full, backgroundColor: colors.success },
  savedText: { fontSize: 12, fontWeight: '600', color: colors.success },
  saveBarRight: { flexDirection: 'row', gap: spacing[2] },
  discardBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5] },
  discardText: { fontSize: 13, fontWeight: '600', color: colors.text },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[2.5] },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  btnDisabled: { opacity: 0.4 },
  modalOverlay: { position: 'absolute', inset: 0, backgroundColor: colors.overlay },
  dialogCard: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], padding: spacing[5], gap: spacing[3] },
  dialogTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  dialogBody: { fontSize: 14, color: colors.textSecondary },
  dialogSaveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing[3], alignItems: 'center' },
  dialogSaveText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  dialogDiscardBtn: { borderWidth: 1, borderColor: colors.error, borderRadius: radii.md, paddingVertical: spacing[3], alignItems: 'center' },
  dialogDiscardText: { color: colors.error, fontWeight: '600', fontSize: 14 },
  dialogStayBtn: { paddingVertical: spacing[2], alignItems: 'center' },
  dialogStayText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  confirmBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[2] },
  confirmCancelBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5] },
  confirmCancelText: { fontSize: 13, fontWeight: '600', color: colors.text },
  confirmSaveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[2.5] },
  confirmSaveText: { fontSize: 13, fontWeight: '700', color: colors.white },
  rejectionBox: { backgroundColor: colors.errorLight + '80', borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5] },
  rejectionText: { fontSize: 12, color: colors.error },
  uploadProgressBox: { gap: spacing[2] },
  uploadProgressTrack: { height: 4, backgroundColor: colors.borderLight, borderRadius: radii.full, overflow: 'hidden' },
  uploadProgressFill: { height: 4, backgroundColor: colors.primary, borderRadius: radii.full },
  uploadProgressText: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  uploadArea: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[5], gap: spacing[2] },
  uploadAreaText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
})
