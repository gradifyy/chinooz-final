import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Locale = 'en' | 'ne'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface ToastMessage {
  id: string
  message: string
  variant: 'success' | 'error' | 'warning' | 'info'
  duration?: number
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

interface UIState {
  locale: Locale
  theme: ThemeMode
  toasts: ToastMessage[]
  addressReminderPending: boolean
  setLocale: (locale: Locale) => void
  setTheme: (theme: ThemeMode) => void
  addToast: (toast: Omit<ToastMessage, 'id'>) => void
  removeToast: (id: string) => void
  setAddressReminderPending: (v: boolean) => void
}

let toastCounter = 0

export const useUIStore = create<UIState>()(
  persist(
    set => ({
      locale: 'en',
      theme: 'light',
      toasts: [],
      addressReminderPending: false,

      setLocale: locale => set({ locale }),

      setTheme: theme => set({ theme }),

      addToast: toast =>
        set(state => {
          const id = `toast-${++toastCounter}`
          const newToast = { ...toast, id }
          setTimeout(() => {
            set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
          }, toast.duration ?? 3000)
          return { toasts: [...state.toasts, newToast] }
        }),

      removeToast: id =>
        set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),

      setAddressReminderPending: v => set({ addressReminderPending: v }),
    }),
    {
      name: 'chinooz-ui',
      storage: getStorage(),
      partialize: state => ({ locale: state.locale, theme: state.theme, addressReminderPending: state.addressReminderPending }),
    },
  ),
)
