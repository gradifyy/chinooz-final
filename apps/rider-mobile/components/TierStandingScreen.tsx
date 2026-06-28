import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated'
import {
  ChevronLeft,
  ChevronRight,
  Award,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
  Headphones,
  Banknote,
  Clock,
  ArrowRight,
  Info,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow, duration, easing } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import { useA11y } from './A11yProvider'
import { TierUpCelebration } from './TierUpCelebration'
import {
  getRiderTierDetail,
  RIDER_TIER_ACCENTS,
  type RiderTierDetail,
  type RiderTierCriterion,
  type RiderTierPerk,
  type RiderCriterionStatus,
  type RiderStandingStatus,
  type RiderImprovementStep,
  type RiderWarning,
} from '@chinooz/mock-data'

/**
 * RP4 — Tier, standing & improvement.
 *
 * Reachable from the Performance "Tier & standing" entry point (a pushed
 * route, NOT a bottom tab). Shows the current tier with a progress bar to the
 * next tier, the metric thresholds to reach/keep it, a tier perks recap,
 * standing/health status (good / at-risk) with specific actionable steps to
 * improve, any warnings/strikes shown supportively with a recovery path, and
 * a link to the Incentives tier-perks page (RI4).
 *
 * Tone: improvement tips are concrete + encouraging; at-risk is supportive
 * not scary; tier perks feel aspirational. Status is never color-only — each
 * status pairs an icon + word with the tint.
 */

const CRITERION_VISUAL: Record<
  RiderCriterionStatus,
  { tint: string; ring: string; text: string; Icon: React.ComponentType<{ size?: number; color?: string }> }
> = {
  met: { tint: colors.successLight, ring: colors.success, text: colors.success, Icon: CheckCircle2 },
  close: { tint: colors.warningLight, ring: colors.warning, text: '#92400E', Icon: Clock },
  below: { tint: colors.errorLight, ring: colors.error, text: colors.error, Icon: AlertTriangle },
}

const STANDING_VISUAL: Record<
  RiderStandingStatus,
  { tint: string; ring: string; text: string; Icon: React.ComponentType<{ size?: number; color?: string }> }
> = {
  good: { tint: colors.successLight, ring: colors.success, text: colors.success, Icon: CheckCircle2 },
  at_risk: { tint: colors.warningLight, ring: colors.warning, text: '#92400E', Icon: AlertTriangle },
}

const PERK_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  zap: Zap,
  'trending-up': TrendingUp,
  headphones: Headphones,
  banknote: Banknote,
}

const STEP_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  'check-circle': CheckCircle2,
  clock: Clock,
  'trending-up': TrendingUp,
}

function criterionWordKey(status: RiderCriterionStatus): string {
  if (status === 'met') return 'rider.tier.criterionMet'
  if (status === 'close') return 'rider.tier.criterionClose'
  return 'rider.tier.criterionBelow'
}

function standingWordKey(status: RiderStandingStatus): string {
  return status === 'good' ? 'rider.tier.standingGood' : 'rider.tier.standingAtRisk'
}

