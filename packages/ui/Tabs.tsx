import React from 'react'
import { View, TouchableOpacity, Text, ScrollView } from 'react-native'
import { colors, radii, spacing } from '@chinooz/theme'
import type { TabsProps } from '@chinooz/types/components'

export default function Tabs({
  tabs,
  activeKey,
  onChange,
  testID,
}: TabsProps) {
  return (
    <ScrollView
      testID={testID}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing[1] }}
    >
      {tabs.map(tab => {
        const isActive = tab.key === activeKey
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={{
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[2],
              borderRadius: radii.full,
              backgroundColor: isActive ? colors.primary : colors.background,
              borderWidth: 1,
              borderColor: isActive ? colors.primary : colors.border,
              minHeight: 40,
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: isActive ? colors.white : colors.text,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}
