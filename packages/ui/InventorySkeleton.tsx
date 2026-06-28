import React from 'react'
import { View, StyleSheet } from 'react-native'
import { colors, radii, spacing } from '@chinooz/theme'
import Skeleton from './Skeleton'

export default function InventoryRowSkeletons({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.container} accessibilityRole="progressbar">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.row}>
            <Skeleton width={40} height={40} borderRadius={radii.md} />
            <View style={{ flex: 1, gap: spacing[1.5] }}>
              <Skeleton width="60%" height={14} />
              <Skeleton width="35%" height={10} />
            </View>
            <Skeleton width={48} height={16} />
            <Skeleton width={72} height={20} borderRadius={radii.full} />
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: spacing[2.5] },
  card: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.borderLight, padding: spacing[3],
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
})
