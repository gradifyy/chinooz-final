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

interface NotificationPreferences {
  orders: boolean
  deals: boolean
  messages: boolean
}

interface PreferencesState {
  notifications: NotificationPreferences
  setNotification: (key: keyof NotificationPreferences, value: boolean) => void
  setAllNotifications: (prefs: NotificationPreferences) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    set => ({
      notifications: {
        orders: true,
        deals: true,
        messages: true,
      },

      setNotification: (key, value) =>
        set(state => ({
          notifications: { ...state.notifications, [key]: value },
        })),

      setAllNotifications: (prefs) =>
        set({ notifications: prefs }),
    }),
    {
      name: 'chinooz-preferences',
      storage: getStorage(),
      partialize: state => ({ notifications: state.notifications }),
    },
  ),
)
