import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, DimensionValue } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Store, AlertCircle, WifiOff, RefreshCw, Info } from 'lucide-react-native'
import { colors, spacing, radii } from '@chinooz/theme'

export type AnalyticsStatus =
  | 'loading'
  | 'ready'
  | 'empty-insufficient'
  | 'empty-no-results'
  | 'error'
  | 'offline'

export function AnalyticsStateWrapper({
  status,
  children,
  onRetry,
  onClearFilters,
  hasFilters,
  partialData,
}: {
  status: AnalyticsStatus
  children: React.ReactNode
  onRetry?: () => void
  onClearFilters?: () => void
  hasFilters?: boolean
  partialData?: boolean
}) {
  const { t } = useTranslation()

  if (status === 'loading') {
    return <SectionSkeletons />
  }

  if (status === 'empty-insufficient') {
    return <EmptyInsufficient onAddProduct={() => {}} t={t} />
  }

  if (status === 'empty-no-results') {
    return (
      <EmptyNoResults
        onClear={onClearFilters ?? (() => {})}
        hasFilters={hasFilters ?? false}
        t={t}
      />
    )
  }

  if (status === 'error') {
    return <ErrorState onRetry={onRetry ?? (() => {})} t={t} />
  }

  return (
    <View>
      {partialData && <PartialDataChip t={t} />}
      {status === 'offline' && <OfflineNotice t={t} onRetry={onRetry} />}
      {children}
    </View>
  )
}

function SkeletonBox({
  width,
  height,
  radius,
}: {
  width: number | string
  height: number
  radius?: number
}) {
  return (
    <View
      style={{
        width: width as DimensionValue,
        height,
        borderRadius: radius ?? 6,
        backgroundColor: colors.shimmer,
      }}
    />
  )
}

export function SectionSkeletons() {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading analytics">
      {/* KPI skeletons */}
      <View style={styles.kpiGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.kpiCard}>
            <SkeletonBox width={80} height={12} />
            <SkeletonBox width={120} height={22} />
            <SkeletonBox width={60} height={12} />
          </View>
        ))}
      </View>

      {/* Chart skeleton */}
      <View style={styles.card}>
        <SkeletonBox width={100} height={14} />
        <View style={styles.chartSkeleton}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={styles.chartBarCol}>
              <SkeletonBox width="100%" height={40 + Math.random() * 80} radius={4} />
              <SkeletonBox width={24} height={10} />
            </View>
          ))}
        </View>
      </View>

      {/* Breakdown skeleton */}
      <View style={styles.card}>
        <SkeletonBox width={80} height={14} />
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.skRow}>
            <SkeletonBox width={60} height={12} />
            <SkeletonBox width={40} height={12} />
          </View>
        ))}
      </View>

      {/* Table skeleton */}
      <View style={styles.card}>
        <SkeletonBox width={100} height={14} />
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.skTableRow}>
            <SkeletonBox width={32} height={32} radius={6} />
            <View style={styles.skTableBody}>
              <SkeletonBox width="60%" height={12} />
              <SkeletonBox width="30%" height={10} />
            </View>
            <SkeletonBox width={50} height={12} />
          </View>
        ))}
      </View>
    </View>
  )
}

