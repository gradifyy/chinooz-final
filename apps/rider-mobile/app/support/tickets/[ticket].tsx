import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
  Alert,
  FlatList,
  Modal,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  MessageCircle,
  CheckCircle2,
  Loader,
  Clock,
  MapPin,
  Wallet,
  Banknote,
  Image as ImageIcon,
  Camera,
  Send,
  RotateCcw,
  XCircle,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize, fontFamily } from '@chinooz/theme'
import { Skeleton } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import {
  useTicketThread,
  useAddTicketMessage,
  useReopenTicket,
  useCloseTicket,
} from '@chinooz/hooks'
import {
  getRiderTicketCategoryMeta,
  type RiderTicketStatus,
  type RiderTicketMessage,
} from '@chinooz/mock-data'

const STATUS_META: Record<RiderTicketStatus, {
  icon: LucideIcon
  color: string
  bg: string
  labelKey: string
  ariaKey: string
}> = {
  open: { icon: MessageCircle, color: colors.info, bg: colors.infoLight, labelKey: 'rider.support.tickets.thread.statusOpen', ariaKey: 'rider.support.tickets.thread.statusOpenAria' },
  in_progress: { icon: Loader, color: colors.warning, bg: colors.warningLight, labelKey: 'rider.support.tickets.thread.statusInProgress', ariaKey: 'rider.support.tickets.thread.statusInProgressAria' },
  resolved: { icon: CheckCircle2, color: colors.success, bg: colors.successLight, labelKey: 'rider.support.tickets.thread.statusResolved', ariaKey: 'rider.support.tickets.thread.statusResolvedAria' },
}

const TH_PREFIX = 'rider.support.tickets.thread'
const thKey = (k: string) => `${TH_PREFIX}.${k}`

function timeLabel(ms: number): string {
  const d = new Date(ms)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
}

