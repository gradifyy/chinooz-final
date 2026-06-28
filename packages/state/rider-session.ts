import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * RO3 branching states after OTP verify:
 * - "new":      phone not linked to an approved rider → onboarding stepper.
 * - "approved": existing, approved rider → Home / jobs board.
 * - "pending":  existing rider awaiting approval → pending state (RO6).
 */
export type RiderAccountState = 'new' | 'approved' | 'pending'

export interface RiderProfile {
  name: string
  phone: string
  language: 'en' | 'ne'
}

interface RiderSessionState {
  onboardingSeen: boolean
  isLoggedIn: boolean
  riderId: string | null
  rider: RiderProfile
  accountState: RiderAccountState | null
  devMock: boolean
  markOnboardingSeen: () => void
  login: (riderId: string, name: string) => void
  logout: () => void
  toggleLogin: () => void
  toggleDevMock: () => void
  updateRider: (data: Partial<RiderProfile>) => void
  setAccountState: (state: RiderAccountState) => void
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

const defaultRider: RiderProfile = {
  name: '',
  phone: '',
  language: 'en',
}

export const useRiderSessionStore = create<RiderSessionState>()(
  persist(
    (set, get) => ({
      onboardingSeen: false,
      isLoggedIn: false,
      riderId: null,
      rider: { ...defaultRider },
      accountState: null,
      devMock: true,

      markOnboardingSeen: () => set({ onboardingSeen: true }),

      login: (riderId, name) =>
        set({
          isLoggedIn: true,
          riderId,
          rider: { ...get().rider, name: name || get().rider.name },
        }),

      logout: () =>
        set({
          isLoggedIn: false,
          riderId: null,
          rider: { ...defaultRider },
        }),

      toggleLogin: () => {
        const { isLoggedIn } = get()
        if (isLoggedIn) {
          set({ isLoggedIn: false, riderId: null })
        } else {
          set({
            isLoggedIn: true,
            riderId: 'rider-1',
            rider: { ...defaultRider, name: 'Chinooz Rider' },
          })
        }
      },

      toggleDevMock: () => set(state => ({ devMock: !state.devMock })),

      updateRider: data =>
        set(state => ({
          rider: { ...state.rider, ...data },
          riderId: state.riderId,
        })),

      setAccountState: accountState => set({ accountState }),
    }),
    {
      name: 'chinooz-rider-session',
      storage: getStorage(),
      partialize: state => ({
        onboardingSeen: state.onboardingSeen,
        isLoggedIn: state.isLoggedIn,
        riderId: state.riderId,
        rider: state.rider,
        accountState: state.accountState,
        devMock: state.devMock,
      }),
    },
  ),
)
