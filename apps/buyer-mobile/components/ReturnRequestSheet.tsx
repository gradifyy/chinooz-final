import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { useRequestReturn } from '@chinooz/hooks'
import BottomSheet from '@chinooz/ui/BottomSheet'
import type { CartItem, CancelReason } from '@chinooz/types'

const REASONS: { key: CancelReason; labelKey: string }[] = [
  { key: 'changed_mind', labelKey: 'orderActions.reasonChangedMind' },
  { key: 'cheaper_elsewhere', labelKey: 'orderActions.reasonCheaperElsewhere' },
  { key: 'ordered_by_mistake', labelKey: 'orderActions.reasonOrderedByMistake' },
  { key: 'other', labelKey: 'orderActions.reasonOther' },
]

interface ReturnRequestSheetProps {
  visible: boolean
  orderId: string
  items: CartItem[]
  onClose: () => void
  onSuccess: () => void
}

export default function ReturnRequestSheet({
  visible,
  orderId,
  items,
  onClose,
  onSuccess,
}: ReturnRequestSheetProps) {
  const { t } = useTranslation()
  const requestReturn = useRequestReturn()
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectedReason, setSelectedReason] = useState<CancelReason | null>(null)
  const [reasonDetail, setReasonDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleItem = useCallback((id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setError(null)
  }, [])

  const handleReturn = useCallback(async () => {
    if (selectedItems.size === 0) {
      setError(t('orderActions.selectAtLeastOne'))
      return
    }
    if (!selectedReason) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await requestReturn.mutateAsync({
        orderId,
        itemIds: [...selectedItems],
        reason: selectedReason,
        reasonDetail: reasonDetail.trim() || undefined,
      })
      if (result.success) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
        setSelectedItems(new Set())
        setSelectedReason(null)
        setReasonDetail('')
        onSuccess()
        onClose()
      }
    } catch {
      setError(t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }, [selectedItems, selectedReason, reasonDetail, orderId, requestReturn, onSuccess, onClose, t])

  const handleClose = useCallback(() => {
    setSelectedItems(new Set())
    setSelectedReason(null)
    setReasonDetail('')
    setError(null)
    onClose()
  }, [onClose])

  return (
    <BottomSheet visible={visible} onClose={handleClose} title={t('orderActions.returnConfirmTitle')}>
      <ScrollView style={{ paddingHorizontal: spacing[4] }}>
        <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing[4], lineHeight: 20 }}>
          {t('orderActions.returnConfirmMsg')}
        </Text>

        {/* Item selection */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing[3] }}>
          {t('orderActions.selectItems')}
        </Text>

        <View style={{ gap: spacing[2], marginBottom: spacing[4] }}>
          {items.map(item => {
            const isSelected = selectedItems.has(item.id)
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => toggleItem(item.id)}
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing[2.5],
                  paddingHorizontal: spacing[3],
                  borderRadius: radii.lg,
                  backgroundColor: isSelected ? colors.primary50 : colors.surface,
                  borderWidth: 1.5,
                  borderColor: isSelected ? colors.primary : colors.border,
                  gap: spacing[3],
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${item.name}, ${formatNPR(item.price * item.quantity)}`}
              >
                {/* Checkbox */}
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: radii.sm,
                    borderWidth: 2,
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected && (
                    <Text style={{ fontSize: 14, color: colors.white, fontWeight: '700' }}>✓</Text>
                  )}
                </View>

                {/* Thumbnail */}
                <Image
                  source={{ uri: item.image }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radii.md,
                    backgroundColor: colors.shimmer,
                  }}
                />

                {/* Details */}
                <View style={{ flex: 1, gap: spacing[0.5] }}>
                  <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={1}>
                    {item.name.split('—')[0]?.trim() || item.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {t('orders.quantity')}: {item.quantity}
                  </Text>
                </View>

                {/* Price */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] }}>
                  {formatNPR(item.price * item.quantity)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Reason picker */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing[3] }}>
          {t('orderActions.selectReason')}
        </Text>

        <View style={{ gap: spacing[2], marginBottom: spacing[4] }}>
          {REASONS.map(reason => {
            const isSelected = selectedReason === reason.key
            return (
              <TouchableOpacity
                key={reason.key}
                onPress={() => setSelectedReason(reason.key)}
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing[3],
                  paddingHorizontal: spacing[3],
                  borderRadius: radii.lg,
                  backgroundColor: isSelected ? colors.primary50 : colors.surface,
                  borderWidth: 1.5,
                  borderColor: isSelected ? colors.primary : colors.border,
                  gap: spacing[3],
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={t(reason.labelKey)}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: isSelected ? colors.primary : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected && (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: colors.primary,
                      }}
                    />
                  )}
                </View>
                <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>
                  {t(reason.labelKey)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Other reason text area */}
        {selectedReason === 'other' && (
          <TextInput
            value={reasonDetail}
            onChangeText={setReasonDetail}
            placeholder={t('orderActions.reasonPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={500}
            style={{
              minHeight: 80,
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              borderWidth: 1.5,
              borderColor: colors.border,
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
              fontSize: 15,
              color: colors.text,
              textAlignVertical: 'top',
              marginBottom: spacing[4],
            }}
          />
        )}

        {/* Error message */}
        {error && (
          <Text style={{ fontSize: 13, color: colors.error, marginBottom: spacing[3] }}>
            {error}
          </Text>
        )}

        {/* Confirm button */}
        <TouchableOpacity
          onPress={handleReturn}
          disabled={selectedItems.size === 0 || !selectedReason || submitting}
          style={{
            backgroundColor: selectedItems.size === 0 || !selectedReason ? colors.border : colors.primary,
            height: 48,
            borderRadius: radii.lg,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: submitting ? 0.7 : 1,
            marginBottom: spacing[4],
          }}
          activeOpacity={0.85}
          accessibilityLabel={t('orderActions.confirmReturn')}
          accessibilityRole="button"
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: selectedItems.size === 0 || !selectedReason ? colors.textMuted : colors.white,
            }}
          >
            {submitting ? '...' : t('orderActions.confirmReturn')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </BottomSheet>
  )
}
