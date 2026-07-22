import { createJSONStorage } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Encryption-backed storage for Zustand `persist` on React Native.
 *
 * Uses `expo-secure-store` (iOS Keychain / Android EncryptedSharedPreferences)
 * so PII (profile, addresses, payment prefs) is stored encrypted at rest.
 *
 * Values that exceed the SecureStore size budget (e.g. a very long address
 * list) transparently fall back to AsyncStorage so the app never crashes —
 * the common case (small text PII) is always encrypted.
 *
 * Metro resolves this `.native.ts` variant ahead of `secureStorage.ts` on
 * device; the web/SSR build never sees this file.
 */

const SECURE_VALUE_MAX_BYTES = 2048

function byteLength(str: string): number {
  return new TextEncoder().encode(str).length
}

const secureStateStorage = {
  getItem: (key: string): Promise<string | null> =>
    SecureStore.getItemAsync(key).then(secureValue => {
      if (secureValue !== null) return secureValue
      // Fall back to AsyncStorage for large values stored there previously.
      return AsyncStorage.getItem(key)
    }),

  setItem: (key: string, value: string): Promise<void> => {
    if (byteLength(value) > SECURE_VALUE_MAX_BYTES) {
      return AsyncStorage.setItem(key, value).then(() =>
        SecureStore.deleteItemAsync(key).catch(() => {}),
      )
    }
    return SecureStore.setItemAsync(key, value).then(() =>
      AsyncStorage.removeItem(key).catch(() => {}),
    )
  },

  removeItem: (key: string): Promise<void> =>
    Promise.all([
      SecureStore.deleteItemAsync(key).catch(() => {}),
      AsyncStorage.removeItem(key).catch(() => {}),
    ]).then(() => {}),
}

export function getSecureStorage() {
  return createJSONStorage(() => secureStateStorage)
}
