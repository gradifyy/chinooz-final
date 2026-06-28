import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize, fontFamily } from '@chinooz/theme'
import { EmptyState, Skeleton } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import { useA11y } from '../../components/A11yProvider'

type TicketStatus = 'open' | 'pending' | 'resolved'

type Ticket = {
  id: string
  subjectIdx: number
  status: TicketStatus
  updatedAt: number // epoch ms
}

// i18n subject keys are derived from the index to avoid inline key literals.
const TICKET_PREFIX = 'rider.support.ticketArticles'
const ticketSubjectKey = (idx: number) => `${TICKET_PREFIX}.t${idx}Subject`

const MOCK_TICKETS: Ticket[] = [
  { id: 'CHZ-9001', subjectIdx: 1, status: 'open', updatedAt: Date.now() - 1000 * 60 * 60 * 3 },
  { id: 'CHZ-9002', subjectIdx: 2, status: 'pending', updatedAt: Date.now() - 1000 * 60 * 60 * 26 },
  { id: 'CHZ-9003', subjectIdx: 3, status: 'resolved', updatedAt: Date.now() - 1000 * 60 * 60 * 72 },
  { id: 'CHZ-9004', subjectIdx: 4, status: 'resolved', updatedAt: Date.now() - 1000 * 60 * 60 * 120 },
]

const STATUS_META: Record<TicketStatus, { dot: string; bg: string; labelKey: string; ariaKey: string }> = {
  open: { dot: colors.info, bg: colors.infoLight, labelKey: 'rider.support.tickets.statusOpen', ariaKey: 'rider.support.tickets.statusOpenAria' },
  pending: { dot: colors.warning, bg: colors.warningLight, labelKey: 'rider.support.tickets.statusPending', ariaKey: 'rider.support.tickets.statusPendingAria' },
  resolved: { dot: colors.success, bg: colors.successLight, labelKey: 'rider.support.tickets.statusResolved', ariaKey: 'rider.support.tickets.statusResolvedAria' },
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

  const [isLoading, setIsLoading] = useState(true)
  const [tickets] = useState<Ticket[]>(MOCK_TICKETS)

  useEffect(() => {
    analytics.screen({ name: 'rider-support-tickets' })
    const id = setTimeout(() => setIsLoading(false), 450)
    return () => clearTimeout(id)
  }, [])

  const sorted = useMemo(
    () => [...tickets].sort((a, b) => b.updatedAt - a.updatedAt),
    [tickets],
  )

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
                  try { AccessibilityInfo.announceForAccessibility(t('rider.support.tickets.rowAria', { id: ticket.id, subject: t(ticketSubjectKey(ticket.subjectIdx)), status: t(STATUS_META[ticket.status].labelKey), date: timeAgo(ticket.updatedAt) })) } catch {}
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
  ticket: Ticket
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
  const subject = t(ticketSubjectKey(ticket.subjectIdx))
  const statusLabel = t(meta.labelKey)
  const ago = timeAgo(ticket.updatedAt)

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={[styles.ticketRow, divider && styles.ticketRowBorder]}
        onPress={onOpen}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={t('rider.support.tickets.rowAria', { id: ticket.id, subject, status: statusLabel, date: ago })}
        activeOpacity={0.85}
      >
        <View style={styles.ticketIcon}>
          <TicketIcon size={18} color={colors.primary} />
        </View>
        <View style={styles.ticketBody}>
          <View style={styles.ticketHead}>
            <Text style={styles.ticketId}>{ticket.id}</Text>
            <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
              <Text style={[styles.statusText, { color: meta.dot }]}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={styles.ticketSubject} numberOfLines={2}>{subject}</Text>
          <Text style={styles.ticketDate}>{t('rider.support.tickets.lastUpdated', { date: ago })}</Text>
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
    minHeight: 56,
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
  statusDot: { width: 6, height: 6, borderRadius: 9999 },
  statusText: { fontSize: fontSize.xs[0], fontWeight: '700' },
  ticketSubject: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text, lineHeight: 19 },
  ticketDate: { fontSize: fontSize.xs[0], color: colors.textMuted, fontFamily: fontFamily.sans[0] },
})
