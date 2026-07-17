import { createJSONStorage } from 'zustand/middleware'

interface AsyncStorageLike {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

/**
 * Webpack injects `__non_webpack_require__` as the real Node.js `require`
 * when it encounters the global in source code. Using it instead of the
 * standard `require` prevents webpack from trying to statically analyze
 * (and fail to bundle) the call, which eliminates the
 * "Critical dependency: the request of a dependency is an expression" warning.
 *
 * In Metro (React Native) and plain Node.js this global does not exist,
 * so we fall back to the standard module-scoped `require`.
 */
declare const __non_webpack_require__: NodeRequire | undefined

/**
 * Single source of truth for Zustand persistence storage across every store.
 *
 * - Web browser → `localStorage`.
 * - Next.js SSR (Node) → in-memory no-op (no persistence on the server).
 * - React Native native → `@react-native-async-storage/async-storage`, loaded
 *   lazily at runtime. If the package is not installed the store degrades to
 *   an in-memory no-op rather than crashing the native bundle.
 *
 * To enable native persistence: add `@react-native-async-storage/async-storage`
 * to `apps/buyer-mobile` and run the native prebuild — no code change needed here.
 */
const noopStorage = () =>
  createJSONStorage(() => ({
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  }))

export function getStorage() {
  // Web browser.
  if (typeof window !== 'undefined' && (window as { localStorage?: Storage }).localStorage) {
    return createJSONStorage(() => localStorage)
  }
  // Next.js / Node SSR — never persist on the server.
  if (
    typeof process !== 'undefined' &&
    (process as { versions?: { node?: string } }).versions?.node
  ) {
    return noopStorage()
  }
  // React Native native — optional AsyncStorage.
  try {
    let required: AsyncStorageLike & { default?: AsyncStorageLike }
    if (typeof __non_webpack_require__ !== 'undefined') {
      // Webpack: use the real Node require that bypasses static analysis.
      required = __non_webpack_require__('@react-native-async-storage/async-storage')
    } else {
      // Metro / Node: use the module-scoped require with a variable name
      // so the bundler does not statically resolve the optional dependency.
      const mod = '@react-native-async-storage/async-storage'
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      required = require(mod) as AsyncStorageLike & { default?: AsyncStorageLike }
    }
    const AsyncStorage = required.default ?? required
    if (AsyncStorage) return createJSONStorage(() => AsyncStorage)
  } catch {
    // AsyncStorage not installed — fall through to no-op.
  }
  return noopStorage()
}
