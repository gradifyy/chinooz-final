import React, { useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Share,
} from 'react-native'
import { X, Share2, FileText, Package } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily } from '../lib/theme'
import { formatNPR } from '@chinooz/utils'
import type { SellerSubOrder } from '@chinooz/types'

const SHIPPING_TO_CARRIER_KEY: Record<string, string> = {
  standard: 'seller.orders.carrierStandardPost',
  express: 'seller.orders.carrierPathaoExpress',
  sameday: 'seller.orders.carrierPathaoSameday',
  pickup: 'seller.orders.carrierStorePickup',
}

function genTracking(order: SellerSubOrder): string {
  if (order.trackingNumber) return order.trackingNumber
  const digits = order.orderId.replace(/\D/g, '') || '000000'
  return `TRK${digits.padStart(8, '0')}`
}

/** Deterministic barcode-like bar row from a string (on-device renderer, no print plugin). */
function Barcode({ value, ariaLabel }: { value: string; ariaLabel: string }) {
  const bars = useMemo(() => {
    const out: { w: number; dark: boolean }[] = []
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i)
      for (let j = 0; j < 4; j++) {
        const bit = (code >> (j * 2)) & 0x3
        out.push({ w: 1 + (bit & 1), dark: (bit & 0x2) === 0 })
      }
      if (i < value.length - 1) out.push({ w: 1, dark: false })
    }
    return out
  }, [value])
  return (
    <View style={styles.barcodeRow} accessibilityRole="image" accessibilityLabel={ariaLabel}>
      {bars.map((b, i) => (
        <View key={i} style={{ width: b.w * 2, height: 44, backgroundColor: b.dark ? colors.text : 'transparent' }} />
      ))}
    </View>
  )
}

type Tab = 'slip' | 'label'

