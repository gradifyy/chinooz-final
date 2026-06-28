import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected'
export type GoLiveStatus = 'offline' | 'review' | 'live'

export interface SellerStore {
  id: string
  name: string
  slug: string
  tagline?: string
  description?: string
  logoUrl?: string
  bannerUrl?: string
  category?: string
  pickupAddress?: string
  returnAddress?: string
  contactPhone?: string
  contactEmail?: string
  rating?: number
  reviewCount?: number
}

export interface SellerProfile {
  name: string
  email: string
  phone: string
  language: 'en' | 'ne'
}

export interface StoreDraft {
  storeName: string
  handle: string
  description: string
  categoryId: string
  logoUrl: string
  bannerUrl: string
  pickupStreet: string
  pickupArea: string
  pickupCity: string
  pickupPhone: string
  setupStep: number
  businessType: 'individual' | 'registered'
  legalName: string
  panNumber: string
  regNumber: string
  docId: string
  docReg: string
  docPan: string
}

const defaultDraft: StoreDraft = {
  storeName: '',
  handle: '',
  description: '',
  categoryId: '',
  logoUrl: '',
  bannerUrl: '',
  pickupStreet: '',
  pickupArea: '',
  pickupCity: '',
  pickupPhone: '',
  setupStep: 0,
  businessType: 'individual',
  legalName: '',
  panNumber: '',
  regNumber: '',
  docId: '',
  docReg: '',
  docPan: '',
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
  storeDraft: StoreDraft
  markOnboardingSeen: () => void
  login: (sellerId: string, name: string) => void
  logout: () => void
  toggleLogin: () => void
  setStore: (store: SellerStore) => void
  updateStore: (data: Partial<SellerStore>) => void
  setKycStatus: (status: KycStatus) => void
  setGoLiveStatus: (status: GoLiveStatus) => void
  toggleDevMock: () => void
  updateSeller: (data: Partial<SellerProfile>) => void
  updateDraft: (data: Partial<StoreDraft>) => void
  clearDraft: () => void
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
      storeDraft: { ...defaultDraft },

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
            store: { id: 'store-1', name: 'Chinooz Store', slug: 'chinooz-store', tagline: 'Authentic Nepali crafts & electronics', description: 'We bring you the best of Nepal — from handmade crafts to the latest electronics, delivered with care.', category: 'Lifestyle', rating: 4.8, reviewCount: 128, contactPhone: '9801234567', contactEmail: 'hello@chinoozstore.com' },
            kycStatus: 'verified',
            goLiveStatus: 'live',
          })
        }
      },

      setStore: store => set({ store }),

      updateStore: data =>
        set(state => ({
          store: state.store ? { ...state.store, ...data } : state.store,
        })),

      setKycStatus: status => set({ kycStatus: status }),

      setGoLiveStatus: status => set({ goLiveStatus: status }),

      toggleDevMock: () => set(state => ({ devMock: !state.devMock })),

      updateSeller: data =>
        set(state => ({
          seller: { ...state.seller, ...data },
          sellerId: state.sellerId,
        })),

      updateDraft: data =>
        set(state => ({
          storeDraft: { ...state.storeDraft, ...data },
        })),

      clearDraft: () => set({ storeDraft: { ...defaultDraft } }),
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
        storeDraft: state.storeDraft,
      }),
    },
  ),
)
