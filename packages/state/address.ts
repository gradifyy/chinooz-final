import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface SavedAddress {
  id: string
  fullName: string
  phone: string
  street: string
  area: string
  city: string
  label: 'home' | 'work' | 'other'
  isDefault: boolean
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

interface AddressState {
  addresses: SavedAddress[]
  locationCoords: { lat: number; lng: number } | null
  addAddress: (addr: Omit<SavedAddress, 'id' | 'isDefault'>) => void
  removeAddress: (id: string) => void
  setDefault: (id: string) => void
  setLocationCoords: (coords: { lat: number; lng: number } | null) => void
}

let idCounter = 0

export const useAddressStore = create<AddressState>()(
  persist(
    set => ({
      addresses: [],
      locationCoords: null,

      addAddress: addr =>
        set(state => {
          const id = `addr-${Date.now()}-${++idCounter}`
          const isFirst = state.addresses.length === 0
          return {
            addresses: [...state.addresses, { ...addr, id, isDefault: isFirst }],
          }
        }),

      removeAddress: id =>
        set(state => ({
          addresses: state.addresses.filter(a => a.id !== id),
        })),

      setDefault: id =>
        set(state => ({
          addresses: state.addresses.map(a => ({ ...a, isDefault: a.id === id })),
        })),

      setLocationCoords: coords => set({ locationCoords: coords }),
    }),
    {
      name: 'chinooz-addresses',
      storage: getStorage(),
      partialize: state => ({ addresses: state.addresses, locationCoords: state.locationCoords }),
    },
  ),
)
