import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal as RNModal, Pressable, Switch } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { ArrowLeft, Plus, X, Building2, Wallet, Trash2, Pencil, ChevronDown, Star } from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import { payoutSchema } from '@chinooz/validation'
import { getPayoutMethodEntries, addPayoutMethod, updatePayoutMethod, deletePayoutMethod, setDefaultPayoutMethod, NEPAL_BANKS, type PayoutMethodEntry, type FinancePayoutMethod } from '@chinooz/mock-data'

const TYPE_ICONS: Record<FinancePayoutMethod, typeof Building2> = { bank: Building2, esewa: Wallet, khalti: Wallet }
interface FormData { type: FinancePayoutMethod; bankName: string; accountName: string; accountNumber: string; accountConfirm: string; branch: string; walletNumber: string; isDefault: boolean }
const EMPTY_FORM: FormData = { type: 'bank', bankName: '', accountName: '', accountNumber: '', accountConfirm: '', branch: '', walletNumber: '', isDefault: false }

export default function PayoutMethodsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { reducedMotion, minTouchTarget } = useA11y()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const [methods, setMethods] = useState<PayoutMethodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PayoutMethodEntry | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => { analytics.screen({ name: 'seller-finance-payout-methods' }) }, [])
  const loadMethods = useCallback(async () => { setLoading(true); setMethods(await getPayoutMethodEntries()); setLoading(false) }, [])
  useEffect(() => { if (isLoggedIn) loadMethods() }, [isLoggedIn, loadMethods])
  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }, [])
  const goBack = useCallback(() => { if (router.canGoBack()) router.back(); else router.replace('/finance') }, [router])
  const handleAdd = useCallback(() => { setForm(EMPTY_FORM); setErrors({}); setEditingId(null); setShowForm(true) }, [])
  const handleEdit = useCallback((m: PayoutMethodEntry) => { setForm({ type: m.type, bankName: m.bankName ?? '', accountName: m.accountName ?? '', accountNumber: '', accountConfirm: '', branch: m.branch ?? '', walletNumber: m.walletNumber ?? '', isDefault: m.isDefault }); setErrors({}); setEditingId(m.id); setShowForm(true) }, [])
  const handleSave = useCallback(async () => {
    const result = payoutSchema.safeParse({ payoutMethod: form.type, bankName: form.bankName, accountName: form.accountName, accountNumber: form.accountNumber, accountConfirm: form.accountConfirm, branch: form.branch, walletNumber: form.walletNumber, isDefault: form.isDefault })
    if (!result.success) {
      const ne: Record<string, string> = {}
      for (const issue of result.error.issues) { const f = issue.path[0] as string; const key = f === 'payoutMethod' ? 'type' : f; if (!ne[key]) { const ek = key === 'bankName' ? 'errBankName' : key === 'accountName' ? 'errAccountName' : key === 'accountNumber' ? 'errAccountNumber' : key === 'accountConfirm' ? 'errAccountConfirm' : key === 'branch' ? 'errBranch' : key === 'walletNumber' ? 'errWallet' : null; ne[key] = ek ? t(`seller.finance.methods.${ek}`) : issue.message } }
      setErrors(ne); try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}; return
    }
    setSaving(true)
    try {
      if (editingId) await updatePayoutMethod(editingId, { type: form.type, bankName: form.bankName || undefined, accountName: form.accountName || undefined, accountNumber: form.accountNumber || undefined, branch: form.branch || undefined, walletNumber: form.walletNumber || undefined, isDefault: form.isDefault })
      else await addPayoutMethod({ type: form.type, bankName: form.bankName || undefined, accountName: form.accountName || undefined, accountNumber: form.accountNumber || undefined, branch: form.branch || undefined, walletNumber: form.walletNumber || undefined, isDefault: form.isDefault })
      await loadMethods(); setShowForm(false); try { if (!reducedMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}; showToast(t('seller.finance.methods.saved'))
    } catch { setErrors({ form: t('seller.finance.methods.error') }) }
    setSaving(false)
  }, [form, editingId, t, loadMethods, showToast, reducedMotion])
  const handleDelete = useCallback(async () => { if (!deleteTarget) return; await deletePayoutMethod(deleteTarget.id); await loadMethods(); setDeleteTarget(null); showToast(t('seller.finance.methods.deleted')) }, [deleteTarget, loadMethods, showToast])
  const handleSetDefault = useCallback(async (id: string) => { try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}; await setDefaultPayoutMethod(id); await loadMethods() }, [loadMethods, reducedMotion])
  const updateField = useCallback((field: keyof FormData, value: string | boolean) => { setForm(p => ({ ...p, [field]: value })); setErrors(p => ({ ...p, [field]: '' })) }, [])
  const isBank = form.type === 'bank'

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('seller.finance.methods.back')} onPress={goBack} hitSlop={8} style={[styles.iconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}><ArrowLeft size={22} color={colors.text} /></TouchableOpacity>
        <Text accessibilityRole="header" style={styles.topBarTitle}>{t('seller.finance.methods.title')}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('seller.finance.methods.addAria')} onPress={handleAdd} hitSlop={8} style={[styles.iconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}><Plus size={24} color={colors.primary} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{t('seller.finance.methods.subtitle')}</Text>
        {loading ? (
          <View style={styles.loadingWrap}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>{t('seller.finance.methods.loading')}</Text></View>
        ) : methods.length === 0 ? (
          <View style={styles.emptyWrap}><Text style={styles.emptyTitle}>{t('seller.finance.methods.emptyTitle')}</Text><Text style={styles.emptySub}>{t('seller.finance.methods.emptySubtitle')}</Text><TouchableOpacity onPress={handleAdd} style={styles.addBtn} accessibilityRole="button" accessibilityLabel={t('seller.finance.methods.addAria')}><Plus size={18} color={colors.white} /><Text style={styles.addBtnText}>{t('seller.finance.methods.add')}</Text></TouchableOpacity></View>
        ) : (
          <View style={{ gap: spacing[3] }}>
            {methods.map(m => {
              const Icon = TYPE_ICONS[m.type]
              return (
                <View key={m.id} style={styles.methodCard} accessibilityLabel={t('seller.finance.methods.cardAria', { type: m.label, last4: m.accountMasked.slice(-4), default: m.isDefault ? `, ${t('seller.finance.methods.default')}` : '' })}>
                  <View style={styles.methodIcon}><Icon size={20} color={colors.primary} /></View>
                  <View style={styles.methodBody}>
                    <View style={styles.methodHeader}><Text style={styles.methodLabel}>{m.label}</Text>{m.isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultText}>{t('seller.finance.methods.default')}</Text></View>}</View>
                    <Text style={styles.methodMask}>{m.accountMasked}</Text>
                    {m.bankName ? <Text style={styles.methodBank}>{m.bankName} · {m.branch}</Text> : null}
                    {m.accountName ? <Text style={styles.methodName}>{m.accountName}</Text> : null}
                  </View>
                  <View style={styles.methodActions}>
                    {!m.isDefault && <TouchableOpacity onPress={() => handleSetDefault(m.id)} accessibilityRole="button" accessibilityLabel={t('seller.finance.methods.setDefaultAria', { method: m.label })} hitSlop={8} style={styles.actionBtn}><Star size={18} color={colors.textMuted} /></TouchableOpacity>}
                    <TouchableOpacity onPress={() => handleEdit(m)} accessibilityRole="button" accessibilityLabel={t('seller.finance.methods.editAria', { method: m.label })} hitSlop={8} style={styles.actionBtn}><Pencil size={18} color={colors.textMuted} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => setDeleteTarget(m)} accessibilityRole="button" accessibilityLabel={t('seller.finance.methods.deleteAria', { method: m.label })} hitSlop={8} style={styles.actionBtn}><Trash2 size={18} color={colors.error} /></TouchableOpacity>
                  </View>
                </View>
              )
            })}
          </View>
        )}
        <View style={{ height: spacing[8] }} />
      </ScrollView>

      <RNModal visible={showForm} transparent animationType="slide" onRequestClose={() => !saving && setShowForm(false)}>
        <Pressable style={styles.overlay} onPress={() => !saving && setShowForm(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing[5] }}>
              <View style={styles.formHeader}><Text style={styles.formTitle}>{editingId ? t('seller.finance.methods.formTitleEdit') : t('seller.finance.methods.formTitleAdd')}</Text>{!saving && <TouchableOpacity onPress={() => setShowForm(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('seller.finance.methods.formCancel')}><X size={22} color={colors.textMuted} /></TouchableOpacity>}</View>
              <View style={{ gap: spacing[4] }}>
                <View><Text style={styles.fieldLabel}>{t('seller.finance.methods.formType')}</Text><View style={styles.typeRow}>{(['bank', 'esewa', 'khalti'] as FinancePayoutMethod[]).map(typ => <TouchableOpacity key={typ} onPress={() => updateField('type', typ)} accessibilityRole="button" accessibilityState={{ selected: form.type === typ }} style={[styles.typePill, form.type === typ && styles.typePillActive]}><Text style={[styles.typeText, form.type === typ && styles.typeTextActive]}>{typ === 'bank' ? t('seller.finance.methods.formTypeBank') : typ === 'esewa' ? t('seller.finance.methods.formTypeEsewa') : t('seller.finance.methods.formTypeKhalti')}</Text></TouchableOpacity>)}</View></View>
                {isBank ? (
                  <>
                    <View><Text style={styles.fieldLabel}>{t('seller.finance.methods.formBankName')}</Text><TouchableOpacity onPress={() => setBankOpen(o => !o)} accessibilityRole="button" accessibilityLabel={t('seller.finance.methods.formBankNameAria')} style={styles.dropdownBtn}><Text style={[styles.dropdownText, !form.bankName && { color: colors.textTertiary }]}>{form.bankName || t('seller.finance.methods.formBankName')}</Text><ChevronDown size={18} color={colors.textMuted} /></TouchableOpacity>{bankOpen && <View style={styles.dropdownList}>{NEPAL_BANKS.map(b => <TouchableOpacity key={b} onPress={() => { updateField('bankName', b); setBankOpen(false) }} style={styles.dropdownItem}><Text style={styles.dropdownItemText}>{b}</Text></TouchableOpacity>)}</View>}{errors.bankName ? <Text style={styles.errText} accessibilityRole="alert">{errors.bankName}</Text> : null}</View>
                    <MField label={t('seller.finance.methods.formAccountName')} ariaLabel={t('seller.finance.methods.formAccountNameAria')} value={form.accountName} onChange={v => updateField('accountName', v)} error={errors.accountName} />
                    <MField label={t('seller.finance.methods.formAccountNumber')} ariaLabel={t('seller.finance.methods.formAccountNumberAria')} value={form.accountNumber} onChange={v => updateField('accountNumber', v)} error={errors.accountNumber} />
                    <MField label={t('seller.finance.methods.formAccountConfirm')} ariaLabel={t('seller.finance.methods.formAccountConfirmAria')} value={form.accountConfirm} onChange={v => updateField('accountConfirm', v)} error={errors.accountConfirm} />
                    <MField label={t('seller.finance.methods.formBranch')} ariaLabel={t('seller.finance.methods.formBranchAria')} value={form.branch} onChange={v => updateField('branch', v)} error={errors.branch} />
                  </>
                ) : <MField label={t('seller.finance.methods.formWalletNumber')} ariaLabel={t('seller.finance.methods.formWalletNumberAria')} value={form.walletNumber} onChange={v => updateField('walletNumber', v.replace(/[^0-9]/g, ''))} error={errors.walletNumber} keyboardType="numeric" />}
                <View style={styles.switchRow}><Switch value={form.isDefault} onValueChange={v => updateField('isDefault', v)} trackColor={{ true: colors.primary, false: colors.border }} accessibilityLabel={t('seller.finance.methods.formDefaultAria')} /><Text style={styles.switchLabel}>{t('seller.finance.methods.formDefault')}</Text></View>
                {errors.form ? <Text style={styles.errText} accessibilityRole="alert">{errors.form}</Text> : null}
                <View style={styles.formActions}><TouchableOpacity onPress={() => setShowForm(false)} disabled={saving} style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel={t('seller.finance.methods.formCancel')}><Text style={styles.cancelText}>{t('seller.finance.methods.formCancel')}</Text></TouchableOpacity><TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel={t('seller.finance.methods.formSave')}><Text style={styles.saveText}>{saving ? t('seller.finance.methods.formSaving') : t('seller.finance.methods.formSave')}</Text></TouchableOpacity></View>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </RNModal>

      <RNModal visible={deleteTarget !== null} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <Pressable style={styles.overlay} onPress={() => setDeleteTarget(null)}>
          <Pressable style={styles.confirmSheet} onPress={e => e.stopPropagation()} accessibilityRole="alert" accessibilityLabel={t('seller.finance.methods.deleteConfirmTitle')}>
            <Text style={styles.confirmTitle}>{t('seller.finance.methods.deleteConfirmTitle')}</Text>
            <Text style={styles.confirmBody}>{t('seller.finance.methods.deleteConfirmBody', { method: deleteTarget?.label ?? '', account: deleteTarget?.accountMasked ?? '' })}</Text>
            <View style={styles.formActions}><TouchableOpacity onPress={() => setDeleteTarget(null)} style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel={t('seller.finance.methods.deleteConfirmCancel')}><Text style={styles.cancelText}>{t('seller.finance.methods.deleteConfirmCancel')}</Text></TouchableOpacity><TouchableOpacity onPress={handleDelete} style={styles.deleteConfirmBtn} accessibilityRole="button" accessibilityLabel={t('seller.finance.methods.deleteConfirmCta')}><Text style={styles.deleteConfirmText}>{t('seller.finance.methods.deleteConfirmCta')}</Text></TouchableOpacity></View>
          </Pressable>
        </Pressable>
      </RNModal>

      {toast !== '' && <View style={styles.toast} accessibilityRole="status" accessibilityLiveRegion="polite"><Text style={styles.toastText}>{toast}</Text></View>}
    </View>
  )
}

