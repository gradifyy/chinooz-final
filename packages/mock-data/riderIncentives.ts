/**
 * RI1 — Rider Incentives & Quests mock data.
 *
 * Shared mock for the Incentives hub (RI2), quest detail (RI3),
 * streaks/tiers (RI4) and surge map (RI5). Reads are async to mirror
 * the rest of the mock-data layer and give the hub a realistic loading
 * state (skeleton aria-busy).
 */

export type QuestKind = 'mission' | 'streak' | 'surge' | 'bonus'

export type QuestStatus = 'active' | 'available' | 'completed' | 'expired'

/** Full terms shown on the quest detail screen (RI3). */
export interface RiderQuestTerms {
  /** How to qualify, as a list of plain-language steps. */
  howToQualify: string[]
  /** Human-readable time window, e.g. "Today, 5:00 PM \u2013 8:00 PM". */
  timeWindow: string
  /** Fine print / conditions. */
  finePrint: string[]
  /** Whether the quest is opt-in (requires a "join" action). */
  optIn: boolean
  /** Whether the reward has already been claimed (for completed quests). */
  claimed: boolean
}

export interface RiderQuest {
  id: string
  kind: QuestKind
  title: string
  description: string
  /** Progress numerator (e.g. deliveries completed toward the goal). */
  progress: number
  /** Progress denominator (goal). */
  goal: number
  /** Reward in NPR. Gold is reserved for these reward moments. */
  rewardNpr: number
  status: QuestStatus
  /** ISO timestamp the quest expires, if any. */
  expiresAt?: string
  /** Human-readable time-left label, pre-formatted for the UI. */
  timeLeftLabel?: string
  /** Detail route (RI3) href for the quest. */
  detailHref: string
  /** Full terms for the detail screen. */
  terms: RiderQuestTerms
}

export interface RiderStreak {
  /** Current day streak (consecutive days with >=1 completed delivery). */
  current: number
  /** Longest streak achieved by this rider. */
  best: number
  /** Tier label, e.g. "Bronze", "Silver", "Gold". */
  tier: string
  /** NPR bonus unlocked at the current tier. */
  tierBonusNpr: number
  /** Progress toward next tier (0..1). */
  nextTierProgress: number
  /** Streaks/tiers (RI4) href. */
  tiersHref: string
}

export interface RiderSurge {
  /** Whether a surge multiplier is currently live in the rider's zone. */
  active: boolean
  /** Multiplier, e.g. 1.5 for 1.5x. 1 when no surge. */
  multiplier: number
  /** Zone label shown in the surge pill + surge map (RI5). */
  zoneLabel: string
  /** Minutes until the current surge window ends (0 if inactive). */
  minutesLeft: number
  /** Surge map (RI5) href. */
  mapHref: string
}

export interface RiderIncentiveEarnings {
  /** NPR earned this week from incentives/quests/streaks only. */
  thisWeekNpr: number
  /** Breakdown rows for the tabular "earned this week" total. */
  breakdown: { label: string; amountNpr: number }[]
  currency: 'NPR'
}

