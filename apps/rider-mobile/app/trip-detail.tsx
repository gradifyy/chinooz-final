import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  MapPin,
  Navigation,
  Clock,
  Banknote,
  Star,
  Receipt,
  ArrowRight,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import {
  getRiderTripDetail,
  formatRiderNPRAmount,
  type TripLedgerEntry,
  type TripLedgerLine,
} from '@chinooz/mock-data'

function tripClock(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const KIND_ICON_COLOR: Record<TripLedgerLine['kind'], string> = {
  trip: colors.primary,
  incentive: colors.warning,
  tip: colors.success,
  adjustment: colors.error,
}

export default function RiderTripDetailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const params = useLocalSearchParams<{ id: string }>()

  const [trip, setTrip] = useState<TripLedgerEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    analytics.screen({ name: 'rider-trip-detail' })
  }, [])

  const load = useCallback(async () => {
    setError(false)
    try {
      const r = await getRiderTripDetail(params.id)
      setTrip(r)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const lines = trip?.lines ?? []
  const baseAmount = useMemo(
    () => lines.filter(l => l.kind === 'trip').reduce((s, l) => s + l.amount, 0),
    [lines],
  )
  const incentiveAmount = useMemo(
    () => lines.filter(l => l.kind === 'incentive').reduce((s, l) => s + l.amount, 0),
    [lines],
  )
  const tipAmount = useMemo(
    () => lines.filter(l => l.kind === 'tip').reduce((s, l) => s + l.amount, 0),
    [lines],
  )
  const feeAmount = useMemo(
    () => Math.abs(lines.filter(l => l.kind === 'adjustment').reduce((s, l) => s + l.amount, 0)),
    [lines],
  )

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.earnings.ledger.detail.back')}
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              {t('rider.earnings.ledger.detail.title')}
            </Text>
            <Text style={styles.headerSub}>{t('rider.earnings.ledger.detail.subtitle')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {loading ? (
          <TripDetailSkeleton ariaLabel={t('rider.earnings.ledger.detail.skeletonAria')} />
        ) : error ? (
          <ErrorState
            title={t('rider.earnings.ledger.detail.errorTitle')}
            subtitle={t('rider.earnings.ledger.detail.errorSubtitle')}
            retry={t('rider.earnings.ledger.detail.retry')}
            onRetry={onRefresh}
          />
        ) : !trip ? (
          <NotFoundState
            title={t('rider.earnings.ledger.detail.notFound')}
            subtitle={t('rider.earnings.ledger.detail.notFoundSubtitle')}
          />
        ) : (
          <View style={styles.body}>
            {/* Hero: net earning + route */}
            <View
              style={styles.heroCard}
              accessibilityRole="header"
              accessible
              accessibilityLabel={t('rider.earnings.ledger.trips.rowAria', {
                time: tripClock(trip.completedAt),
                pickup: trip.pickupArea,
                dropoff: trip.dropoffArea,
                km: trip.distanceKm,
                amount: formatRiderNPRAmount(trip.netEarning),
                incentive: '',
              })}
            >
              <View style={styles.heroAccent} />
              <View style={styles.heroBody}>
                <Text style={styles.heroLabel}>
                  {t('rider.earnings.ledger.detail.netEarning')}
                </Text>
                <Text style={styles.heroAmount}>
                  NPR {formatRiderNPRAmount(trip.netEarning)}
                </Text>
                {trip.hasIncentive && (
                  <View
                    style={styles.incentiveBadge}
                    accessibilityRole="text"
                    accessible
                    accessibilityLabel={t('rider.earnings.ledger.detail.incentiveBadgeAria')}
                  >
                    <Star size={12} color={colors.warning} />
                    <Text style={styles.incentiveBadgeText}>
                      {t('rider.earnings.ledger.detail.incentiveBadge')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Route card */}
            <View style={styles.routeCard}>
              <View style={styles.routeRow}>
                <View style={styles.routeIcon}>
                  <MapPin size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.routeLabel}>Pickup</Text>
                  <Text style={styles.routeValue} numberOfLines={1}>{trip.pickupArea}</Text>
                </View>
              </View>
              <View style={styles.routeConnector} />
              <View style={styles.routeRow}>
                <View style={styles.routeIcon}>
                  <Navigation size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.routeLabel}>Drop-off</Text>
                  <Text style={styles.routeValue} numberOfLines={1}>{trip.dropoffArea}</Text>
                </View>
              </View>
              <View style={styles.routeMetaRow}>
                <View style={styles.routeMetaItem}>
                  <Clock size={13} color={colors.textMuted} />
                  <Text style={styles.routeMetaText}>
                    {t('rider.earnings.ledger.detail.completedAt', {
                      time: tripClock(trip.completedAt),
                    })}
                  </Text>
                </View>
                <View style={styles.routeMetaItem}>
                  <Navigation size={13} color={colors.textMuted} />
                  <Text style={styles.routeMetaText}>
                    {t('rider.earnings.ledger.trips.rowDistance', { km: trip.distanceKm })}
                  </Text>
                </View>
                <View style={styles.routeMetaItem}>
                  <Receipt size={13} color={colors.textMuted} />
                  <Text style={styles.routeMetaText}>
                    {t('rider.earnings.ledger.detail.orderRef', { ref: trip.orderRef })}
                  </Text>
                </View>
              </View>
            </View>

            {/* COD / prepaid status */}
            <View style={styles.paymentCard}>
              {trip.isCod ? (
                <>
                  <View style={styles.paymentLeft}>
                    <View style={[styles.paymentIcon, { backgroundColor: colors.warningLight }]}>
                      <Banknote size={16} color={colors.warning} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.paymentTitle}>
                        {t('rider.earnings.ledger.detail.cod')}
                      </Text>
                      <Text style={styles.paymentSub}>
                        {t('rider.earnings.ledger.detail.codCollected', {
                          amount: formatRiderNPRAmount(trip.codAmount),
                        })}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="link"
                    onPress={() => router.push('/wallet')}
                    style={styles.paymentCta}
                  >
                    <Text style={styles.paymentCtaText}>
                      {t('rider.earnings.ledger.detail.codHint')}
                    </Text>
                    <ArrowRight size={13} color={colors.warning} />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.paymentLeft}>
                  <View style={[styles.paymentIcon, { backgroundColor: colors.infoLight }]}>
                    <Receipt size={16} color={colors.info} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.paymentTitle}>
                      {t('rider.earnings.ledger.detail.prepaid')}
                    </Text>
                    <Text style={styles.paymentSub}>
                      {t('rider.earnings.ledger.detail.prepaidHint')}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Earnings breakdown */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>
                {t('rider.earnings.ledger.detail.sectionBreakdown')}
              </Text>
            </View>
            <View style={styles.breakdownCard}>
              {baseAmount > 0 && (
                <BreakdownRow
                  icon={<Receipt size={14} color={colors.primary} />}
                  label={t('rider.earnings.ledger.trips.baseLine')}
                  amount={baseAmount}
                  t={t}
                  positive
                />
              )}
              {incentiveAmount > 0 && (
                <BreakdownRow
                  icon={<Star size={14} color={colors.warning} />}
                  label={t('rider.earnings.ledger.trips.incentiveLine')}
                  amount={incentiveAmount}
                  t={t}
                  positive
                  gold
                />
              )}
              {tipAmount > 0 && (
                <BreakdownRow
                  icon={<Star size={14} color={colors.success} />}
                  label={t('rider.earnings.ledger.trips.tipLine')}
                  amount={tipAmount}
                  t={t}
                  positive
                />
              )}
              {feeAmount > 0 && (
                <BreakdownRow
                  icon={<Receipt size={14} color={colors.error} />}
                  label={t('rider.earnings.ledger.trips.adjustmentLine')}
                  amount={-feeAmount}
                  t={t}
                />
              )}
              <View style={styles.breakdownTotalRow}>
                <Text style={styles.breakdownTotalLabel}>
                  {t('rider.earnings.ledger.detail.netEarning')}
                </Text>
                <Text style={styles.breakdownTotalValue}>
                  NPR {formatRiderNPRAmount(trip.netEarning)}
                </Text>
              </View>
            </View>

            <View style={{ height: spacing[4] }} />
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function BreakdownRow({
  icon,
  label,
  amount,
  t,
  positive,
  gold,
}: {
  icon: React.ReactNode
  label: string
  amount: number
  t: (key: string, opts?: Record<string, unknown>) => string
  positive?: boolean
  gold?: boolean
}) {
  const isCredit = amount >= 0
  return (
    <View
      style={styles.breakdownRow}
      accessibilityRole="text"
      accessible
      accessibilityLabel={t('rider.earnings.ledger.detail.lineAria', {
        label,
        amount: formatRiderNPRAmount(Math.abs(amount)),
      })}
    >
      <View style={[styles.breakdownRowIcon, gold && styles.breakdownRowIconGold]}>
        {icon}
      </View>
      <Text style={[styles.breakdownRowLabel, gold && styles.breakdownRowLabelGold]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[
          styles.breakdownRowAmount,
          !isCredit && styles.breakdownRowAmountNeg,
          gold && styles.breakdownRowAmountGold,
        ]}
        numberOfLines={1}
      >
        {isCredit ? '+' : '−'}NPR {formatRiderNPRAmount(Math.abs(amount))}
      </Text>
    </View>
  )
}

function TripDetailSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      <View style={[styles.skeletonBlock, { height: 160 }]} />
      <View style={[styles.skeletonBlock, { height: 140 }]} />
      <View style={[styles.skeletonBlock, { height: 72 }]} />
      <View style={[styles.skeletonBlock, { height: 200 }]} />
    </View>
  )
}

function NotFoundState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.emptyWrap}>
      <Receipt size={32} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  )
}

