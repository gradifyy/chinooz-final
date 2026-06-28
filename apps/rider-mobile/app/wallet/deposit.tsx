import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Clipboard,
  Dimensions,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  Landmark,
  Store,
  Building2,
  Copy,
  Check,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Banknote,
  Navigation,
} from 'lucide-react-native'
import Svg, { Polygon, Circle, G, Defs, ClipPath } from 'react-native-svg'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import { useCODWalletStore, useCodLimitStatus } from '@chinooz/state'
import { useA11y } from '../../components/A11yProvider'
import { useAppState } from '../../components/AppStateProvider'
import {
  DepositErrorState,
  OfflineQueuedBanner,
} from '../../components/WalletStates'
import {
  DEPOSIT_METHODS,
  getDepositInstructions,
  submitCodDeposit,
  verifyDeposit,
  formatRiderNPRAmount,
  VALLEY_BOUNDARY,
  RIDER_LOCATION,
  type DepositMethodKind,
  type DepositInstructions,
  type DepositAgent,
  type DepositResult,
  type GeoPoint,
} from '@chinooz/mock-data'

type Step = 'method' | 'amount' | 'instructions' | 'confirm' | 'pending' | 'success' | 'error' | 'verifyError'

const SCREEN_WIDTH = Dimensions.get('window').width
const MAP_HEIGHT = 180

const METHOD_ICON: Record<DepositMethodKind, React.ElementType> = {
  bank: Landmark,
  agent: Store,
  office: Building2,
}

/**
 * RW4 — Deposit / settle-cash flow.
 *
 * Multi-step: method choice (bank / agent / office) → amount (default full,
 * partial allowed) → method-specific instructions + copyable reference code
 * → confirm → pending-verification → success milestone.
 *
 * On verification, the shared `codWalletStatus` store's `recordDeposit`
 * reduces cash-in-hand and frees the COD limit.
 */
