import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native'
import {
  Navigation,
  X,
  RefreshCw,
  TrendingUp,
  Zap,
  CheckCircle2,
  WifiOff,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize } from '@chinooz/theme'
import {
  type DemandZone,
  type RiderRecommendation,
} from '@chinooz/mock-data'

/**
 * RD3 — Recommendations strip.
 *
 * A ranked list of suggested zones for THIS rider, balancing distance +
 * demand + surge. Each suggestion carries a concrete move hint (distance +
 * expected benefit) + a Navigate handoff. Dismiss + refresh controls keep
 * the advice non-nagging.
 *
 * States:
 *  - offline: calm prompt to go online (recommendations need a location).
 *  - in-hotspot: reassurance ("You're in a hotspot — stay online"), announced
 *    as status so screen readers read it as a live update.
 *  - ranked: one card per suggestion, best-first, with Navigate + dismiss.
 *  - empty: calm "no suggestions" fallback.
 *
 * Accessibility:
 *  - Cards have aria-labels (zone + distance + benefit).
 *  - Navigate + dismiss + refresh have aria-labels.
 *  - Reassurance uses accessibilityRole="status" (announced live).
 *  - Ranking is readable in DOM order (best first).
 */

interface RecommendationsStripProps {
  /** Rider-specific ranked suggestions (best first). */
  recommendations: RiderRecommendation[]
  /** The zone the rider is currently in, if it's a hotspot (reassurance). */
  hotspotZone: DemandZone | null
  /** Whether the rider is online. Offline shows a calm prompt. */
  isOnline: boolean
  /** CTA to open maps directions to a zone (maps handoff). */
  onNavigate: (zone: DemandZone) => void
  /** CTA to refresh the recommendations. */
  onRefresh: () => void
  /** i18n strings. */
  labels: {
    title: string
    sub: string
    offline: string
    offlineSub: string
    empty: string
    emptySub: string
    moveHint: (km: number, name: string) => string
    benefit: (b: string) => string
    why: (reason: string) => string
    cardAria: (rank: number, move: string, benefit: string, reason: string) => string
    navigate: string
    navigateAria: (name: string) => string
    dismiss: string
    dismissAria: (name: string) => string
    refresh: string
    refreshAria: string
    dismissedAria: (name: string) => string
    reassureTitle: string
    reassureBody: (name: string) => string
    reassureAria: (name: string) => string
    reassureStayOnline: string
  }
}