export interface RiderIncentives {
  streak: RiderStreak
  surge: RiderSurge
  /** Today's mission progress (a single active mission quest). */
  todayMission: { progress: number; goal: number; title: string }
  activeQuests: RiderQuest[]
  availableQuests: RiderQuest[]
  completedQuests: RiderQuest[]
  earnings: RiderIncentiveEarnings
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function getIncentives(): Promise<RiderIncentives> {
  await delay(220 + Math.random() * 300)
  return INCENTIVES
}

/**
 * Synchronous access to the surge slice (RI5). Shared by the demand heatmap
 * (RD1) so the surge overlay and the Incentives hub report the same value
 * without the heatmap needing to await the async getter.
 */
export function getIncentiveSurge(): RiderSurge {
  return INCENTIVES.surge
}

export const INCENTIVES: RiderIncentives = {
  streak: {
    current: 6,
    best: 14,
    tier: 'Silver',
    tierBonusNpr: 250,
    nextTierProgress: 0.66,
    tiersHref: '/streaks',
  },
  surge: {
    active: true,
    multiplier: 1.5,
    zoneLabel: 'Thamel',
    minutesLeft: 38,
    mapHref: '/surge-map',
  },
  todayMission: {
    title: "Today's mission: 8 deliveries",
    progress: 5,
    goal: 8,
  },
  activeQuests: [
    {
      id: 'q-mission-today',
      kind: 'mission',
      title: "Today's mission: 8 deliveries",
      description: 'Complete 8 deliveries today to unlock a NPR 150 bonus.',
      progress: 5,
      goal: 8,
      rewardNpr: 150,
      status: 'active',
      timeLeftLabel: '7h 12m left',
      expiresAt: new Date(Date.now() + 7 * 3600 * 1000).toISOString(),
      detailHref: '/quests/q-mission-today',
      terms: {
        howToQualify: [
          'Complete 8 deliveries between 6:00 AM and 11:59 PM today.',
          'Cancelled or failed deliveries do not count.',
          'The bonus is credited automatically once you hit 8.',
        ],
        timeWindow: 'Today, 6:00 AM \u2013 11:59 PM',
        finePrint: [
          'Only deliveries accepted and completed by you count.',
          'If you go offline, progress is saved \u2014 just come back before midnight.',
          'Reward is added to your withdrawable earnings within 1 hour.',
        ],
        optIn: false,
        claimed: false,
      },
    },
    {
      id: 'q-streak-7day',
      kind: 'streak',
      title: '7-day streak bonus',
      description: 'Ride 7 days in a row for a NPR 500 streak bonus.',
      progress: 6,
      goal: 7,
      rewardNpr: 500,
      status: 'active',
      timeLeftLabel: '1 day left',
      expiresAt: new Date(Date.now() + 26 * 3600 * 1000).toISOString(),
      detailHref: '/quests/q-streak-7day',
      terms: {
        howToQualify: [
          'Complete at least 1 delivery on 7 consecutive days.',
          'A day counts if you complete any delivery between 6:00 AM and 11:59 PM.',
          'Missing a day resets your streak to 0.',
        ],
        timeWindow: '7 consecutive days, ending tomorrow',
        finePrint: [
          'Your current streak is 6 days \u2014 one more day to go.',
          'If you miss a day, your streak resets but your best streak is remembered.',
          'The NPR 500 bonus is credited the moment you complete day 7.',
        ],
        optIn: false,
        claimed: false,
      },
    },
  ],
  availableQuests: [
    {
      id: 'q-surge-evening',
      kind: 'surge',
      title: 'Evening surge: 5 peak rides',
      description: 'Complete 5 rides during surge hours for a NPR 220 bonus.',
      progress: 0,
      goal: 5,
      rewardNpr: 220,
      status: 'available',
      timeLeftLabel: 'Today, 5p-8p',
      detailHref: '/quests/q-surge-evening',
      terms: {
        howToQualify: [
          'Opt in to this quest before the surge window starts.',
          'Complete 5 deliveries during the 5:00 PM \u2013 8:00 PM surge window.',
          'Each ride must start and end within the surge window.',
        ],
        timeWindow: 'Today, 5:00 PM \u2013 8:00 PM',
        finePrint: [
          'Surge rides also earn the standard 1.5x per-ride multiplier.',
          'The bonus is separate from per-ride surge earnings.',
          'If the surge window is cut short, the goal is prorated.',
        ],
        optIn: true,
        claimed: false,
      },
    },
    {
      id: 'q-bonus-first10',
      kind: 'bonus',
      title: 'Weekend bonus: 10 rides',
      description: 'Complete 10 rides this weekend for a NPR 300 bonus.',
      progress: 0,
      goal: 10,
      rewardNpr: 300,
      status: 'available',
      timeLeftLabel: 'Sat-Sun',
      detailHref: '/quests/q-bonus-first10',
      terms: {
        howToQualify: [
          'Opt in to this quest before the weekend starts.',
          'Complete 10 deliveries across Saturday and Sunday combined.',
          'Any delivery type counts \u2014 standard, COD, or surge.',
        ],
        timeWindow: 'Saturday 6:00 AM \u2013 Sunday 11:59 PM',
        finePrint: [
          'Progress is shared across both days \u2014 4 Saturday + 6 Sunday counts.',
          'The bonus is credited Sunday night after your 10th delivery.',
          'Weekend bonus stacks with the daily mission and streak.',
        ],
        optIn: true,
        claimed: false,
      },
    },
  ],
  completedQuests: [
    {
      id: 'q-mission-yesterday',
      kind: 'mission',
      title: "Yesterday's mission: 6 deliveries",
      description: 'Complete 6 deliveries yesterday to unlock a NPR 120 bonus.',
      progress: 6,
      goal: 6,
      rewardNpr: 120,
      status: 'completed',
      timeLeftLabel: 'Completed yesterday',
      detailHref: '/quests/q-mission-yesterday',
      terms: {
        howToQualify: [
          'Completed 6 deliveries between 6:00 AM and 11:59 PM yesterday.',
        ],
        timeWindow: 'Yesterday, 6:00 AM \u2013 11:59 PM',
        finePrint: [
          'Reward was credited to your withdrawable earnings.',
        ],
        optIn: false,
        claimed: true,
      },
    },
    {
      id: 'q-streak-5day',
      kind: 'streak',
      title: '5-day streak bonus',
      description: 'Rode 5 days in a row for a NPR 200 streak bonus.',
      progress: 5,
      goal: 5,
      rewardNpr: 200,
      status: 'completed',
      timeLeftLabel: 'Completed 2 days ago',
      detailHref: '/quests/q-streak-5day',
      terms: {
        howToQualify: [
          'Completed at least 1 delivery on 5 consecutive days.',
        ],
        timeWindow: '5 consecutive days',
        finePrint: [
          'Reward was credited to your withdrawable earnings.',
        ],
        optIn: false,
        claimed: true,
      },
    },
  ],
  earnings: {
    thisWeekNpr: 1120,
    currency: 'NPR',
    breakdown: [
      { label: 'Daily missions', amountNpr: 450 },
      { label: 'Streak bonus', amountNpr: 250 },
      { label: 'Surge rides', amountNpr: 320 },
      { label: 'Weekend bonus', amountNpr: 100 },
    ],
  },
}

/**
 * All quests across every status, for the quests list screen.
 */
export function getAllQuests(): RiderQuest[] {
  return [
    ...INCENTIVES.activeQuests,
    ...INCENTIVES.availableQuests,
    ...INCENTIVES.completedQuests,
  ]
}

/**
 * RI3 \u2014 fetch a single quest by id for the detail screen.
 */
export async function getQuestById(id: string): Promise<RiderQuest | null> {
  await delay(160 + Math.random() * 200)
  return getAllQuests().find(q => q.id === id) ?? null
}

/**
 * RI3 \u2014 claim a completed quest's reward.
 */
export async function claimQuestReward(id: string): Promise<{ id: string; rewardNpr: number } | null> {
  await delay(300 + Math.random() * 250)
  const quest = getAllQuests().find(q => q.id === id)
  if (!quest || quest.status !== 'completed' || quest.terms.claimed) return null
  quest.terms = { ...quest.terms, claimed: true }
  return { id: quest.id, rewardNpr: quest.rewardNpr }
}

/**
 * RI3 \u2014 opt in to an available quest.
 */
export async function joinQuest(id: string): Promise<RiderQuest | null> {
  await delay(280 + Math.random() * 200)
  const idx = INCENTIVES.availableQuests.findIndex(q => q.id === id)
  if (idx < 0) return null
  const quest = INCENTIVES.availableQuests[idx]
  if (!quest.terms.optIn) return null
  const joined: RiderQuest = { ...quest, status: 'active', progress: 0, timeLeftLabel: quest.timeLeftLabel }
  INCENTIVES.availableQuests.splice(idx, 1)
  INCENTIVES.activeQuests.push(joined)
  return joined
}
