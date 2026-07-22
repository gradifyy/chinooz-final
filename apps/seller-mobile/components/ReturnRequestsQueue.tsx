import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { Check, XCircle, MessageCircle, RotateCcw } from 'lucide-react-native'
import {
  useApproveReturnRequest,
  useRejectReturnRequest,
} from '@chinooz/hooks'
import { formatNPRAmount } from '@chinooz/mock-data'
import { colors, spacing, radii, fontFamily } from '../lib/theme'
import type { SellerReturnRequest, ReturnRequestStatus, RefundStatus, CancelReason } from '@chinooz/types'

const STATUS_META: Record<ReturnRequestStatus, { bg: string; text: string; labelKey: string }> = {
  requested: { bg: colors.warningLight, text: colors.warningText, labelKey: 'seller.orders.returnRequested' },
  approved: { bg: colors.infoLight, text: colors.info, labelKey: 'seller.orders.returnApproved' },
  rejected: { bg: colors.errorLight, text: colors.error, labelKey: 'seller.orders.returnRejected' },
  refund_processed: { bg: colors.successLight, text: colors.successText, labelKey: 'seller.orders.returnRefundProcessed' },
}

const REFUND_META: Record<RefundStatus, { bg: string; text: string; labelKey: string }> = {
  none: { bg: colors.borderLight, text: colors.textMuted, labelKey: 'seller.orders.refundNone' },
  pending: { bg: colors.warningLight, text: colors.warningText, labelKey: 'seller.orders.refundPending' },
  refunded: { bg: colors.successLight, text: colors.successText, labelKey: 'seller.orders.refundRefunded' },
  rejected: { bg: colors.errorLight, text: colors.error, labelKey: 'seller.orders.refundRejected' },
}

const REASON_LABEL_KEY: Record<CancelReason, string> = {
  changed_mind: 'seller.orders.cancelReasonChanged_mind',
  cheaper_elsewhere: 'seller.orders.cancelReasonCheaper_elsewhere',
  ordered_by_mistake: 'seller.orders.cancelReasonOrdered_by_mistake',
  other: 'seller.orders.cancelReasonOther',
}

function formatDateShort(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'ne' ? 'ne-NP' : 'en-US', { month: 'short', day: 'numeric' })
}