export default function DepositScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { minTouchTarget } = useA11y()
  const reduced = useReducedMotion()
  const { connectivity } = useAppState()
  const isOffline = connectivity === 'offline'

  const cashInHand = useCODWalletStore(s => s.cashInHand)
  const recordDeposit = useCODWalletStore(s => s.recordDeposit)
  const limitStatus = useCodLimitStatus()

  const [step, setStep] = useState<Step>('method')
  const [method, setMethod] = useState<DepositMethodKind | null>(null)
  const [amountStr, setAmountStr] = useState('')
  const [instructions, setInstructions] = useState<DepositInstructions | null>(null)
  const [instructionsLoading, setInstructionsLoading] = useState(false)
  const [depositResult, setDepositResult] = useState<DepositResult | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [amountError, setAmountError] = useState<string | null>(null)
  const copiedRefTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copiedAccountTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Default amount = full cash-in-hand when entering amount step.
  useEffect(() => {
    if (step === 'amount' && !amountStr) {
      setAmountStr(String(cashInHand))
    }
  }, [step, amountStr, cashInHand])

  // Auto-verify after pending for a mock delay (simulates Chinooz confirming).
  useEffect(() => {
    if (step !== 'pending' || !depositResult) return
    let cancelled = false
    setVerifying(true)
    const timer = setTimeout(async () => {
      if (cancelled) return
      try {
        const result = await verifyDeposit(depositResult.id)
        if (cancelled) return
        if (result.status === 'verified') {
          recordDeposit(depositResult.amount)
          setStep('success')
          if (!reduced) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } else {
          setStep('verifyError')
          if (!reduced) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        }
      } catch {
        if (!cancelled) setStep('verifyError')
        if (!cancelled && !reduced) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } finally {
        if (!cancelled) setVerifying(false)
      }
    }, 2500)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [step, depositResult, recordDeposit, reduced])

  const handleSelectMethod = useCallback(
    (kind: DepositMethodKind) => {
      setMethod(kind)
      setAmountStr('')
      setAmountError(null)
      setStep('amount')
      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      analytics.track('rider_deposit_method_selected', { method: kind })
    },
    [reduced],
  )

  const validateAmount = useCallback(
    (val: string): string | null => {
      const n = Number(val)
      if (!val || isNaN(n)) return t('rider.wallet.deposit.amountValidationEmpty')
      if (n < 100) return t('rider.wallet.deposit.amountValidationMin')
      if (n > cashInHand)
        return t('rider.wallet.deposit.amountValidationExceed', { max: formatRiderNPRAmount(cashInHand) })
      return null
    },
    [cashInHand, t],
  )

  const handleAmountChange = useCallback(
    (val: string) => {
      setAmountStr(val)
      setAmountError(validateAmount(val))
    },
    [validateAmount],
  )

  const handleUseFull = useCallback(() => {
    setAmountStr(String(cashInHand))
    setAmountError(null)
  }, [cashInHand])

  const handleAmountNext = useCallback(async () => {
    const err = validateAmount(amountStr)
    if (err) {
      setAmountError(err)
      return
    }
    if (!method) return
    setStep('instructions')
    setInstructionsLoading(true)
    try {
      const instr = await getDepositInstructions(method)
      setInstructions(instr)
    } catch {
      setStep('error')
    } finally {
      setInstructionsLoading(false)
    }
  }, [amountStr, method, validateAmount])

  const handleCopyRef = useCallback(() => {
    if (!instructions) return
    try {
      Clipboard.setString(instructions.referenceCode)
    } catch {}
    setCopiedRef(true)
    if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (copiedRefTimer.current) clearTimeout(copiedRefTimer.current)
    copiedRefTimer.current = setTimeout(() => setCopiedRef(false), 2000)
  }, [instructions, reduced])

  const handleCopyAccount = useCallback(
    (accountNumber: string) => {
      try {
        Clipboard.setString(accountNumber)
      } catch {}
      setCopiedAccount(true)
      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      if (copiedAccountTimer.current) clearTimeout(copiedAccountTimer.current)
      copiedAccountTimer.current = setTimeout(() => setCopiedAccount(false), 2000)
    },
    [reduced],
  )

  const handleConfirm = useCallback(async () => {
    if (!method || !instructions) return
    const amount = Number(amountStr)
    setStep('confirm')
    try {
      const result = await submitCodDeposit(amount, method, instructions.referenceCode)
      setDepositResult(result)
      setStep('pending')
      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      analytics.track('rider_deposit_submitted', {
        method,
        amount,
        reference: result.reference,
      })
    } catch {
      // Preserve amount + method — never lose the user's input.
      setStep('error')
    }
  }, [method, instructions, amountStr, reduced])

  const handleBack = useCallback(() => {
    switch (step) {
      case 'amount':
        setStep('method')
        break
      case 'instructions':
        setStep('amount')
        break
      case 'confirm':
        setStep('instructions')
        break
      case 'error':
        setStep('confirm')
        break
      case 'verifyError':
        setStep('pending')
        break
      default:
        router.back()
    }
  }, [step, router])

  // Retry deposit submission — preserves amount + method.
  const handleRetrySubmit = useCallback(() => {
    setStep('confirm')
  }, [])

  // Retry verification.
  const handleRetryVerify = useCallback(() => {
    if (!depositResult) return
    setStep('pending')
  }, [depositResult])

  // Full reset.
  const handleRetry = useCallback(() => {
    setStep('method')
    setDepositResult(null)
    setInstructions(null)
    setAmountStr('')
    setAmountError(null)
  }, [])

  const handleDone = useCallback(() => {
    router.replace('/wallet' as never)
  }, [router])

  const amount = Number(amountStr) || 0
  const methodLabel = method
    ? DEPOSIT_METHODS.find(m => m.kind === method)?.label ?? method
    : ''

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('rider.wallet.deposit.back')}
          onPress={handleBack}
          style={[styles.backBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
        >
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{t('rider.wallet.deposit.title')}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {t('rider.wallet.deposit.subtitle')}
          </Text>
        </View>
        <View style={{ width: minTouchTarget }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8] }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step indicator */}
        <StepIndicator step={step} t={t} />

        {/* Step content */}
        {step === 'method' && (
          <MethodChoice
            t={t}
            minTouchTarget={minTouchTarget}
            selected={method}
            onSelect={handleSelectMethod}
          />
        )}

        {step === 'amount' && (
          <AmountEntry
            t={t}
            amountStr={amountStr}
            onAmountChange={handleAmountChange}
            onUseFull={handleUseFull}
            cashInHand={cashInHand}
            error={amountError}
            minTouchTarget={minTouchTarget}
            onNext={handleAmountNext}
            methodLabel={methodLabel}
          />
        )}

        {step === 'instructions' && (
          <InstructionsStep
            t={t}
            method={method}
            instructions={instructions}
            loading={instructionsLoading}
            copiedRef={copiedRef}
            onCopyRef={handleCopyRef}
            copiedAccount={copiedAccount}
            onCopyAccount={handleCopyAccount}
            minTouchTarget={minTouchTarget}
            onNext={() => setStep('confirm')}
            amount={amount}
          />
        )}

        {step === 'confirm' && (
          <ConfirmStep
            t={t}
            amount={amount}
            methodLabel={methodLabel}
            reference={instructions?.referenceCode ?? ''}
            onConfirm={handleConfirm}
            minTouchTarget={minTouchTarget}
          />
        )}

        {(step === 'pending' || step === 'success') && depositResult && (
          <StatusStep
            t={t}
            step={step}
            amount={depositResult.amount}
            reference={depositResult.reference}
            methodLabel={methodLabel}
            verifying={verifying}
            cashInHand={cashInHand}
            limitStatusKind={limitStatus.kind}
            onDone={handleDone}
            minTouchTarget={minTouchTarget}
          />
        )}

        {/* Deposit submit error — preserves amount + method, no double-count */}
        {step === 'error' && (
          <DepositErrorState
            title={t('rider.wallet.states.errorDepositSubmitTitle')}
            body={t('rider.wallet.states.errorDepositSubmitBody')}
            ariaLabel={t('rider.wallet.states.errorDepositSubmitAria')}
            preservedNote={t('rider.wallet.states.errorDepositSubmitPreserved', {
              amount: formatRiderNPRAmount(amount),
              method: methodLabel,
            })}
            retryLabel={t('rider.wallet.states.errorDepositSubmitRetry')}
            retryAria={t('rider.wallet.states.errorDepositSubmitRetryAria', {
              amount: formatRiderNPRAmount(amount),
              method: methodLabel,
            })}
            onRetry={handleRetrySubmit}
            onBack={handleRetry}
            backLabel={t('rider.wallet.deposit.back')}
          />
        )}

        {/* Verification failure — cash is safe, will retry */}
        {step === 'verifyError' && depositResult && (
          <DepositErrorState
            title={t('rider.wallet.states.errorVerificationTitle')}
            body={t('rider.wallet.states.errorVerificationBody')}
            ariaLabel={t('rider.wallet.states.errorVerificationAria')}
            preservedNote={t('rider.wallet.states.errorVerificationPreserved', {
              amount: formatRiderNPRAmount(depositResult.amount),
              method: methodLabel,
              reference: depositResult.reference,
            })}
            retryLabel={t('rider.wallet.states.errorVerificationRetry')}
            retryAria={t('rider.wallet.states.errorVerificationRetryAria')}
            onRetry={handleRetryVerify}
            onBack={handleDone}
            backLabel={t('rider.wallet.deposit.successDone')}
          />
        )}

        {/* Offline queued deposit banner */}
        {isOffline && step === 'pending' && depositResult && (
          <OfflineQueuedBanner
            title={t('rider.wallet.states.offlineQueuedTitle')}
            body={t('rider.wallet.states.offlineQueuedBody', {
              amount: formatRiderNPRAmount(depositResult.amount),
              method: methodLabel,
            })}
            ariaLabel={t('rider.wallet.states.offlineQueuedAria', {
              amount: formatRiderNPRAmount(depositResult.amount),
            })}
          />
        )}
      </ScrollView>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEP_ORDER: Step[] = ['method', 'amount', 'instructions', 'confirm']

