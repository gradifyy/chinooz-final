import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { SellerDateRangeKey } from '@chinooz/mock-data'
import { RANGE_KEYS, dateLabel } from './helpers'
import { styles } from './styles'

export function DateRangeSelector({
  activeKey,
  onChange,
  accessibilityLabel,
}: {
  activeKey: SellerDateRangeKey
  onChange: (key: SellerDateRangeKey) => void
  accessibilityLabel: string
}) {
  const { t } = useTranslation()
  return (
    <View style={styles.rangeTrack} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {RANGE_KEYS.map(key => {
        const active = key === activeKey
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.rangeSegment, active && styles.rangeSegmentActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.rangeLabel, active && styles.rangeLabelActive]}>{dateLabel(key, t)}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