export default function RecommendationsStrip({
  recommendations,
  hotspotZone,
  isOnline,
  onNavigate,
  onRefresh,
  labels,
}: RecommendationsStripProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)

  const visible = recommendations.filter(r => !dismissed.has(r.zone.id))

  const handleDismiss = useCallback((zoneId: string, name: string) => {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(zoneId)
      return next
    })
    try {
      AccessibilityInfo.announceForAccessibility(labels.dismissedAria(name))
    } catch {}
  }, [labels])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    onRefresh()
    // Clear dismissals on refresh so suggestions can reappear.
    setTimeout(() => {
      setDismissed(new Set())
      setRefreshing(false)
    }, 400)
  }, [onRefresh])

  // Offline: calm prompt (recommendations need a location + status).
  if (!isOnline) {
    return (
      <View style={styles.wrap} testID="rec-strip-offline">
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{labels.title}</Text>
            <Text style={styles.sub}>{labels.offline}</Text>
          </View>
        </View>
        <View style={styles.offlineCard}>
          <WifiOff size={22} color={colors.textTertiary} />
          <View style={styles.offlineBody}>
            <Text style={styles.offlineTitle}>{labels.offline}</Text>
            <Text style={styles.offlineSub}>{labels.offlineSub}</Text>
          </View>
        </View>
      </View>
    )
  }

  // In a hotspot: reassurance (status role = announced live).
  if (hotspotZone) {
    return (
      <View style={styles.wrap} testID="rec-strip-reassure">
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{labels.title}</Text>
            <Text style={styles.sub}>{labels.sub}</Text>
          </View>
        </View>
        <View
          style={styles.reassureCard}
          accessibilityRole="alert"
          accessibilityLabel={labels.reassureAria(hotspotZone.name)}
        >
          <View style={styles.reassureIcon}>
            <CheckCircle2 size={28} color={colors.success} />
          </View>
          <View style={styles.reassureBody}>
            <Text style={styles.reassureTitle}>{labels.reassureTitle}</Text>
            <Text style={styles.reassureText}>
              {labels.reassureBody(hotspotZone.name)}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  // Ranked suggestions.
  return (
    <View style={styles.wrap} testID="rec-strip-ranked">
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{labels.title}</Text>
          <Text style={styles.sub}>{labels.sub}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={labels.refreshAria}
          onPress={handleRefresh}
          style={styles.refreshBtn}
          disabled={refreshing}
        >
          <RefreshCw
            size={18}
            color={refreshing ? colors.textTertiary : colors.primary}
          />
        </TouchableOpacity>
      </View>

      {visible.length === 0 ? (
        <View style={styles.emptyCard}>
          <TrendingUp size={22} color={colors.textTertiary} />
          <View style={styles.emptyBody}>
            <Text style={styles.emptyTitle}>{labels.empty}</Text>
            <Text style={styles.emptySub}>{labels.emptySub}</Text>
          </View>
        </View>
      ) : (
        visible.map((rec, idx) => (
          <RecCard
            key={rec.zone.id}
            rank={idx + 1}
            rec={rec}
            labels={labels}
            onNavigate={() => onNavigate(rec.zone)}
            onDismiss={() => handleDismiss(rec.zone.id, rec.zone.name)}
          />
        ))
      )}
    </View>
  )
}

function RecCard({
  rank,
  rec,
  labels,
  onNavigate,
  onDismiss,
}: {
  rank: number
  rec: RiderRecommendation
  labels: RecommendationsStripProps['labels']
  onNavigate: () => void
  onDismiss: () => void
}) {
  const move = labels.moveHint(rec.distanceKm, rec.zone.name)
  const benefit = labels.benefit(rec.benefit)
  const why = labels.why(rec.reason)
  const hasSurge = rec.surgeMultiplier > 1

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardRank}>
          <Text style={styles.cardRankText}>{rank}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardMove}>{move}</Text>
          <Text style={styles.cardBenefit}>{benefit}</Text>
          <Text style={styles.cardWhy} numberOfLines={2}>{why}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={labels.dismissAria(rec.zone.name)}
          onPress={onDismiss}
          style={styles.dismissBtn}
        >
          <X size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={labels.navigateAria(rec.zone.name)}
          onPress={onNavigate}
          style={styles.navigateBtn}
        >
          <Navigation size={16} color={colors.white} />
          <Text style={styles.navigateText}>{labels.navigate}</Text>
        </TouchableOpacity>
        {hasSurge ? (
          <View style={styles.surgeChip}>
            <Zap size={13} color={colors.gold} fill={colors.gold} />
            <Text style={styles.surgeChipText}>{rec.surgeMultiplier}x</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[2.5],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  sub: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Offline
  offlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  offlineBody: { flex: 1, gap: 2 },
  offlineTitle: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.textSecondary,
  },
  offlineSub: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
  },
  // Reassurance
  reassureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.successLight,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderWidth: 1,
    borderColor: colors.success,
  },
  reassureIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reassureBody: { flex: 1, gap: 2 },
  reassureTitle: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.success,
  },
  reassureText: {
    fontSize: fontSize.base[0],
    color: colors.text,
    fontFamily: fontFamily.sans[0],
  },
  // Empty
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyBody: { flex: 1, gap: 2 },
  emptyTitle: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptySub: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
  },
  // Ranked cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing[2.5],
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
  },
  cardRank: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRankText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.primary,
  },
  cardBody: { flex: 1, gap: 2 },
  cardMove: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  cardBenefit: {
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
  },
  cardWhy: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  dismissBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    minHeight: 48,
    flex: 1,
  },
  navigateText: {
    color: colors.white,
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
  },
  surgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  surgeChipText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.gold,
  },
})
