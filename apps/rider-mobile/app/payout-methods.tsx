import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  Building2,
  Smartphone,
  Plus,
  Check,
  Trash2,
  Star,
  X,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import {
  getRiderPayoutMethods,
  addRiderPayoutMethod,
  setDefaultRiderPayoutMethod,
  deleteRiderPayoutMethod,
  formatRiderNPRAmount,
  type RiderPayoutMethod,
  type PayoutMethodKind,
} from '@chinooz/mock-data'

export default function PayoutMethodsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()

  const [methods, setMethods] = useState<RiderPayoutMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addKind, setAddKind] = useState<PayoutMethodKind>('bank')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    analytics.screen({ name: 'rider-payout-methods' })
  }, [])

  const load = useCallback(async () => {
    setError(false)
    try {
      const m = await getRiderPayoutMethods()
      setMethods(m)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const onSetDefault = async (method: RiderPayoutMethod) => {
    if (method.isDefault) return
    try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    await setDefaultRiderPayoutMethod(method.id)
    await load()
    showToast(t('rider.earnings.payout.methods.defaultSetAria', { label: method.label }))
  }

  const onDelete = (method: RiderPayoutMethod) => {
    Alert.alert(
      t('rider.earnings.payout.methods.deleteConfirm'),
      t('rider.earnings.payout.methods.deleteConfirmBody', { label: method.label, account: method.maskedAccount }),
      [
        { text: t('rider.earnings.payout.methods.deleteCancel'), style: 'cancel' },
        {
          text: t('rider.earnings.payout.methods.deleteConfirmBtn'),
          style: 'destructive',
          onPress: async () => {
            try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) } catch {}
            await deleteRiderPayoutMethod(method.id)
            await load()
            showToast(t('rider.earnings.payout.methods.removedAria', { label: method.label }))
          },
        },
      ],
    )
  }

  const onAdded = async () => {
    await load()
    setShowAdd(false)
    showToast(t('rider.earnings.payout.methods.added'))
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('rider.earnings.payout.methods.back')} onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={styles.headerTitle}>{t('rider.earnings.payout.methods.title')}</Text>
            <Text style={styles.headerSub}>{t('rider.earnings.payout.methods.subtitle')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8], paddingHorizontal: spacing[4], paddingTop: spacing[4], gap: spacing[3] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {loading ? (
          <Skeleton ariaLabel={t('rider.earnings.payout.methods.skeletonAria')} />
        ) : error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorTitle}>{t('rider.earnings.payout.methods.errorTitle')}</Text>
            <Text style={styles.errorSubtitle}>{t('rider.earnings.payout.methods.errorSubtitle')}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('rider.earnings.payout.methods.retry')} onPress={onRefresh} style={styles.retryBtn}>
              <Text style={styles.retryText}>{t('rider.earnings.payout.methods.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : methods.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Building2 size={32} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>{t('rider.earnings.payout.methods.noMethods')}</Text>
            <Text style={styles.emptySub}>{t('rider.earnings.payout.methods.noMethodsSub')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{t('rider.earnings.payout.methods.sectionLinked')}</Text>
            </View>
            {methods.map(m => (
              <MethodCard
                key={m.id}
                method={m}
                t={t}
                onSetDefault={() => onSetDefault(m)}
                onDelete={() => onDelete(m)}
                reduced={reduced}
              />
            ))}
          </>
        )}

        {/* Add new */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('rider.earnings.payout.methods.sectionAdd')}</Text>
        </View>
        <View style={styles.addCard}>
          <AddButton
            icon={<Building2 size={18} color={colors.primary} />}
            label={t('rider.earnings.payout.methods.addBank')}
            ariaLabel={t('rider.earnings.payout.methods.addBankAria')}
            onPress={() => { setAddKind('bank'); setShowAdd(true) }}
          />
          <View style={styles.addDivider} />
          <AddButton
            icon={<Smartphone size={18} color='#60B246' />}
            label={t('rider.earnings.payout.methods.addEsewa')}
            ariaLabel={t('rider.earnings.payout.methods.addEsewaAria')}
            onPress={() => { setAddKind('esewa'); setShowAdd(true) }}
          />
          <View style={styles.addDivider} />
          <AddButton
            icon={<Smartphone size={18} color='#7C3AED' />}
            label={t('rider.earnings.payout.methods.addKhalti')}
            ariaLabel={t('rider.earnings.payout.methods.addKhaltiAria')}
            onPress={() => { setAddKind('khalti'); setShowAdd(true) }}
          />
        </View>

        <View style={{ height: spacing[4] }} />
      </ScrollView>

      {/* Toast */}
      {toast && (
        <View style={[styles.toastWrap, { bottom: insets.bottom + spacing[4] }]} accessibilityRole="text" accessibilityLiveRegion="polite">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* Add method modal */}
      <AddMethodModal
        visible={showAdd}
        kind={addKind}
        t={t}
        insets={insets}
        onClose={() => setShowAdd(false)}
        onAdded={onAdded}
        reduced={reduced}
      />
    </View>
  )
}