export default function TierStandingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const { minTouchTarget } = useA11y()

  const [data, setData] = useState<RiderTierDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  // Progress bar animation (Reanimated — 60fps on UI thread).
  const progressAnim = useSharedValue(0)

  useEffect(() => {
    analytics.screen({ name: 'rider-tier' })
  }, [])

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(false)
    try {
      const result = await getRiderTierDetail()
      setData(result)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Animate the progress bar when data loads.
  useEffect(() => {
    if (!data || loading) return
    const target = data.current.progressToNext
    progressAnim.value = 0
    if (reduced) {
      progressAnim.value = target
      return
    }
    progressAnim.value = withDelay(
      duration.normal,
      withTiming(target, {
        duration: duration.slower,
        easing: Easing.bezier(...easing.easeOut),
        reduceMotion: ReduceMotion.Never,
      }),
    )
  }, [data, loading, reduced, progressAnim])

  const onRefresh = useCallback(() => load(true), [load])

  const goBack = useCallback(() => {
    try {
      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    if (router.canGoBack()) router.back()
    else router.replace('/profile/performance')
  }, [router, reduced])

  const goToIncentives = useCallback(() => {
    try {
      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    router.push('/incentives' as never)
  }, [router, reduced])

  const tierLabel = data ? t(data.current.labelKey) : ''
  const nextTierLabel = data?.current.nextTierLabelKey ? t(data.current.nextTierLabelKey) : ''
  const accent = data ? RIDER_TIER_ACCENTS[data.current.accent] : RIDER_TIER_ACCENTS.gold

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.tier.back')}
            onPress={goBack}
            style={[styles.backBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
            hitSlop={8}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              {t('rider.tier.title')}
            </Text>
            <Text style={styles.headerSub}>{t('rider.tier.subtitle')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading ? (
          <TierSkeleton ariaLabel={t('rider.tier.skeletonAria')} />
        ) : error ? (
          <ErrorState
            title={t('rider.tier.errorTitle')}
            subtitle={t('rider.tier.errorSubtitle')}
            retry={t('rider.tier.retry')}
            onRetry={onRefresh}
          />
        ) : data ? (
          <View style={styles.body} nativeID="rider-tier-detail">
            <Text style={styles.asOfCaption}>
              {t('rider.tier.asOf', { date: data.asOf })}
            </Text>

            {/* Current tier + progress to next */}
            <TierHero
              tierLabel={tierLabel}
              tagline={t(data.current.taglineKey)}
              progressToNext={data.current.progressToNext}
              nextTierLabel={nextTierLabel}
              isTopTier={data.current.nextTier === null}
              progressCaption={t(data.current.progressCaptionKey, { count: 1500 - 1284, tier: nextTierLabel })}
              accent={accent}
              progressAnim={progressAnim}
              reduced={reduced}
              t={t}
              tierAria={t('rider.tier.tierCardAria', {
                tier: tierLabel,
                tagline: t(data.current.taglineKey),
                progress: data.current.nextTier === null
                  ? t('rider.tier.progressComplete')
                  : t('rider.tier.progressAria', { tier: nextTierLabel, pct: Math.round(data.current.progressToNext * 100), caption: t(data.current.progressCaptionKey, { count: 1500 - 1284, tier: nextTierLabel }) }),
              })}
            />

            {/* Criteria to keep current tier */}
            <SectionHeading text={t('rider.tier.sectionCriteria', { tier: tierLabel })} />
            <CriteriaTable
              criteria={data.criteria}
              t={t}
            />

            {/* Criteria to reach next tier (if not at top) */}
            {data.nextCriteria && data.current.nextTier && (
              <>
                <SectionHeading text={t('rider.tier.sectionNextCriteria', { tier: nextTierLabel })} />
                <CriteriaTable
                  criteria={data.nextCriteria}
                  t={t}
                />
              </>
            )}

            {/* Tier perks recap */}
            <SectionHeading text={t('rider.tier.sectionPerks', { tier: tierLabel })} />
            <PerksGrid perks={data.perks} t={t} reduced={reduced} />

            {/* Standing / health status */}
            <SectionHeading text={t('rider.tier.sectionStanding')} />
            <StandingCard
              status={data.standing.status}
              label={t(data.standing.labelKey)}
              message={t(data.standing.messageKey)}
              t={t}
            />

            {/* Improvement steps — ordered list */}
            <SectionHeading text={t('rider.tier.sectionSteps')} />
            <ImprovementSteps steps={data.improvementSteps} t={t} />

            {/* Warnings / strikes (if any) */}
            {data.warnings.length > 0 && (
              <>
                <SectionHeading text={t('rider.tier.sectionWarnings')} />
                <WarningsList
                  warnings={data.warnings}
                  t={t}
                  onPress={(route) => {
                    try {
                      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    } catch {}
                    if (route.startsWith('/profile/metrics')) {
                      const metric = route.split('metric=')[1]
                      router.push({ pathname: '/profile/metrics', params: { metric } } as never)
                    } else {
                      router.push(route as never)
                    }
                  }}
                />
              </>
            )}

            {/* Link to Incentives tier perks (RI4) */}
            <TouchableOpacity
              accessibilityRole="link"
              accessibilityLabel={t(data.incentivesAriaKey)}
              onPress={goToIncentives}
              style={styles.incentivesLink}
              activeOpacity={0.7}
            >
              <View style={[styles.incentivesLinkIcon, { backgroundColor: accent.light }]}>
                <Award size={18} color={accent.dark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.incentivesLinkText}>{t(data.incentivesLabelKey)}</Text>
                <Text style={styles.incentivesLinkSub}>{t('rider.tier.sectionPerks', { tier: tierLabel })}</Text>
              </View>
              <ArrowRight size={18} color={accent.primary} />
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}

/** Tier hero — current tier badge + progress bar to next tier. */
function TierHero({
  tierLabel,
  tagline,
  progressToNext,
  nextTierLabel,
  isTopTier,
  progressCaption,
  accent,
  progressAnim,
  reduced,
  t,
  tierAria,
}: {
  tierLabel: string
  tagline: string
  progressToNext: number
  nextTierLabel: string
  isTopTier: boolean
  progressCaption: string
  accent: { primary: string; light: string; dark: string }
  progressAnim: ReturnType<typeof useSharedValue<number>>
  reduced: boolean
  t: (key: string, opts?: Record<string, unknown>) => string
  tierAria: string
}) {
  const pctVal = Math.round(progressToNext * 100)

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * pctVal}%`,
  }))

  return (
    <View
      style={[styles.tierHero, { backgroundColor: accent.light, borderColor: accent.primary }]}
      accessibilityRole="header"
      accessibilityLabel={tierAria}
    >
      <View style={styles.tierHeroTop}>
        <View style={[styles.tierMedal, { backgroundColor: accent.primary }]}>
          <Award size={28} color={colors.white} />
        </View>
        <View style={styles.tierHeroBody}>
          <Text style={[styles.tierHeroLabel, { color: accent.dark }]}>{tierLabel}</Text>
          <Text style={styles.tierHeroTagline}>{tagline}</Text>
        </View>
      </View>

      {/* Progress bar to next tier */}
      {!isTopTier ? (
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabelText}>
              {t('rider.tier.progressLabel', { tier: nextTierLabel })}
            </Text>
            <Text style={[styles.progressPct, { color: accent.dark }]}>{pctVal}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                fillStyle,
                {
                  backgroundColor: accent.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.progressCaption}>{progressCaption}</Text>
        </View>
      ) : (
        <View style={styles.progressSection}>
          <View style={styles.topTierRow}>
            <CheckCircle2 size={16} color={accent.dark} />
            <Text style={[styles.topTierText, { color: accent.dark }]}>
              {t('rider.tier.progressComplete')}
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}

/** Section heading — consistent across the screen. */
function SectionHeading({ text }: { text: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{text}</Text>
    </View>
  )
}

/** Criteria table — metric / your value / required, with status pill. */
function CriteriaTable({
  criteria,
  t,
}: {
  criteria: RiderTierCriterion[]
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  return (
    <View style={styles.criteriaCard}>
      {/* Header row */}
      <View style={styles.criteriaHeaderRow}>
        <Text style={styles.criteriaHeaderLabel}>{t('rider.tier.criterionHeader')}</Text>
        <Text style={styles.criteriaHeaderValue}>{t('rider.tier.criterionHeaderCurrent')}</Text>
        <Text style={styles.criteriaHeaderThreshold}>{t('rider.tier.criterionHeaderThreshold')}</Text>
      </View>
      {criteria.map((c, idx) => {
        const visual = CRITERION_VISUAL[c.status]
        const Icon = visual.Icon
        const unit = t(c.unitKey).trim()
        const aria = t(c.ariaKey, {
          metric: t(c.labelKey),
          current: c.current,
          threshold: c.threshold,
          unit,
          status: t(criterionWordKey(c.status)),
        })
        return (
          <View
            key={c.id}
            style={[
              styles.criteriaRow,
              idx > 0 && styles.criteriaRowBorder,
            ]}
            accessibilityRole="text"
            accessibilityLabel={aria}
          >
            <Text style={styles.criteriaMetric} numberOfLines={1}>
              {t(c.labelKey)}
            </Text>
            <Text style={styles.criteriaCurrent}>{c.current}</Text>
            <View style={styles.criteriaThresholdCol}>
              <Text style={styles.criteriaThreshold}>{c.threshold}</Text>
              <View style={[styles.criteriaPill, { backgroundColor: visual.tint }]}>
                <Icon size={10} color={visual.text} />
                <Text style={[styles.criteriaPillText, { color: visual.text }]} numberOfLines={1}>
                  {t(criterionWordKey(c.status))}
                </Text>
              </View>
            </View>
          </View>
        )
      })}
    </View>
  )
}

/** Perks grid — 2-column aspirational perk cards, staggered entrance. */
function PerksGrid({
  perks,
  t,
  reduced,
}: {
  perks: RiderTierPerk[]
  t: (key: string, opts?: Record<string, unknown>) => string
  reduced: boolean
}) {
  return (
    <View style={styles.perksGrid}>
      {perks.map((perk, idx) => (
        <PerkCard key={perk.id} perk={perk} idx={idx} t={t} reduced={reduced} />
      ))}
    </View>
  )
}

/** Single perk card with staggered fade+slide entrance. Memoized for grid performance. */
const PerkCard = React.memo(function PerkCard({
  perk,
  idx,
  t,
  reduced,
}: {
  perk: RiderTierPerk
  idx: number
  t: (key: string, opts?: Record<string, unknown>) => string
  reduced: boolean
}) {
  const Icon = PERK_ICONS[perk.icon] ?? Award
  const aria = t('rider.tier.perkAria', {
    label: t(perk.labelKey),
    desc: t(perk.descKey),
  })

  const opacity = useSharedValue(reduced ? 1 : 0)
  const translateY = useSharedValue(reduced ? 0 : 14)
  useEffect(() => {
    if (reduced) return
    const delay = idx * 80
    opacity.value = withDelay(delay, withTiming(1, { duration: duration.normal, reduceMotion: ReduceMotion.Never }))
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 20, stiffness: 300, mass: 0.8, reduceMotion: ReduceMotion.Never }),
    )
  }, [idx, reduced])
  const entranceStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.View style={[styles.perkCard, entranceStyle]} accessibilityRole="text" accessibilityLabel={aria}>
      <View style={styles.perkIconWrap}>
        <Icon size={20} color={colors.gold} />
      </View>
      <Text style={styles.perkLabel} numberOfLines={2}>
        {t(perk.labelKey)}
      </Text>
      <Text style={styles.perkDesc} numberOfLines={2}>
        {t(perk.descKey)}
      </Text>
    </Animated.View>
  )
})

/** Standing card — good / at-risk, supportive tone, icon + word (not color-only). */
function StandingCard({
  status,
  label,
  message,
  t,
}: {
  status: RiderStandingStatus
  label: string
  message: string
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const visual = STANDING_VISUAL[status]
  const Icon = visual.Icon
  const aria = t('rider.tier.standingAria', { status: label, message })

  return (
    <View
      style={[styles.standingCard, { backgroundColor: visual.tint, borderColor: visual.ring }]}
      accessibilityRole="summary"
      accessibilityLabel={aria}
    >
      <View style={styles.standingIconRow}>
        <View style={[styles.standingIconWrap, { backgroundColor: colors.white }]}>
          <Icon size={18} color={visual.text} />
        </View>
        <Text style={[styles.standingLabel, { color: visual.text }]}>{label}</Text>
      </View>
      <Text style={styles.standingMessage}>{message}</Text>
    </View>
  )
}

/** Improvement steps — ordered list, concrete + encouraging. */
function ImprovementSteps({
  steps,
  t,
}: {
  steps: RiderImprovementStep[]
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  return (
    <View style={styles.stepsCard} accessibilityRole="list">
      {steps.map((step, idx) => {
        const Icon = STEP_ICONS[step.icon] ?? CheckCircle2
        const aria = t('rider.tier.stepAria', {
          n: idx + 1,
          heading: t(step.headingKey),
          body: t(step.bodyKey),
        })
        return (
          <View
            key={step.id}
            style={[styles.stepRow, idx > 0 && styles.stepRowBorder]}
            accessibilityRole="summary"
            accessibilityLabel={aria}
          >
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{idx + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: spacing[1] }}>
              <View style={styles.stepHeadingRow}>
                <Icon size={15} color={colors.primary} />
                <Text style={styles.stepHeading}>{t(step.headingKey)}</Text>
              </View>
              <Text style={styles.stepBody}>{t(step.bodyKey)}</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

/** Warnings list — supportive, with recovery path. */
function WarningsList({
  warnings,
  t,
  onPress,
}: {
  warnings: RiderWarning[]
  t: (key: string, opts?: Record<string, unknown>) => string
  onPress: (route: string) => void
}) {
  return (
    <View style={styles.warningsWrap}>
      {warnings.map(w => {
        const severity = w.severity
        const tint = severity === 'elevated' ? colors.errorLight : colors.warningLight
        const ring = severity === 'elevated' ? colors.error : colors.warning
        const text = severity === 'elevated' ? colors.error : '#92400E'
        const Icon = severity === 'elevated' ? AlertTriangle : Info
        const aria = t('rider.tier.warningAria', {
          title: t(w.titleKey),
          body: t(w.bodyKey),
          action: t(w.actionLabelKey),
        })
        return (
          <View
            key={w.id}
            style={[styles.warningCard, { backgroundColor: tint, borderColor: ring }]}
            accessibilityRole="alert"
            accessibilityLabel={aria}
          >
            <View style={styles.warningIconRow}>
              <Icon size={16} color={text} />
              <Text style={[styles.warningTitle, { color: text }]}>{t(w.titleKey)}</Text>
            </View>
            <Text style={styles.warningBody}>{t(w.bodyKey)}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t(w.actionAriaKey)}
              onPress={() => onPress(w.actionRoute)}
              style={[styles.warningAction, { borderColor: ring }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.warningActionText, { color: text }]}>
                {t(w.actionLabelKey)}
              </Text>
              <ChevronRight size={14} color={text} />
            </TouchableOpacity>
          </View>
        )
      })}
    </View>
  )
}

function TierSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      <View style={[styles.skeletonBlock, { height: 160 }]} />
      <View style={[styles.skeletonBlock, { height: 200 }]} />
      <View style={[styles.skeletonBlock, { height: 120 }]} />
      <View style={[styles.skeletonBlock, { height: 80 }]} />
      <View style={[styles.skeletonBlock, { height: 140 }]} />
    </View>
  )
}

function ErrorState({
  title,
  subtitle,
  retry,
  onRetry,
}: {
  title: string
  subtitle: string
  retry: string
  onRetry: () => void
}) {
  return (
    <View style={styles.errorWrap}>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorSubtitle}>{subtitle}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={retry}
        onPress={onRetry}
        style={styles.retryBtn}
      >
        <Text style={styles.retryText}>{retry}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { backgroundColor: colors.primary, paddingHorizontal: spacing[4] },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingBottom: spacing[3],
  },
  backBtn: { alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: fontSize.xl[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  headerSub: { fontSize: 13, color: colors.primary50, marginTop: 2, fontFamily: fontFamily.sans[0] },

  body: { padding: spacing[4], paddingTop: spacing[2], gap: spacing[3] },
  asOfCaption: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },

  // Tier hero.
  tierHero: {
    borderRadius: radii['2xl'],
    borderWidth: 1.5,
    padding: spacing[5],
    gap: spacing[4],
    ...shadow('md'),
  },
  tierHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  tierMedal: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierHeroBody: { flex: 1, gap: spacing[1] },
  tierHeroLabel: {
    fontSize: fontSize['2xl'][0],
    fontWeight: '700',
    fontFamily: fontFamily.sansBold[0],
  },
  tierHeroTagline: {
    fontSize: fontSize.base[0],
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
  },

  // Progress bar.
  progressSection: { gap: spacing[2] },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabelText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  progressPct: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  progressTrack: {
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  progressCaption: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  topTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  topTierText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    fontFamily: fontFamily.sansBold[0],
  },

  // Section heading.
  sectionHead: { marginTop: spacing[2] },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Criteria table.
  criteriaCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  criteriaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  criteriaHeaderLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  criteriaHeaderValue: {
    width: 70,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  criteriaHeaderThreshold: {
    width: 90,
    textAlign: 'right',
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[3],
    minHeight: 52,
  },
  criteriaRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  criteriaMetric: {
    flex: 1,
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  criteriaCurrent: {
    width: 70,
    textAlign: 'center',
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  criteriaThresholdCol: {
    width: 90,
    alignItems: 'flex-end',
    gap: spacing[1],
  },
  criteriaThreshold: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansSemiBold[0],
  },
  criteriaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  criteriaPillText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Perks grid.
  perksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2.5],
  },
  perkCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3.5],
    gap: spacing[1.5],
  },
  perkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(224, 169, 59, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkLabel: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  perkDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    fontFamily: fontFamily.sans[0],
  },

  // Standing card.
  standingCard: {
    borderRadius: radii.xl,
    borderWidth: 1.5,
    padding: spacing[4],
    gap: spacing[2.5],
  },
  standingIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  standingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  standingLabel: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    fontFamily: fontFamily.sansBold[0],
  },
  standingMessage: {
    fontSize: fontSize.base[0],
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: fontFamily.sans[0],
  },

  // Improvement steps.
  stepsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
  },
  stepRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansBold[0],
  },
  stepHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  stepHeading: {
    flex: 1,
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  stepBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    fontFamily: fontFamily.sans[0],
  },

  // Warnings.
  warningsWrap: { gap: spacing[3] },
  warningCard: {
    borderRadius: radii.lg,
    borderWidth: 1.5,
    padding: spacing[4],
    gap: spacing[2.5],
  },
  warningIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  warningTitle: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    fontFamily: fontFamily.sansBold[0],
  },
  warningBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    fontFamily: fontFamily.sans[0],
  },
  warningAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
  },
  warningActionText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Incentives link.
  incentivesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    minHeight: 56,
    marginTop: spacing[2],
    ...shadow('sm'),
  },
  incentivesLinkIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incentivesLinkText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  incentivesLinkSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: fontFamily.sans[0],
  },

  // Skeleton + error.
  skeletonWrap: { padding: spacing[4], gap: spacing[3] },
  skeletonBlock: {
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.shimmer,
  },
  errorWrap: { padding: spacing[6], alignItems: 'center', gap: spacing[2] },
  errorTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  errorSubtitle: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  retryBtn: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  retryText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
})
