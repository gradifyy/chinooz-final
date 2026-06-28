import React, { useEffect, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  AccessibilityInfo,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Ticket as TicketIcon,
  MessageCircle,
  Clock,
  CheckCircle2,
  Loader,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize, fontFamily } from '@chinooz/theme'
import { EmptyState, Skeleton } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import { useA11y } from '../../components/A11yProvider'
import { useTickets } from '@chinooz/hooks'
import {
  getRiderTicketCategoryMeta,
  type RiderTicket,
  type RiderTicketStatus,
} from '@chinooz/mock-data'

const STATUS_META: Record<RiderTicketStatus, {
  icon: LucideIcon
  color: string
  bg: string
  labelKey: string
  ariaKey: string
}> = {
  open: { icon: MessageCircle, color: colors.info, bg: colors.infoLight, labelKey: 'rider.support.tickets.statusOpen', ariaKey: 'rider.support.tickets.statusOpenAria' },
  in_progress: { icon: Loader, color: colors.warning, bg: colors.warningLight, labelKey: 'rider.support.tickets.statusInProgress', ariaKey: 'rider.support.tickets.statusInProgressAria' },
  resolved: { icon: CheckCircle2, color: colors.success, bg: colors.successLight, labelKey: 'rider.support.tickets.statusResolved', ariaKey: 'rider.support.tickets.statusResolvedAria' },
}

