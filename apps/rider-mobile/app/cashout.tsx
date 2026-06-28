import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated'
import {
  ChevronLeft,
  Zap,
  Calendar,
  Building2,
  Smartphone,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Banknote,
  ChevronRight,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow, duration, easing } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import { useRiderEarningsStore } from '@chinooz/state'
import { useRiderPayoutMethods, useRiderRequestWithdrawal, useRiderWithdrawalDetail } from '@chinooz/hooks'
import {
  formatRiderNPRAmount,
  MIN_WITHDRAWAL,
  INSTANT_FEE,
  WEEKLY_FEE,
  type RiderPayoutMethod,
  type WithdrawalStatus,
} from '@chinooz/mock-data'

const AnimatedPress = Animated.createAnimatedComponent(TouchableOpacity)

type Phase = 'form' | 'submitting' | 'pending' | 'paid' | 'failed'

export default function CashOutScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()

  const storeBalance = useRiderEarningsStore(s => s.withdrawableBalance)
  const setLastWithdrawal = useRiderEarningsStore(s => s.setLastWithdrawal)
  const setWithdrawalStatus = useRiderEarningsStore(s => s.setWithdrawalStatus)
  const completeCashout = useRiderEarningsStore(s => s.completeCashout)
  const clearLastWithdrawal = useRiderEarningsStore(s => s.clearLastWithdrawal)

  const { data: methods, isLoading: loading, isError: error, refetch, isRefetching } = useRiderPayoutMethods()
  const withdrawMutation = useRiderRequestWithdrawal()

  const [amount, setAmount] = useState('')
  const [isFull, setIsFull] = useState(true)
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null)
  const [isInstant, setIsInstant] = useState(true)
  const [phase, setPhase] = useState<Phase>('form')
  const [withdrawalId, setWithdrawalId] = useState<string | null>(null)
  const [withdrawalRef, setWithdrawalRef] = useState<string | null>(null)
  const [failReason, setFailReason] = useState('')

  const availableBalance = storeBalance ?? 0

  useEffect(() => {
    analytics.screen({ name: 'rider-cashout' })
  }, [])

  // Auto-select default payout method
  useEffect(() => {
    if (methods && methods.length > 0 && !selectedMethodId) {
      const def = methods.find(x => x.isDefault) ?? methods[0]
      if (def) setSelectedMethodId(def.id)
    }
  }, [methods, selectedMethodId])

  const onRefresh = () => {
    refetch()
  }

  // Auto-set full amount on first load
  useEffect(() => {
    if (availableBalance > 0 && isFull && !amount) {
      setAmount(String(availableBalance))
    }
  }, [availableBalance, isFull, amount])

  const numericAmount = parseInt(amount || '0', 10) || 0
  const fee = isInstant ? INSTANT_FEE : WEEKLY_FEE
  const net = Math.max(0, numericAmount - fee)

  const validation = useMemo(() => {
    if (numericAmount <= 0) return { ok: false, msg: t('rider.earnings.payout.cashout.invalidAmount') }
    if (numericAmount < MIN_WITHDRAWAL) return { ok: false, msg: t('rider.earnings.payout.cashout.belowMin', { min: MIN_WITHDRAWAL }) }
    if (numericAmount > availableBalance) return { ok: false, msg: t('rider.earnings.payout.cashout.exceedsBalance') }
    return { ok: true, msg: '' }
  }, [numericAmount, availableBalance, t])

  const selectedMethod = (methods ?? []).find(m => m.id === selectedMethodId) ?? null

  const canSubmit =
    phase === 'form' &&
    validation.ok &&
    selectedMethod !== null &&
    availableBalance > 0

  // Poll withdrawal status while pending
  const { data: withdrawalDetail } = useRiderWithdrawalDetail(withdrawalId)
  useEffect(() => {
    if (phase !== 'pending' || !withdrawalDetail) return
    setWithdrawalStatus(withdrawalDetail.status)
    if (withdrawalDetail.status === 'paid') {
      setPhase('paid')
      setWithdrawalRef(withdrawalDetail.reference ?? null)
      completeCashout(numericAmount)
      analytics.track('rider_withdrawal_paid', { amountNpr: numericAmount })
      try {
        if (!reduced) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
    } else if (withdrawalDetail.status === 'failed') {
      setPhase('failed')
      setFailReason(withdrawalDetail.failureReason ?? '')
      analytics.track('rider_withdrawal_failed', { amountNpr: numericAmount })
      try {
        if (!reduced) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } catch {}
    }
  }, [withdrawalDetail, phase, numericAmount, reduced, setWithdrawalStatus, completeCashout])

  const onSubmit = async () => {
    if (!canSubmit || !selectedMethod) return
    try {
      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {}
    setPhase('submitting')
    analytics.track('rider_withdrawal_submitted', { amountNpr: numericAmount, method: selectedMethod.kind, instant: isInstant })
    try {
      const opRef = `withdraw-${Date.now()}-${numericAmount}`
      const result = await withdrawMutation.mutateAsync({
        amountNpr: numericAmount,
        destination: selectedMethod.kind,
        opRef,
      })
      if (result.success) {
        // Simulate: create a pending withdrawal entry and poll for status
        const simId = `wd-${Date.now()}`
        setWithdrawalId(simId)
        setLastWithdrawal(simId, 'requested')
        setPhase('pending')
        try {
          if (!reduced) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } catch {}
      } else {
        setPhase('failed')
        setFailReason(result.error ?? 'Request failed')
      }
    } catch {
      setPhase('failed')
      setFailReason('Request failed')
    }
  }

  const onFullAmount = () => {
    setIsFull(true)
    setAmount(String(availableBalance))
    try {
      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
  }

  const onPartial = () => {
    setIsFull(false)
    setAmount('')
  }

  const onDone = () => {
    clearLastWithdrawal()
    router.back()
  }

  const onRetry = () => {
    setPhase('form')
    setWithdrawalId(null)
    setWithdrawalRef(null)
    setFailReason('')
  }

  if (loading) return <Skeleton insets={insets} t={t} router={router} />
  if (error) {
    return (
      <ErrorShell
        insets={insets}
        t={t}
        router={router}
        title={t('rider.earnings.payout.cashout.errorTitle')}
        subtitle={t('rider.earnings.payout.cashout.errorSubtitle')}
        retry={t('rider.earnings.payout.cashout.retry')}
        onRetry={onRefresh}
      />
    )
  }

  // ── Pending / Paid / Failed states ──
  if (phase === 'pending' || phase === 'paid' || phase === 'failed') {
    return (
      <ResultState
        t={t}
        router={router}
        insets={insets}
        phase={phase}
        amount={numericAmount}
        net={net}
        fee={fee}
        methodLabel={selectedMethod?.label ?? ''}
        maskedAccount={selectedMethod?.maskedAccount ?? ''}
        ref={withdrawalRef}
        failReason={failReason}
        onDone={onDone}
        onRetry={onRetry}
        reduced={reduced}
        viewHistory={() => router.push('/withdrawal-history')}
      />
    )
  }

  // ── No payout methods ──
  if ((methods ?? []).length === 0 && !loading) {
    return (
      <View style={styles.container}>
        <Header t={t} router={router} insets={insets} />
        <ScrollView contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6], gap: spacing[3] }}>
          <Building2 size={32} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>{t('rider.earnings.payout.cashout.noMethods')}</Text>
          <Text style={styles.emptySub}>{t('rider.earnings.payout.cashout.noMethodsSub')}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.earnings.payout.cashout.noMethodsCtaAria')}
            onPress={() => router.push('/payout-methods')}
            style={styles.emptyCta}
          >
            <Text style={styles.emptyCtaText}>{t('rider.earnings.payout.cashout.noMethodsCta')}</Text>
            <ArrowRight size={16} color={colors.white} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header t={t} router={router} insets={insets} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8], paddingHorizontal: spacing[4], paddingTop: spacing[4], gap: spacing[3] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Balance card */}
        <View style={styles.balanceCard} accessibilityRole="header" accessible accessibilityLabel={t('rider.earnings.payout.cashout.balanceLabel')}>
          <Text style={styles.balanceLabel}>{t('rider.earnings.payout.cashout.balanceLabel')}</Text>
          <Text style={styles.balanceAmount}>NPR {formatRiderNPRAmount(availableBalance)}</Text>
        </View>

        {/* Amount section */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('rider.earnings.payout.cashout.amountLabel')}</Text>
        </View>
        <View style={styles.amountCard}>
          <View style={styles.amountToggleRow}>
            <ToggleChip
              label={t('rider.earnings.payout.cashout.fullAmount')}
              ariaLabel={t('rider.earnings.payout.cashout.fullAmountAria', { amount: formatRiderNPRAmount(availableBalance) })}
              active={isFull}
              onPress={onFullAmount}
            />
            <ToggleChip
              label={t('rider.earnings.payout.cashout.partialAmount')}
              ariaLabel={t('rider.earnings.payout.cashout.partialAmountAria')}
              active={!isFull}
              onPress={onPartial}
            />
          </View>
          <View style={styles.amountInputRow}>
            <Text style={styles.amountCurrency}>NPR</Text>
            <TextInput
              accessibilityLabel={t('rider.earnings.payout.cashout.amountAria', { min: MIN_WITHDRAWAL, available: formatRiderNPRAmount(availableBalance) })}
              accessibilityRole="keyboardkey"
              style={styles.amountInput}
              value={amount}
              onChangeText={v => {
                const clean = v.replace(/[^0-9]/g, '')
                setAmount(clean)
                setIsFull(clean === String(availableBalance))
              }}
              placeholder={t('rider.earnings.payout.cashout.amountPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>
          <Text style={styles.minHint}>{t('rider.earnings.payout.cashout.minThreshold', { min: MIN_WITHDRAWAL })}</Text>
          {!validation.ok && numericAmount > 0 && (
            <Text style={styles.validationMsg} accessibilityRole="text" accessible>
              {validation.msg}
            </Text>
          )}
        </View>

        {/* Method picker */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('rider.earnings.payout.cashout.sectionMethod')}</Text>
        </View>
        <View style={styles.methodsCard}>
          {(methods ?? []).map((m, i) => (
            <MethodRadio
              key={m.id}
              method={m}
              selected={m.id === selectedMethodId}
              onSelect={() => {
                setSelectedMethodId(m.id)
                try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
              }}
              t={t}
              isLast={i === (methods ?? []).length - 1}
            />
          ))}
        </View>

        {/* Schedule */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('rider.earnings.payout.cashout.sectionSchedule')}</Text>
        </View>
        <View style={styles.scheduleCard}>
          <ScheduleOption
            icon={<Zap size={16} color={isInstant ? colors.primary : colors.textTertiary} />}
            label={t('rider.earnings.payout.cashout.instantLabel')}
            sub={t('rider.earnings.payout.cashout.instantSub', { fee: INSTANT_FEE })}
            ariaLabel={t('rider.earnings.payout.cashout.instantAria', { fee: INSTANT_FEE })}
            selected={isInstant}
            onSelect={() => setIsInstant(true)}
          />
          <View style={styles.scheduleDivider} />
          <ScheduleOption
            icon={<Calendar size={16} color={!isInstant ? colors.primary : colors.textTertiary} />}
            label={t('rider.earnings.payout.cashout.weeklyLabel')}
            sub={t('rider.earnings.payout.cashout.weeklySub')}
            ariaLabel={t('rider.earnings.payout.cashout.weeklyAria')}
            selected={!isInstant}
            onSelect={() => setIsInstant(false)}
          />
        </View>

        {/* Fee note */}
        <View style={styles.feeNoteRow} accessibilityRole="text" accessible accessibilityLabel={t('rider.earnings.payout.cashout.feeNoteAria', { fee: INSTANT_FEE })}>
          <Text style={styles.feeNoteText}>
            {t('rider.earnings.payout.cashout.feeNote', { fee: INSTANT_FEE })}
          </Text>
        </View>

        {/* Summary + confirm */}
        {numericAmount > 0 && validation.ok && selectedMethod && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('rider.earnings.payout.cashout.confirmSummary', { amount: formatRiderNPRAmount(numericAmount), method: selectedMethod.label })}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summarySubLabel}>{t('rider.earnings.payout.cashout.confirmFee', { fee: formatRiderNPRAmount(fee) })}</Text>
            </View>
            <View style={styles.summaryNetRow}>
              <Text style={styles.summaryNetLabel}>{t('rider.earnings.payout.cashout.confirmNet')}</Text>
              <Text style={styles.summaryNetValue}>NPR {formatRiderNPRAmount(net)}</Text>
            </View>
          </View>
        )}

        {/* Links */}
        <View style={styles.linksRow}>
          <LinkRow
            label={t('rider.earnings.payout.cashout.manageMethods')}
            ariaLabel={t('rider.earnings.payout.cashout.manageMethodsAria')}
            onPress={() => router.push('/payout-methods')}
          />
          <LinkRow
            label={t('rider.earnings.payout.cashout.viewHistory')}
            ariaLabel={t('rider.earnings.payout.cashout.viewHistoryAria')}
            onPress={() => router.push('/withdrawal-history')}
          />
        </View>

        <View style={{ height: spacing[2] }} />

        {/* Confirm button */}
      </ScrollView>

      {/* Sticky confirm CTA */}
      <View style={[styles.stickyCta, { paddingBottom: insets.bottom + spacing[3] }]}>
        <ConfirmButton
          label={t('rider.earnings.payout.cashout.confirm')}
          ariaLabel={t('rider.earnings.payout.cashout.confirmAria', {
            amount: formatRiderNPRAmount(numericAmount),
            method: selectedMethod?.label ?? '',
            fee: formatRiderNPRAmount(fee),
            net: formatRiderNPRAmount(net),
          })}
          disabled={!canSubmit}
          submitting={phase === 'submitting'}
          onPress={onSubmit}
          reduced={reduced}
        />
      </View>
    </View>
  )
}