function MethodCard({ method, t, onSetDefault, onDelete, reduced }: {
  method: RiderPayoutMethod
  t: ReturnType<typeof useTranslation>['t']
  onSetDefault: () => void
  onDelete: () => void
  reduced: boolean
}) {
  const icon = method.kind === 'bank' ? <Building2 size={18} color={method.accentColor} /> : <Smartphone size={18} color={method.accentColor} />
  return (
    <View style={styles.methodCard} accessibilityRole="text" accessible accessibilityLabel={t('rider.earnings.payout.cashout.methodAria', { label: method.label, account: method.maskedAccount, default: method.isDefault ? t('rider.earnings.payout.methods.defaultBadge') : '' })}>
      <View style={styles.methodCardTop}>
        <View style={[styles.methodIcon, { backgroundColor: method.accentColor + '20' }]}>
          {icon}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.methodLabelRow}>
            <Text style={styles.methodLabel}>{method.label}</Text>
            {method.isDefault && (
              <View style={styles.defaultBadge}>
                <Star size={10} color={colors.gold} />
                <Text style={styles.defaultBadgeText}>{t('rider.earnings.payout.methods.defaultBadge')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.methodAccount}>{method.maskedAccount}</Text>
        </View>
      </View>
      <View style={styles.methodCardActions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={method.isDefault ? t('rider.earnings.payout.methods.isDefaultAlready') : t('rider.earnings.payout.methods.setDefaultAria', { label: method.label })}
          disabled={method.isDefault}
          onPress={onSetDefault}
          style={[styles.methodActionBtn, method.isDefault && styles.methodActionBtnDisabled]}
        >
          {method.isDefault ? (
            <Check size={14} color={colors.success} />
          ) : (
            <Star size={14} color={colors.textMuted} />
          )}
          <Text style={[styles.methodActionText, method.isDefault && styles.methodActionTextActive]}>
            {method.isDefault ? t('rider.earnings.payout.methods.isDefaultAlready') : t('rider.earnings.payout.methods.setDefault')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('rider.earnings.payout.methods.deleteAria', { label: method.label })}
          onPress={onDelete}
          style={styles.methodActionBtn}
        >
          <Trash2 size={14} color={colors.error} />
          <Text style={[styles.methodActionText, { color: colors.error }]}>{t('rider.earnings.payout.methods.delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function AddButton({ icon, label, ariaLabel, onPress }: { icon: React.ReactNode; label: string; ariaLabel: string; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={ariaLabel} onPress={onPress} style={styles.addRow} activeOpacity={0.7}>
      <View style={styles.addIcon}>{icon}</View>
      <Text style={styles.addLabel}>{label}</Text>
      <Plus size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  )
}

function AddMethodModal({ visible, kind, t, insets, onClose, onAdded, reduced }: {
  visible: boolean
  kind: PayoutMethodKind
  t: ReturnType<typeof useTranslation>['t']
  insets: ReturnType<typeof useSafeAreaInsets>
  onClose: () => void
  onAdded: () => void
  reduced: boolean
}) {
  const [label, setLabel] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [walletPhone, setWalletPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const reset = () => {
    setLabel('')
    setBankName('')
    setAccountNumber('')
    setWalletPhone('')
    setErrors({})
    setSubmitting(false)
  }

  const kindLabel = kind === 'bank' ? t('rider.earnings.payout.methods.formBank') : kind === 'esewa' ? t('rider.earnings.payout.methods.formEsewa') : t('rider.earnings.payout.methods.formKhalti')

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!label.trim()) e.label = t('rider.earnings.payout.methods.valLabel')
    if (kind === 'bank') {
      if (!bankName.trim()) e.bankName = t('rider.earnings.payout.methods.valBankName')
      if (accountNumber.replace(/\s/g, '').length < 8) e.accountNumber = t('rider.earnings.payout.methods.valAccountNumber')
    } else {
      if (!/^9[78]\d{8}$/.test(walletPhone.replace(/\s/g, ''))) e.walletPhone = t('rider.earnings.payout.methods.valWalletPhone')
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    try {
      const input =
        kind === 'bank'
          ? { kind, label: label.trim(), bankName: bankName.trim(), accountNumber: accountNumber.replace(/\s/g, '') }
          : { kind, label: label.trim(), walletPhone: walletPhone.replace(/\s/g, '') }
      await addRiderPayoutMethod(input)
      reset()
      onAdded()
      try { if (!reduced) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
    } catch {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing[4] }]}>
          <View style={styles.modalHeader}>
            <Text accessibilityRole="header" style={styles.modalTitle}>{t('rider.earnings.payout.methods.sectionAdd')}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('rider.earnings.payout.methods.deleteCancel')} onPress={handleClose} style={styles.modalClose}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ gap: spacing[3] }} showsVerticalScrollIndicator={false}>
            {/* Kind display */}
            <View style={styles.formKindRow} accessibilityRole="text" accessible accessibilityLabel={t('rider.earnings.payout.methods.formAria', { kind: kindLabel })}>
              <Text style={styles.formKindLabel}>{t('rider.earnings.payout.methods.formKind')}</Text>
              <View style={styles.formKindBadge}>
                <Text style={styles.formKindBadgeText}>{kindLabel}</Text>
              </View>
            </View>

            {/* Display label */}
            <FormField label={t('rider.earnings.payout.methods.formLabel')}>
              <TextInput
                style={styles.formInput}
                value={label}
                onChangeText={setLabel}
                placeholder={t('rider.earnings.payout.methods.formLabelPlaceholder')}
                placeholderTextColor={colors.textTertiary}
              />
            </FormField>
            {errors.label && <Text style={styles.formError}>{errors.label}</Text>}

            {/* Bank fields */}
            {kind === 'bank' && (
              <>
                <FormField label={t('rider.earnings.payout.methods.formBankName')}>
                  <TextInput
                    style={styles.formInput}
                    value={bankName}
                    onChangeText={setBankName}
                    placeholder={t('rider.earnings.payout.methods.formBankNamePlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                  />
                </FormField>
                {errors.bankName && <Text style={styles.formError}>{errors.bankName}</Text>}

                <FormField label={t('rider.earnings.payout.methods.formAccountNumber')}>
                  <TextInput
                    style={styles.formInput}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder={t('rider.earnings.payout.methods.formAccountNumberPlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                  />
                </FormField>
                {errors.accountNumber && <Text style={styles.formError}>{errors.accountNumber}</Text>}
              </>
            )}

            {/* Wallet fields */}
            {kind !== 'bank' && (
              <>
                <FormField label={t('rider.earnings.payout.methods.formWalletPhone')}>
                  <TextInput
                    style={styles.formInput}
                    value={walletPhone}
                    onChangeText={setWalletPhone}
                    placeholder={t('rider.earnings.payout.methods.formWalletPhonePlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                  />
                </FormField>
                {errors.walletPhone && <Text style={styles.formError}>{errors.walletPhone}</Text>}
              </>
            )}

            <View style={{ height: spacing[2] }} />

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.earnings.payout.methods.formSubmit')}
              disabled={submitting}
              onPress={handleSubmit}
              style={[styles.formSubmitBtn, submitting && styles.formSubmitBtnDisabled]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.formSubmitText}>{t('rider.earnings.payout.methods.formSubmit')}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formFieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

function Skeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View style={styles.skeletonWrap} accessibilityRole="progressbar" accessibilityLabel={ariaLabel} accessibilityLiveRegion="polite" accessible>
      <View style={[styles.skeletonBlock, { height: 100 }]} />
      <View style={[styles.skeletonBlock, { height: 100 }]} />
      <View style={[styles.skeletonBlock, { height: 100 }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { backgroundColor: colors.primary, paddingHorizontal: spacing[4] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingBottom: spacing[3] },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.xl[0], fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
  headerSub: { fontSize: 13, color: colors.primary50, marginTop: 2, fontFamily: fontFamily.sans[0] },

  sectionHead: { marginTop: spacing[1], paddingHorizontal: spacing[1] },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fontFamily.sansSemiBold[0] },

  methodCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[4], gap: spacing[3], ...shadow('sm') },
  methodCardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  methodIcon: { width: 40, height: 40, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  methodLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  methodLabel: { fontSize: 15, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  defaultBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.warningLight, paddingHorizontal: spacing[1.5], paddingVertical: 2, borderRadius: radii.sm },
  defaultBadgeText: { fontSize: 10, fontWeight: '700', color: colors.warning, fontFamily: fontFamily.sansSemiBold[0] },
  methodAccount: { fontSize: 13, color: colors.textMuted, marginTop: 3, fontFamily: fontFamily.sans[0] },
  methodCardActions: { flexDirection: 'row', gap: spacing[2], borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing[3] },
  methodActionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radii.md, backgroundColor: colors.background },
  methodActionBtnDisabled: { backgroundColor: colors.successLight },
  methodActionText: { fontSize: 12, fontWeight: '600', color: colors.textMuted, fontFamily: fontFamily.sansSemiBold[0] },
  methodActionTextActive: { color: colors.success },

  addCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden', ...shadow('sm') },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[3.5], minHeight: 56 },
  addIcon: { width: 36, height: 36, borderRadius: radii.full, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  addLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  addDivider: { height: 1, backgroundColor: colors.borderLight, marginLeft: spacing[12] },

  // Toast
  toastWrap: { position: 'absolute', left: spacing[4], right: spacing[4], backgroundColor: colors.text, borderRadius: radii.lg, paddingHorizontal: spacing[4], paddingVertical: spacing[3], ...shadow('lg') },
  toastText: { fontSize: 14, fontWeight: '600', color: colors.white, textAlign: 'center', fontFamily: fontFamily.sansSemiBold[0] },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], paddingHorizontal: spacing[4], paddingTop: spacing[4], maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] },
  modalTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0] },
  modalClose: { width: 36, height: 36, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  formKindRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  formKindLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, fontFamily: fontFamily.sansSemiBold[0] },
  formKindBadge: { backgroundColor: colors.primary50, paddingHorizontal: spacing[2.5], paddingVertical: spacing[1], borderRadius: radii.sm },
  formKindBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary, fontFamily: fontFamily.sansSemiBold[0] },
  formField: { gap: spacing[1.5] },
  formFieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  formInput: { borderWidth: 1.5, borderColor: colors.borderLight, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], fontSize: 15, color: colors.text, fontFamily: fontFamily.sans[0] },
  formError: { fontSize: 12, color: colors.error, fontWeight: '600', fontFamily: fontFamily.sansSemiBold[0], marginTop: -spacing[1] },
  formSubmitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 52, borderRadius: radii.lg, backgroundColor: colors.primary, marginTop: spacing[2] },
  formSubmitBtnDisabled: { opacity: 0.6 },
  formSubmitText: { fontSize: 16, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },

  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[6], gap: spacing[2] },
  emptyTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, textAlign: 'center', fontFamily: fontFamily.sansSemiBold[0] },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },

  // Skeleton
  skeletonWrap: { gap: spacing[3] },
  skeletonBlock: { borderRadius: radii.lg, backgroundColor: colors.shimmer },

  // Error
  errorWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[6], gap: spacing[2] },
  errorTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  errorSubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },
  retryBtn: { marginTop: spacing[3], paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radii.lg, backgroundColor: colors.primary },
  retryText: { fontSize: 14, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
})