function dateLabel(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

type ThreadEntry = (RiderTicketMessage & { type?: 'message' }) | { id: string; type: 'separator'; label: string }

function groupByDay(messages: RiderTicketMessage[]): ThreadEntry[] {
  const result: ThreadEntry[] = []
  let lastDay = ''
  for (const msg of messages) {
    const day = new Date(msg.createdAt).toDateString()
    if (day !== lastDay) {
      result.push({ id: `sep-${day}`, type: 'separator', label: new Date(msg.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) })
      lastDay = day
    }
    result.push({ ...msg, type: 'message' })
  }
  return result
}

export default function TicketThreadScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ ticket?: string }>()

  const ticketId = typeof params.ticket === 'string'
    ? params.ticket
    : Array.isArray(params.ticket)
      ? params.ticket[0]
      : ''

  const { data: ticket = null, isLoading, isError, refetch } = useTicketThread(ticketId)
  const [replyError, setReplyError] = useState(false)
  const [reply, setReply] = useState('')
  const [showReopen, setShowReopen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const flatListRef = useRef<FlatList>(null)

  const sendReplyMutation = useAddTicketMessage()
  const reopenMutation = useReopenTicket()
  const closeMutation = useCloseTicket()

  const isSending = sendReplyMutation.isPending
  const isActioning = reopenMutation.isPending || closeMutation.isPending
  const loadError = isError

  useEffect(() => {
    analytics.screen({ name: 'rider-ticket-thread', properties: { ticketId } })
  }, [ticketId])

  useEffect(() => {
    if (loadError) {
      try { AccessibilityInfo.announceForAccessibility(t('rider.support.states.ticketThreadLoadErrorAria')) } catch {}
    }
  }, [loadError, t])

  const grouped = useMemo(() => ticket ? groupByDay(ticket.messages) : [], [ticket])

  const handleSendReply = async () => {
    const trimmed = reply.trim()
    if (!trimmed || !ticket) return
    setReplyError(false)
    try {
      const result = await sendReplyMutation.mutateAsync({ ticketId: ticket.id, body: trimmed })
      if (result.success && result.ticket) {
        setReply('')
        try { AccessibilityInfo.announceForAccessibility(t(thKey('threadReplySent'))) } catch {}
      } else {
        setReplyError(true)
        try { AccessibilityInfo.announceForAccessibility(t('rider.support.states.replyErrorAria')) } catch {}
      }
    } catch {
      setReplyError(true)
      try { AccessibilityInfo.announceForAccessibility(t('rider.support.states.replyErrorAria')) } catch {}
    }
  }

  const handleReopen = async () => {
    if (!ticket || !reopenReason.trim()) return
    try {
      const result = await reopenMutation.mutateAsync({ ticketId: ticket.id, reason: reopenReason.trim() })
      if (result.success && result.ticket) {
        setShowReopen(false)
        setReopenReason('')
        try { AccessibilityInfo.announceForAccessibility(t(thKey('threadReopened'))) } catch {}
      }
    } catch {}
  }

  const handleClose = () => {
    if (!ticket) return
    Alert.alert(
      t(thKey('threadCloseBtn')),
      t(thKey('threadCloseConfirm')),
      [
        { text: t(thKey('threadCloseNo')), style: 'cancel' },
        {
          text: t(thKey('threadCloseYes')),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await closeMutation.mutateAsync(ticket.id)
              if (result.success && result.ticket) {
                try { AccessibilityInfo.announceForAccessibility(t(thKey('threadClosed'))) } catch {}
              }
            } catch {}
          },
        },
      ],
    )
  }

  // ---- Loading state ----
  if (isLoading) {
    return (
      <View style={styles.container}>
        <TopBar title={t(thKey('threadTitle'), { id: ticketId })} onBack={() => router.back()} backAria={t(thKey('threadBack'))} />
        <View style={styles.skeletonWrap} accessibilityRole="none" accessibilityState={{ busy: true }} accessibilityLabel={t(thKey('threadLoading'))}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={[styles.skeletonRow, { justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end' }]}>
              <Skeleton width="60%" height={36} borderRadius={18} />
            </View>
          ))}
        </View>
      </View>
    )
  }

  // ---- Load error ----
  if (loadError) {
    return (
      <View style={styles.container}>
        <TopBar title={t(thKey('threadTitle'), { id: ticketId })} onBack={() => router.back()} backAria={t(thKey('threadBack'))} />
        <View style={styles.errorWrap} accessibilityRole="alert" accessibilityLabel={t('rider.support.states.ticketThreadLoadErrorAria')}>
          <TriangleAlert size={36} color={colors.error} />
          <Text accessibilityRole="header" style={styles.errorTitle}>{t('rider.support.states.ticketThreadLoadErrorTitle')}</Text>
          <Text style={styles.errorBody}>{t('rider.support.states.ticketThreadLoadErrorBody')}</Text>
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
      </View>
    )
  }

  // ---- Not found ----
  if (!ticket) {
    return (
      <View style={styles.container}>
        <TopBar title={t(thKey('threadTitle'), { id: ticketId })} onBack={() => router.back()} backAria={t(thKey('threadBack'))} />
        <View style={styles.notFoundWrap}>
          <Text style={{ fontSize: 44 }}>{'\u{1F4CB}'}</Text>
          <Text accessibilityRole="header" style={styles.notFoundTitle}>{t(thKey('threadNotFoundTitle'))}</Text>
          <Text style={styles.notFoundBody}>{t(thKey('threadNotFoundBody'))}</Text>
          <TouchableOpacity
            style={styles.notFoundBtn}
            onPress={() => router.replace('/support/tickets')}
            accessibilityRole="button"
            accessibilityLabel={t(thKey('threadNotFoundCta'))}
          >
            <Text style={styles.notFoundBtnText}>{t(thKey('threadNotFoundCta'))}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const meta = STATUS_META[ticket.status]
  const StatusIcon = meta.icon
  const catMeta = getRiderTicketCategoryMeta(ticket.category)
  const statusLabel = t(meta.labelKey)
  const isResolved = ticket.status === 'resolved'
  const canReply = !isActioning

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.container}>
        {/* Header with status pill */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t(thKey('threadBack'))}
            hitSlop={8}
            style={styles.topBarBtn}
          >
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <Text style={styles.topBarTitle} numberOfLines={1}>{ticket.id}</Text>
            <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
              <StatusIcon size={11} color={meta.color} />
              <Text style={[styles.statusText, { color: meta.color }]}>{statusLabel}</Text>
            </View>
          </View>
          <View style={styles.topBarBtn} />
        </View>

        <FlatList
          ref={flatListRef}
          data={grouped}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[2] }}
          onContentSizeChange={() => {
            requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }))
          }}
          ListHeaderComponent={
            <View style={styles.ticketInfoCard}>
              {/* Subject */}
              <Text accessibilityRole="header" style={styles.ticketSubject}>{ticket.subject}</Text>

              {/* Meta row */}
              <View style={styles.metaRow}>
                {catMeta && (
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipText}>{t(catMeta.labelKey)}</Text>
                  </View>
                )}
                <View style={styles.metaChip}>
                  <Clock size={11} color={colors.textMuted} />
                  <Text style={styles.metaChipText}>{t(thKey('threadCreated'), { date: dateLabel(ticket.createdAt) })}</Text>
                </View>
              </View>

              {/* Context */}
              {ticket.context.orderRef && (
                <View style={styles.contextCard} accessibilityLabel={t(thKey('threadContextTitle'))}>
                  <View style={styles.contextHead}>
                    <MapPin size={14} color={colors.primary} />
                    <Text accessibilityRole="header" style={styles.contextTitle}>{t(thKey('threadContextTitle'))}</Text>
                  </View>
                  <Text style={styles.contextOrder}>{t(thKey('threadContextOrder'), { ref: ticket.context.orderRef })}</Text>
                  {ticket.context.pickup && ticket.context.dropoff && (
                    <Text style={styles.contextRoute}>{t(thKey('threadContextRoute'), { pickup: ticket.context.pickup, dropoff: ticket.context.dropoff })}</Text>
                  )}
                  {ticket.context.payout != null && (
                    <View style={styles.contextItem}>
                      <Wallet size={12} color={colors.textMuted} />
                      <Text style={styles.contextItemText}>{t(thKey('threadContextPayout'), { amount: ticket.context.payout.toLocaleString() })}</Text>
                    </View>
                  )}
                  {ticket.context.isCod && (
                    <View style={styles.contextItem}>
                      <Banknote size={12} color={colors.textMuted} />
                      <Text style={styles.contextItemText}>{t(thKey('threadContextCod'))}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Attachments */}
              {ticket.attachments.length > 0 && (
                <View style={styles.attachSection}>
                  <Text accessibilityRole="header" style={styles.attachTitle}>{t(thKey('threadAttachmentsTitle'))}</Text>
                  <View style={styles.attachList}>
                    {ticket.attachments.map((att) => (
                      <View key={att.id} style={styles.attachThumb}>
                        <View style={styles.attachThumbIcon}>
                          {att.kind === 'screenshot' ? <ImageIcon size={16} color={colors.primary} /> : <Camera size={16} color={colors.primary} />}
                        </View>
                        <Text style={styles.attachThumbName} numberOfLines={1}>{att.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === 'separator') {
              return (
                <View style={styles.daySeparator}>
                  <View style={styles.dayLine} />
                  <Text style={styles.dayText}>{(item as { label: string }).label}</Text>
                  <View style={styles.dayLine} />
                </View>
              )
            }
            const msg = item as RiderTicketMessage & { type?: 'message' }
            return <Bubble msg={msg} t={t} />
          }}
        />

        {/* Reopen modal */}
        <Modal visible={showReopen} transparent animationType="fade" onRequestClose={() => setShowReopen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet} accessibilityRole="alert" accessibilityLabel={t(thKey('threadReopenAria'))}>
              <Text accessibilityRole="header" style={styles.modalTitle}>{t(thKey('threadReopenBtn'))}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t(thKey('threadReopenPlaceholder'))}
                placeholderTextColor={colors.textTertiary}
                value={reopenReason}
                onChangeText={setReopenReason}
                multiline
                accessibilityLabel={t(thKey('threadReopenPlaceholder'))}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => { setShowReopen(false); setReopenReason('') }}
                  accessibilityRole="button"
                  accessibilityLabel={t(thKey('threadCloseNo'))}
                >
                  <Text style={styles.modalCancelText}>{t(thKey('threadCloseNo'))}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, (!reopenReason.trim() || isActioning) && styles.modalConfirmBtnDisabled]}
                  onPress={handleReopen}
                  disabled={!reopenReason.trim() || isActioning}
                  accessibilityRole="button"
                  accessibilityLabel={t(thKey('threadReopenConfirm'))}
                >
                  <Text style={styles.modalConfirmText}>{t(thKey('threadReopenConfirm'))}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Reply error banner — preserves draft */}
        {replyError && !isResolved && (
          <View style={styles.replyErrorBanner} accessibilityRole="alert">
            <TriangleAlert size={14} color={colors.error} />
            <Text style={styles.replyErrorText}>{t('rider.support.states.replyErrorBody')}</Text>
            <TouchableOpacity
              onPress={() => handleSendReply()}
              disabled={isSending}
              accessibilityRole="button"
              accessibilityLabel={t('rider.support.states.submitErrorRetryAria')}
            >
              <Text style={styles.replyErrorRetry}>{t('rider.support.states.submitErrorRetry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action bar: reply or reopen/close */}
        {isResolved ? (
          <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing[2] }]}>
            <TouchableOpacity
              style={styles.reopenBtn}
              onPress={() => setShowReopen(true)}
              accessibilityRole="button"
              accessibilityLabel={t(thKey('threadReopenAria'))}
              activeOpacity={0.85}
            >
              <RotateCcw size={16} color={colors.primary} />
              <Text style={styles.reopenBtnText}>{t(thKey('threadReopenBtn'))}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing[2] }]}>
            <TextInput
              style={styles.replyInput}
              placeholder={t(thKey('threadReplyPlaceholder'))}
              placeholderTextColor={colors.textTertiary}
              value={reply}
              onChangeText={setReply}
              multiline
              maxLength={500}
              accessibilityLabel={t(thKey('threadReplyAria'))}
              editable={canReply}
            />
            <View style={styles.inputActions}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleClose}
                disabled={isActioning}
                accessibilityRole="button"
                accessibilityLabel={t(thKey('threadCloseAria'))}
              >
                <XCircle size={20} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, (!reply.trim() || isSending) && styles.sendBtnDisabled]}
                onPress={handleSendReply}
                disabled={!reply.trim() || isSending}
                accessibilityRole="button"
                accessibilityLabel={t(thKey('threadReplyAriaBtn'))}
              >
                <Send size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