function timeAgo(ms: number): string {
  const mins = Math.floor((Date.now() - ms) / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

export default function MyTicketsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { reducedMotion } = useA11y()

  const { data: tickets = [], isLoading, isError, refetch, isRefetching } = useTickets()
  const loadError = isError && !isRefetching

  useEffect(() => {
    analytics.screen({ name: 'rider-support-tickets' })
  }, [])

  useEffect(() => {
    if (loadError) {
      try { AccessibilityInfo.announceForAccessibility(t('rider.support.states.ticketLoadErrorAria')) } catch {}
    }
  }, [loadError, t])

  const sorted = useMemo(
    () => [...tickets].sort((a, b) => b.updatedAt - a.updatedAt),
    [tickets],
  )

  useEffect(() => {
    if (!isLoading && !loadError && sorted.length === 0) {
      try { AccessibilityInfo.announceForAccessibility(t('rider.support.tickets.emptyTitle')) } catch {}
    }
  }, [isLoading, loadError, sorted.length, t])

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('rider.support.back')}
          hitSlop={8}
          style={styles.topBarBtn}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>{t('rider.support.tickets.title')}</Text>
        <View style={styles.topBarBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[6] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.subtitle}>{t('rider.support.tickets.subtitle')}</Text>
            {!isLoading && (
              <Text style={styles.countText}>
                {t('rider.support.tickets.count', { count: tickets.length })}
              </Text>
            )}
          </View>
          {!isLoading && (
            <TouchableOpacity
              style={styles.newBtn}
              onPress={() => router.push('/support/contact')}
              accessibilityRole="button"
              accessibilityLabel={t('rider.support.tickets.newTicketAria')}
              activeOpacity={0.85}
            >
              <Plus size={16} color={colors.white} />
              <Text style={styles.newBtnText}>{t('rider.support.tickets.newTicket')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View
            style={styles.skeletonWrap}
            accessibilityRole="none"
            accessibilityState={{ busy: true }}
            accessibilityLabel={t('rider.support.tickets.skeletonAria')}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={styles.skeletonRow}>
                <View style={styles.skeletonIcon}>
                  <Skeleton width={20} height={20} circle />
                </View>
                <View style={{ flex: 1, gap: spacing[1.5] }}>
                  <Skeleton width="70%" height={14} />
                  <Skeleton width="40%" height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : loadError ? (
          <View style={styles.errorWrap} accessibilityRole="alert" accessibilityLabel={t('rider.support.states.ticketLoadErrorAria')}>
            <TriangleAlert size={36} color={colors.error} />
            <Text accessibilityRole="header" style={styles.errorTitle}>{t('rider.support.states.ticketLoadErrorTitle')}</Text>
            <Text style={styles.errorBody}>{t('rider.support.states.ticketLoadErrorBody')}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => refetch()}
              accessibilityRole="button"
              accessibilityLabel={t('rider.support.states.retryAria')}
              activeOpacity={0.85}
            >
              <Text style={styles.retryBtnText}>{t('rider.support.states.retryBtn')}</Text>
            </TouchableOpacity>
          </View>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Text style={{ fontSize: 44 }}>{'\u{1F4CB}'}</Text>}
            title={t('rider.support.tickets.emptyTitle')}
            subtitle={t('rider.support.tickets.emptySubtitle')}
            action={{
              label: t('rider.support.tickets.newTicket'),
              onPress: () => router.push('/support/contact'),
            }}
          />
        ) : (
          <View style={styles.listCard}>
            {sorted.map((ticket, i) => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                reducedMotion={reducedMotion}
                divider={i < sorted.length - 1}
                t={t}
                onOpen={() => {
                  analytics.track({ event: 'rider_ticket_opened', screen: 'rider-support-tickets', properties: { ticketId: ticket.id } })
                  router.push({ pathname: '/support/tickets/[ticket]', params: { ticket: ticket.id } })
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function TicketRow({
  ticket,
  reducedMotion,
  divider,
  t,
  onOpen,
}: {
  ticket: RiderTicket
  reducedMotion: boolean
  divider: boolean
  t: (k: string, o?: Record<string, unknown>) => string
  onOpen: () => void
}) {
  const scale = useSharedValue(1)
  const handlePressIn = () => { if (!reducedMotion) scale.value = withSpring(0.98, { damping: 20, stiffness: 400 }) }
  const handlePressOut = () => { if (!reducedMotion) scale.value = withSpring(1, { damping: 20, stiffness: 400 }) }
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const meta = STATUS_META[ticket.status]
  const StatusIcon = meta.icon
  const catMeta = getRiderTicketCategoryMeta(ticket.category)
  const statusLabel = t(meta.labelKey)
  const ago = timeAgo(ticket.updatedAt)
  const hasContext = !!ticket.context.orderRef

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={[styles.ticketRow, divider && styles.ticketRowBorder]}
        onPress={onOpen}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={t('rider.support.tickets.rowAria', { id: ticket.id, subject: ticket.subject, status: statusLabel, date: ago })}
        activeOpacity={0.85}
      >
        <View style={styles.ticketIcon}>
          <TicketIcon size={18} color={colors.primary} />
        </View>
        <View style={styles.ticketBody}>
          <View style={styles.ticketHead}>
            <Text style={styles.ticketId}>{ticket.id}</Text>
            {/* Status pill — icon + text, never color-only */}
            <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
              <StatusIcon size={12} color={meta.color} />
              <Text style={[styles.statusText, { color: meta.color }]}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={styles.ticketSubject} numberOfLines={2}>{ticket.subject}</Text>
          <View style={styles.ticketMeta}>
            {catMeta && (
              <Text style={styles.ticketCategory}>{t(catMeta.labelKey)}</Text>
            )}
            {hasContext && (
              <>
                <Text style={styles.metaDot}>{'\u00B7'}</Text>
                <Text style={styles.ticketOrder}>{ticket.context.orderRef}</Text>
              </>
            )}
            <Text style={styles.metaDot}>{'\u00B7'}</Text>
            <Clock size={11} color={colors.textTertiary} />
            <Text style={styles.ticketDate}>{t('rider.support.tickets.lastUpdated', { date: ago })}</Text>
          </View>
        </View>
        <ChevronRight size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topBarBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: fontSize.lg[0], fontWeight: '600', color: colors.text, flex: 1, textAlign: 'center' },
  scroll: { paddingHorizontal: spacing[4], paddingTop: spacing[4], gap: spacing[3] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  subtitle: { fontSize: fontSize.sm[0], color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  countText: { fontSize: fontSize.xs[0], fontWeight: '600', color: colors.textTertiary },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[4],
    minHeight: 44,
  },
  newBtnText: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.white },
  skeletonWrap: { gap: spacing[3], marginTop: spacing[1] },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing[3] },
  skeletonIcon: { width: 36, height: 36, borderRadius: 9999, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 64,
  },
  ticketRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  ticketIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketBody: { flex: 1, gap: spacing[1] },
  ticketHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  ticketId: { fontSize: fontSize.xs[0], fontWeight: '700', color: colors.textTertiary, fontFamily: fontFamily.sansSemiBold[0] },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  statusText: { fontSize: fontSize.xs[0], fontWeight: '700' },
  ticketSubject: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text, lineHeight: 19 },
  ticketMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], flexWrap: 'wrap' },
  ticketCategory: { fontSize: fontSize.xs[0], color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  metaDot: { fontSize: fontSize.xs[0], color: colors.textTertiary },
  ticketOrder: { fontSize: fontSize.xs[0], fontWeight: '500', color: colors.textSecondary },
  ticketDate: { fontSize: fontSize.xs[0], color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  errorWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[10], paddingHorizontal: spacing[5], gap: spacing[3] },
  errorTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, textAlign: 'center' },
  errorBody: { fontSize: fontSize.sm[0], color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  retryBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing[5], paddingVertical: spacing[3], minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  retryBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base[0] },
})
