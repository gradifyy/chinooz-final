import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * RI2 — shared rider incentives store.
 *
 * Single source of truth for the "earned this week from incentives" total
 * that ties the Incentives & Quests hub back to the Earnings tab. The hub
 * seeds this from mock `getIncentives()` and the Earnings overview reads it
 * so incentive earnings appear as a single tabular figure, not a duplicate
 * of trip earnings.
 *
 * Only the weekly incentive total is persisted here. Quest progress, streaks
 * and surge state live in the mock data layer (getIncentives) and are
 * refetched by the hub via TanStack Query.
 */

interface RiderIncentivesState {
  /** NPR earned this week from incentives/quests/streaks only. Null until seeded. */
  thisWeekNpr: number | null
  /** ISO date (yyyy-mm-dd) of the week this total belongs to. */
  weekOf: string | null
  /** Seed the weekly incentive total once the hub has loaded. */
  setThisWeek: (amount: number, weekOf: string) => void
  /** Clear the total (e.g. on logout). */
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
    set => ({
      thisWeekNpr: null,
      weekOf: null,

      setThisWeek: (amount, weekOf) => {
        set({ thisWeekNpr: amount, weekOf })
      },

      reset: () => set({ thisWeekNpr: null, weekOf: null }),
    }),
    {
      name: 'chinooz-rider-incentives',
      storage: getStorage(),
      partialize: state => ({
        thisWeekNpr: state.thisWeekNpr,
        weekOf: state.weekOf,
      }),
    },
  ),
)