function TopBar({ title, onBack, backAria }: { title: string; onBack: () => void; backAria: string }) {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={backAria}
        hitSlop={8}
        style={styles.topBarBtn}
      >
        <ChevronLeft size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.topBarTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.topBarBtn} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function Bubble({ msg, t }: { msg: RiderTicketMessage; t: (k: string, o?: Record<string, unknown>) => string }) {
  const isMine = msg.sender === 'rider'
  const time = timeLabel(msg.createdAt)
  const senderLabel = isMine ? t(thKey('threadRiderLabel')) : (msg.agentName ?? t(thKey('threadAgentLabel')))
  const ariaLabel = `${senderLabel}. ${msg.body}. ${time}`

  return (
    <View
      style={[styles.bubbleWrap, isMine ? styles.bubbleWrapMine : styles.bubbleWrapAgent]}
      accessibilityLabel={ariaLabel}
    >
      {!isMine && (
        <Text style={styles.bubbleAgent}>{senderLabel}</Text>
      )}
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleAgent2]}>
        <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{msg.body}</Text>
      </View>
      <Text style={[styles.bubbleTime, isMine && { textAlign: 'right' }]}>{time}</Text>
    </View>
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
  topBarCenter: { flex: 1, alignItems: 'center', gap: 4 },
  topBarTitle: { fontSize: fontSize.md[0], fontWeight: '700', color: colors.text },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2.5],
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  statusText: { fontSize: fontSize.xs[0], fontWeight: '700' },

  // Skeleton
  skeletonWrap: { padding: spacing[4], gap: spacing[3] },
  skeletonRow: { flexDirection: 'row', alignItems: 'center' },

  // Not found
  notFoundWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6], gap: spacing[3] },
  notFoundTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, textAlign: 'center' },
  notFoundBody: { fontSize: fontSize.sm[0], color: colors.textMuted, textAlign: 'center' },
  notFoundBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing[5], paddingVertical: spacing[3] },
  notFoundBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base[0] },

  // Load error
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6], gap: spacing[3] },
  errorTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, textAlign: 'center' },
  errorBody: { fontSize: fontSize.sm[0], color: colors.textMuted, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing[5], paddingVertical: spacing[3], minHeight: 44 },
  retryBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base[0] },

  // Reply error banner
  replyErrorBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.errorLight, borderTopWidth: 1, borderTopColor: colors.error, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  replyErrorText: { flex: 1, fontSize: fontSize.xs[0], color: colors.error, fontWeight: '500' },
  replyErrorRetry: { fontSize: fontSize.xs[0], fontWeight: '700', color: colors.error },

  // Ticket info card (ListHeader)
  ticketInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  ticketSubject: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, lineHeight: 24, fontFamily: fontFamily.sansBold[0] },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.background,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
  },
  metaChipText: { fontSize: fontSize.xs[0], color: colors.textMuted, fontWeight: '500' },

  // Context
  contextCard: {
    backgroundColor: colors.primary50,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    gap: spacing[1.5],
  },
  contextHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  contextTitle: { fontSize: fontSize.xs[0], fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
  contextOrder: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  contextRoute: { fontSize: fontSize.xs[0], color: colors.textMuted },
  contextItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  contextItemText: { fontSize: fontSize.xs[0], color: colors.textMuted },

  // Attachments
  attachSection: { gap: spacing[2] },
  attachTitle: { fontSize: fontSize.xs[0], fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  attachList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  attachThumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary50,
    borderRadius: radii.md,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[2],
  },
  attachThumbIcon: { width: 28, height: 28, borderRadius: radii.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  attachThumbName: { fontSize: fontSize.xs[0], fontWeight: '500', color: colors.text },

  // Day separator
  daySeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing[3], gap: spacing[2] },
  dayLine: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  dayText: { fontSize: fontSize.xs[0], color: colors.textMuted, fontWeight: '500', backgroundColor: colors.background, paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.full },

  // Bubbles
  bubbleWrap: { marginBottom: spacing[2], maxWidth: '82%' },
  bubbleWrapMine: { alignSelf: 'flex-end' },
  bubbleWrapAgent: { alignSelf: 'flex-start' },
  bubbleAgent: { fontSize: fontSize.xs[0], fontWeight: '600', color: colors.textMuted, marginBottom: 2, marginLeft: spacing[1] },
  bubble: { paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], borderRadius: radii.lg },
  bubbleMine: { backgroundColor: colors.primary, borderTopRightRadius: radii.xl, borderBottomRightRadius: 4 },
  bubbleAgent2: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderTopLeftRadius: radii.xl, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: fontSize.base[0], color: colors.text, lineHeight: 21 },
  bubbleTextMine: { color: colors.white },
  bubbleTime: { fontSize: fontSize.xs[0], color: colors.textTertiary, marginTop: 2, fontFamily: fontFamily.sans[0] },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  replyInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontSize: fontSize.base[0],
    color: colors.text,
  },
  inputActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },

  // Action bar (resolved)
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  reopenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    minHeight: 48,
  },
  reopenBtnText: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.primary },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing[5] },
  modalSheet: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing[5], gap: spacing[3] },
  modalTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: fontSize.base[0],
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: spacing[2], justifyContent: 'flex-end' },
  modalCancelBtn: {
    borderRadius: radii.md,
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.textMuted },
  modalConfirmBtn: {
    borderRadius: radii.md,
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.primary,
  },
  modalConfirmBtnDisabled: { opacity: 0.5 },
  modalConfirmText: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.white },
})