export function MobileLabelSheet({
  order,
  visible,
  onClose,
  onPrinted,
  t,
}: {
  order: SellerSubOrder
  visible: boolean
  onClose: () => void
  onPrinted?: () => void
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const [tab, setTab] = useState<Tab>('label')
  const isCod = order.paymentType === 'cod'
  const tracking = genTracking(order)
  const carrier = order.carrier ?? (SHIPPING_TO_CARRIER_KEY[order.shippingMethod] ? t(SHIPPING_TO_CARRIER_KEY[order.shippingMethod]) : t('seller.orders.carrierLocal'))
  const subtotal = order.items.reduce((s, it) => s + it.price * it.quantity, 0)
  const deliveryFee = Math.max(0, order.total - subtotal)

  const buildText = useCallback(() => {
    const lines: string[] = []
    if (tab === 'label') {
      lines.push(`${t('seller.orders.labelTitle')} — ${order.orderId}`)
      lines.push(`${t('seller.orders.labelCarrier')}: ${carrier}`)
      lines.push(`${t('seller.orders.labelTracking')}: ${tracking}`)
      lines.push(`${t('seller.orders.labelTo')}: ${order.buyerName}, ${order.city}, ${order.district}`)
      lines.push(`${order.buyerPhone}`)
      if (isCod) lines.push(`${t('seller.orders.labelCodBox')}: ${formatNPR(order.total)}`)
    } else {
      lines.push(`${t('seller.orders.slipTitle')} — ${order.orderId}`)
      for (const it of order.items) {
        lines.push(`${it.quantity}× ${it.name} — ${formatNPR(it.price * it.quantity)}`)
      }
      lines.push(`${t('seller.orders.slipTotal')}: ${formatNPR(order.total)}`)
    }
    return lines.join('\n')
  }, [tab, order, carrier, tracking, isCod, t])

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: buildText() })
      onPrinted?.()
    } catch {}
  }, [buildText, onPrinted])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.card}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>{t('seller.orders.printDocsTitle')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('seller.orders.printDocsCloseAria')}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {([
            { key: 'label' as Tab, label: t('seller.orders.printDocsTabLabel'), Icon: Package },
            { key: 'slip' as Tab, label: t('seller.orders.printDocsTabSlip'), Icon: FileText },
          ]).map(tb => {
            const active = tab === tb.key
            const Icon = tb.Icon
            return (
              <TouchableOpacity
                key={tb.key}
                onPress={() => setTab(tb.key)}
                style={[styles.tab, active && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Icon size={15} color={active ? colors.primary : colors.textMuted} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tb.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: spacing[4] }} showsVerticalScrollIndicator={false}>
          <View style={styles.doc}>
            {tab === 'label' ? (
              <>
                <Text style={styles.docTitle}>{t('seller.orders.labelTitle')}</Text>
                <Text style={styles.store}>{t('seller.orders.labelStoreName')}</Text>
                <View style={styles.metaGrid}>
                  <Meta label={t('seller.orders.labelCarrier')} value={carrier} />
                  <Meta label={t('seller.orders.labelService')} value={order.shippingMethod} />
                </View>
                <View style={styles.divider} />
                <Text style={styles.metaLabel}>{t('seller.orders.labelTo')}</Text>
                <Text style={styles.toName}>{order.buyerName}</Text>
                <Text style={styles.toLine}>{order.city}, {order.district}</Text>
                <Text style={styles.toLine}>{order.buyerPhone}</Text>
                <Barcode value={tracking} ariaLabel={t('seller.orders.barcodeAria', { value: tracking })} />
                <Text style={styles.tracking}>{t('seller.orders.labelTracking')}: {tracking}</Text>
                {isCod ? (
                  <View style={styles.codBox}>
                    <Text style={styles.codBanner}>{t('seller.orders.labelCodBox')}</Text>
                    <Text style={styles.codAmount}>{formatNPR(order.total)}</Text>
                  </View>
                ) : (
                  <Text style={styles.prepaid}>{t('seller.orders.slipPrepaid')}</Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.docTitle}>{t('seller.orders.slipTitle')}</Text>
                <Text style={styles.store}>{order.orderId} · {order.buyerName}</Text>
                <View style={styles.divider} />
                {order.items.map(it => (
                  <View key={it.id} style={styles.itemRow}>
                    <Text style={styles.itemQty}>{it.quantity}×</Text>
                    <Text style={styles.itemName} numberOfLines={2}>{it.name}</Text>
                    <Text style={styles.itemPrice}>{formatNPR(it.price * it.quantity)}</Text>
                  </View>
                ))}
                <View style={styles.divider} />
                <Row label={t('seller.orders.slipSubtotal')} value={formatNPR(subtotal)} />
                <Row label={t('seller.orders.slipDelivery')} value={formatNPR(deliveryFee)} />
                <Row label={t('seller.orders.slipTotal')} value={formatNPR(order.total)} bold />
                {isCod && (
                  <View style={styles.codBox}>
                    <Text style={styles.codBanner}>{t('seller.orders.slipCodCollect')}</Text>
                    <Text style={styles.codAmount}>{formatNPR(order.total)}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn} accessibilityRole="button">
            <Text style={styles.cancelText}>{t('seller.orders.printDocsCloseAria')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn} accessibilityRole="button" accessibilityLabel={t('seller.orders.printDocsShareAria')}>
            <Share2 size={16} color={colors.white} />
            <Text style={styles.shareText}>{t('seller.orders.printDocsShare')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.totalsRow}>
      <Text style={[styles.totalsLabel, bold && styles.totalsBold]}>{label}</Text>
      <Text style={[styles.totalsValue, bold && styles.totalsBold]}>{value}</Text>
    </View>
  )
}

export default MobileLabelSheet

const styles = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, backgroundColor: colors.overlay },
  card: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'],
    maxHeight: '90%',
  },
  handle: { width: 40, height: 4, borderRadius: radii.full, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing[2] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[2] },
  title: { fontSize: 18, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  tabs: { flexDirection: 'row', gap: spacing[2], paddingHorizontal: spacing[5], paddingBottom: spacing[2] },
  tab: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radii.full, borderWidth: 1, borderColor: colors.border },
  tabActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  tabText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.primary },
  body: { paddingHorizontal: spacing[5] },
  doc: { borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.lg, padding: spacing[4], backgroundColor: colors.white },
  docTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  store: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  metaGrid: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[3] },
  metaLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 14, color: colors.text, fontWeight: '600', marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing[3] },
  toName: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2 },
  toLine: { fontSize: 13, color: colors.textSecondary },
  barcodeRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing[4], height: 44 },
  tracking: { fontSize: 12, color: colors.text, marginTop: spacing[1], fontWeight: '600' },
  codBox: { marginTop: spacing[3], borderWidth: 2, borderColor: colors.text, borderRadius: radii.md, padding: spacing[3], alignItems: 'center' },
  codBanner: { fontSize: 12, fontWeight: '700', color: colors.text },
  codAmount: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 2 },
  prepaid: { fontSize: 13, fontWeight: '700', color: colors.success, marginTop: spacing[3] },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[1.5] },
  itemQty: { fontSize: 13, fontWeight: '700', color: colors.text, width: 28 },
  itemName: { flex: 1, fontSize: 13, color: colors.text },
  itemPrice: { fontSize: 13, fontWeight: '600', color: colors.text },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[1] },
  totalsLabel: { fontSize: 13, color: colors.textSecondary },
  totalsValue: { fontSize: 13, color: colors.text },
  totalsBold: { fontWeight: '800', color: colors.text },
  actions: { flexDirection: 'row', gap: spacing[3], padding: spacing[5], paddingTop: spacing[3] },
  cancelBtn: { flex: 1, paddingVertical: spacing[3], borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  shareBtn: { flex: 1, flexDirection: 'row', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  shareText: { color: colors.white, fontWeight: '700', fontSize: 14 },
})