function Header({ t, router, insets }: { t: ReturnType<typeof useTranslation>['t']; router: ReturnType<typeof useRouter>; insets: ReturnType<typeof useSafeAreaInsets> }) {
  return (
    <View style={[styles.headerBar, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('rider.earnings.payout.cashout.back')} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={styles.headerTitle}>{t('rider.earnings.payout.cashout.title')}</Text>
          <Text style={styles.headerSub}>{t('rider.earnings.payout.cashout.subtitle')}</Text>
        </View>
      </View>
    </View>
  )
}

function ToggleChip({ label, ariaLabel, active, onPress }: { label: string; ariaLabel: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.toggleChip, active && styles.toggleChipActive]}
    >
      <Text style={[styles.toggleChipText, active && styles.toggleChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function MethodRadio({ method, selected, onSelect, t, isLast }: { method: RiderPayoutMethod; selected: boolean; onSelect: () => void; t: ReturnType<typeof useTranslation>['t']; isLast: boolean }) {
  const icon = method.kind === 'bank' ? <Building2 size={18} color={method.accentColor} /> : <Smartphone size={18} color={method.accentColor} />
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityLabel={t('rider.earnings.payout.cashout.methodAria', {
        label: method.label,
        account: method.maskedAccount,
        default: method.isDefault ? t('rider.earnings.payout.cashout.methodDefault') : '',
      })}
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={[styles.methodRow, isLast && styles.methodRowLast]}
    >
      <View style={[styles.methodIcon, { backgroundColor: method.accentColor + '20' }]}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.methodLabelRow}>
          <Text style={styles.methodLabel}>{method.label}</Text>
          {method.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>{t('rider.earnings.payout.cashout.methodDefault')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.methodAccount}>{method.maskedAccount}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </TouchableOpacity>
  )
}

function ScheduleOption({ icon, label, sub, ariaLabel, selected, onSelect }: { icon: React.ReactNode; label: string; sub: string; ariaLabel: string; selected: boolean; onSelect: () => void }) {
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={styles.scheduleRow}
    >
      <View style={[styles.scheduleIcon, { backgroundColor: selected ? colors.primary50 : colors.background }]}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.scheduleLabel, selected && styles.scheduleLabelSelected]}>{label}</Text>
        <Text style={styles.scheduleSub}>{sub}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </TouchableOpacity>
  )
}

