import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

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

interface WishlistEntry {
  productId: string
  addedAt: string
}

interface WishlistState {
  entries: WishlistEntry[]
  add: (productId: string) => void
  remove: (productId: string) => void
  toggle: (productId: string) => void
  has: (productId: string) => boolean
  ids: () => string[]
  clear: () => void
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      entries: [],

      add: (productId) =>
        set(state => {
          if (state.entries.some(e => e.productId === productId)) return state
          return { entries: [...state.entries, { productId, addedAt: new Date().toISOString() }] }
        }),

      remove: (productId) =>
        set(state => ({ entries: state.entries.filter(e => e.productId !== productId) })),

      toggle: (productId) => {
        const { entries } = get()
        if (entries.some(e => e.productId === productId)) {
          set({ entries: entries.filter(e => e.productId !== productId) })
        } else {
          set({ entries: [...entries, { productId, addedAt: new Date().toISOString() }] })
        }
      },

      has: (productId) => get().entries.some(e => e.productId === productId),

      ids: () => get().entries.map(e => e.productId),

      clear: () => set({ entries: [] }),
    }),
    {
      name: 'chinooz-wishlist',
      storage: getStorage(),
      partialize: state => ({ entries: state.entries }),
    },
  ),
)
