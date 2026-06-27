import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const MAX_RECENT = 10

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

interface RecentSearchesState {
  searches: string[]
  addSearch: (term: string) => void
  removeSearch: (term: string) => void
  clearAll: () => void
}

export const useRecentSearchesStore = create<RecentSearchesState>()(
  persist(
    set => ({
      searches: [],

      addSearch: (term: string) =>
        set(state => {
          const filtered = state.searches.filter(s => s !== term)
          return { searches: [term, ...filtered].slice(0, MAX_RECENT) }
        }),

      removeSearch: (term: string) =>
        set(state => ({
          searches: state.searches.filter(s => s !== term),
        })),

      clearAll: () => set({ searches: [] }),
    }),
    {
      name: 'chinooz-recent-searches',
      storage: getStorage(),
      partialize: state => ({ searches: state.searches }),
    },
  ),
)