function ReturnRequestCard({
  request,
  onApprove,
  onReject,
  onMessage,
  t,
}: {
  request: SellerReturnRequest
  onApprove: (requestId: string) => void
  onReject: (requestId: string) => void
  onMessage: (orderId: string) => void
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const { i18n } = useTranslation()
  const statusMeta = STATUS_META[request.status]
  const isResolved = request.status === 'approved' || request.status === 'rejected' || request.status === 'refund_processed'

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {t('seller.orders.returnCardTitle')} · {request.buyerName}
          </Text>
          <Text style={styles.cardSub}>
            <Text style={styles.mono}>{request.orderId}</Text> · {formatDateShort(request.createdAt, i18n.language)}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusMeta.text }]} />
          <Text style={[styles.statusText, { color: statusMeta.text }]}>{t(statusMeta.labelKey)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('seller.orders.returnReasonLabel')}</Text>
        <Text style={styles.sectionValue}>{t(REASON_LABEL_KEY[request.reason])}</Text>
        {request.reasonDetail ? <Text style={styles.reasonDetail}>{request.reasonDetail}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('seller.orders.returnItemsLabel')}</Text>
        {request.items.map(item => (
          <View key={item.itemId} style={styles.itemRow}>
            <Image source={{ uri: item.image }} style={styles.itemThumb} accessibilityIgnoresInvertColors />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name.split('—')[0]?.trim() || item.name}</Text>
              <Text style={styles.itemMeta}>
                {t('seller.orders.qty')}: {item.quantity} · {formatNPRAmount(item.price)} {t('seller.orders.each')}
              </Text>
            </View>
            <Text style={styles.itemTotal}>{formatNPRAmount(item.price * item.quantity)}</Text>
          </View>
        ))}
      </View>

      {request.photoUrls.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('seller.orders.returnPhotosLabel')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            {request.photoUrls.map((_, i) => (
              <View key={i} style={styles.photoPlaceholder} accessibilityLabel={`${t('seller.orders.returnPhoto')} ${i + 1}`} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>{t('seller.orders.returnRequestedAmount')}</Text>
        <Text style={styles.amountValue}>{formatNPRAmount(request.requestedAmount)}</Text>
      </View>

      {isResolved && request.resolutionNote ? (
        <View style={styles.noteBox}>
          <Text style={styles.sectionLabel}>{t('seller.orders.returnResolutionNote')}</Text>
          <Text style={styles.sectionValue}>{request.resolutionNote}</Text>
        </View>
      ) : null}

      {request.refundStatus !== 'none' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Text style={styles.refundLabel}>{t('seller.orders.refundStatusLabel')}</Text>
          <View style={[styles.statusPill, { backgroundColor: REFUND_META[request.refundStatus].bg }]}>
            <Text style={[styles.statusText, { color: REFUND_META[request.refundStatus].text }]}>
              {t(REFUND_META[request.refundStatus].labelKey)}
            </Text>
          </View>
        </View>
      )}

      {!isResolved ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={() => onApprove(request.id)}
            style={styles.approveBtn}
            accessibilityRole="button"
            accessibilityLabel={t('seller.orders.returnApproveAria', { id: request.orderId, amount: formatNPRAmount(request.requestedAmount) })}
          >
            <Check size={15} color={colors.white} />
            <Text style={styles.approveText}>{t('seller.orders.returnApprove')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onReject(request.id)}
            style={styles.rejectBtn}
            accessibilityRole="button"
            accessibilityLabel={t('seller.orders.returnRejectAria', { id: request.orderId })}
          >
            <XCircle size={15} color={colors.error} />
            <Text style={styles.rejectText}>{t('seller.orders.returnReject')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onMessage(request.orderId)}
            style={styles.msgBtn}
            accessibilityRole="button"
            accessibilityLabel={t('seller.orders.returnMessageAria', { id: request.orderId })}
          >
            <MessageCircle size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => onMessage(request.orderId)}
          style={styles.resolvedMsgBtn}
          accessibilityRole="button"
          accessibilityLabel={t('seller.orders.returnMessageAria', { id: request.orderId })}
        >
          <MessageCircle size={14} color={colors.primary} />
          <Text style={styles.resolvedMsgText}>{t('seller.orders.returnMessageBuyer')}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export function ReturnRequestsQueue({
  requests,
  onMessage,
  t,
}: {
  requests: SellerReturnRequest[]
  onMessage: (orderId: string) => void
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const { t: tHook } = useTranslation()
  const approveReturn = useApproveReturnRequest()
  const rejectReturn = useRejectReturnRequest()
  const [busyId, setBusyId] = useState<string | null>(null)

  const handleApprove = useCallback(
    async (requestId: string) => {
      setBusyId(requestId)
      try {
        await approveReturn.mutateAsync({ requestId })
      } catch {
        // error feedback via toast could be added; kept minimal for parity
      } finally {
        setBusyId(null)
      }
    },
    [approveReturn],
  )

  const handleReject = useCallback(
    async (requestId: string) => {
      setBusyId(requestId)
      try {
        await rejectReturn.mutateAsync({ requestId })
      } catch {
        // noop
      } finally {
        setBusyId(null)
      }
    },
    [rejectReturn],
  )

  const pending = requests.filter(r => r.status === 'requested')
  const resolved = requests.filter(r => r.status !== 'requested')

  if (requests.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIconWrap}>
          <RotateCcw size={32} color={colors.textTertiary} />
        </View>
        <Text style={styles.emptyTitle}>{tHook('seller.orders.returnEmptyTitle')}</Text>
        <Text style={styles.emptySubtitle}>{tHook('seller.orders.returnEmptySubtitle')}</Text>
      </View>
    )
  }

  const wrapCard = (r: SellerReturnRequest) => (
    <View key={r.id} style={{ opacity: busyId === r.id ? 0.6 : 1 }}>
      {busyId === r.id && (
        <View style={styles.cardOverlay}>
          <ActivityIndicator size={20} color={colors.primary} />
        </View>
      )}
      <ReturnRequestCard
        request={r}
        onApprove={handleApprove}
        onReject={handleReject}
        onMessage={onMessage}
        t={t}
      />
    </View>
  )

  return (
    <View style={{ gap: spacing[3] }}>
      {pending.length > 0 && (
        <View style={{ gap: spacing[2] }}>
          <Text style={styles.queueHeading}>
            {tHook('seller.orders.returnQueuePending')} ({pending.length})
          </Text>
          {pending.map(wrapCard)}
        </View>
      )}
      {resolved.length > 0 && (
        <View style={{ gap: spacing[2] }}>
          <Text style={styles.queueHeading}>
            {tHook('seller.orders.returnQueueResolved')} ({resolved.length})
          </Text>
          {resolved.map(wrapCard)}
        </View>
      )}
    </View>
  )
}

export default ReturnRequestsQueue

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.lg, padding: spacing[4], gap: spacing[3] },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[2] },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  mono: { fontFamily: fontFamily.sansBold[0] },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[2.5], paddingVertical: spacing[1], borderRadius: radii.full },
  statusDot: { width: 6, height: 6, borderRadius: radii.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  section: { gap: spacing[1] },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: colors.textMuted },
  sectionValue: { fontSize: 14, color: colors.text },
  reasonDetail: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5] },
  itemThumb: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.shimmer },
  itemName: { fontSize: 14, color: colors.text },
  itemMeta: { fontSize: 12, color: colors.textMuted },
  itemTotal: { fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  photoPlaceholder: { width: 56, height: 56, borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.background },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  amountLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  amountValue: { fontSize: 16, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0] },
  noteBox: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.md, padding: spacing[2.5], gap: spacing[1] },
  refundLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[1.5], height: 40, borderRadius: radii.md, backgroundColor: colors.success },
  approveText: { color: colors.white, fontWeight: '700', fontSize: 14, fontFamily: fontFamily.sansSemiBold[0] },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[1.5], height: 40, borderRadius: radii.md, borderWidth: 1, borderColor: colors.error + '40', backgroundColor: colors.error + '0D' },
  rejectText: { color: colors.error, fontWeight: '700', fontSize: 14, fontFamily: fontFamily.sansSemiBold[0] },
  msgBtn: { width: 40, height: 40, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  resolvedMsgBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], alignSelf: 'flex-start' },
  resolvedMsgText: { color: colors.primary, fontWeight: '600', fontSize: 14, fontFamily: fontFamily.sansSemiBold[0] },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[10], gap: spacing[2] },
  emptyIconWrap: { width: 64, height: 64, borderRadius: radii.full, backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2] },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  queueHeading: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textMuted },
  cardOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
})