function StepIndicator({
  step,
  t,
}: {
  step: Step
  t: (key: string) => string
}) {
  const currentIdx = STEP_ORDER.indexOf(step)
  const isStatus = step === 'pending' || step === 'success' || step === 'error' || step === 'verifyError'

  return (
    <View style={styles.stepBar}>
      {STEP_ORDER.map((s, i) => {
        const isActive = !isStatus && i === currentIdx
        const isDone = !isStatus && i < currentIdx
        const labelKeys: Record<string, string> = {
          method: 'rider.wallet.deposit.stepMethod',
          amount: 'rider.wallet.deposit.stepAmount',
          instructions: 'rider.wallet.deposit.stepInstructions',
          confirm: 'rider.wallet.deposit.stepConfirm',
        }
        return (
          <View key={s} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                isActive && styles.stepDotActive,
                isDone && styles.stepDotDone,
              ]}
            >
              {isDone ? (
                <Check size={12} color={colors.white} />
              ) : (
                <Text
                  style={[
                    styles.stepNum,
                    isActive && styles.stepNumActive,
                  ]}
                >
                  {i + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                isActive && styles.stepLabelActive,
                isDone && styles.stepLabelDone,
              ]}
              numberOfLines={1}
            >
              {t(labelKeys[s])}
            </Text>
            {i < STEP_ORDER.length - 1 && (
              <View
                style={[styles.stepConnector, isDone && styles.stepConnectorDone]}
              />
            )}
          </View>
        )
      })}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Method choice step
// ---------------------------------------------------------------------------

function MethodChoice({
  t,
  minTouchTarget,
  selected,
  onSelect,
}: {
  t: (key: string, opts?: Record<string, unknown>) => string
  minTouchTarget: number
  selected: DepositMethodKind | null
  onSelect: (kind: DepositMethodKind) => void
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('rider.wallet.deposit.stepMethod')}</Text>
      {DEPOSIT_METHODS.map(m => {
        const Icon = METHOD_ICON[m.kind]
        const isSelected = selected === m.kind
        const aria = t('rider.wallet.deposit.methodAria', {
          label: m.label,
          description: m.description,
        })
        return (
          <Pressable
            key={m.kind}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={aria}
            onPress={() => onSelect(m.kind)}
            style={[
              styles.methodCard,
              isSelected && styles.methodCardSelected,
              { minHeight: minTouchTarget },
            ]}
          >
            <View
              style={[
                styles.methodIconWrap,
                isSelected && styles.methodIconWrapSelected,
              ]}
            >
              <Icon
                size={22}
                color={isSelected ? colors.primary : colors.textSecondary}
              />
            </View>
            <View style={styles.methodText}>
              <Text style={styles.methodLabel}>{m.label}</Text>
              <Text style={styles.methodDesc} numberOfLines={2}>
                {m.description}
              </Text>
            </View>
            <View
              style={[
                styles.radioOuter,
                isSelected && styles.radioOuterSelected,
              ]}
            >
              {isSelected && <View style={styles.radioInner} />}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Amount entry step
// ---------------------------------------------------------------------------

function AmountEntry({
  t,
  amountStr,
  onAmountChange,
  onUseFull,
  cashInHand,
  error,
  minTouchTarget,
  onNext,
  methodLabel: _methodLabel,
}: {
  t: (key: string, opts?: Record<string, unknown>) => string
  amountStr: string
  onAmountChange: (val: string) => void
  onUseFull: () => void
  cashInHand: number
  error: string | null
  minTouchTarget: number
  onNext: () => void
  methodLabel: string
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('rider.wallet.deposit.stepAmount')}</Text>

      {/* Cash-in-hand context */}
      <View style={styles.cashContextCard}>
        <Banknote size={18} color={colors.gold} />
        <View style={styles.cashContextText}>
          <Text style={styles.cashContextLabel}>
            {t('rider.wallet.deposit.amountDefault', {
              amount: formatRiderNPRAmount(cashInHand),
            })}
          </Text>
        </View>
      </View>

      {/* Amount input */}
      <View style={styles.amountInputWrap}>
        <Text style={styles.currencyPrefix}>NPR</Text>
        <TextInput
          style={styles.amountInput}
          value={amountStr}
          onChangeText={onAmountChange}
          placeholder={t('rider.wallet.deposit.amountPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          keyboardType="numeric"
          accessibilityLabel={t('rider.wallet.deposit.amountAria', {
            max: formatRiderNPRAmount(cashInHand),
          })}
          returnKeyType="done"
        />
      </View>

      {error && (
        <View style={styles.errorRow}>
          <AlertTriangle size={14} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Quick action: use full */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('rider.wallet.deposit.amountUseFull')}
        onPress={onUseFull}
        style={[styles.useFullBtn, { minHeight: minTouchTarget }]}
      >
        <Text style={styles.useFullText}>
          {t('rider.wallet.deposit.amountUseFull')}
        </Text>
      </Pressable>

      {/* Next */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('rider.wallet.deposit.nextBtn')}
        onPress={onNext}
        disabled={!!error || !amountStr}
        style={[
          styles.primaryBtn,
          (error || !amountStr) && styles.primaryBtnDisabled,
          { minHeight: minTouchTarget },
        ]}
      >
        <Text style={styles.primaryBtnText}>{t('rider.wallet.deposit.nextBtn')}</Text>
      </Pressable>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Instructions step (method-specific + reference code)
// ---------------------------------------------------------------------------

function InstructionsStep({
  t,
  method,
  instructions,
  loading,
  copiedRef,
  onCopyRef,
  copiedAccount,
  onCopyAccount,
  minTouchTarget,
  onNext,
  amount,
}: {
  t: (key: string, opts?: Record<string, unknown>) => string
  method: DepositMethodKind | null
  instructions: DepositInstructions | null
  loading: boolean
  copiedRef: boolean
  onCopyRef: () => void
  copiedAccount: boolean
  onCopyAccount: (account: string) => void
  minTouchTarget: number
  onNext: () => void
  amount: number
}) {
  if (loading || !instructions) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('rider.wallet.loading')}</Text>
      </View>
    )
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('rider.wallet.deposit.instructionsTitle')}</Text>

      {/* Reference code (always shown) */}
      <View style={styles.refCard}>
        <Text style={styles.refLabel}>{t('rider.wallet.deposit.referenceLabel')}</Text>
        <Text style={styles.refHint}>{t('rider.wallet.deposit.referenceHint')}</Text>
        <View style={styles.refCodeRow}>
          <Text style={styles.refCode} accessibilityRole="text">
            {instructions.referenceCode}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('rider.wallet.deposit.referenceCopyAria', {
              code: instructions.referenceCode,
            })}
            onPress={onCopyRef}
            style={[styles.copyBtn, { minHeight: minTouchTarget, minWidth: minTouchTarget }]}
          >
            {copiedRef ? (
              <Check size={16} color={colors.success} />
            ) : (
              <Copy size={16} color={colors.primary} />
            )}
          </Pressable>
        </View>
        {copiedRef && (
          <Text
            style={styles.copiedText}
            accessibilityLiveRegion="polite"
            accessibilityRole="text"
          >
            {t('rider.wallet.deposit.referenceCopied')}
          </Text>
        )}
      </View>

      {/* Method-specific instructions */}
      {method === 'bank' && instructions.bank && (
        <BankInstructions
          t={t}
          bank={instructions.bank}
          copiedAccount={copiedAccount}
          onCopyAccount={onCopyAccount}
          minTouchTarget={minTouchTarget}
        />
      )}

      {method === 'agent' && instructions.agents && (
        <AgentInstructions
          t={t}
          agents={instructions.agents}
        />
      )}

      {method === 'office' && instructions.office && (
        <OfficeInstructions t={t} office={instructions.office} />
      )}

      {/* Amount summary */}
      <View style={styles.amountSummary}>
        <Text style={styles.amountSummaryLabel}>
          {t('rider.wallet.deposit.amountLabel')}
        </Text>
        <Text style={styles.amountSummaryValue}>
          NPR {formatRiderNPRAmount(amount)}
        </Text>
      </View>

      {/* Next */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('rider.wallet.deposit.nextBtn')}
        onPress={onNext}
        style={[styles.primaryBtn, { minHeight: minTouchTarget }]}
      >
        <Text style={styles.primaryBtnText}>{t('rider.wallet.deposit.nextBtn')}</Text>
      </Pressable>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Bank instructions
// ---------------------------------------------------------------------------

function BankInstructions({
  t,
  bank,
  copiedAccount,
  onCopyAccount,
  minTouchTarget,
}: {
  t: (key: string, opts?: Record<string, unknown>) => string
  bank: NonNullable<DepositInstructions['bank']>
  copiedAccount: boolean
  onCopyAccount: (account: string) => void
  minTouchTarget: number
}) {
  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailCardTitle}>{t('rider.wallet.deposit.bankTitle')}</Text>

      <DetailRow label={t('rider.wallet.deposit.bankNameLabel')} value={bank.bankName} />
      <DetailRow
        label={t('rider.wallet.deposit.bankAccountNameLabel')}
        value={bank.accountName}
      />

      {/* Account number with copy */}
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          {t('rider.wallet.deposit.bankAccountNumberLabel')}
        </Text>
        <View style={styles.accountNumRow}>
          <Text style={styles.detailValueMono} accessibilityRole="text">
            {bank.accountNumber}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('rider.wallet.deposit.bankCopyAccountAria', {
              number: bank.accountNumber,
            })}
            onPress={() => onCopyAccount(bank.accountNumber)}
            style={[
              styles.copyBtn,
              { minHeight: minTouchTarget, minWidth: minTouchTarget },
            ]}
          >
            {copiedAccount ? (
              <Check size={16} color={colors.success} />
            ) : (
              <Copy size={16} color={colors.primary} />
            )}
          </Pressable>
        </View>
      </View>

      {copiedAccount && (
        <Text
          style={styles.copiedText}
          accessibilityLiveRegion="polite"
          accessibilityRole="text"
        >
          {t('rider.wallet.deposit.bankAccountCopied')}
        </Text>
      )}

      {/* QR placeholder */}
      <View style={styles.qrWrap}>
        <View style={styles.qrPlaceholder}>
          <View style={styles.qrGrid}>
            {Array.from({ length: 25 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.qrCell,
                  (i * 7 + 3) % 3 === 0 && styles.qrCellFilled,
                ]}
              />
            ))}
          </View>
        </View>
        <Text style={styles.qrHint}>{t('rider.wallet.deposit.bankQrHint')}</Text>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Agent instructions (map + fallback list)
// ---------------------------------------------------------------------------

function AgentInstructions({
  t,
  agents,
}: {
  t: (key: string, opts?: Record<string, unknown>) => string
  agents: DepositAgent[]
}) {
  const cardWidth = SCREEN_WIDTH - spacing[5] * 2
  const mapWidth = cardWidth - spacing[4] * 2

  const { project } = useAgentProjection(mapWidth, MAP_HEIGHT, agents)

  const boundaryPts = useMemo(
    () => polygonPoints(VALLEY_BOUNDARY, project),
    [project],
  )
  const riderPt = useMemo(() => project(RIDER_LOCATION), [project])

  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailCardTitle}>{t('rider.wallet.deposit.agentTitle')}</Text>

      {/* Agent map */}
      <View
        style={styles.agentMapWrap}
        accessibilityRole="image"
        accessibilityLabel={t('rider.wallet.deposit.agentMapAria', {
          count: agents.length,
        })}
      >
        <Svg width={mapWidth} height={MAP_HEIGHT} viewBox={`0 0 ${mapWidth} ${MAP_HEIGHT}`}>
          <Defs>
            <ClipPath id="agentMapClip">
              <Polygon points={boundaryPts} />
            </ClipPath>
          </Defs>
          {/* Boundary fill */}
          <Polygon
            points={boundaryPts}
            fill={colors.background}
            stroke={colors.border}
            strokeWidth={1.5}
          />
          {/* Rider marker */}
          <G>
            <Circle cx={riderPt.x} cy={riderPt.y} r={7} fill={colors.primary} />
            <Circle cx={riderPt.x} cy={riderPt.y} r={3} fill={colors.white} />
          </G>
          {/* Agent markers */}
          {agents.map(agent => {
            const pt = project(agent.point)
            return (
              <G key={agent.id}>
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={6}
                  fill={agent.open ? colors.gold : colors.textTertiary}
                />
                <Circle cx={pt.x} cy={pt.y} r={2.5} fill={colors.white} />
              </G>
            )
          })}
        </Svg>
        {/* Legend */}
        <View style={styles.mapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>You</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.gold }]} />
            <Text style={styles.legendText}>Open agent</Text>
          </View>
        </View>
      </View>

      {/* Fallback list (always shown for accessibility) */}
      <Text style={styles.agentListTitle}>
        {t('rider.wallet.deposit.agentListTitle')}
      </Text>
      {agents.map(agent => (
        <View key={agent.id} style={styles.agentItem} accessibilityRole="text">
          <View style={styles.agentItemHeader}>
            <MapPin size={14} color={agent.open ? colors.gold : colors.textTertiary} />
            <Text style={styles.agentName} numberOfLines={1}>
              {agent.name}
            </Text>
          </View>
          <Text style={styles.agentAddress} numberOfLines={2}>
            {agent.address}
          </Text>
          <View style={styles.agentMetaRow}>
            <View style={styles.agentMetaItem}>
              <Navigation size={11} color={colors.textMuted} />
              <Text style={styles.agentMetaText}>
                {t('rider.wallet.deposit.agentDistance', { km: agent.distanceKm })}
              </Text>
            </View>
            <View style={styles.agentMetaItem}>
              <Clock size={11} color={agent.open ? colors.success : colors.error} />
              <Text
                style={[
                  styles.agentMetaText,
                  { color: agent.open ? colors.success : colors.error },
                ]}
              >
                {agent.open
                  ? t('rider.wallet.deposit.agentOpen')
                  : t('rider.wallet.deposit.agentClosed')}
              </Text>
            </View>
            <Text style={styles.agentHoursText}>{agent.hours}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Office instructions
// ---------------------------------------------------------------------------

function OfficeInstructions({
  t,
  office,
}: {
  t: (key: string) => string
  office: NonNullable<DepositInstructions['office']>
}) {
  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailCardTitle}>{t('rider.wallet.deposit.officeTitle')}</Text>
      <DetailRow label={t('rider.wallet.deposit.officeAddressLabel')} value={office.address} />
      <DetailRow label={t('rider.wallet.deposit.officeHoursLabel')} value={office.hours} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Confirm step
// ---------------------------------------------------------------------------

function ConfirmStep({
  t,
  amount,
  methodLabel,
  reference,
  onConfirm,
  minTouchTarget,
}: {
  t: (key: string, opts?: Record<string, unknown>) => string
  amount: number
  methodLabel: string
  reference: string
  onConfirm: () => void
  minTouchTarget: number
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('rider.wallet.deposit.confirmTitle')}</Text>

      <View style={styles.confirmCard}>
        <View style={styles.confirmAmountWrap}>
          <Text style={styles.confirmAmountLabel}>NPR</Text>
          <Text style={styles.confirmAmountValue} accessibilityRole="text">
            {formatRiderNPRAmount(amount)}
          </Text>
        </View>
        <View style={styles.confirmDivider} />
        <DetailRow
          label={t('rider.wallet.deposit.stepMethod')}
          value={methodLabel}
        />
        <DetailRow
          label={t('rider.wallet.deposit.confirmReference')}
          value={reference}
          mono
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('rider.wallet.deposit.confirmAria', {
          amount: formatRiderNPRAmount(amount),
          method: methodLabel,
          code: reference,
        })}
        onPress={onConfirm}
        style={[styles.primaryBtn, styles.confirmBtn, { minHeight: minTouchTarget }]}
      >
        <Text style={styles.primaryBtnText}>
          {t('rider.wallet.deposit.confirmBtn')}
        </Text>
      </Pressable>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Pending / Success status step
// ---------------------------------------------------------------------------

function StatusStep({
  t,
  step,
  amount,
  reference,
  methodLabel: _methodLabel,
  verifying,
  cashInHand,
  limitStatusKind,
  onDone,
  minTouchTarget,
}: {
  t: (key: string, opts?: Record<string, unknown>) => string
  step: Step
  amount: number
  reference: string
  methodLabel: string
  verifying: boolean
  cashInHand: number
  limitStatusKind: string
  onDone: () => void
  minTouchTarget: number
}) {
  const isPending = step === 'pending'

  const aria = isPending
    ? t('rider.wallet.deposit.pendingAria', {
        amount: formatRiderNPRAmount(amount),
        code: reference,
      })
    : t('rider.wallet.deposit.successAria', {
        amount: formatRiderNPRAmount(amount),
        cash: formatRiderNPRAmount(cashInHand),
      })

  return (
    <View
      style={styles.statusSection}
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
      accessibilityLabel={aria}
    >
      {isPending ? (
        <>
          <View style={styles.statusIconWrapPending}>
            <Loader2 size={36} color={colors.primary} />
          </View>
          <Text style={styles.statusTitle}>
            {t('rider.wallet.deposit.pendingTitle')}
          </Text>
          <Text style={styles.statusSubtitle}>
            {t('rider.wallet.deposit.pendingSubtitle', {
              amount: formatRiderNPRAmount(amount),
            })}
          </Text>
          <View style={styles.statusRefCard}>
            <Text style={styles.statusRefLabel}>
              {t('rider.wallet.deposit.pendingReference', { code: reference })}
            </Text>
          </View>
          <Text style={styles.statusHint}>
            {t('rider.wallet.deposit.pendingHint')}
          </Text>
          {verifying && (
            <View style={styles.verifyingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.verifyingText}>
                {t('rider.wallet.deposit.verifyingBtn')}
              </Text>
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.statusIconWrapSuccess}>
            <CheckCircle2 size={40} color={colors.success} />
          </View>
          <Text style={styles.statusTitleSuccess}>
            {t('rider.wallet.deposit.successTitle')}
          </Text>
          <Text style={styles.statusSubtitle}>
            {t('rider.wallet.deposit.successSubtitle', {
              amount: formatRiderNPRAmount(amount),
            })}
          </Text>
          <View style={styles.successMilestoneCard}>
            <View style={styles.milestoneRow}>
              <Banknote size={18} color={colors.gold} />
              <Text style={styles.milestoneLabel}>
                {t('rider.wallet.deposit.successCashInHand', {
                  amount: formatRiderNPRAmount(cashInHand),
                })}
              </Text>
            </View>
            <View style={styles.milestoneDivider} />
            <View style={styles.milestoneRow}>
              <CheckCircle2 size={18} color={colors.success} />
              <Text style={styles.milestoneLabel}>
                {t('rider.wallet.deposit.successReference', { code: reference })}
              </Text>
            </View>
            {limitStatusKind !== 'atLimit' && (
              <View style={styles.milestoneRow}>
                <Check size={16} color={colors.success} />
                <Text style={styles.milestoneLabel}>COD limit freed up</Text>
              </View>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('rider.wallet.deposit.successDone')}
            onPress={onDone}
            style={[styles.primaryBtn, { minHeight: minTouchTarget }]}
          >
            <Text style={styles.primaryBtnText}>
              {t('rider.wallet.deposit.successDone')}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Error step
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shared: detail row
// ---------------------------------------------------------------------------

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[styles.detailValue, mono && styles.detailValueMono]}
        accessibilityRole="text"
      >
        {value}
      </Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Agent map projection (reuse VALLEY_BOUNDARY bbox)
// ---------------------------------------------------------------------------

function useAgentProjection(
  width: number,
  height: number,
  agents: DepositAgent[],
) {
  return useMemo(() => {
    const pts = VALLEY_BOUNDARY
    const lats = pts.map(p => p.lat)
    const lngs = pts.map(p => p.lng)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const pad = 16
    const w = width - pad * 2
    const h = height - pad * 2
    const latSpan = maxLat - minLat || 1
    const lngSpan = maxLng - minLng || 1
    const scale = Math.min(w / lngSpan, h / latSpan)
    const offsetX = pad + (w - lngSpan * scale) / 2
    const offsetY = pad + (h - latSpan * scale) / 2

    const project = (p: { lat: number; lng: number }) => {
      const x = offsetX + (p.lng - minLng) * scale
      const y = offsetY + (maxLat - p.lat) * scale
      return { x, y }
    }
    return { project }
  }, [width, height, agents])
}

function polygonPoints(
  points: GeoPoint[],
  project: (p: { lat: number; lng: number }) => { x: number; y: number },
): string {
  return points
    .map(p => {
      const { x, y } = project(p)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing[2],
  },
  headerTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  headerSubtitle: {
    fontSize: fontSize.xs[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    textAlign: 'center',
    marginTop: spacing[0.5],
  },
  scroll: {
    flex: 1,
  },
  // Step indicator
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepDotDone: {
    backgroundColor: colors.success,
  },
  stepNum: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  stepNumActive: {
    color: colors.white,
  },
  stepLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    marginLeft: spacing[1.5],
    flexShrink: 1,
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  stepLabelDone: {
    color: colors.textSecondary,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing[1],
  },
  stepConnectorDone: {
    backgroundColor: colors.success,
  },
  // Section
  section: {
    padding: spacing[5],
  },
  sectionTitle: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
    marginBottom: spacing[3],
  },
  // Method cards
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[4],
    borderWidth: 2,
    borderColor: colors.borderLight,
    marginBottom: spacing[3],
    gap: spacing[3],
  },
  methodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  methodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconWrapSelected: {
    backgroundColor: colors.white,
  },
  methodText: {
    flex: 1,
  },
  methodLabel: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  methodDesc: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    marginTop: spacing[0.5],
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  // Amount entry
  cashContextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    backgroundColor: 'rgba(224, 169, 59, 0.08)',
    borderRadius: radii.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  cashContextText: {
    flex: 1,
  },
  cashContextLabel: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  currencyPrefix: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
    marginRight: spacing[2],
  },
  amountInput: {
    flex: 1,
    fontSize: fontSize['2xl'][0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
    paddingVertical: spacing[3],
    fontVariant: ['tabular-nums'],
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    marginBottom: spacing[3],
  },
  errorText: {
    fontSize: fontSize.sm[0],
    color: colors.error,
    fontFamily: fontFamily.sans[0],
  },
  useFullBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2.5],
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: spacing[4],
  },
  useFullText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Primary button (plum)
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing[3.5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: colors.border,
  },
  primaryBtnText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  confirmBtn: {
    marginTop: spacing[5],
  },
  // Loading
  loadingWrap: {
    padding: spacing[10],
    alignItems: 'center',
    gap: spacing[3],
  },
  loadingText: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  // Reference code card
  refCard: {
    backgroundColor: colors.primary50,
    borderRadius: radii.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(138, 27, 87, 0.15)',
  },
  refLabel: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
    marginBottom: spacing[1],
  },
  refHint: {
    fontSize: fontSize.xs[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    marginBottom: spacing[3],
  },
  refCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  refCode: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  copyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  copiedText: {
    fontSize: fontSize.xs[0],
    color: colors.success,
    fontFamily: fontFamily.sansSemiBold[0],
    marginTop: spacing[2],
  },
  // Detail card (bank/agent/office)
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  detailCardTitle: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
    marginBottom: spacing[3],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  detailLabel: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  detailValue: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: spacing[3],
  },
  detailValueMono: {
    fontFamily: fontFamily.sansBold[0],
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  accountNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  // QR placeholder
  qrWrap: {
    alignItems: 'center',
    marginTop: spacing[4],
  },
  qrPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow('sm'),
  },
  qrGrid: {
    width: 90,
    height: 90,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  qrCell: {
    width: 18,
    height: 18,
  },
  qrCellFilled: {
    backgroundColor: colors.text,
  },
  qrHint: {
    fontSize: fontSize.xs[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    textAlign: 'center',
    marginTop: spacing[2],
  },
  // Agent map
  agentMapWrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.background,
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  mapLegend: {
    flexDirection: 'row',
    gap: spacing[4],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1.5],
    backgroundColor: colors.surface,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  legendText: {
    fontSize: 10,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  agentListTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
    marginBottom: spacing[2],
  },
  agentItem: {
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  agentItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    marginBottom: spacing[1],
  },
  agentName: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
    flex: 1,
  },
  agentAddress: {
    fontSize: fontSize.xs[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    marginBottom: spacing[2],
  },
  agentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flexWrap: 'wrap',
  },
  agentMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  agentMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  agentHoursText: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  // Amount summary (instructions step)
  amountSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  amountSummaryLabel: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  amountSummaryValue: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  // Confirm
  confirmCard: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow('sm'),
  },
  confirmAmountWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[2],
    justifyContent: 'center',
  },
  confirmAmountLabel: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  confirmAmountValue: {
    fontSize: fontSize['3xl'][0],
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  confirmDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing[4],
  },
  // Status (pending / success / error)
  statusSection: {
    padding: spacing[5],
    alignItems: 'center',
  },
  statusIconWrapPending: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  statusIconWrapSuccess: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  statusIconWrapError: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  statusTitle: {
    fontSize: fontSize.xl[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  statusTitleSuccess: {
    fontSize: fontSize.xl[0],
    fontWeight: '700',
    color: colors.success,
    fontFamily: fontFamily.sansSemiBold[0],
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  statusTitleError: {
    fontSize: fontSize.xl[0],
    fontWeight: '700',
    color: colors.error,
    fontFamily: fontFamily.sansSemiBold[0],
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  statusSubtitle: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[4],
  },
  statusRefCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing[3],
  },
  statusRefLabel: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  statusHint: {
    fontSize: fontSize.xs[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  verifyingText: {
    fontSize: fontSize.sm[0],
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  successMilestoneCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing[5],
    ...shadow('sm'),
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    paddingVertical: spacing[2],
  },
  milestoneLabel: {
    fontSize: fontSize.sm[0],
    color: colors.text,
    fontFamily: fontFamily.sans[0],
    flex: 1,
  },
  milestoneDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing[1],
  },
})
