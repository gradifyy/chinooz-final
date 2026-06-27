import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { useCancelOrder } from '@chinooz/hooks'
import BottomSheet from '@chinooz/ui/BottomSheet'
import type { CancelReason } from '@chinooz/types'

const REASONS: { key: CancelReason; labelKey: string }[] = [
  { key: 'changed_mind', labelKey: 'orderActions.reasonChangedMind' },
  { key: 'cheaper_elsewhere', labelKey: 'orderActions.reasonCheaperElsewhere' },
  { key: 'ordered_by_mistake', labelKey: 'orderActions.reasonOrderedByMistake' },
  { key: 'other', labelKey: 'orderActions.reasonOther' },
]

interface CancelOrderSheetProps {
  visible: boolean
  orderId: string
  onClose: () => void
  onSuccess: () => void
}

export default function CancelOrderSheet({
  visible,
  orderId,
  onClose,
  onSuccess,
}: CancelOrderSheetProps) {
  const { t } = useTranslation()
  const cancelOrder = useCancelOrder()
  const [selectedReason, setSelectedReason] = useState<CancelReason | null>(null)
  const [reasonDetail, setReasonDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCancel = useCallback(async () => {
    if (!selectedReason) return
    setSubmitting(true)
    try {
      const result = await cancelOrder.mutateAsync({
        orderId,
        reason: selectedReason,
        reasonDetail: reasonDetail.trim() || undefined,
      })
      if (result.success) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
        setSelectedReason(null)
        setReasonDetail('')
        onSuccess()
        onClose()
      }
    } catch {} finally {
      setSubmitting(false)
    }
  }, [selectedReason, reasonDetail, orderId, cancelOrder, onSuccess, onClose])

  const handleClose = useCallback(() => {
    setSelectedReason(null)
    setReasonDetail('')
    onClose()
  }, [onClose])

  return (
    <BottomSheet visible={visible} onClose={handleClose} title={t('orderActions.cancelConfirmTitle')}>
      <ScrollView style={{ paddingHorizontal: spacing[4] }}>
        <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing[4], lineHeight: 20 }}>
          {t('orderActions.cancelConfirmMsg')}
        </Text>

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

        {/* Confirm button */}
        <TouchableOpacity
          onPress={handleCancel}
          disabled={!selectedReason || submitting}
          style={{
            backgroundColor: !selectedReason ? colors.border : colors.error,
            height: 48,
            borderRadius: radii.lg,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: submitting ? 0.7 : 1,
            marginBottom: spacing[4],
          }}
          activeOpacity={0.85}
          accessibilityLabel={t('orderActions.confirmCancel')}
          accessibilityRole="button"
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: !selectedReason ? colors.textMuted : colors.white,
            }}
          >
            {submitting ? '...' : t('orderActions.confirmCancel')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </BottomSheet>
  )
}
