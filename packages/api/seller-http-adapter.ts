/**
 * HTTP Seller API adapter — placeholder for the real backend implementation.
 *
 * Every method rejects with a 501 `ApiError` until the real endpoints are wired.
 * The shape matches `SellerApi` so swapping `createMockSellerApi()` →
 * `createHttpSellerApi()` (behind the `USE_REAL_SELLER_API` flag) requires no
 * changes in hooks or screens.
 *
 * Implementation note: methods are lazily proxied — any property access returns
 * a function that rejects with a descriptive "not implemented" error, so new
 * `SellerApi` methods are covered automatically without updating this stub.
 */
import { ApiError, type ApiClientConfig } from './client'
import type { SellerApi } from './seller-types'

function notImplementedGroup(label: string): never {
  // A Proxy that returns a rejecting function for any property access.
  const handler: ProxyHandler<Record<string, unknown>> = {
    get: (_target, prop) =>
      () =>
        Promise.reject(
          new ApiError(`Seller HTTP API not implemented: ${label}.${String(prop)}`, 501),
        ),
  }
  return new Proxy({}, handler) as never
}

export function createHttpSellerApi(_config: ApiClientConfig): SellerApi {
  return {
    orders: notImplementedGroup('orders'),
    messages: notImplementedGroup('messages'),
    services: notImplementedGroup('services'),
    promotions: notImplementedGroup('promotions'),
    campaigns: notImplementedGroup('campaigns'),
    catalog: notImplementedGroup('catalog'),
    dashboard: notImplementedGroup('dashboard'),
    finance: notImplementedGroup('finance'),
    analytics: notImplementedGroup('analytics'),
    sellerReviews: notImplementedGroup('sellerReviews'),
    notifications: notImplementedGroup('notifications'),
    onboarding: notImplementedGroup('onboarding'),
    promoCrud: notImplementedGroup('promoCrud'),
  } as unknown as SellerApi
}
