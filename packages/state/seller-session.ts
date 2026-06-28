import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected'
export type GoLiveStatus = 'offline' | 'review' | 'live'

export interface SellerStore {
  id: string
  name: string
  slug: string
}

export interface SellerProfile {
  name: string
  email: string
  phone: string
  language: 'en' | 'ne'
}

interface SellerSessionState {
  onboardingSeen: boolean
  isLoggedIn: boolean
  sellerId: string | null
  seller: SellerProfile
  store: SellerStore | null
  kycStatus: KycStatus
  goLiveStatus: GoLiveStatus
  devMock: boolean
  markOnboardingSeen: () => void
  login: (sellerId: string, name: string) => void
  logout: () => void
  toggleLogin: () => void
  setStore: (store: SellerStore) => void
  setKycStatus: (status: KycStatus) => void
  setGoLiveStatus: (status: GoLiveStatus) => void
  toggleDevMock: () => void
  updateSeller: (data: Partial<SellerProfile>) => void
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

const defaultSeller: SellerProfile = {
  name: '',
  email: '',
  phone: '',
  language: 'en',
}

export const useSellerSessionStore = create<SellerSessionState>()(
  persist(
    (set, get) => ({
      onboardingSeen: false,
      isLoggedIn: false,
      sellerId: null,
      seller: { ...defaultSeller },
      store: null,
      kycStatus: 'none',
      goLiveStatus: 'offline',
      devMock: true,

      markOnboardingSeen: () => set({ onboardingSeen: true }),

      login: (sellerId, name) =>
        set({
          isLoggedIn: true,
          sellerId,
          seller: { ...get().seller, name: name || get().seller.name },
        }),

      logout: () =>
        set({
          isLoggedIn: false,
          sellerId: null,
          seller: { ...defaultSeller },
          store: null,
          kycStatus: 'none',
          goLiveStatus: 'offline',
        }),

      toggleLogin: () => {
        const { isLoggedIn } = get()
        if (isLoggedIn) {
          set({ isLoggedIn: false, sellerId: null, store: null, kycStatus: 'none', goLiveStatus: 'offline' })
        } else {
          set({
            isLoggedIn: true,
            sellerId: 'seller-1',
            seller: { ...defaultSeller, name: 'Chinooz Seller' },
            store: { id: 'store-1', name: 'Chinooz Store', slug: 'chinooz-store' },
            kycStatus: 'verified',
            goLiveStatus: 'live',
          })
        }
      },

      setStore: store => set({ store }),

      setKycStatus: status => set({ kycStatus: status }),

      setGoLiveStatus: status => set({ goLiveStatus: status }),

      toggleDevMock: () => set(state => ({ devMock: !state.devMock })),

      updateSeller: data =>
        set(state => ({
          seller: { ...state.seller, ...data },
          sellerId: state.sellerId,
        })),
    }),
    {
      name: 'chinooz-seller-session',
      storage: getStorage(),
      partialize: state => ({
        onboardingSeen: state.onboardingSeen,
        isLoggedIn: state.isLoggedIn,
        sellerId: state.sellerId,
        seller: state.seller,
        store: state.store,
        kycStatus: state.kycStatus,
        goLiveStatus: state.goLiveStatus,
        devMock: state.devMock,
      }),
    },
  ),
)
