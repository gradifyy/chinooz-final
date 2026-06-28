import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal as RNModal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { X, Check, AlertCircle, ChevronRight } from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import {
  requestWithdraw,
  getWithdrawMethods,
  rollbackWithdraw,
  formatNPRAmount,
  MIN_WITHDRAWAL,
  type WithdrawMethod,
} from '@chinooz/mock-data'

type Step = 'form' | 'confirm' | 'submitting' | 'success' | 'error'

interface Props {
  open: boolean
  onClose: () => void
  availableBalance: number
  pendingBalance: number
  onBalancesUpdate: (available: number, pending: number) => void
}

export default function WithdrawSheet({
  open,
  onClose,
  availableBalance,
  pendingBalance,
  onBalancesUpdate,
}: Props) {
  const { t } = useTranslation()
  const { reducedMotion, minTouchTarget } = useA11y()
  const [step, setStep] = useState<Step>('form')
  const [amountStr, setAmountStr] = useState('')
  const [methods, setMethods] = useState<WithdrawMethod[]>([])
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null)
  const [methodsLoading, setMethodsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState<{
    payoutId?: string
    newAvailable?: number
    newPending?: number
  }>({})

  useEffect(() => {
    if (!open) return
    setStep('form')
    setAmountStr('')
    setErrorMsg('')
    setResult({})
    setMethodsLoading(true)
    let active = true
    getWithdrawMethods().then(ms => {
      if (!active) return
      setMethods(ms)
      const def = ms.find(m => m.isDefault)
      setSelectedMethodId(def?.id ?? ms[0]?.id ?? null)
      setMethodsLoading(false)
    })
    return () => {
      active = false
    }
  }, [open])

  const amount = useMemo(() => parseInt(amountStr || '0', 10) || 0, [amountStr])

  const validationError = useMemo(() => {
    if (amount === 0) return ''
    if (amount < MIN_WITHDRAWAL) return t('seller.finance.withdraw.minError', { min: formatNPRAmount(MIN_WITHDRAWAL) })
    if (amount > availableBalance) return t('seller.finance.withdraw.maxError')
    return ''
  }, [amount, availableBalance, t])

  const hasMethods = methods.length > 0
  const canProceed = amount >= MIN_WITHDRAWAL && amount <= availableBalance && !!selectedMethodId && hasMethods
  const selectedMethod = methods.find(m => m.id === selectedMethodId)

  const handleAll = useCallback(() => {
    setAmountStr(String(availableBalance))
  }, [availableBalance])

  const handleConfirm = useCallback(async () => {
    if (!selectedMethodId) return
    setStep('submitting')
    setErrorMsg('')
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {}

    const prevAvailable = availableBalance
    const prevPending = pendingBalance
    onBalancesUpdate(prevAvailable - amount, prevPending + amount)

    try {
      const res = await requestWithdraw({ amount, methodId: selectedMethodId })
      if (res.success) {
        try {
          if (!reducedMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } catch {}
        setResult({
          payoutId: res.payoutId,
          newAvailable: res.newAvailableBalance,
          newPending: res.newPendingBalance,
        })
        setStep('success')
      } else {
        rollbackWithdraw(amount)
        onBalancesUpdate(prevAvailable, prevPending)
        try {
          if (!reducedMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        } catch {}
        const errKey =
          res.error === 'below_minimum' ? 'errorBelowMin'
            : res.error === 'exceeds_available' ? 'errorExceeds'
              : res.error === 'no_method' ? 'errorNoMethod'
                : res.error === 'service_unavailable' ? 'errorService'
                  : 'errorGeneric'
        setErrorMsg(t(`seller.finance.withdraw.${errKey}`, { min: formatNPRAmount(MIN_WITHDRAWAL) }))
        setStep('error')
      }
    } catch {
      rollbackWithdraw(amount)
      onBalancesUpdate(prevAvailable, prevPending)
      setErrorMsg(t('seller.finance.withdraw.errorGeneric'))
      setStep('error')
    }
  }, [amount, selectedMethodId, availableBalance, pendingBalance, onBalancesUpdate, t, reducedMotion])

  return (
    <RNModal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={step === 'submitting' ? undefined : onClose}
      accessibilityRole="alert"
      accessibilityLabel={t('seller.finance.withdraw.title')}
    >
      <Pressable style={styles.overlay} onPress={step === 'submitting' ? undefined : onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t('seller.finance.withdraw.title')}</Text>
                <Text style={styles.subtitle}>{t('seller.finance.withdraw.subtitle')}</Text>
              </View>
              {step !== 'submitting' && (
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('seller.finance.withdraw.cancel')}
                >
                  <X size={22} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Form */}
            {step === 'form' && (
              <View style={{ gap: spacing[4] }}>
                {/* Amount */}
                <View>
                  <Text style={styles.label}>{t('seller.finance.withdraw.amountLabel')}</Text>
                  <View style={styles.amountRow}>
                    <View style={styles.amountInputWrap}>
                      <Text style={styles.currencyPrefix}>NPR</Text>
                      <TextInput
                        value={amountStr}
                        onChangeText={v => setAmountStr(v.replace(/[^0-9]/g, ''))}
                        placeholder={t('seller.finance.withdraw.amountPlaceholder')}
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                        accessibilityLabel={t('seller.finance.withdraw.amountAria', { max: formatNPRAmount(availableBalance) })}
                        style={styles.amountInput}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={handleAll}
                      style={styles.allBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t('seller.finance.withdraw.allAria', { amount: formatNPRAmount(availableBalance) })}
                    >
                      <Text style={styles.allText}>{t('seller.finance.withdraw.all')}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.availText}>
                    {t('seller.finance.withdraw.available')}: NPR {formatNPRAmount(availableBalance)}
                  </Text>
                  {validationError !== '' && (
                    <Text style={styles.errorText} accessibilityRole="alert">
                      {validationError}
                    </Text>
                  )}
                </View>

                {/* Method picker */}
                <View>
                  <Text style={styles.label}>{t('seller.finance.withdraw.methodLabel')}</Text>
                  {methodsLoading ? (
                    <View style={styles.methodSkeleton} />
                  ) : hasMethods ? (
                    <View accessibilityRole="radiogroup" accessibilityLabel={t('seller.finance.withdraw.methodAria')}>
                      {methods.map(m => (
                        <TouchableOpacity
                          key={m.id}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selectedMethodId === m.id }}
                          onPress={() => setSelectedMethodId(m.id)}
                          style={[
                            styles.methodRow,
                            selectedMethodId === m.id && styles.methodRowActive,
                          ]}
                          activeOpacity={0.85}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.methodLabel}>{m.label}</Text>
                            <Text style={styles.methodMask}>{m.accountMasked}</Text>
                          </View>
                          <View
                            style={[
                              styles.radio,
                              selectedMethodId === m.id && styles.radioActive,
                            ]}
                          >
                            {selectedMethodId === m.id && <Check size={12} color={colors.white} />}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.noMethodBox}>
                      <Text style={styles.noMethodText}>{t('seller.finance.withdraw.methodNone')}</Text>
                      <Text style={styles.addMethodLink}>{t('seller.finance.withdraw.methodAdd')}</Text>
                    </View>
                  )}
                </View>

                {/* Summary */}
                {amount > 0 && validationError === '' && selectedMethodId && (
                  <View style={styles.summaryBox} accessibilityRole="summary">
                    <Text style={styles.summaryTitle}>{t('seller.finance.withdraw.summary')}</Text>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{t('seller.finance.withdraw.summaryAmount')}</Text>
                      <Text style={styles.summaryValue}>NPR {formatNPRAmount(amount)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{t('seller.finance.withdraw.summaryFee')}</Text>
                      <Text style={[styles.summaryValue, { color: colors.success }]}>
                        {t('seller.finance.withdraw.summaryFeeNone')}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{t('seller.finance.withdraw.summaryArrival')}</Text>
                      <Text style={styles.summaryValue}>{t('seller.finance.withdraw.summaryArrivalValue')}</Text>
                    </View>
                  </View>
                )}

                {!methodsLoading && !hasMethods && (
                  <Text style={styles.errorText} accessibilityRole="alert">
                    {t('seller.finance.withdraw.noMethodError')}
                  </Text>
                )}

                <TouchableOpacity
                  onPress={() => setStep('confirm')}
                  disabled={!canProceed}
                  style={[styles.ctaBtn, !canProceed && styles.ctaBtnDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel={t('seller.finance.withdraw.confirm')}
                >
                  <Text style={styles.ctaText}>{t('seller.finance.withdraw.confirm')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Confirm */}
            {step === 'confirm' && selectedMethod && (
              <View style={{ gap: spacing[4] }}>
                <View style={styles.confirmBanner}>
                  <Text style={styles.confirmText}>
                    {t('seller.finance.withdraw.confirmBody', {
                      amount: formatNPRAmount(amount),
                      method: `${selectedMethod.label} ${selectedMethod.accountMasked}`,
                    })}
                  </Text>
                </View>

                <View style={{ gap: spacing[2] }}>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>{t('seller.finance.withdraw.confirmAmount')}</Text>
                    <Text style={styles.confirmValue}>NPR {formatNPRAmount(amount)}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>{t('seller.finance.withdraw.confirmDestination')}</Text>
                    <Text style={styles.confirmValue}>{selectedMethod.label} · {selectedMethod.accountMasked}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>{t('seller.finance.withdraw.confirmArrival')}</Text>
                    <Text style={styles.confirmValue}>{t('seller.finance.withdraw.summaryArrivalValue')}</Text>
                  </View>
                </View>

                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    onPress={() => setStep('form')}
                    style={styles.backBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('seller.finance.withdraw.back')}
                  >
                    <Text style={styles.backText}>{t('seller.finance.withdraw.back')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleConfirm}
                    style={styles.confirmBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('seller.finance.withdraw.confirmCtaAria', {
                      amount: formatNPRAmount(amount),
                      destination: `${selectedMethod.label} ${selectedMethod.accountMasked}`,
                    })}
                  >
                    <Text style={styles.confirmBtnText}>{t('seller.finance.withdraw.confirmCta')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Submitting */}
            {step === 'submitting' && (
              <View style={styles.centerWrap}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={styles.submittingText} accessibilityRole="status">
                  {t('seller.finance.withdraw.submitting')}
                </Text>
              </View>
            )}

            {/* Success */}
            {step === 'success' && (
              <View style={styles.centerWrap} accessibilityRole="status" accessibilityLiveRegion="polite">
                <View style={styles.successCircle}>
                  <View style={styles.successGoldRing} />
                  <Check size={32} color={colors.success} />
                </View>
                <Text style={styles.successTitle}>{t('seller.finance.withdraw.successTitle')}</Text>
                <Text style={styles.successBody}>
                  {t('seller.finance.withdraw.successBody', {
                    amount: formatNPRAmount(amount),
                    method: selectedMethod?.label ?? '',
                  })}
                </Text>
                {result.payoutId && (
                  <Text style={styles.refText}>
                    {t('seller.finance.withdraw.successPayoutId')}: {result.payoutId}
                  </Text>
                )}
                <View style={styles.balanceSummary}>
                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceLabel}>{t('seller.finance.withdraw.successNewAvailable')}</Text>
                    <Text style={styles.balanceValue}>
                      NPR {formatNPRAmount(result.newAvailable ?? availableBalance - amount)}
                    </Text>
                  </View>
                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceLabel}>{t('seller.finance.withdraw.successNewPending')}</Text>
                    <Text style={[styles.balanceValue, { color: colors.textMuted }]}>
                      NPR {formatNPRAmount(result.newPending ?? pendingBalance + amount)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.ctaBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('seller.finance.withdraw.successClose')}
                >
                  <Text style={styles.ctaText}>{t('seller.finance.withdraw.successClose')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Error */}
            {step === 'error' && (
              <View style={styles.centerWrap} accessibilityRole="alert" accessibilityLiveRegion="assertive">
                <View style={styles.errorCircle}>
                  <AlertCircle size={28} color={colors.error} />
                </View>
                <Text style={styles.errorTitle}>{t('seller.finance.withdraw.errorGeneric')}</Text>
                {errorMsg !== '' && <Text style={styles.errorBody}>{errorMsg}</Text>}
                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.backBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('seller.finance.withdraw.cancel')}
                  >
                    <Text style={styles.backText}>{t('seller.finance.withdraw.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setStep('form')}
                    style={styles.confirmBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('seller.finance.withdraw.retry')}
                  >
                    <Text style={styles.confirmBtnText}>{t('seller.finance.withdraw.retry')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </RNModal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '90%',
  },
  sheetContent: { padding: spacing[5] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[5] },
  title: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: 2 },
  label: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text, marginBottom: spacing[2] },
  amountRow: { flexDirection: 'row', gap: spacing[2] },
  amountInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    paddingLeft: spacing[3],
    height: 48,
  },
  currencyPrefix: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.textMuted },
  amountInput: {
    flex: 1,
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    paddingLeft: spacing[2],
  },
  allBtn: {
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  allText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.primary },
  availText: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: spacing[1.5] },
  errorText: { fontSize: fontSize.xs[0], color: colors.error, marginTop: spacing[1.5], fontWeight: '500' },
  methodSkeleton: { height: 48, borderRadius: radii.lg, backgroundColor: colors.shimmer },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[2],
  },
  methodRowActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  methodLabel: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  methodMask: { fontSize: fontSize.xs[0], color: colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  noMethodBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    padding: spacing[4],
    alignItems: 'center',
  },
  noMethodText: { fontSize: fontSize.sm[0], color: colors.textMuted },
  addMethodLink: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.primary, marginTop: spacing[1] },
  summaryBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  summaryTitle: { fontSize: fontSize.xs[0], fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: fontSize.sm[0], color: colors.textMuted },
  summaryValue: { fontSize: fontSize.sm[0], fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'] },
  ctaBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  ctaBtnDisabled: { opacity: 0.5 },
  ctaText: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.white },
  confirmBanner: {
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    borderRadius: radii.lg,
    padding: spacing[4],
  },
  confirmText: { fontSize: fontSize.sm[0], color: colors.text },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmLabel: { fontSize: fontSize.sm[0], color: colors.textMuted },
  confirmValue: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  confirmActions: { flexDirection: 'row', gap: spacing[3] },
  backBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  backText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.textMuted },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  confirmBtnText: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.white },
  centerWrap: { alignItems: 'center', paddingVertical: spacing[6] },
  submittingText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text, marginTop: spacing[3] },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  successGoldRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: colors.gold + '4D',
  },
  successTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, marginBottom: spacing[1] },
  successBody: { fontSize: fontSize.sm[0], color: colors.textMuted, textAlign: 'center', marginBottom: spacing[2] },
  refText: { fontSize: fontSize.xs[0], color: colors.textTertiary, fontFamily: 'monospace', marginBottom: spacing[4] },
  balanceSummary: { width: '100%', gap: spacing[2], marginBottom: spacing[5] },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  balanceLabel: { fontSize: fontSize.sm[0], color: colors.textMuted },
  balanceValue: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  errorCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  errorTitle: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.text, marginBottom: spacing[2] },
  errorBody: { fontSize: fontSize.sm[0], color: colors.error, textAlign: 'center', marginBottom: spacing[4] },
})
