import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import Skeleton from '@chinooz/ui/Skeleton'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'

export function HeroSkeleton() {
  return (
    <View style={styles.heroCard} accessibilityRole="summary" accessibilityLabel="Loading balance">
      <Skeleton width={120} height={12} borderRadius={6} />
      <View style={{ marginTop: spacing[2] }}><Skeleton width={180} height={32} borderRadius={8} /></View>
      <View style={{ marginTop: spacing[4], paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: colors.borderLight }}>
        <Skeleton width={100} height={12} borderRadius={6} />
        <View style={{ marginTop: spacing[2] }}><Skeleton width={140} height={16} borderRadius={6} /></View>
        <View style={{ marginTop: spacing[2] }}><Skeleton width={180} height={10} borderRadius={4} /></View>
      </View>
      <View style={{ marginTop: spacing[5] }}><Skeleton width="100%" height={44} borderRadius={8} /></View>
    </View>
  )
}

export function CardsSkeleton() {
  return (
    <View style={styles.cardsGrid} accessibilityRole="summary" accessibilityLabel="Loading summary">
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={styles.summaryCard}>
          <Skeleton width={80} height={12} borderRadius={6} />
          <View style={{ marginTop: spacing[2] }}><Skeleton width={100} height={22} borderRadius={6} /></View>
        </View>
      ))}
    </View>
  )
}

export function FinanceEmptyState({ title, subtitle, ctaLabel, ctaAriaLabel, onCta, icon = '📭' }: { title: string; subtitle: string; ctaLabel?: string; ctaAriaLabel?: string; onCta?: () => void; icon?: string }) {
  return (
    <View style={styles.emptyWrap} accessibilityRole="summary" accessibilityLiveRegion="polite">
      <Text style={styles.emptyIcon} aria-hidden="true">{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{subtitle}</Text>
      {ctaLabel && onCta && (
        <TouchableOpacity onPress={onCta} style={styles.emptyCta} accessibilityRole="button" accessibilityLabel={ctaAriaLabel ?? ctaLabel}>
          <Text style={styles.emptyCtaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export function FinanceErrorState({ onRetry, retryLabel, retryAriaLabel, message }: { onRetry: () => void; retryLabel: string; retryAriaLabel?: string; message?: string }) {
  return (
    <View style={styles.emptyWrap} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Text style={styles.emptyIcon} aria-hidden="true">⚠️</Text>
      <Text style={styles.emptyTitle}>{message ?? 'Something went wrong'}</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryBtn} accessibilityRole="button" accessibilityLabel={retryAriaLabel ?? retryLabel}>
        <Text style={styles.retryText}>{retryLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

export function KycRequiredBanner({ title, subtitle, ctaLabel, ctaAriaLabel, onCta }: { title: string; subtitle: string; ctaLabel: string; ctaAriaLabel: string; onCta: () => void }) {
  return (
    <View style={styles.kycBanner} accessibilityRole="status" accessibilityLiveRegion="polite">
      <View style={{ flex: 1 }}>
        <Text style={styles.kycTitle}>{title}</Text>
        <Text style={styles.kycSub}>{subtitle}</Text>
      </View>
      <TouchableOpacity onPress={onCta} style={styles.kycCta} accessibilityRole="button" accessibilityLabel={ctaAriaLabel}>
        <Text style={styles.kycCtaText}>{ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

export function OfflineBanner({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.offlineBanner} accessibilityRole="status" accessibilityLiveRegion="polite">
      <Text style={styles.offlineIcon} aria-hidden="true">📡</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.offlineTitle}>{title}</Text>
        <Text style={styles.offlineSub}>{subtitle}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[5], elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  summaryCard: { flexGrow: 1, flexBasis: '47%', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[4] },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing[10], paddingHorizontal: spacing[4], gap: spacing[2] },
  emptyIcon: { fontSize: 36, opacity: 0.5 },
  emptyTitle: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text, textAlign: 'center' },
  emptySub: { fontSize: fontSize.sm[0], color: colors.textMuted, textAlign: 'center', maxWidth: 280 },
  emptyCta: { marginTop: spacing[2], backgroundColor: colors.primary, borderRadius: radii.lg, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  emptyCtaText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.white },
  retryBtn: { marginTop: spacing[2], borderWidth: 1, borderColor: colors.primary, borderRadius: radii.lg, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  retryText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.primary },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.warningLight, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.warning + '33', paddingHorizontal: spacing[4], paddingVertical: spacing[3], marginBottom: spacing[4] },
  offlineIcon: { fontSize: 18 },
  offlineTitle: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.warning },
  offlineSub: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: 2 },
  kycBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.infoLight, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.info + '33', paddingHorizontal: spacing[4], paddingVertical: spacing[3], marginBottom: spacing[4] },
  kycTitle: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.info },
  kycSub: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: 2 },
  kycCta: { borderWidth: 1, borderColor: colors.info, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  kycCtaText: { fontSize: fontSize.xs[0], fontWeight: '600', color: colors.info },
})
