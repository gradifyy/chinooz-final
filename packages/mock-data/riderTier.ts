/**
 * RP4 — Rider tier, standing & improvement mock data.
 *
 * Surfaces:
 * - getRiderTierDetail():  current tier, progress to next, the metric
 *   thresholds to reach/keep each tier, tier perks recap, standing/health
 *   status (good / at-risk) with specific actionable improvement steps, and
 *   any warnings/strikes shown supportively with a recovery path. Also
 *   exposes a link to the Incentives tier-perks page (RI4).
 *
 * Tone: improvement tips are concrete + encouraging; at-risk is supportive
 * not scary; tier perks feel aspirational. Warnings always carry a recovery
 * path — never a dead end.
 *
 * The detail is reachable from the Performance "Tier & standing" entry point
 * (a pushed route, NOT a bottom tab).
 */

import type { RiderTier } from './riderProfile'

export type RiderStandingStatus = 'good' | 'at_risk'

export type RiderCriterionStatus = 'met' | 'close' | 'below'

export interface RiderTierCriterion {
  /** Stable id for keys + analytics. */
  id: 'rating' | 'acceptance' | 'completion' | 'on_time' | 'deliveries'
  /** i18n key for the metric label. */
  labelKey: string
  /** Pre-formatted threshold value, e.g. "4.7" or "90%". */
  threshold: string
  /** Raw threshold value (same scale as currentValue). */
  thresholdRaw: number
  /** Pre-formatted current value. */
  current: string
  /** Raw current value. */
  currentRaw: number
  /** i18n key for the unit suffix (may be empty). */
  unitKey: string
  /** Whether this criterion is met / close / below the threshold. */
  status: RiderCriterionStatus
  /** i18n key for the unit-aware aria, e.g. "{{current}} of {{threshold}}". */
  ariaKey: string
}

export interface RiderTierPerk {
  /** Stable id. */
  id: string
  /** i18n key for the perk label. */
  labelKey: string
  /** i18n key for the perk description. */
  descKey: string
  /** lucide icon name. */
  icon: string
}

export interface RiderTierInfo {
  tier: RiderTier
  /** i18n key for the tier label. */
  labelKey: string
  /** i18n key for the tier tagline (aspirational, short). */
  taglineKey: string
  /** Tier accent color key — maps to a theme color in the component. */
  accent: 'bronze' | 'silver' | 'gold' | 'platinum'
  /** Progress toward the next tier (0..1). 1 when at the top tier. */
  progressToNext: number
  /** i18n key for the progress caption, e.g. "{{count}} deliveries to Gold". */
  progressCaptionKey: string
  /** Next tier (null when at platinum / top tier). */
  nextTier: RiderTier | null
  /** i18n key for the next tier label. */
  nextTierLabelKey: string | null
}

export interface RiderImprovementStep {
  /** Stable id. */
  id: string
  /** i18n key for the step heading (concrete, actionable). */
  headingKey: string
  /** i18n key for the step body (encouraging detail). */
  bodyKey: string
  /** lucide icon name. */
  icon: string
}

export interface RiderWarning {
  /** Stable id. */
  id: string
  /** i18n key for the warning title. */
  titleKey: string
  /** i18n key for the warning body (supportive, with a recovery path). */
  bodyKey: string
  /** i18n key for the recovery action label. */
  actionLabelKey: string
  /** Route to push for the recovery action. */
  actionRoute: string
  /** i18n key for the aria-label of the recovery action. */
  actionAriaKey: string
  /** Severity — affects icon + tint. */
  severity: 'soft' | 'elevated'
}

export interface RiderTierDetail {
  /** Current tier info + progress to next. */
  current: RiderTierInfo
  /** Criteria (metric thresholds) to reach/keep the current tier. */
  criteria: RiderTierCriterion[]
  /** Criteria to reach the next tier (if not at top). */
  nextCriteria: RiderTierCriterion[] | null
  /** Perks recap for the current tier. */
  perks: RiderTierPerk[]
  /** Standing / health status. */
  standing: {
    status: RiderStandingStatus
    /** i18n key for the standing label, e.g. "Good standing" / "Needs attention". */
    labelKey: string
    /** i18n key for the standing message (supportive, not scary). */
    messageKey: string
  }
  /** Specific, actionable improvement steps (ordered list). */
  improvementSteps: RiderImprovementStep[]
  /** Warnings / strikes (if applicable), shown supportively. */
  warnings: RiderWarning[]
  /** ISO date the tier was evaluated (yyyy-mm-dd). */
  asOf: string
  /** Link to the Incentives tier-perks page (RI4). */
  incentivesHref: string
  /** i18n key for the Incentives link label. */
  incentivesLabelKey: string
  /** i18n key for the Incentives link aria-label. */
  incentivesAriaKey: string
}

export const RIDER_TIER_ORDER: RiderTier[] = ['bronze', 'silver', 'gold', 'platinum']

export const RIDER_TIER_ACCENTS: Record<
  RiderTierInfo['accent'],
  { primary: string; light: string; dark: string }
> = {
  bronze: { primary: '#B87333', light: '#FDF0E6', dark: '#8B5A2B' },
  silver: { primary: '#9CA3AF', light: '#F3F4F6', dark: '#6B7280' },
  gold: { primary: '#E0A93B', light: '#FEF6E7', dark: '#B8860B' },
  platinum: { primary: '#6B7BA8', light: '#EEF0F6', dark: '#4A5578' },
}

