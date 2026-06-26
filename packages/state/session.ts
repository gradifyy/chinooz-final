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

interface UserProfile {
  name: string
  email: string
  avatarUri: string | null
  language: 'en' | 'ne'
}

interface SessionState {
  onboardingSeen: boolean
  isLoggedIn: boolean
  profileComplete: boolean
  userId: string | null
  userName: string | null
  profile: UserProfile
  markOnboardingSeen: () => void
  login: (userId: string, userName: string) => void
  logout: () => void
  toggleLogin: () => void
  updateProfile: (data: Partial<UserProfile>) => void
  markProfileComplete: () => void
}

const defaultProfile: UserProfile = {
  name: '',
  email: '',
  avatarUri: null,
  language: 'en',
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      onboardingSeen: false,
      isLoggedIn: false,
      profileComplete: false,
      userId: null,
      userName: null,
      profile: { ...defaultProfile },

      markOnboardingSeen: () => set({ onboardingSeen: true }),

      login: (userId, userName) => set({
        isLoggedIn: true,
        userId,
        userName,
        profile: { ...get().profile, name: userName || get().profile.name },
      }),

      logout: () => set({
        isLoggedIn: false,
        userId: null,
        userName: null,
        profileComplete: false,
        profile: { ...defaultProfile },
      }),

      toggleLogin: () => {
        const { isLoggedIn } = get()
        if (isLoggedIn) {
          set({ isLoggedIn: false, userId: null, userName: null, profileComplete: false })
        } else {
          set({ isLoggedIn: true, userId: 'user-1', userName: 'Ayush Chaudhary' })
        }
      },

      updateProfile: (data) => set(state => ({
        profile: { ...state.profile, ...data },
        userName: data.name || state.userName,
      })),

      markProfileComplete: () => set({ profileComplete: true }),
    }),
    {
      name: 'chinooz-session',
      storage: getStorage(),
      partialize: state => ({
        onboardingSeen: state.onboardingSeen,
        isLoggedIn: state.isLoggedIn,
        profileComplete: state.profileComplete,
        userId: state.userId,
        userName: state.userName,
        profile: state.profile,
      }),
    },
  ),
)
