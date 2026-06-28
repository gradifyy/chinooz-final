import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  RiderNavApp,
  RiderDistanceUnit,
  RiderSoundLevel,
  RiderHapticsLevel,
  RiderMapStyle,
  RiderCodPreference,
} from '@chinooz/mock-data'

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

/**
 * Rider-specific app preferences that take effect app-wide immediately.
 *
 * Language (locale) is handled by useUIStore (shared across all apps).
 * This store covers rider-only settings: nav app, distance unit, sound,
 * haptics, battery/data saver, map style, and job prefs.
 *
 * The store is persisted locally so settings survive app restarts even
 * without a network connection. When the server preferences query loads,
 * the screen merges server data into this store and vice-versa.
 */
interface RiderAppPrefsState {
  navApp: RiderNavApp
  distanceUnit: RiderDistanceUnit
  soundLevel: RiderSoundLevel
  hapticsLevel: RiderHapticsLevel
  batterySaver: boolean
  dataSaver: boolean
  mapStyle: RiderMapStyle
  preferredZones: string[]
  maxDistanceKm: number
  codPreference: RiderCodPreference
  setNavApp: (v: RiderNavApp) => void
  setDistanceUnit: (v: RiderDistanceUnit) => void
  setSoundLevel: (v: RiderSoundLevel) => void
  setHapticsLevel: (v: RiderHapticsLevel) => void
  setBatterySaver: (v: boolean) => void
  setDataSaver: (v: boolean) => void
  setMapStyle: (v: RiderMapStyle) => void
  setPreferredZones: (v: string[]) => void
  setMaxDistanceKm: (v: number) => void
  setCodPreference: (v: RiderCodPreference) => void
  /** Merge server preferences into local store (one-way sync on load). */
  hydrateFromServer: (prefs: {
    navApp: RiderNavApp
    distanceUnit: RiderDistanceUnit
    soundLevel: RiderSoundLevel
    hapticsLevel: RiderHapticsLevel
    batterySaver: boolean
    dataSaver: boolean
    mapStyle: RiderMapStyle
    preferredZones: string[]
    maxDistanceKm: number
    codPreference: RiderCodPreference
  }) => void
}

export const useRiderPrefsStore = create<RiderAppPrefsState>()(
  persist(
    set => ({
      navApp: 'google',
      distanceUnit: 'km',
      soundLevel: 'medium',
      hapticsLevel: 'medium',
      batterySaver: false,
      dataSaver: false,
      mapStyle: 'standard',
      preferredZones: ['patan', 'ktm-central'],
      maxDistanceKm: 10,
      codPreference: 'any',

      setNavApp: v => set({ navApp: v }),
      setDistanceUnit: v => set({ distanceUnit: v }),
      setSoundLevel: v => set({ soundLevel: v }),
      setHapticsLevel: v => set({ hapticsLevel: v }),
      setBatterySaver: v => set({ batterySaver: v }),
      setDataSaver: v => set({ dataSaver: v }),
      setMapStyle: v => set({ mapStyle: v }),
      setPreferredZones: v => set({ preferredZones: v }),
      setMaxDistanceKm: v => set({ maxDistanceKm: v }),
      setCodPreference: v => set({ codPreference: v }),

      hydrateFromServer: prefs =>
        set({
          navApp: prefs.navApp,
          distanceUnit: prefs.distanceUnit,
          soundLevel: prefs.soundLevel,
          hapticsLevel: prefs.hapticsLevel,
          batterySaver: prefs.batterySaver,
          dataSaver: prefs.dataSaver,
          mapStyle: prefs.mapStyle,
          preferredZones: prefs.preferredZones,
          maxDistanceKm: prefs.maxDistanceKm,
          codPreference: prefs.codPreference,
        }),
    }),
    {
      name: 'chinooz-rider-prefs',
      storage: getStorage(),
    },
  ),
)
