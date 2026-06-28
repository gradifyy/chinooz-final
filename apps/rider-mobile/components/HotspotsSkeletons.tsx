import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Skeleton } from '@chinooz/ui'
import { colors, radii, spacing } from '@chinooz/theme'

/**
 * RD5 — Shimmer skeletons for the hotspots screen.
 *
 * Loading uses shimmer (not spinners) to match the existing pattern. The
 * container is aria-busy so screen readers announce the loading state.
 *
 * Layout mirrors the loaded screen: map → forecast → ranked list → recs.
 */

export function HotspotsSkeleton({ labels }: { labels: SkeletonLabels }) {
  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLabel={labels.loadingMap}
      accessibilityLiveRegion="polite"
    >
      {/* Map skeleton */}
      <View style={styles.mapCard}>
        <Skeleton width="100%" height={300} borderRadius={radii.xl} testID="sk-map" />
        {/* Legend skeleton */}
        <View style={styles.legendRow}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={styles.legendItem}>
              <Skeleton width={14} height={14} borderRadius={radii.sm} />
              <Skeleton width={50} height={12} />
            </View>
          ))}
        </View>
      </View>

      {/* Forecast skeleton */}
      <View style={styles.forecastCard}>
        <Skeleton width={160} height={18} />
        <View style={styles.forecastBars}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton
              key={i}
              width={20}
              height={40 + (i % 3) * 30}
              borderRadius={radii.sm}
            />
          ))}
        </View>
        <Skeleton width="80%" height={14} />
      </View>

      {/* Ranked list skeleton */}
      <View style={styles.rankedCard}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={styles.rankedRow}>
            <Skeleton width={24} height={20} />
            <View style={styles.rankedBody}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={12} />
            </View>
            <Skeleton width={40} height={14} borderRadius={radii.full} />
          </View>
        ))}
      </View>

      {/* Recommendations skeleton */}
      <View style={styles.recCard}>
        {[0, 1].map(i => (
          <View key={i} style={styles.recRow}>
            <Skeleton width="70%" height={16} />
            <Skeleton width="50%" height={12} />
            <Skeleton width={100} height={36} borderRadius={radii.md} />
          </View>
        ))}
      </View>
    </View>
  )
}

export interface SkeletonLabels {
  loadingMap: string
  loadingRecs: string
  loadingForecast: string
}

const styles = StyleSheet.create({
  container: { gap: spacing[4] },
  mapCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[2],
    gap: spacing[2],
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2.5] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  forecastCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2],
  },
  forecastBars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2], height: 120 },
  rankedCard: {
    gap: spacing[2],
  },
  rankedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rankedBody: { flex: 1, gap: 4 },
  recCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[4],
  },
  recRow: { gap: spacing[2] },
})
