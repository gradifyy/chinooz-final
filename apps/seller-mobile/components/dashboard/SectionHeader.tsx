import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { styles } from './styles'

export function SectionHeader({
  title,
  seeAllLabel,
  onSeeAll,
}: {
  title: string
  seeAllLabel?: string
  onSeeAll?: () => void
}) {
  return (
    <View style={styles.sectionHeader} accessibilityRole="header">
      <Text style={styles.sectionTitle}>{title}</Text>
      {seeAllLabel && onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} hitSlop={8} accessibilityRole="link">
          <Text style={styles.seeAllLink}>{seeAllLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
