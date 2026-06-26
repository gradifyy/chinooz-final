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

interface SessionState {
  onboardingSeen: boolean
  isLoggedIn: boolean
  userId: string | null
  userName: string | null
  markOnboardingSeen: () => void
  login: (userId: string, userName: string) => void
  logout: () => void
  toggleLogin: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      onboardingSeen: false,
      isLoggedIn: false,
      userId: null,
      userName: null,

      markOnboardingSeen: () => set({ onboardingSeen: true }),

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
    }),
    {
      name: 'chinooz-session',
      storage: getStorage(),
      partialize: state => ({
        onboardingSeen: state.onboardingSeen,
        isLoggedIn: state.isLoggedIn,
        userId: state.userId,
        userName: state.userName,
      }),
    },
  ),
)