function LinkRow({ label, ariaLabel, onPress }: { label: string; ariaLabel: string; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={ariaLabel} onPress={onPress} style={styles.linkRow} activeOpacity={0.7}>
      <Text style={styles.linkText}>{label}</Text>
      <ChevronRight size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  )
}

function ConfirmButton({ label, ariaLabel, disabled, submitting, onPress, reduced }: { label: string; ariaLabel: string; disabled: boolean; submitting: boolean; onPress: () => void; reduced: boolean }) {
  const scale = useSharedValue(1)
  const handlePressIn = () => { if (!reduced) scale.value = withSpring(0.97, { damping: 14, stiffness: 400, mass: 0.6 }) }
  const handlePressOut = () => { if (!reduced) scale.value = withSpring(1, { damping: 14, stiffness: 400, mass: 0.6 }) }
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <AnimatedPress
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ disabled, busy: submitting }}
      disabled={disabled || submitting}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.confirmBtn, scaleStyle, disabled && styles.confirmBtnDisabled]}
    >
      {submitting ? (
        <ActivityIndicator size="small" color={colors.white} />
      ) : (
        <Text style={styles.confirmBtnText}>{label}</Text>
      )}
    </AnimatedPress>
  )
}

function ResultState({ t, router, insets, phase, amount, net, fee, methodLabel, maskedAccount, ref, failReason, onDone, onRetry, reduced, viewHistory }: {
  t: ReturnType<typeof useTranslation>['t']
  router: ReturnType<typeof useRouter>
  insets: ReturnType<typeof useSafeAreaInsets>
  phase: Phase
  amount: number
  net: number
  fee: number
  methodLabel: string
  maskedAccount: string
  ref: string | null
  failReason: string
  onDone: () => void
  onRetry: () => void
  reduced: boolean
  viewHistory: () => void
}) {
  const scale = useSharedValue(reduced ? 1 : 0.8)
  const opacity = useSharedValue(reduced ? 1 : 0)
  // Celebration ring: expands outward on paid state.
  const ringScale = useSharedValue(reduced ? 0 : 0)
  const ringOpacity = useSharedValue(reduced ? 0 : 0)

  const isPending = phase === 'pending'
  const isPaid = phase === 'paid'
  const isFailed = phase === 'failed'

  useEffect(() => {
    if (reduced) return
    scale.value = withSpring(1, { damping: 16, stiffness: 300, mass: 0.8 })
    opacity.value = withTiming(1, { duration: duration.normal, easing: Easing.bezier(...easing.easeOut) })
    // Celebration burst on paid.
    if (isPaid) {
      ringScale.value = withSpring(1.8, { damping: 12, stiffness: 120, mass: 1 })
      ringOpacity.value = withTiming(0, { duration: duration.slower, easing: Easing.bezier(...easing.easeOut) })
    }
  }, [isPaid, reduced])

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }))
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }))

  const icon = isPaid ? <CheckCircle2 size={48} color={colors.success} /> : isFailed ? <XCircle size={48} color={colors.error} /> : <Clock size={48} color={colors.primary} />
  const title = isPaid ? t('rider.earnings.payout.cashout.paidTitle') : isFailed ? t('rider.earnings.payout.cashout.failedTitle') : t('rider.earnings.payout.cashout.pendingTitle')
  const sub = isPaid ? t('rider.earnings.payout.cashout.paidSub', { net: formatRiderNPRAmount(net), method: methodLabel }) : isFailed ? t('rider.earnings.payout.cashout.failedSub', { amount: formatRiderNPRAmount(amount) }) : t('rider.earnings.payout.cashout.pendingSub', { amount: formatRiderNPRAmount(amount), method: methodLabel })
  const ariaLabel = isPaid
    ? t('rider.earnings.payout.cashout.paidAria', { net: formatRiderNPRAmount(net), method: methodLabel, ref: ref ?? '' })
    : isFailed
      ? t('rider.earnings.payout.cashout.failedAria', { reason: failReason })
      : t('rider.earnings.payout.cashout.pendingAria', { amount: formatRiderNPRAmount(amount), status: t('rider.earnings.payout.cashout.pendingStatus') })

  return (
    <View style={styles.container}>
      <Header t={t} router={router} insets={insets} />
      <View style={styles.resultWrap}>
        <Animated.View style={[styles.resultIconWrap, animStyle]} accessibilityRole="image" accessible accessibilityLabel={ariaLabel}>
          {icon}
        </Animated.View>
        <Text style={styles.resultTitle} accessibilityRole="header">{title}</Text>
        <Text style={styles.resultSub}>{sub}</Text>

        {/* Status announcement for screen readers */}
        <Text
          style={styles.srOnly}
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          {ariaLabel}
        </Text>

        {isPaid && ref && (
          <View style={styles.resultRefRow}>
            <Text style={styles.resultRef}>{t('rider.earnings.payout.cashout.paidRef', { ref })}</Text>
          </View>
        )}
        {isPaid && (
          <View style={styles.resultDetailCard}>
            <View style={styles.resultDetailRow}>
              <Text style={styles.resultDetailLabel}>{t('rider.earnings.payout.cashout.confirmSummary', { amount: formatRiderNPRAmount(amount), method: methodLabel })}</Text>
            </View>
            <View style={styles.resultDetailRow}>
              <Text style={styles.resultDetailSub}>{t('rider.earnings.payout.cashout.confirmFee', { fee: formatRiderNPRAmount(fee) })}</Text>
            </View>
            <View style={styles.resultDetailNetRow}>
              <Text style={styles.resultDetailNetLabel}>{t('rider.earnings.payout.cashout.confirmNet')}</Text>
              <Text style={styles.resultDetailNetValue}>NPR {formatRiderNPRAmount(net)}</Text>
            </View>
            <Text style={styles.resultDetailAccount}>{methodLabel} · {maskedAccount}</Text>
          </View>
        )}
        {isFailed && (
          <View style={styles.resultFailCard}>
            <Text style={styles.resultFailText}>{failReason}</Text>
          </View>
        )}

        <View style={styles.resultActions}>
          {isFailed ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('rider.earnings.payout.cashout.failedRetry')} onPress={onRetry} style={styles.resultRetryBtn}>
              <Text style={styles.resultRetryText}>{t('rider.earnings.payout.cashout.failedRetry')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('rider.earnings.payout.cashout.viewHistoryAria')} onPress={viewHistory} style={styles.resultHistoryBtn}>
              <Text style={styles.resultHistoryText}>{t('rider.earnings.payout.cashout.viewHistory')}</Text>
              <ArrowRight size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('rider.earnings.payout.cashout.doneAria')} onPress={onDone} style={styles.resultDoneBtn}>
            <Text style={styles.resultDoneText}>{t('rider.earnings.payout.cashout.done')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

function Skeleton({ insets, t, router }: { insets: ReturnType<typeof useSafeAreaInsets>; t: ReturnType<typeof useTranslation>['t']; router: ReturnType<typeof useRouter> }) {
  return (
    <View style={styles.container}>
      <Header t={t} router={router} insets={insets} />
      <View style={styles.skeletonWrap} accessibilityRole="progressbar" accessibilityLabel={t('rider.earnings.payout.cashout.skeletonAria')} accessibilityLiveRegion="polite" accessible>
        <View style={[styles.skeletonBlock, { height: 80 }]} />
        <View style={[styles.skeletonBlock, { height: 140 }]} />
        <View style={[styles.skeletonBlock, { height: 120 }]} />
        <View style={[styles.skeletonBlock, { height: 100 }]} />
      </View>
    </View>
  )
}

function ErrorShell({ insets, t, router, title, subtitle, retry, onRetry }: { insets: ReturnType<typeof useSafeAreaInsets>; t: ReturnType<typeof useTranslation>['t']; router: ReturnType<typeof useRouter>; title: string; subtitle: string; retry: string; onRetry: () => void }) {
  return (
    <View style={styles.container}>
      <Header t={t} router={router} insets={insets} />
      <View style={styles.errorWrap}>
        <Text style={styles.errorTitle}>{title}</Text>
        <Text style={styles.errorSubtitle}>{subtitle}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={retry} onPress={onRetry} style={styles.retryBtn}>
          <Text style={styles.retryText}>{retry}</Text>
        </TouchableOpacity>
      </View>
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

  balanceCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[4], gap: spacing[1], ...shadow('sm') },
  balanceLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: fontFamily.sansSemiBold[0] },
  balanceAmount: { fontSize: 28, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },

  sectionHead: { marginTop: spacing[1], paddingHorizontal: spacing[1] },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fontFamily.sansSemiBold[0] },

  amountCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[4], gap: spacing[2.5], ...shadow('sm') },
  amountToggleRow: { flexDirection: 'row', gap: spacing[2] },
  toggleChip: { flex: 1, alignItems: 'center', paddingVertical: spacing[2.5], borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.borderLight, backgroundColor: colors.background },
  toggleChipActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  toggleChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted, fontFamily: fontFamily.sansSemiBold[0] },
  toggleChipTextActive: { color: colors.primary },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderBottomWidth: 1.5, borderBottomColor: colors.primary, paddingBottom: spacing[1] },
  amountCurrency: { fontSize: 18, fontWeight: '700', color: colors.primary, fontFamily: fontFamily.sansBold[0] },
  amountInput: { flex: 1, fontSize: 24, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0], fontVariant: ['tabular-nums'], padding: 0 },
  minHint: { fontSize: 12, color: colors.textTertiary, fontFamily: fontFamily.sans[0] },
  validationMsg: { fontSize: 12, color: colors.error, fontWeight: '600', fontFamily: fontFamily.sansSemiBold[0] },

  methodsCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden', ...shadow('sm') },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[3.5], borderBottomWidth: 1, borderBottomColor: colors.borderLight, minHeight: 56 },
  methodRowLast: { borderBottomWidth: 0 },
  methodIcon: { width: 36, height: 36, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  methodLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  methodLabel: { fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  defaultBadge: { backgroundColor: colors.primary50, paddingHorizontal: spacing[1.5], paddingVertical: 2, borderRadius: radii.sm },
  defaultBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary, fontFamily: fontFamily.sansSemiBold[0] },
  methodAccount: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontFamily: fontFamily.sans[0] },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },

  scheduleCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden', ...shadow('sm') },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[3.5], minHeight: 56 },
  scheduleIcon: { width: 36, height: 36, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  scheduleLabel: { fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  scheduleLabelSelected: { color: colors.primary },
  scheduleSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontFamily: fontFamily.sans[0] },
  scheduleDivider: { height: 1, backgroundColor: colors.borderLight, marginLeft: spacing[12] },

  feeNoteRow: { flexDirection: 'row', backgroundColor: colors.infoLight, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], gap: spacing[2] },
  feeNoteText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.info, fontFamily: fontFamily.sans[0] },

  summaryCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.primary, padding: spacing[4], gap: spacing[2], ...shadow('sm') },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  summarySubLabel: { fontSize: 13, color: colors.textMuted, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },
  summaryNetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing[2], marginTop: spacing[1] },
  summaryNetLabel: { fontSize: 14, fontWeight: '700', color: colors.primary, fontFamily: fontFamily.sansBold[0] },
  summaryNetValue: { fontSize: 16, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },

  linksRow: { gap: spacing[1] },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[2.5], paddingHorizontal: spacing[1] },
  linkText: { fontSize: 13, fontWeight: '600', color: colors.primary, fontFamily: fontFamily.sansSemiBold[0] },

  stickyCta: { paddingHorizontal: spacing[4], paddingTop: spacing[3], backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], minHeight: 54, borderRadius: radii.lg, backgroundColor: colors.primary },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },

  // Result states
  resultWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[6], gap: spacing[3] },
  resultIconWrap: { marginBottom: spacing[2] },
  resultTitle: { fontSize: fontSize.xl[0], fontWeight: '700', color: colors.text, textAlign: 'center', fontFamily: fontFamily.sansBold[0] },
  resultSub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  resultRefRow: { marginTop: spacing[1] },
  resultRef: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, fontFamily: fontFamily.sansSemiBold[0] },
  resultDetailCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[4], gap: spacing[2], marginTop: spacing[2], ...shadow('sm') },
  resultDetailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultDetailLabel: { fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  resultDetailSub: { fontSize: 13, color: colors.textMuted, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },
  resultDetailNetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing[2], marginTop: spacing[1] },
  resultDetailNetLabel: { fontSize: 14, fontWeight: '700', color: colors.primary, fontFamily: fontFamily.sansBold[0] },
  resultDetailNetValue: { fontSize: 18, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  resultDetailAccount: { fontSize: 12, color: colors.textTertiary, marginTop: spacing[1], fontFamily: fontFamily.sans[0] },
  resultFailCard: { width: '100%', backgroundColor: colors.errorLight, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.error, padding: spacing[3], marginTop: spacing[2] },
  resultFailText: { fontSize: 13, color: colors.error, textAlign: 'center', fontFamily: fontFamily.sans[0] },
  resultActions: { width: '100%', gap: spacing[2], marginTop: spacing[4] },
  resultHistoryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], minHeight: 48, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.primary },
  resultHistoryText: { fontSize: 14, fontWeight: '700', color: colors.primary, fontFamily: fontFamily.sansSemiBold[0] },
  resultRetryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: radii.lg, backgroundColor: colors.primary },
  resultRetryText: { fontSize: 14, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
  resultDoneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight },
  resultDoneText: { fontSize: 14, fontWeight: '600', color: colors.textMuted, fontFamily: fontFamily.sansSemiBold[0] },

  // Empty (no methods)
  emptyTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, textAlign: 'center', fontFamily: fontFamily.sansSemiBold[0] },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },
  emptyCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radii.lg, backgroundColor: colors.primary },
  emptyCtaText: { fontSize: 14, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },

  // Skeleton
  skeletonWrap: { padding: spacing[4], gap: spacing[3] },
  skeletonBlock: { borderRadius: radii.lg, backgroundColor: colors.shimmer },

  // Error
  errorWrap: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: spacing[6], gap: spacing[2] },
  errorTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  errorSubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },
  retryBtn: { marginTop: spacing[3], paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radii.lg, backgroundColor: colors.primary },
  retryText: { fontSize: 14, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
})
