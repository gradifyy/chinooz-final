import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * RS2 — shared rider online-status store.
 * Single source of truth for the rider's availability state across the
 * rider-mobile app (Home shell, incoming-request overlay, stats, etc.).
 *
 * Status model:
 * - "offline": rider is off-duty, will not receive delivery requests.
 * - "online":  rider is active and listening for incoming jobs.
 * - "paused":  rider is briefly paused (e.g. on a break); not actively
 *              listening but still counted as on-shift.
 */

export type OnlineStatus = 'offline' | 'online' | 'paused'

interface OnlineStatusState {
  status: OnlineStatus
  /** Epoch ms of the most recent transition into "online". Null while offline. */
  onlineSince: number | null
  /** Accumulated online seconds for "today" (resets on logout / new day). */
  onlineSecondsToday: number
  /** Epoch ms of the last status change, used for analytics + stamps. */
  lastChangedAt: number
  setOnlineStatus: (next: OnlineStatus) => void
  toggleOnline: () => void
  /** Advance the online timer (called on tick while online). */
  tickOnline: (seconds?: number) => void
  resetOnlineTime: () => void
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

export const useOnlineStatusStore = create<OnlineStatusState>()(
  persist(
    (set, get) => ({
      status: 'offline',
      onlineSince: null,
      onlineSecondsToday: 0,
      lastChangedAt: Date.now(),

      setOnlineStatus: next => {
        const prev = get().status
        if (prev === next) return
        const now = Date.now()
        // Close out any running online session into the daily total.
        let addedSeconds = 0
        if (prev === 'online' && get().onlineSince !== null) {
          addedSeconds = Math.max(0, Math.floor((now - get().onlineSince!) / 1000))
        }
        set({
          status: next,
          onlineSince: next === 'online' ? now : null,
          onlineSecondsToday: get().onlineSecondsToday + addedSeconds,
          lastChangedAt: now,
        })
      },

      toggleOnline: () => {
        const { status } = get()
        get().setOnlineStatus(status === 'offline' || status === 'paused' ? 'online' : 'offline')
      },

      tickOnline: (seconds = 1) => {
        if (get().status !== 'online') return
        set(state => ({ onlineSecondsToday: state.onlineSecondsToday + seconds }))
      },

      resetOnlineTime: () => set({ onlineSecondsToday: 0, onlineSince: null }),
    }),
    {
      name: 'chinooz-rider-online',
      storage: getStorage(),
      partialize: state => ({
        status: state.status,
        onlineSince: state.onlineSince,
        onlineSecondsToday: state.onlineSecondsToday,
        lastChangedAt: state.lastChangedAt,
      }),
    },
  ),
)
