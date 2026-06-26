import { create } from 'zustand'

interface CartState {
  count: number
  increment: () => void
  decrement: () => void
  setCount: (n: number) => void
}

export const useCartStore = create<CartState>(set => ({
  count: 3,
  increment: () => set(s => ({ count: s.count + 1 })),
  decrement: () => set(s => ({ count: Math.max(0, s.count - 1) })),
  setCount: n => set({ count: n }),
}))
