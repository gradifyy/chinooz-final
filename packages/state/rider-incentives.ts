import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * RI2/RI3 — shared rider incentives store.
 *
 * Single source of truth for the "earned this week from incentives" total
 * that ties the Incentives & Quests hub back to the Earnings tab. The hub
 * seeds this from mock `getIncentives()` and the Earnings overview reads it
 * so incentive earnings appear as a single tabular figure, not a duplicate
 * of trip earnings.
 *
 * RI3 adds claimed-quest tracking: when a rider claims a completed quest
 * reward, `claimQuestReward` credits the amount to both `thisWeekNpr` and
 * `claimedRewardsNpr` so there is one source of truth — the Earnings tab
 * sees the updated incentive total without a second API call.
 *
 * Quest progress, streaks and surge state live in the mock data layer
 * (getIncentives) and are refetched by the hub via TanStack Query.
 */

interface ClaimedReward {
  questId: string
  amountNpr: number
  claimedAt: number
}

interface RiderIncentivesState {
  /** NPR earned this week from incentives/quests/streaks only. Null until seeded. */
  thisWeekNpr: number | null
  /** ISO date (yyyy-mm-dd) of the week this total belongs to. */
  weekOf: string | null
  /** Total NPR claimed from completed quests (lifetime, this session). */
  claimedRewardsNpr: number
  /** Per-quest claim log so repeat claims are rejected client-side. */
  claimedQuests: Record<string, ClaimedReward>
  /** Seed the weekly incentive total once the hub has loaded. */
  setThisWeek: (amount: number, weekOf: string) => void
  /**
   * Record a claimed quest reward. Credits the amount to the weekly total
   * and the claimed-rewards total. Idempotent — repeat calls for the same
   * questId are ignored. This is the one source of truth that Earnings reads.
   */
  claimQuestReward: (questId: string, amountNpr: number) => void
  /** True if this quest has already been claimed. */
  isQuestClaimed: (questId: string) => boolean
  /** Clear the store (e.g. on logout). */
  reset: () => void
}

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return createJSONStorage(() => localStorage)
  }
  return createJSONStorage(() => ({
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  }))
}

export const useRiderIncentivesStore = create<RiderIncentivesState>()(
  persist(
    (set, get) => ({
      thisWeekNpr: null,
      weekOf: null,
      claimedRewardsNpr: 0,
      claimedQuests: {},

      setThisWeek: (amount, weekOf) => {
        set({ thisWeekNpr: amount, weekOf })
      },

      claimQuestReward: (questId, amountNpr) => {
        const state = get()
        if (state.claimedQuests[questId]) return
        const claimed: ClaimedReward = {
          questId,
          amountNpr,
          claimedAt: Date.now(),
        }
        set({
          claimedQuests: { ...state.claimedQuests, [questId]: claimed },
          claimedRewardsNpr: state.claimedRewardsNpr + amountNpr,
          thisWeekNpr:
            state.thisWeekNpr !== null
              ? state.thisWeekNpr + amountNpr
              : amountNpr,
        })
      },

      isQuestClaimed: questId => {
        return !!get().claimedQuests[questId]
      },

      reset: () =>
        set({
          thisWeekNpr: null,
          weekOf: null,
          claimedRewardsNpr: 0,
          claimedQuests: {},
        }),
    }),
    {
      name: 'chinooz-rider-incentives',
      storage: getStorage(),
      partialize: state => ({
        thisWeekNpr: state.thisWeekNpr,
        weekOf: state.weekOf,
        claimedRewardsNpr: state.claimedRewardsNpr,
        claimedQuests: state.claimedQuests,
      }),
    },
  ),
)
