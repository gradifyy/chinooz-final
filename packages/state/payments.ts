import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type PaymentType = 'khalti' | 'esewa' | 'cod'

export interface PaymentMethod {
  id: string
  type: PaymentType
  name: string
  note: string
  connected: boolean
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

const DEFAULT_METHODS: PaymentMethod[] = [
  { id: 'pay-cod', type: 'cod', name: 'Cash on Delivery', note: 'Pay when you receive your order', connected: true, isDefault: true },
  { id: 'pay-khalti', type: 'khalti', name: 'Khalti', note: 'Digital wallet — fast & secure', connected: false, isDefault: false },
  { id: 'pay-esewa', type: 'esewa', name: 'eSewa', note: 'Nepal\'s leading digital wallet', connected: false, isDefault: false },
]

interface PaymentsState {
  methods: PaymentMethod[]
  setDefault: (id: string) => void
  connect: (id: string) => void
  remove: (id: string) => void
  add: (method: Omit<PaymentMethod, 'id' | 'isDefault'>) => void
}

export const usePaymentsStore = create<PaymentsState>()(
  persist(
    (set, get) => ({
      methods: DEFAULT_METHODS,

      setDefault: (id) =>
        set(state => ({
          methods: state.methods.map(m => ({ ...m, isDefault: m.id === id })),
        })),

      connect: (id) =>
        set(state => ({
          methods: state.methods.map(m =>
            m.id === id ? { ...m, connected: true } : m,
          ),
        })),

      remove: (id) =>
        set(state => ({
          methods: state.methods.filter(m => m.id !== id),
        })),

      add: (method) =>
        set(state => ({
          methods: [...state.methods, { ...method, id: `pay-${Date.now()}`, isDefault: state.methods.length === 0 }],
        })),
    }),
    {
      name: 'chinooz-payments',
      storage: getStorage(),
      partialize: state => ({ methods: state.methods }),
    },
  ),
)