function ErrorState({
  title,
  subtitle,
  retry,
  onRetry,
}: {
  title: string
  subtitle: string
  retry: string
  onRetry: () => void
}) {
  return (
    <View style={styles.errorWrap}>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorSubtitle}>{subtitle}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={retry}
        onPress={onRetry}
        style={styles.retryBtn}
      >
        <Text style={styles.retryText}>{retry}</Text>
      </TouchableOpacity>
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

  body: { padding: spacing[4], gap: spacing[3] },

  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radii['2xl'],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow('lg'),
  },
  heroAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: colors.gold },
  heroBody: { padding: spacing[5], paddingLeft: spacing[6], gap: spacing[1.5] },
  heroLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: fontFamily.sansSemiBold[0] },
  heroAmount: { fontSize: 32, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0], lineHeight: 38 },
  incentiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    alignSelf: 'flex-start',
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  incentiveBadgeText: { fontSize: 11, fontWeight: '700', color: colors.warning, fontFamily: fontFamily.sansSemiBold[0] },

  routeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    ...shadow('sm'),
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  routeIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fontFamily.sansSemiBold[0] },
  routeValue: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 1, fontFamily: fontFamily.sansBold[0] },
  routeConnector: { marginLeft: 15, width: 2, height: 16, backgroundColor: colors.border },
  routeMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.borderLight },
  routeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  routeMetaText: { fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },

  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3.5],
    ...shadow('sm'),
  },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1, minWidth: 0 },
  paymentIcon: { width: 32, height: 32, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  paymentTitle: { fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  paymentSub: { fontSize: 12, color: colors.textMuted, marginTop: 1, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },
  paymentCta: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  paymentCtaText: { fontSize: 11, fontWeight: '600', color: colors.warning, fontFamily: fontFamily.sansSemiBold[0] },

  sectionHead: { marginTop: spacing[1], paddingHorizontal: spacing[1] },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fontFamily.sansSemiBold[0] },

  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    ...shadow('sm'),
  },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5], paddingVertical: spacing[2.5], borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  breakdownRowIcon: { width: 28, height: 28, borderRadius: radii.full, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  breakdownRowIconGold: { backgroundColor: colors.warningLight },
  breakdownRowLabel: { flex: 1, fontSize: 14, color: colors.text, fontFamily: fontFamily.sans[0], minWidth: 0 },
  breakdownRowLabelGold: { fontWeight: '700', color: colors.warning, fontFamily: fontFamily.sansSemiBold[0] },
  breakdownRowAmount: { fontSize: 14, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  breakdownRowAmountNeg: { color: colors.error },
  breakdownRowAmountGold: { color: colors.warning },
  breakdownTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing[2], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.borderLight },
  breakdownTotalLabel: { fontSize: 14, fontWeight: '700', color: colors.primary, fontFamily: fontFamily.sansBold[0] },
  breakdownTotalValue: { fontSize: 18, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },

  skeletonWrap: { padding: spacing[4], gap: spacing[3] },
  skeletonBlock: { borderRadius: radii.lg, backgroundColor: colors.shimmer },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[6], gap: spacing[2] },
  emptyTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },

  errorWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[6], gap: spacing[2] },
  errorTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  errorSubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },
  retryBtn: { marginTop: spacing[3], paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radii.lg, backgroundColor: colors.primary },
  retryText: { fontSize: 14, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
})
