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
