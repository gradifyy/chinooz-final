import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Zap, Users, Check, X } from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { BottomSheet, EmptyState, Toast } from '@chinooz/ui'
import { useA11y } from './A11yProvider'
import { analytics } from '@chinooz/analytics'
import { useSellerProducts } from '@chinooz/hooks'
import {
  getCampaigns,
  optIntoCampaign,
  withdrawFromCampaign,
  getCampaignStatusPill,
  type Campaign,
} from '@chinooz/mock-data'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatExposure(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n)
}

type TT = (key: string, opts?: Record<string, unknown>) => string

export default function CampaignsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { reducedMotion } = useA11y()
  const queryClient = useQueryClient()

  const [optInCampaign, setOptInCampaign] = useState<Campaign | null>(null)
  const [withdrawCampaign, setWithdrawCampaign] = useState<Campaign | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message })
    setTimeout(() => setToast({ visible: false, message: '' }), 3000)
  }, [])

  useEffect(() => {
    analytics.screen({ name: 'seller-campaigns' })
  }, [])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['campaigns-mobile'],
    queryFn: getCampaigns,
  })

  const campaigns = data ?? []

  const haptic = useCallback(() => {
    if (reducedMotion) return
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [reducedMotion])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    refetch().finally(() => setRefreshing(false))
  }, [refetch])

  const handleOptInSuccess = useCallback(async (campaignId: string, productIds: string[], discountValue: number) => {
    await optIntoCampaign({ campaignId, productIds, discountValue })
    queryClient.invalidateQueries({ queryKey: ['campaigns-mobile'] })
    setOptInCampaign(null)
    const camp = campaigns.find(c => c.id === campaignId)
    showToast(t('seller.promotions.campaigns.optInSuccess', { name: camp?.name ?? '' }))
  }, [queryClient, campaigns, showToast, t])

  const handleWithdraw = useCallback(async (campaignId: string) => {
    await withdrawFromCampaign(campaignId)
    queryClient.invalidateQueries({ queryKey: ['campaigns-mobile'] })
    setWithdrawCampaign(null)
    const camp = campaigns.find(c => c.id === campaignId)
    showToast(t('seller.promotions.campaigns.withdrawSuccess', { name: camp?.name ?? '' }))
  }, [queryClient, campaigns, showToast, t])

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.push('/promotions')}
            accessibilityRole="button"
            accessibilityLabel={t('seller.promotions.builder.backAria')}
            hitSlop={8}
            style={styles.backBtn}
          >
            <ArrowLeft size={22} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text accessibilityRole="header" style={styles.headerTitle} numberOfLines={1}>
              {t('seller.promotions.campaigns.title')}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{t('seller.promotions.campaigns.subtitle')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing[8] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading ? (
          <Text style={styles.loadingText}>{t('seller.promotions.campaigns.loading')}</Text>
        ) : isError ? (
          <EmptyState
            title={t('seller.promotions.campaigns.error')}
            action={{ label: t('seller.promotions.campaigns.retry'), onPress: () => refetch() }}
          />
        ) : campaigns.length === 0 ? (
          <EmptyState title={t('seller.promotions.campaigns.empty')} />
        ) : (
          <>
            <Text style={styles.countText}>{t('seller.promotions.campaigns.count', { count: campaigns.length })}</Text>
            {campaigns.map(camp => (
              <CampaignCard
                key={camp.id}
                campaign={camp}
                t={t}
                onOptIn={() => { haptic(); setOptInCampaign(camp) }}
                onWithdraw={() => { haptic(); setWithdrawCampaign(camp) }}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Opt-in sheet */}
      <BottomSheet
        visible={!!optInCampaign}
        onClose={() => setOptInCampaign(null)}
        title={optInCampaign ? t('seller.promotions.campaigns.optInTitle', { name: optInCampaign.name }) : ''}
      >
        {optInCampaign && (
          <OptInSheet
            campaign={optInCampaign}
            t={t}
            onClose={() => setOptInCampaign(null)}
            onConfirm={handleOptInSuccess}
          />
        )}
      </BottomSheet>

      {/* Withdraw sheet */}
      <BottomSheet
        visible={!!withdrawCampaign}
        onClose={() => setWithdrawCampaign(null)}
        title={t('seller.promotions.campaigns.withdrawConfirm')}
      >
        {withdrawCampaign && (
          <View style={styles.sheetBody}>
            <Text style={styles.dirtyBody}>{t('seller.promotions.campaigns.withdrawConfirmBody')}</Text>
            <View style={styles.dirtyActions}>
              <TouchableOpacity onPress={() => setWithdrawCampaign(null)} style={styles.dirtyCancelBtn}>
                <Text style={styles.dirtyCancelText}>{t('seller.promotions.builder.actionCancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleWithdraw(withdrawCampaign.id)} style={styles.withdrawBtn}>
                <Text style={styles.withdrawBtnText}>{t('seller.promotions.campaigns.withdrawConfirmBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </BottomSheet>

      <Toast message={toast.message} variant="success" visible={toast.visible} />
    </View>
  )
}

function CampaignCard({ campaign, t, onOptIn, onWithdraw }: { campaign: Campaign; t: TT; onOptIn: () => void; onWithdraw: () => void }) {
  const pill = getCampaignStatusPill(campaign.participation?.status ?? 'upcoming')
  const isParticipating = campaign.participation && campaign.participation.status !== 'upcoming'
  const statusLabel = t(pill.label)

  return (
    <View style={styles.card}>
      {/* Banner */}
      <View style={styles.cardBanner}>
        <View style={styles.bannerIcon}>
          <Zap size={20} color={colors.gold} />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.cardTitle} numberOfLines={1}>{campaign.name}</Text>
          <Text style={styles.cardDates}>
            {t('seller.promotions.campaigns.dateRange', { start: formatDate(campaign.startsAt), end: formatDate(campaign.endsAt) })}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
          <Text style={[styles.statusPillText, { color: pill.color }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardDescription}>{campaign.description}</Text>

        <View style={styles.chipsRow}>
          <View style={styles.discountChip}>
            <Zap size={13} color={colors.gold} />
            <Text style={styles.discountChipText}>
              {t('seller.promotions.campaigns.requiredDiscount', { min: campaign.minDiscount, max: campaign.maxDiscount })}
            </Text>
          </View>
          <View style={styles.exposureChip}>
            <Users size={13} color={colors.textMuted} />
            <Text style={styles.exposureChipText}>
              {t('seller.promotions.campaigns.exposureValue', { count: formatExposure(campaign.expectedExposure) })}
            </Text>
          </View>
        </View>

        {/* Rules */}
        <Text style={styles.rulesTitle}>{t('seller.promotions.campaigns.rules')}</Text>
        {campaign.rules.map((rule, i) => (
          <Text key={i} style={styles.ruleItem}>• {rule}</Text>
        ))}

        {/* Participation info */}
        {isParticipating && campaign.participation && (
          <View style={styles.participationBox}>
            <Text style={styles.participationTitle}>{t('seller.promotions.campaigns.participationStatus')}</Text>
            <Text style={styles.participationDetail}>
              {t('seller.promotions.campaigns.productsSelected', { count: campaign.participation.productIds.length })} · {t('seller.promotions.campaigns.yourDiscount', { value: campaign.participation.discountValue })}
            </Text>
          </View>
        )}

        {/* Actions */}
        {!isParticipating || campaign.participation?.status === 'upcoming' ? (
          <TouchableOpacity
            onPress={onOptIn}
            accessibilityRole="button"
            accessibilityLabel={t('seller.promotions.campaigns.optInAria', { name: campaign.name })}
            style={styles.optInBtn}
          >
            <Zap size={16} color={colors.white} />
            <Text style={styles.optInBtnText}>{t('seller.promotions.campaigns.optIn')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionRow}>
            <View style={styles.optedInRow}>
              <Check size={16} color={colors.success} />
              <Text style={styles.optedInText}>{t('seller.promotions.campaigns.optedIn')}</Text>
            </View>
            {campaign.participation?.status !== 'live' && campaign.participation?.status !== 'ended' && (
              <TouchableOpacity
                onPress={onWithdraw}
                accessibilityRole="button"
                accessibilityLabel={t('seller.promotions.campaigns.withdrawAria', { name: campaign.name })}
                style={styles.withdrawBtn}
              >
                <Text style={styles.withdrawBtnSmallText}>{t('seller.promotions.campaigns.withdraw')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  )
}

function OptInSheet({ campaign, t, onClose, onConfirm }: { campaign: Campaign; t: TT; onClose: () => void; onConfirm: (campaignId: string, productIds: string[], discountValue: number) => void }) {
  const { data: productData } = useSellerProducts({})
  const products = productData?.items ?? []
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(campaign.participation?.productIds ?? []))
  const [discount, setDiscount] = useState(String(campaign.participation?.discountValue ?? campaign.minDiscount))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const dv = Number(discount) || 0
  const discountValid = dv >= campaign.minDiscount && dv <= campaign.maxDiscount
  const canSubmit = discountValid && selectedIds.size > 0 && !submitting

  const toggleProduct = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setError('')
  }

  const handleConfirm = async () => {
    if (!discountValid) {
      setError(t('seller.promotions.campaigns.discountError', { min: campaign.minDiscount, max: campaign.maxDiscount }))
      return
    }
    if (selectedIds.size === 0) {
      setError(t('seller.promotions.campaigns.noProductsSelected'))
      return
    }
    setError('')
    setSubmitting(true)
    await onConfirm(campaign.id, [...selectedIds], dv)
    setSubmitting(false)
  }

  return (
    <View style={styles.sheetBody}>
      <Text style={styles.sheetSubtitle}>{t('seller.promotions.campaigns.optInSubtitle')}</Text>

      {/* Discount */}
      <Text style={styles.fieldLabel}>{t('seller.promotions.campaigns.discountLabel')}</Text>
      <View style={styles.discountRow}>
        <TextInput
          value={discount}
          onChangeText={v => { setDiscount(v); setError('') }}
          keyboardType="numeric"
          inputMode="numeric"
          accessibilityLabel={t('seller.promotions.campaigns.discountLabel')}
          style={[styles.input, styles.discountInput, !discountValid && discount ? styles.inputError : null]}
        />
        <Text style={styles.percentSuffix}>%</Text>
      </View>
      <Text style={styles.fieldHint}>
        {t('seller.promotions.campaigns.discountHint', { min: campaign.minDiscount, max: campaign.maxDiscount })}
      </Text>

      {/* Product selection */}
      <Text style={styles.fieldLabel}>{t('seller.promotions.campaigns.selectProducts')}</Text>
      <Text style={styles.fieldHint}>{t('seller.promotions.campaigns.selectProductsHint')}</Text>
      <View style={styles.productList}>
        {products.length === 0 ? (
          <Text style={styles.noProducts}>No products available.</Text>
        ) : (
          products.map(p => {
            const selected = selectedIds.has(p.id)
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => toggleProduct(p.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={p.name}
                style={[styles.productRow, selected && styles.productRowSelected]}
              >
                <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                  {selected && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.productCategory} numberOfLines={1}>{p.categoryName}</Text>
                </View>
                <Text style={styles.productPrice}>NPR {p.price.toLocaleString()}</Text>
              </TouchableOpacity>
            )
          })
        )}
      </View>
      <Text style={styles.selectedCount}>
        {t('seller.promotions.campaigns.productsSelected', { count: selectedIds.size })}
      </Text>

      {error ? (
        <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
      ) : null}

      <View style={styles.sheetActions}>
        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>{t('seller.promotions.builder.actionCancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel={t('seller.promotions.campaigns.confirmAria', { name: campaign.name })}
          style={[styles.confirmBtn, !canSubmit && styles.confirmBtnDisabled]}
        >
          <Text style={styles.confirmText}>
            {submitting ? '…' : t('seller.promotions.campaigns.confirm')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingHorizontal: spacing[4], paddingBottom: spacing[3] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.white },
  headerSubtitle: { fontSize: fontSize.sm[0], color: colors.primary50, marginTop: 2 },

  scrollContent: { padding: spacing[4], gap: spacing[3] },
  loadingText: { fontSize: fontSize.base[0], color: colors.textMuted, textAlign: 'center', marginTop: spacing[6] },
  countText: { fontSize: fontSize.sm[0], color: colors.textMuted, marginBottom: spacing[1] },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: 'rgba(224,169,59,0.06)',
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(224,169,59,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: fontSize.lg[0], fontWeight: '600', color: colors.text },
  cardDates: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: 2 },
  statusPill: { borderRadius: radii.full, paddingHorizontal: spacing[2.5], paddingVertical: 4 },
  statusPillText: { fontSize: fontSize.sm[0], fontWeight: '600' },

  cardBody: { padding: spacing[4] },
  cardDescription: { fontSize: fontSize.base[0], color: colors.textSecondary, lineHeight: 20, marginBottom: spacing[3] },

  chipsRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3], flexWrap: 'wrap' },
  discountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: 'rgba(224,169,59,0.10)',
    borderRadius: radii.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: 4,
  },
  discountChipText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.gold },
  exposureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  exposureChipText: { fontSize: fontSize.sm[0], color: colors.textMuted },

  rulesTitle: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text, marginBottom: spacing[1.5] },
  ruleItem: { fontSize: fontSize.sm[0], color: colors.textMuted, lineHeight: 18, marginBottom: 2 },

  participationBox: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    marginTop: spacing[2],
    marginBottom: spacing[3],
  },
  participationTitle: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text, marginBottom: 4 },
  participationDetail: { fontSize: fontSize.sm[0], color: colors.textMuted },

  optInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
  },
  optInBtnText: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.white },

  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
  optedInRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  optedInText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.success },
  withdrawBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  withdrawBtnSmallText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.textMuted },

  // Opt-in sheet
  sheetBody: { paddingHorizontal: spacing[4] },
  sheetSubtitle: { fontSize: fontSize.sm[0], color: colors.textMuted, marginBottom: spacing[3] },
  fieldLabel: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text, marginBottom: spacing[1.5] },
  fieldHint: { fontSize: fontSize.sm[0], color: colors.textMuted, marginBottom: spacing[2] },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontSize: fontSize.base[0],
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.error },
  discountRow: { flexDirection: 'row', alignItems: 'center' },
  discountInput: { flex: 1 },
  percentSuffix: { fontSize: fontSize.lg[0], fontWeight: '600', color: colors.textMuted, marginLeft: spacing[2] },

  productList: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    maxHeight: 240,
    overflow: 'hidden',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  productRowSelected: { backgroundColor: colors.primary50 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxTick: { color: colors.white, fontSize: 13, fontWeight: '700' },
  productInfo: { flex: 1, minWidth: 0 },
  productName: { fontSize: fontSize.base[0], fontWeight: '500', color: colors.text },
  productCategory: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: 2 },
  productPrice: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  noProducts: { padding: spacing[4], fontSize: fontSize.sm[0], color: colors.textMuted, textAlign: 'center' },
  selectedCount: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: spacing[2] },
  errorText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.error, marginTop: spacing[2] },

  sheetActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[5] },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.white },

  // Withdraw sheet
  dirtyBody: { fontSize: fontSize.base[0], color: colors.textMuted, lineHeight: 20, paddingHorizontal: spacing[4], marginTop: spacing[2] },
  dirtyActions: { flexDirection: 'row', gap: spacing[3], paddingHorizontal: spacing[4], marginTop: spacing[5] },
  dirtyCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirtyCancelText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  withdrawBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawBtnText: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.white },
})
