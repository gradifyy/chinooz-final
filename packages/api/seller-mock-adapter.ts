/**
 * Mock Seller API adapter — implements `SellerApi` by delegating to the
 * existing `@chinooz/mock-data` functions and service objects. This is the
 * default adapter used until a real backend is wired (flip
 * `USE_REAL_SELLER_API`).
 *
 * The mock namespace structurally satisfies every `Pick` group in `SellerApi`,
 * so each group is simply the mock namespace itself.
 */
import * as mockApi from '@chinooz/mock-data'
import {
  orderService,
  messagingService,
  sellerServices,
  promotionService,
  campaignService,
} from '@chinooz/mock-data'
import type { SellerApi } from './seller-types'

export function createMockSellerApi(): SellerApi {
  return {
    orders: orderService,
    messages: messagingService,
    services: sellerServices,
    promotions: promotionService,
    campaigns: campaignService,
    catalog: mockApi,
    dashboard: mockApi,
    finance: mockApi,
    analytics: mockApi,
    sellerReviews: mockApi,
    notifications: mockApi,
    onboarding: mockApi,
    promoCrud: mockApi,
  }
}
