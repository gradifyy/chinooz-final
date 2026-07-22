import { createJSONStorage } from 'zustand/middleware'

/**
 * Web / SSR fallback for secure storage.
 *
 * On web, authentication tokens live in HttpOnly server cookies (see the C1
 * fix in `apps/buyer-web/lib/auth/session.ts`), so client-readable
 * localStorage is acceptable for the remaining client-side PII (profile name,
 * addresses, etc.) — it is no less secure than any other client-side store.
 *
 * On the server (Next.js SSR) persistence is a no-op.
 */
const noopStorage = () =>
  createJSONStorage(() => ({
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  }))

export function getSecureStorage() {
  if (typeof window !== 'undefined' && (window as { localStorage?: Storage }).localStorage) {
    return createJSONStorage(() => localStorage)
  }
  return noopStorage()
}
