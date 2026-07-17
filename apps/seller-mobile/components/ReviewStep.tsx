import React, { useState, useCallback, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { Check, Pencil, Clock } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, sellerFont } from '../lib/theme'
import { useSellerSessionStore } from '@chinooz/state'
import { getCategories } from '@chinooz/mock-data'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import WizardStepper from './WizardStepper'
import LanguageToggle from './LanguageToggle'

interface Props {
  onEditStore: () => void
  onEditBusiness: () => void
  onEditBank: () => void
  onBack: () => void
  onApproved: () => void
}

type SubmitState = 'idle' | 'submitting' | 'review' | 'approved'

export default function ReviewStep({
  onEditStore,
  onEditBusiness,
  onEditBank,
  onBack,
  onApproved,
}: Props) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const draft = useSellerSessionStore(s => s.storeDraft)
  const setKycStatus = useSellerSessionStore(s => s.setKycStatus)
  const setGoLiveStatus = useSellerSessionStore(s => s.setGoLiveStatus)
  const seller = useSellerSessionStore(s => s.seller)

  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [categoryName, setCategoryName] = useState('')

  useEffect(() => {
    getCategories()
      .then(cats => {
        const cat = cats.find(c => c.id === draft.categoryId)
        if (cat) setCategoryName(cat.name)
      })
      .catch(() => {
        // Best-effort category-name lookup; leave empty on failure.
      })
  }, [draft.categoryId])

  const handleSubmit = useCallback(() => {
    if (submitState !== 'idle') return
    setSubmitState('submitting')
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}

    setTimeout(() => {
      setSubmitState('review')
      setKycStatus('pending')
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      } catch {}
    }, 1200)

    setTimeout(() => {
      setSubmitState('approved')
      setKycStatus('verified')
      setGoLiveStatus('review')
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
    }, 3000)
  }, [submitState, setKycStatus, setGoLiveStatus])

  const handleGoToDashboard = useCallback(() => {
    setGoLiveStatus('live')
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    onApproved()
  }, [setGoLiveStatus, onApproved])

  const steps = [
    { key: 'store', labelKey: 'seller.setup.stepStore', label: t('seller.setup.stepStore') },
    {
      key: 'business',
      labelKey: 'seller.setup.stepBusiness',
      label: t('seller.setup.stepBusiness'),
    },
    { key: 'bank', labelKey: 'seller.setup.stepBank', label: t('seller.setup.stepBank') },
    { key: 'review', labelKey: 'seller.setup.stepReview', label: t('seller.setup.stepReview') },
  ]

  if (submitState === 'review' || submitState === 'approved') {
    return (
      <StatusScreen
        state={submitState}
        reduced={reduced}
        onContinue={handleGoToDashboard}
        t={t}
        sellerName={seller.name}
      />
    )
  }

  const docCount = [draft.docId, draft.docReg, draft.docPan].filter(Boolean).length
  const bizTypeLabel =
    draft.businessType === 'individual'
      ? t('seller.setup.rowIndividual')
      : t('seller.setup.rowRegistered')
  const payoutMethodLabel =
    draft.payoutMethod === 'bank'
      ? t('seller.setup.methodBank')
      : draft.payoutMethod === 'esewa'
        ? t('seller.setup.methodEsewa')
        : t('seller.setup.methodKhalti')
  const fullAddress = [draft.pickupStreet, draft.pickupArea, draft.pickupCity]
    .filter(Boolean)
    .join(', ')

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>

      <View style={styles.stepperWrap}>
        <WizardStepper steps={steps} current={3} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('seller.setup.reviewTitle')}
          </Text>
          <Text style={styles.subtitle}>{t('seller.setup.reviewSubtitle')}</Text>
        </View>

        <View style={styles.sections}>
          <ReviewSection
            title={t('seller.setup.sectionStore')}
            editAria={t('seller.setup.editStoreAria')}
            onEdit={onEditStore}
            t={t}
          >
            <Row label={t('seller.setup.rowStoreName')} value={draft.storeName} />
            <Row label={t('seller.setup.rowHandle')} value={`chinooz.com/store/${draft.handle}`} />
            <Row label={t('seller.setup.rowCategory')} value={categoryName} />
            {draft.description ? (
              <Row label={t('seller.setup.rowDescription')} value={draft.description} />
            ) : null}
            <Row label={t('seller.setup.rowAddress')} value={fullAddress} />
          </ReviewSection>

          <ReviewSection
            title={t('seller.setup.sectionBusiness')}
            editAria={t('seller.setup.editBusinessAria')}
            onEdit={onEditBusiness}
            t={t}
          >
            <Row label={t('seller.setup.rowBusinessType')} value={bizTypeLabel} />
            <Row label={t('seller.setup.rowLegalName')} value={draft.legalName} />
            <Row label={t('seller.setup.rowPan')} value={draft.panNumber} />
            {draft.businessType === 'registered' && draft.regNumber ? (
              <Row label={t('seller.setup.rowRegNumber')} value={draft.regNumber} />
            ) : null}
            <Row
              label={t('seller.setup.rowKycDocs')}
              value={t('seller.setup.rowKycDocsValue', { count: docCount })}
            />
          </ReviewSection>

          <ReviewSection
            title={t('seller.setup.sectionBank')}
            editAria={t('seller.setup.editBankAria')}
            onEdit={onEditBank}
            t={t}
          >
            <Row label={t('seller.setup.rowPayoutMethod')} value={payoutMethodLabel} />
            {draft.payoutMethod === 'bank' ? (
              <>
                <Row label={t('seller.setup.rowBankName')} value={draft.bankName} />
                <Row label={t('seller.setup.rowAccountName')} value={draft.accountName} />
                <Row
                  label={t('seller.setup.rowAccountNumber')}
                  value={`••••${draft.accountNumber.slice(-4)}`}
                />
                <Row label={t('seller.setup.rowBranch')} value={draft.branch} />
              </>
            ) : (
              <Row label={t('seller.setup.rowWalletNumber')} value={draft.walletNumber} />
            )}
            <Row
              label={t('seller.setup.rowDefault')}
              value={draft.payoutIsDefault ? t('seller.setup.rowYes') : t('seller.setup.rowNo')}
            />
          </ReviewSection>
        </View>
      </ScrollView>

      <View style={[styles.ctaDock, { paddingBottom: insets.bottom + spacing[4] }]}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitState === 'submitting'}
          style={[styles.primaryCta, submitState === 'submitting' && styles.primaryCtaDisabled]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={
            submitState === 'submitting' ? t('seller.setup.submitted') : t('seller.setup.submit')
          }
        >
          {submitState === 'submitting' ? (
            <View style={styles.submittingRow}>
              <View style={styles.spinner} />
              <Text style={styles.primaryCtaText}>{t('seller.setup.submitting')}</Text>
            </View>
          ) : (
            <View style={styles.submitRow}>
              <Text style={styles.primaryCtaText}>{t('seller.setup.submit')}</Text>
              <Check size={18} color={colors.white} strokeWidth={2.5} />
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onBack}
          style={styles.secondaryCta}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('seller.setup.back')}
        >
          <Text style={styles.secondaryCtaText}>{t('seller.setup.back')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function StatusScreen({
  state,
  reduced,
  onContinue,
  t,
  sellerName: _sellerName,
}: {
  state: 'review' | 'approved'
  reduced: boolean
  onContinue: () => void
  t: (k: string, o?: Record<string, unknown>) => string
  sellerName: string
}) {
  const insets = useSafeAreaInsets()
  const isApproved = state === 'approved'

  const checkScale = useSharedValue(reduced ? 1 : 0)
  React.useEffect(() => {
    if (isApproved && !reduced) {
      checkScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 300, mass: 0.8 }))
    }
  }, [isApproved, reduced, checkScale])

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }))

  return (
    <View
      style={[styles.statusContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <Animated.View
        entering={reduced ? FadeIn : SlideInUp.springify().damping(20).stiffness(300)}
        style={styles.statusBody}
      >
        <View
          style={[
            styles.statusIconWrap,
            isApproved ? styles.statusIconApproved : styles.statusIconReview,
          ]}
        >
          {isApproved ? (
            <Animated.View style={checkStyle}>
              <Check size={36} color={colors.success} strokeWidth={3} />
            </Animated.View>
          ) : (
            <Clock size={36} color={colors.warning} strokeWidth={2} />
          )}
        </View>

        <View
          style={[
            styles.statusPill,
            isApproved ? styles.statusPillApproved : styles.statusPillReview,
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              isApproved ? styles.statusPillTextApproved : styles.statusPillTextReview,
            ]}
          >
            {isApproved ? t('seller.setup.statusApproved') : t('seller.setup.statusReview')}
          </Text>
        </View>

        <Text accessibilityRole="header" style={styles.statusTitle}>
          {isApproved ? t('seller.setup.approvedTitle') : t('seller.setup.underReviewTitle')}
        </Text>
        <Text style={styles.statusSubtitle}>
          {isApproved ? t('seller.setup.approvedSubtitle') : t('seller.setup.underReviewSubtitle')}
        </Text>

        {!isApproved && (
          <View style={styles.timeframePill}>
            <Clock size={14} color={colors.warning} strokeWidth={2} />
            <Text style={styles.timeframeText}>{t('seller.setup.underReviewTimeframe')}</Text>
          </View>
        )}

        <Text style={styles.statusDesc}>
          {isApproved ? t('seller.setup.approvedDesc') : t('seller.setup.underReviewDesc')}
        </Text>
      </Animated.View>

      {isApproved && (
        <View style={{ paddingHorizontal: spacing[6], paddingBottom: insets.bottom + spacing[4] }}>
          <TouchableOpacity
            onPress={onContinue}
            style={styles.primaryCta}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('seller.setup.goToDashboard')}
          >
            <Text style={styles.primaryCtaText}>{t('seller.setup.goToDashboard')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

function ReviewSection({
  title,
  editAria,
  onEdit,
  t,
  children,
}: {
  title: string
  editAria: string
  onEdit: () => void
  t: (k: string, o?: Record<string, unknown>) => string
  children: React.ReactNode
}) {
  return (
    <View style={styles.sectionCard} accessibilityRole="summary">
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        <TouchableOpacity
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={editAria}
          style={styles.editLink}
        >
          <Pencil size={13} color={colors.primary} strokeWidth={2} />
          <Text style={styles.editLinkText}>{t('seller.setup.editSection')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { alignItems: 'flex-end', paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  stepperWrap: { paddingBottom: spacing[2] },
  scroll: { flex: 1 },
  header: { paddingHorizontal: spacing[6], paddingTop: spacing[4], paddingBottom: spacing[3] },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing[1],
    fontFamily: sellerFont.display,
  },
  subtitle: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  sections: { paddingHorizontal: spacing[6], gap: spacing[4] },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  editLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editLinkText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  sectionBody: { gap: spacing[2.5] },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  rowLabel: { fontSize: 14, fontWeight: '400', color: colors.textMuted, flexShrink: 0 },
  rowValue: { fontSize: 16, fontWeight: '400', color: colors.text, textAlign: 'right', flex: 1 },
  ctaDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[3],
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing[2],
  },
  primaryCta: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaDisabled: { opacity: 0.7 },
  primaryCtaText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  submitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  submittingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: colors.white,
  },
  secondaryCta: { height: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Status screen
  statusContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
  statusBody: { alignItems: 'center', paddingHorizontal: spacing[6], gap: spacing[3] },
  statusIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  statusIconReview: { backgroundColor: colors.warningLight },
  statusIconApproved: { backgroundColor: colors.successLight },
  statusPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  statusPillReview: { backgroundColor: colors.warningLight },
  statusPillApproved: { backgroundColor: colors.successLight },
  statusPillText: { fontSize: 12, fontWeight: '600' },
  statusPillTextReview: { color: colors.warningText },
  statusPillTextApproved: { color: colors.successText },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    fontFamily: sellerFont.display,
  },
  statusSubtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  timeframePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  timeframeText: { fontSize: 13, fontWeight: '600', color: colors.warningText },
  statusDesc: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
})
