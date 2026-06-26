import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Product } from '@chinooz/types'

interface WishlistState {
  items: Product[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  hasItem: (productId: string) => boolean
  toggleItem: (product: Product) => void
  clear: () => void
}

const wishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product) => {
        set(state => {
          if (state.items.some(i => i.id === product.id)) return state
          return { items: [...state.items, product] }
        })
      },

      removeItem: (productId: string) => {
        set(state => ({
          items: state.items.filter(i => i.id !== productId),
        }))
      },

      hasItem: (productId: string) => {
        return get().items.some(i => i.id === productId)
      },

      toggleItem: (product: Product) => {
        const has = get().hasItem(product.id)
        if (has) {
          get().removeItem(product.id)
        } else {
          get().addItem(product)
        }
      },

      clear: () => set({ items: [] }),
    }),
    {
      name: 'chinooz-wishlist',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      }),
    },
  ),
)

export default wishlistStore
