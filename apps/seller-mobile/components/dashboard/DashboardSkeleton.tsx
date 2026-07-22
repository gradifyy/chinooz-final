import React from 'react'
import { View } from 'react-native'
import { styles } from './styles'

export function DashboardSkeleton({ t }: { t: (k: string) => string }) {
  return (
    <View style={styles.sections} aria-busy accessibilityLabel={t('seller.dashboard.loadingDashboard')}>
      <View style={styles.heroCard}>
        <View style={styles.heroSkLabel} />
        <View style={styles.heroSkValue} />
        <View style={styles.heroSkTrend} />
        <View style={styles.heroSkChart} />
        <View style={styles.heroSkRange} />
        <View style={styles.heroSkMetrics}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={[styles.heroSkMetric, i > 0 && styles.heroSkMetricDivided]}>
              <View style={styles.heroSkMetricLabel} />
              <View style={styles.heroSkMetricValue} />
            </View>
          ))}
        </View>
      </View>
      <View>
        <View style={styles.skeletonSectionTitle} />
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={[styles.skeletonAlertRow, i > 0 && styles.skeletonRowBorder]} />
        ))}
      </View>
      <View>
        <View style={styles.skeletonSectionTitle} />
        <View style={styles.skeletonQuickRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.skeletonQuickTile} />
          ))}
        </View>
      </View>
      <View>
        <View style={styles.skeletonSectionTitle} />
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={[styles.skeletonActivityRow, i > 0 && styles.skeletonRowBorder]} />
        ))}
      </View>
    </View>
  )
}