export async function getRiderTierDetail(): Promise<RiderTierDetail> {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 240))

  return {
    current: {
      tier: 'gold',
      labelKey: 'rider.profile.tierGold',
      taglineKey: 'rider.tier.taglineGold',
      accent: 'gold',
      progressToNext: 0.68,
      progressCaptionKey: 'rider.tier.progressCaption',
      nextTier: 'platinum',
      nextTierLabelKey: 'rider.profile.tierPlatinum',
    },
    criteria: [
      {
        id: 'rating',
        labelKey: 'rider.performance.metricRating',
        threshold: '4.7',
        thresholdRaw: 4.7,
        current: '4.8',
        currentRaw: 4.8,
        unitKey: 'rider.performance.unitOutOfFive',
        status: 'met',
        ariaKey: 'rider.tier.criterionAria',
      },
      {
        id: 'acceptance',
        labelKey: 'rider.performance.metricAcceptance',
        threshold: '90%',
        thresholdRaw: 90,
        current: '96%',
        currentRaw: 96,
        unitKey: 'rider.performance.unitEmpty',
        status: 'met',
        ariaKey: 'rider.tier.criterionAria',
      },
      {
        id: 'completion',
        labelKey: 'rider.performance.metricCompletion',
        threshold: '95%',
        thresholdRaw: 95,
        current: '94%',
        currentRaw: 94,
        unitKey: 'rider.performance.unitEmpty',
        status: 'close',
        ariaKey: 'rider.tier.criterionAria',
      },
      {
        id: 'on_time',
        labelKey: 'rider.performance.metricOnTime',
        threshold: '90%',
        thresholdRaw: 90,
        current: '91%',
        currentRaw: 91,
        unitKey: 'rider.performance.unitEmpty',
        status: 'met',
        ariaKey: 'rider.tier.criterionAria',
      },
      {
        id: 'deliveries',
        labelKey: 'rider.performance.metricTotalDeliveries',
        threshold: '1,500',
        thresholdRaw: 1500,
        current: '1,284',
        currentRaw: 1284,
        unitKey: 'rider.performance.unitDeliveries',
        status: 'close',
        ariaKey: 'rider.tier.criterionAria',
      },
    ],
    nextCriteria: [
      {
        id: 'rating',
        labelKey: 'rider.performance.metricRating',
        threshold: '4.8',
        thresholdRaw: 4.8,
        current: '4.8',
        currentRaw: 4.8,
        unitKey: 'rider.performance.unitOutOfFive',
        status: 'met',
        ariaKey: 'rider.tier.criterionAria',
      },
      {
        id: 'acceptance',
        labelKey: 'rider.performance.metricAcceptance',
        threshold: '95%',
        thresholdRaw: 95,
        current: '96%',
        currentRaw: 96,
        unitKey: 'rider.performance.unitEmpty',
        status: 'met',
        ariaKey: 'rider.tier.criterionAria',
      },
      {
        id: 'completion',
        labelKey: 'rider.performance.metricCompletion',
        threshold: '97%',
        thresholdRaw: 97,
        current: '94%',
        currentRaw: 94,
        unitKey: 'rider.performance.unitEmpty',
        status: 'below',
        ariaKey: 'rider.tier.criterionAria',
      },
      {
        id: 'on_time',
        labelKey: 'rider.performance.metricOnTime',
        threshold: '93%',
        thresholdRaw: 93,
        current: '91%',
        currentRaw: 91,
        unitKey: 'rider.performance.unitEmpty',
        status: 'below',
        ariaKey: 'rider.tier.criterionAria',
      },
      {
        id: 'deliveries',
        labelKey: 'rider.performance.metricTotalDeliveries',
        threshold: '3,000',
        thresholdRaw: 3000,
        current: '1,284',
        currentRaw: 1284,
        unitKey: 'rider.performance.unitDeliveries',
        status: 'below',
        ariaKey: 'rider.tier.criterionAria',
      },
    ],
    perks: [
      {
        id: 'priority-jobs',
        labelKey: 'rider.tier.perkPriorityJobs',
        descKey: 'rider.tier.perkPriorityJobsDesc',
        icon: 'zap',
      },
      {
        id: 'surge-bonus',
        labelKey: 'rider.tier.perkSurgeBonus',
        descKey: 'rider.tier.perkSurgeBonusDesc',
        icon: 'trending-up',
      },
      {
        id: 'support-fast',
        labelKey: 'rider.tier.perkSupportFast',
        descKey: 'rider.tier.perkSupportFastDesc',
        icon: 'headphones',
      },
      {
        id: 'earnings-boost',
        labelKey: 'rider.tier.perkEarningsBoost',
        descKey: 'rider.tier.perkEarningsBoostDesc',
        icon: 'banknote',
      },
    ],
    standing: {
      status: 'good',
      labelKey: 'rider.tier.standingGood',
      messageKey: 'rider.tier.standingGoodMsg',
    },
    improvementSteps: [
      {
        id: 'raise-completion',
        headingKey: 'rider.tier.stepCompletionHeading',
        bodyKey: 'rider.tier.stepCompletionBody',
        icon: 'check-circle',
      },
      {
        id: 'keep-on-time',
        headingKey: 'rider.tier.stepOnTimeHeading',
        bodyKey: 'rider.tier.stepOnTimeBody',
        icon: 'clock',
      },
      {
        id: 'grow-volume',
        headingKey: 'rider.tier.stepVolumeHeading',
        bodyKey: 'rider.tier.stepVolumeBody',
        icon: 'trending-up',
      },
    ],
    warnings: [],
    asOf: new Date().toISOString().slice(0, 10),
    incentivesHref: '/incentives',
    incentivesLabelKey: 'rider.tier.linkIncentives',
    incentivesAriaKey: 'rider.tier.linkIncentivesAria',
  }
}
