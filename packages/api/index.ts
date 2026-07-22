/**
 * @chinooz/api — shared API abstraction layer.
 *
 * Exports:
 *  - `BuyerApi` interface (the contract)
 *  - `createApi()` factory (returns mock or HTTP adapter based on flag)
 *  - `ApiClient` / `ApiError` (low-level HTTP client)
 *  - All type interfaces for request/response shapes
 *
 * Usage:
 *   import { createApi } from '@chinooz/api'
 *   const api = createApi({ baseUrl: 'https://api.chinooz.com' })
 *   const product = await api.getProductById('prod-1')
 *
 * When no real backend is available, the mock adapter is used automatically.
 * Set `process.env.NEXT_PUBLIC_USE_REAL_API === 'true'` (web) or
 * `process.env.EXPO_PUBLIC_USE_REAL_API === 'true'` (mobile) to switch to HTTP.
 */

export { ApiClient, ApiError } from './client'
export type { ApiClientConfig, RequestOptions } from './client'
export type { BuyerApi } from './types'
export type {
  PaginatedResult,
  SearchParams,
  FacetedSearchParams,
  SubmitReviewData,
  CancelOrderData,
  ReturnRequestData,
  OtpResult,
  OtpRequestResult,
  FeedbackData,
  FeedbackResult,
  FbtResult,
  SellerStorefrontResult,
} from './types'
export { createMockApi } from './mock-adapter'
export { createHttpApi } from './http-adapter'
// Seller API contract + adapters (mirror of the Buyer pattern). See
// `seller-types.ts` for the `SellerApi` interface.
export type { SellerApi } from './seller-types'
export { createMockSellerApi } from './seller-mock-adapter'
export { createHttpSellerApi } from './seller-http-adapter'

import { createMockApi } from './mock-adapter'
import { createHttpApi } from './http-adapter'
import { createMockSellerApi } from './seller-mock-adapter'
import { createHttpSellerApi } from './seller-http-adapter'
import type { ApiClientConfig } from './client'
import type { BuyerApi } from './types'
import type { SellerApi } from './seller-types'

export interface CreateApiOptions {
  baseUrl: string
  /** Override the flag detection; defaults to env-based detection. */
  useRealApi?: boolean
  /** Passed to the HTTP adapter when real API is enabled. */
  authTokenProvider?: () => string | null | undefined
  /** Called once on a 401 to refresh the access token; the original request is
   *  retried with the fresh token. Wire this to the auth store's refresh
   *  endpoint. Shared single-flight across concurrent 401s. */
  refreshTokenProvider?: () => Promise<string | null>
}

function detectUseRealApi(): boolean {
  if (typeof process !== 'undefined') {
    const webFlag = process.env.NEXT_PUBLIC_USE_REAL_API
    const mobileFlag = process.env.EXPO_PUBLIC_USE_REAL_API
    return webFlag === 'true' || mobileFlag === 'true'
  }
  return false
}

export function createApi(options: CreateApiOptions): BuyerApi {
  const useReal = options.useRealApi ?? detectUseRealApi()

  if (useReal) {
    const config: ApiClientConfig = {
      baseUrl: options.baseUrl,
      getAuthToken: options.authTokenProvider,
      refreshAuthToken: options.refreshTokenProvider,
    }
    return createHttpApi(config)
  }

  return createMockApi()
}

/**
 * Seller API factory — returns a mock or HTTP adapter based on the
 * `USE_REAL_SELLER_API` flag (falls back to the shared `USE_REAL_API` flag).
 * This is the single entry point seller hooks should use, so the mock data
 * layer can be swapped for a real backend with no hook changes:
 *
 *   import { createSellerApi } from '@chinooz/api'
 *   const sellerApi = createSellerApi({ baseUrl: 'https://api.chinooz.com' })
 *   await sellerApi.orders.getOrders(sellerId, 'new')
 */
export interface CreateSellerApiOptions {
  baseUrl: string
  /** Override flag detection; defaults to env-based detection. */
  useRealApi?: boolean
  /** Passed to the HTTP adapter when real API is enabled. */
  authTokenProvider?: () => string | null | undefined
  /** Called once on a 401 to refresh the seller access token. */
  refreshTokenProvider?: () => Promise<string | null>
}

function detectUseRealSellerApi(): boolean {
  if (typeof process !== 'undefined') {
    const sellerFlag = process.env.NEXT_PUBLIC_USE_REAL_SELLER_API ?? process.env.EXPO_PUBLIC_USE_REAL_SELLER_API
    if (sellerFlag !== undefined) return sellerFlag === 'true'
    return detectUseRealApi()
  }
  return false
}

export function createSellerApi(options: CreateSellerApiOptions): SellerApi {
  const useReal = options.useRealApi ?? detectUseRealSellerApi()

  if (useReal) {
    const config: ApiClientConfig = {
      baseUrl: options.baseUrl,
      getAuthToken: options.authTokenProvider,
      refreshAuthToken: options.refreshTokenProvider,
    }
    return createHttpSellerApi(config)
  }

  return createMockSellerApi()
}
