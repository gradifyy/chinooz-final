import { create } from 'zustand'

interface SessionState {
  isLoggedIn: boolean
  userId: string | null
  userName: string | null
  login: (userId: string, userName: string) => void
  logout: () => void
  toggleLogin: () => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  isLoggedIn: true,
  userId: 'user-1',
  userName: 'Ayush Chaudhary',

  login: (userId, userName) => set({ isLoggedIn: true, userId, userName }),

  logout: () => set({ isLoggedIn: false, userId: null, userName: null }),

  toggleLogin: () => {
    const { isLoggedIn } = get()
    if (isLoggedIn) {
      set({ isLoggedIn: false, userId: null, userName: null })
    } else {
      set({ isLoggedIn: true, userId: 'user-1', userName: 'Ayush Chaudhary' })
    }
  },
}))
