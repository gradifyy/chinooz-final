import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * RO3–RO6 — rider onboarding stepper draft store.
 *
 * Holds the in-progress onboarding data across the four steps
 * (Personal → Vehicle → Documents → Review) so the rider can resume if they
 * background the app or navigate away. Each step persists its own slice;
 * `currentStep` records the furthest step reached so the stepper can show
 * progress and a resume entry point can deep-link back.
 *
 * The store is intentionally permissive about partial data — validation
 * happens at each step's "Next" gate via the shared zod schemas, not here.
 */

export type OnboardingStep = 'personal' | 'vehicle' | 'documents' | 'review'

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'personal',
  'vehicle',
  'documents',
  'review',
]

export interface PersonalDraft {
  name: string
  photoUri: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | ''
  city: string
  zone: string
  emergencyName: string
  emergencyPhone: string
  emergencyRelation: string
}

export type VehicleType = 'bicycle' | 'motorbike' | 'scooter' | ''

export interface VehicleDraft {
  type: VehicleType
  makeModel: string
  plate: string
  color: string
}

export interface OnboardingDraft {
  personal: PersonalDraft
  vehicle: VehicleDraft
  documents: Record<string, unknown>
}

interface OnboardingState {
  currentStep: OnboardingStep
  draft: OnboardingDraft
  setPersonal: (data: Partial<PersonalDraft>) => void
  setVehicle: (data: Partial<VehicleDraft>) => void
  setDocuments: (data: Record<string, unknown>) => void
  setCurrentStep: (step: OnboardingStep) => void
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

const emptyPersonal: PersonalDraft = {
  name: '',
  photoUri: '',
  dateOfBirth: '',
  gender: '',
  city: '',
  zone: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelation: '',
}

const emptyVehicle: VehicleDraft = {
  type: '',
  makeModel: '',
  plate: '',
  color: '',
}

const emptyDraft: OnboardingDraft = {
  personal: { ...emptyPersonal },
  vehicle: { ...emptyVehicle },
  documents: {},
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    set => ({
      currentStep: 'personal',
      draft: { ...emptyDraft },

      setPersonal: data =>
        set(state => ({
          draft: {
            ...state.draft,
            personal: { ...state.draft.personal, ...data },
          },
        })),

      setVehicle: data =>
        set(state => ({
          draft: {
            ...state.draft,
            vehicle: { ...state.draft.vehicle, ...data },
          },
        })),

      setDocuments: data =>
        set(state => ({
          draft: {
            ...state.draft,
            documents: { ...state.draft.documents, ...data },
          },
        })),

      setCurrentStep: step => set({ currentStep: step }),

      reset: () => set({ currentStep: 'personal', draft: { ...emptyDraft } }),
    }),
    {
      name: 'chinooz-rider-onboarding',
      storage: getStorage(),
      partialize: state => ({ currentStep: state.currentStep, draft: state.draft }),
    },
  ),
)
