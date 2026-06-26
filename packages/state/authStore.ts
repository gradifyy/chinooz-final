import { create } from 'zustand'
import type { User, Locale } from '@chinooz/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  locale: Locale
  setUser: (user: User | null) => void
  logout: () => void
  setLocale: (locale: Locale) => void
}

const authStore = create<AuthState>()(set => ({
  user: null,
  isAuthenticated: false,
  locale: 'en',

  setUser: (user: User | null) =>
    set({ user, isAuthenticated: !!user }),

  logout: () => set({ user: null, isAuthenticated: false }),

  setLocale: (locale: Locale) => set({ locale }),
}))

export default authStore
