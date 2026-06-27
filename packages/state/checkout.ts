import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type CheckoutStep = 'address' | 'delivery' | 'payment' | 'review'
export type DeliveryMethod = 'standard' | 'express'
export type PaymentMethod = 'cod' | 'esewa' | 'khalti'

interface CheckoutAddress {
  fullName: string
  phone: string
  street: string
  area: string
  city: string
  label: 'home' | 'work' | 'other'
}

interface CheckoutState {
  currentStep: CheckoutStep
  address: CheckoutAddress | null
  deliveryMethod: DeliveryMethod
  paymentMethod: PaymentMethod
  completedSteps: CheckoutStep[]

  setStep: (step: CheckoutStep) => void
  setAddress: (address: CheckoutAddress) => void
  setDeliveryMethod: (method: DeliveryMethod) => void
  setPaymentMethod: (method: PaymentMethod) => void
  completeStep: (step: CheckoutStep) => void
  goToStep: (step: CheckoutStep) => void
  reset: () => void
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

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    set => ({
      currentStep: 'address',
      address: null,
      deliveryMethod: 'standard',
      paymentMethod: 'cod',
      completedSteps: [],

      setStep: step => set({ currentStep: step }),

      setAddress: address => set({ address }),

      setDeliveryMethod: method => set({ deliveryMethod: method }),

      setPaymentMethod: method => set({ paymentMethod: method }),

      completeStep: step =>
        set(state => ({
          completedSteps: Array.from(new Set([...state.completedSteps, step])),
        })),

      goToStep: step => set({ currentStep: step }),

      reset: () =>
        set({
          currentStep: 'address',
          address: null,
          deliveryMethod: 'standard',
          paymentMethod: 'cod',
          completedSteps: [],
        }),
    }),
    {
      name: 'chinooz-checkout',
      storage: getStorage(),
      partialize: state => ({
        currentStep: state.currentStep,
        address: state.address,
        deliveryMethod: state.deliveryMethod,
        paymentMethod: state.paymentMethod,
        completedSteps: state.completedSteps,
      }),
    },
  ),
)