function MField({ label, ariaLabel, value, onChange, error, keyboardType }: { label: string; ariaLabel: string; value: string; onChange: (v: string) => void; error?: string; keyboardType?: 'numeric' }) {
  return (
    <View><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChange} aria-label={ariaLabel} keyboardType={keyboardType === 'numeric' ? 'numeric' : 'default'} style={[styles.textInput, error && { borderColor: colors.error }]} placeholderTextColor={colors.textTertiary} />{error ? <Text style={styles.errText} accessibilityRole="alert">{error}</Text> : null}</View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[3], paddingVertical: spacing[2], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  iconBtn: { alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text },
  scrollContent: { padding: spacing[4], gap: spacing[3] },
  subtitle: { fontSize: fontSize.sm[0], color: colors.textMuted },
  loadingWrap: { alignItems: 'center', paddingVertical: spacing[10], gap: spacing[2] },
  loadingText: { fontSize: fontSize.sm[0], color: colors.textMuted },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing[10], paddingHorizontal: spacing[4], gap: spacing[2] },
  emptyTitle: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text, textAlign: 'center' },
  emptySub: { fontSize: fontSize.sm[0], color: colors.textMuted, textAlign: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.primary, borderRadius: radii.lg, paddingHorizontal: spacing[4], paddingVertical: spacing[3], marginTop: spacing[3] },
  addBtnText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.white },
  methodCard: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[4], elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  methodIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  methodBody: { flex: 1 },
  methodHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  methodLabel: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  defaultBadge: { backgroundColor: colors.primary, borderRadius: radii.sm, paddingHorizontal: spacing[1.5], paddingVertical: 2 },
  defaultText: { fontSize: 10, fontWeight: '700', color: colors.white, textTransform: 'uppercase' },
  methodMask: { fontSize: fontSize.sm[0], color: colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  methodBank: { fontSize: fontSize.xs[0], color: colors.textTertiary, marginTop: 2 },
  methodName: { fontSize: fontSize.xs[0], color: colors.textTertiary },
  methodActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  actionBtn: { padding: spacing[2] },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: '90%' },
  confirmSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing[5] },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  formTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text },
  fieldLabel: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text, marginBottom: spacing[2] },
  typeRow: { flexDirection: 'row', gap: spacing[2] },
  typePill: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.background, paddingVertical: spacing[2.5], alignItems: 'center' },
  typePillActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  typeText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.textMuted },
  typeTextActive: { color: colors.primary },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background, paddingHorizontal: spacing[3], paddingVertical: spacing[3] },
  dropdownText: { fontSize: fontSize.sm[0], color: colors.text },
  dropdownList: { marginTop: spacing[1], borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, maxHeight: 200 },
  dropdownItem: { paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  dropdownItemText: { fontSize: fontSize.sm[0], color: colors.text },
  textInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background, paddingHorizontal: spacing[3], paddingVertical: spacing[3], fontSize: fontSize.sm[0], color: colors.text },
  errText: { fontSize: fontSize.xs[0], color: colors.error, marginTop: spacing[1], fontWeight: '500' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  switchLabel: { fontSize: fontSize.sm[0], color: colors.text },
  formActions: { flexDirection: 'row', gap: spacing[3], paddingTop: spacing[2] },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: radii.lg, paddingVertical: spacing[3], alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  cancelText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.textMuted },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radii.lg, paddingVertical: spacing[3], alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  saveText: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.white },
  deleteConfirmBtn: { flex: 1, backgroundColor: colors.error, borderRadius: radii.lg, paddingVertical: spacing[3], alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  deleteConfirmText: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.white },
  confirmTitle: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.text, marginBottom: spacing[2] },
  confirmBody: { fontSize: fontSize.sm[0], color: colors.textMuted, marginBottom: spacing[4] },
  toast: { position: 'absolute', bottom: spacing[6], left: spacing[4], right: spacing[4], backgroundColor: colors.text, borderRadius: radii.lg, paddingVertical: spacing[3], paddingHorizontal: spacing[4], alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  toastText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.white },
})
