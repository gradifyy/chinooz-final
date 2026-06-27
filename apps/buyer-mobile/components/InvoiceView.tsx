import React from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import type { OrderInvoice } from '@chinooz/types'

interface InvoiceViewProps {
  visible: boolean
  invoice: OrderInvoice | null
  onClose: () => void
}

export default function InvoiceView({ visible, invoice, onClose }: InvoiceViewProps) {
  const { t } = useTranslation()

  if (!invoice) return null

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <Text style={{ fontSize: 22, color: colors.text }}>✕</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            {t('orderActions.invoiceTitle')}
          </Text>
          <View style={{ width: 40, height: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing[4], gap: spacing[5] }}
        >
          {/* Company header */}
          <View style={{ alignItems: 'center', gap: spacing[1] }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
              {t('orderActions.companyName')}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>
              {t('orderActions.companyAddress')}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>
              {t('orderActions.companyPan')}
            </Text>
            <View
              style={{
                marginTop: spacing[2],
                backgroundColor: colors.primary50,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[1.5],
                borderRadius: radii.full,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                {t('orderActions.taxInvoice')}
              </Text>
            </View>
          </View>

          {/* Invoice details */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              padding: spacing[4],
              borderWidth: 1,
              borderColor: colors.borderLight,
              gap: spacing[3],
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>{t('orders.orderId')}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] }}>
                {invoice.invoiceNumber}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>{t('orders.orderDate')}</Text>
              <Text style={{ fontSize: 13, color: colors.text }}>
                {new Date(invoice.issuedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>

          {/* Bill to */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              padding: spacing[4],
              borderWidth: 1,
              borderColor: colors.borderLight,
              gap: spacing[1],
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted }}>
              {t('orderActions.billTo')}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
              {invoice.customerName}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>
              {invoice.customerAddress}
            </Text>
          </View>

          {/* Items table */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              padding: spacing[4],
              borderWidth: 1,
              borderColor: colors.borderLight,
              gap: spacing[3],
            }}
          >
            {/* Table header */}
            <View style={{ flexDirection: 'row', paddingBottom: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
              <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: colors.textMuted }}>
                Item
              </Text>
              <Text style={{ width: 40, fontSize: 12, fontWeight: '600', color: colors.textMuted, textAlign: 'center' }}>
                Qty
              </Text>
              <Text style={{ width: 80, fontSize: 12, fontWeight: '600', color: colors.textMuted, textAlign: 'right' }}>
                Price
              </Text>
              <Text style={{ width: 80, fontSize: 12, fontWeight: '600', color: colors.textMuted, textAlign: 'right' }}>
                Total
              </Text>
            </View>

            {/* Table rows */}
            {invoice.items.map((item, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontSize: 14, color: colors.text }} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={{ width: 40, fontSize: 14, color: colors.text, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
                  {item.quantity}
                </Text>
                <Text style={{ width: 80, fontSize: 14, color: colors.text, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                  {formatNPR(item.unitPrice)}
                </Text>
                <Text style={{ width: 80, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                  {formatNPR(item.total)}
                </Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              padding: spacing[4],
              borderWidth: 1,
              borderColor: colors.borderLight,
              gap: spacing[2],
            }}
          >
            <SummaryLine label={t('orderActions.subtotal')} value={invoice.subtotal} />
            <SummaryLine label={t('orderActions.vat')} value={invoice.vat} muted />
            <SummaryLine label={t('orderActions.deliveryFee')} value={invoice.deliveryFee} />
            {invoice.discount > 0 && (
              <SummaryLine label={t('orderActions.discount')} value={-invoice.discount} muted />
            )}
            <View style={{ height: 1, backgroundColor: colors.borderLight, marginVertical: spacing[1] }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                {t('orderActions.grandTotal')}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'] }}>
                {formatNPR(invoice.grandTotal)}
              </Text>
            </View>
          </View>

          {/* Download PDF button (mock) */}
          <TouchableOpacity
            onPress={() => {}}
            style={{
              height: 48,
              borderRadius: radii.lg,
              borderWidth: 1.5,
              borderColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing[6],
            }}
            activeOpacity={0.85}
            accessibilityLabel={t('orderActions.downloadPdf')}
            accessibilityRole="button"
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>
              {t('orderActions.downloadPdf')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )
}

function SummaryLine({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
      <Text style={{ fontSize: 14, color: muted ? colors.textMuted : colors.text }}>{label}</Text>
      <Text style={{ fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] }}>
        {formatNPR(Math.abs(value))}
      </Text>
    </View>
  )
}
