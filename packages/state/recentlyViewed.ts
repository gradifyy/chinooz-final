import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getStorage } from './storage'

const MAX_RECENT = 12

interface RecentlyViewedEntry {
  productId: string
  viewedAt: number
}

interface RecentlyViewedState {
  entries: RecentlyViewedEntry[]
  addViewed: (productId: string) => void
  clearAll: () => void
  ids: () => string[]
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      entries: [],

      addViewed: (productId: string) =>
        set(state => {
          const filtered = state.entries.filter(e => e.productId !== productId)
          return { entries: [{ productId, viewedAt: Date.now() }, ...filtered].slice(0, MAX_RECENT) }
        }),

      clearAll: () => set({ entries: [] }),

      ids: () => get().entries.map(e => e.productId),
    }),
    {
      name: 'chinooz-recently-viewed',
      storage: getStorage(),
      partialize: state => ({ entries: state.entries }),
    },
  ),
)
