import { useSessionStore } from './session'
import { useCartStore } from './cart'
import { useWishlistStore } from './wishlist'
import { useCheckoutStore } from './checkout'
import { useAddressStore } from './address'
import { usePaymentsStore } from './payments'
import { usePreferencesStore } from './preferences'
import { useRecentlyViewedStore } from './recentlyViewed'
import { useRecentSearchesStore } from './recentSearches'

/**
 * Purge every locally-persisted piece of buyer data from the device.
 *
 * This is the client half of "Delete Account" (and, once a backend exists, it
 * should be called alongside a server-side `delete_account` RPC). Previously the
 * delete-account handlers only called `session.logout()`, which reset the session
 * but left the cart, wishlist, saved addresses, payment methods and preferences
 * sitting in `localStorage`/`AsyncStorage` — so a "deleted" account's personal
 * data survived on the device.
 *
 * Resets: session, cart, wishlist, checkout, addresses, payment methods,
 * notification preferences, recently-viewed and recent searches. Each store is
 * persisted, so resetting its in-memory state immediately overwrites the
 * persisted copy as well.
 *
 * Device-level UI preferences (locale / theme in the `ui` store) are intentionally
 * preserved — they are device settings, not account data.
 */
export function clearAllUserData(): void {
  useSessionStore.getState().logout()
  useCartStore.getState().clearCart()
  useWishlistStore.getState().clear()
  useCheckoutStore.getState().reset()
  useAddressStore.getState().reset()
  usePaymentsStore.getState().reset()
  usePreferencesStore.getState().reset()
  useRecentlyViewedStore.getState().clearAll()
  useRecentSearchesStore.getState().clearAll()
}
