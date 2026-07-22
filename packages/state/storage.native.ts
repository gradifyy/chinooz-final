import { createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Native (iOS/Android) persistence storage.
 *
 * Metro resolves this `.native.ts` variant ahead of `storage.ts` on device,
 * so React Native gets a STATIC AsyncStorage import that the bundler can always
 * resolve — instead of the dynamic `require()` in storage.ts that Metro may fail
 * to bundle (which would silently drop persistence to an in-memory no-op).
 *
 * The web/SSR build never sees this file (webpack/Next resolve `storage.ts`),
 * so the React-Native-only dependency stays out of the web bundle.
 */
export function getStorage() {
  return createJSONStorage(() => AsyncStorage)
}
