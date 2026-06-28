import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * RI3 — shared rider trips-today store.
 *
 * Tracks completed deliveries for progress computation across the Quests
 * list + detail screens. Quest progress (e.g. "5 of 8 deliveries today") is
 * derived from this store so it feels live — every completed delivery bumps
 * the quest progress without a refetch.
 *
 * The store is seeded from the mock earnings `periods[0].trips` (today's
 * trips) and incremented when the active-delivery store reaches `delivered`.
 * Streak days are seeded from the incentives mock `streak.current`.
 */

interface RiderTripsState {
  /** Completed deliveries today. */
  tripsToday: number
  /** Completed deliveries this week (Mon-Sun). */
  tripsThisWeek: number
  /** Consecutive streak days (>=1 delivery). */
  streakDays: number
  /** Peak-hour rides today (within a surge window). */
  peakRidesToday: number
  /** Seed the trip counts from the mock layer. */
  seedTrips: (opts: { today: number; week: number; streak: number; peak: number }) => void
  /** Increment tripsToday + tripsThisWeek when a delivery completes. */
  incrementTrip: (isPeak?: boolean) => void
  /** Reset the daily count (called on day rollover / logout). */
  resetToday: () => void
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

export const useRiderTripsStore = create<RiderTripsState>()(
  persist(
    (set, get) => ({
      tripsToday: 5,
      tripsThisWeek: 34,
      streakDays: 6,
      peakRidesToday: 0,

      seedTrips: ({ today, week, streak, peak }) =>
        set({
          tripsToday: today,
          tripsThisWeek: week,
          streakDays: streak,
          peakRidesToday: peak,
        }),

      incrementTrip: (isPeak = false) =>
        set(state => ({
          tripsToday: state.tripsToday + 1,
          tripsThisWeek: state.tripsThisWeek + 1,
          peakRidesToday: isPeak ? state.peakRidesToday + 1 : state.peakRidesToday,
        })),

      resetToday: () => set({ tripsToday: 0, peakRidesToday: 0 }),
    }),
    {
      name: 'chinooz-rider-trips',
      storage: getStorage(),
      partialize: state => ({
        tripsToday: state.tripsToday,
        tripsThisWeek: state.tripsThisWeek,
        streakDays: state.streakDays,
        peakRidesToday: state.peakRidesToday,
      }),
    },
  ),
)

/**
 * Compute live quest progress from the trips store. Returns the progress
 * numerator for a given quest kind, clamped to the quest goal.
 */
export function computeQuestProgress(
  kind: 'mission' | 'streak' | 'surge' | 'bonus',
  goal: number,
  trips: Pick<RiderTripsState, 'tripsToday' | 'tripsThisWeek' | 'streakDays' | 'peakRidesToday'>,
): number {
  let raw: number
  switch (kind) {
    case 'mission':
      raw = trips.tripsToday
      break
    case 'streak':
      raw = trips.streakDays
      break
    case 'surge':
      raw = trips.peakRidesToday
      break
    case 'bonus':
      raw = trips.tripsThisWeek
      break
    default:
      raw = 0
  }
  return Math.min(goal, Math.max(0, raw))
}