export function EmptyInsufficient({
  onAddProduct,
  t,
}: {
  onAddProduct: () => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  return (
    <View
      style={styles.emptyContainer}
      accessibilityRole="text"
      accessibilityLabel={t('seller.analytics.states.emptyAria')}
    >
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyIconCircle}>
          <Store size={28} color={colors.primary} />
        </View>
      </View>
      <View style={styles.emptyText}>
        <Text style={styles.emptyTitle}>{t('seller.analytics.states.emptyInsufficientTitle')}</Text>
        <Text style={styles.emptySubtitle}>
          {t('seller.analytics.states.emptyInsufficientSubtitle')}
        </Text>
        <Text style={styles.emptySubtitleNe}>
          {t('seller.analytics.states.emptyInsufficientSubtitleNe')}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onAddProduct}
        style={styles.emptyBtn}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('seller.analytics.states.emptyInsufficientAction')}
      >
        <Text style={styles.emptyBtnText}>
          {t('seller.analytics.states.emptyInsufficientAction')}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export function EmptyNoResults({
  onClear,
  hasFilters,
  t,
}: {
  onClear: () => void
  hasFilters: boolean
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  return (
    <View
      style={styles.emptyContainer}
      accessibilityRole="text"
      accessibilityLabel={t('seller.analytics.states.emptyAria')}
    >
      <View style={styles.emptyIconSmall}>
        <Info size={24} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>{t('seller.analytics.states.emptyNoResultsTitle')}</Text>
      <Text style={styles.emptySubtitle}>
        {t('seller.analytics.states.emptyNoResultsSubtitle')}
      </Text>
      {hasFilters && (
        <TouchableOpacity
          onPress={onClear}
          style={styles.clearBtn}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('seller.analytics.states.emptyNoResultsAction')}
        >
          <Text style={styles.clearBtnText}>
            {t('seller.analytics.states.emptyNoResultsAction')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export function ErrorState({
  onRetry,
  t,
}: {
  onRetry: () => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  return (
    <View
      style={styles.emptyContainer}
      accessibilityRole="alert"
      accessibilityLabel={t('seller.analytics.states.errorAria')}
    >
      <View style={styles.errorIcon}>
        <AlertCircle size={24} color={colors.error} />
      </View>
      <Text style={styles.emptyTitle}>{t('seller.analytics.states.errorLoadTitle')}</Text>
      <Text style={styles.emptySubtitle}>{t('seller.analytics.states.errorLoadSubtitle')}</Text>
      <TouchableOpacity
        onPress={onRetry}
        style={styles.retryBtn}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('seller.analytics.states.errorRetryAria')}
      >
        <RefreshCw size={14} color={colors.primary} />
        <Text style={styles.retryBtnText}>{t('seller.analytics.states.errorRetry')}</Text>
      </TouchableOpacity>
    </View>
  )
}

export function OfflineNotice({
  t,
  onRetry,
}: {
  t: (k: string, o?: Record<string, unknown>) => string
  onRetry?: () => void
}) {
  return (
    <View
      style={styles.offlineBanner}
      accessibilityRole="text"
      accessibilityLabel={t('seller.analytics.states.offlineTitle')}
    >
      <WifiOff size={16} color="#92400E" />
      <View style={styles.offlineBody}>
        <Text style={styles.offlineTitle}>{t('seller.analytics.states.offlineTitle')}</Text>
        <Text style={styles.offlineSubtitle}>{t('seller.analytics.states.offlineSubtitle')}</Text>
      </View>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('seller.analytics.states.offlineRetry')}
        >
          <Text style={styles.offlineRetry}>{t('seller.analytics.states.offlineRetry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export function PartialDataChip({ t }: { t: (k: string, o?: Record<string, unknown>) => string }) {
  return (
    <View
      style={styles.partialChip}
      accessibilityRole="text"
      accessibilityLabel={t('seller.analytics.states.partialDataAria')}
    >
      <Info size={12} color={colors.info} />
      <Text style={styles.partialText}>{t('seller.analytics.states.partialDataTitle')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  kpiCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3.5],
    gap: 6,
  } as ViewStyle,
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
  },
  chartSkeleton: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    gap: spacing[2],
    marginTop: spacing[3],
  },
  chartBarCol: { flex: 1, alignItems: 'center', gap: spacing[1.5] },
  skRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2.5],
  },
  skTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2.5],
  },
  skTableBody: { flex: 1, gap: 4 },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  emptyIllustration: {
    width: 120,
    height: 120,
    borderRadius: radii['2xl'],
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconSmall: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { alignItems: 'center', gap: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center' },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  emptySubtitleNe: { fontSize: 14, color: colors.textTertiary, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    marginTop: spacing[2],
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: colors.white },
  clearBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    marginTop: spacing[1],
  },
  clearBtnText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    marginTop: spacing[1],
  },
  retryBtnText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning + '4D',
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    marginBottom: spacing[3],
  },
  offlineBody: { flex: 1, gap: 2 },
  offlineTitle: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  offlineSubtitle: { fontSize: 12, color: '#92400ECC' },
  offlineRetry: { fontSize: 12, fontWeight: '600', color: '#92400E' },
  partialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.infoLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    marginBottom: spacing[3],
    alignSelf: 'flex-start',
  },
  partialText: { fontSize: 11, fontWeight: '600', color: colors.info },
})
