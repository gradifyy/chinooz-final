import React from 'react'
import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'

interface DeliverySectionProps {
  sellerName: string
  stock: string
}

export default function DeliverySection({ sellerName, stock }: DeliverySectionProps) {
  const { t } = useTranslation()

  return (
    <View style={{ gap: spacing[3] }}>
      {/* Estimated delivery */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.primary50,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 16 }}>🚚</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
            {t('product.estimatedDelivery')}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            2–4 business days to Kathmandu Valley
          </Text>
        </View>
      </View>

      {/* COD badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <View style={{
          backgroundColor: colors.successLight,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radii.full,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.success }}>
            {t('product.codAvailable')}
          </Text>
        </View>
      </View>

      {/* Return policy */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.primary50,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 16 }}>↩️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
            {t('product.returnPolicy')}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            {t('product.returnNote')}
          </Text>
        </View>
      </View>
    </View>
  )
}
