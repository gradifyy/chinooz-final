/**
 * Seller API contract — the interface that both the mock adapter and the real
 * HTTP adapter implement. This is the single boundary that seller hooks
 * (`@chinooz/hooks`) and seller screens should consume, so the mock data layer
 * can be swapped for a real backend behind the `USE_REAL_SELLER_API` flag with
 * no hook or screen changes.
 *
 * Mirrors the `BuyerApi` pattern in `./types.ts`. Grouped by domain:
 *  - `orders`        — seller order management (status, fulfill, cancel, returns)
 *  - `messages`      — seller conversations / messages
 *  - `services`      — auth / store / KYC / payout onboarding
 *  - `promotions`    — promotion service
 *  - `campaigns`     — campaign service
 *  - `catalog`       — products, inventory, stock, thresholds
 *  - `dashboard`     — dashboard metrics
 *  - `finance`       — finance summary, payouts, withdrawals, COD reconciliation
 *  - `analytics`     — analytics + sales trend
 *  - `sellerReviews` — seller review management
 *  - `notifications` — seller notifications
 *  - `onboarding`    — OTP / handle availability / categories
 *  - `promoCrud`     — create / update promotions
 *
 * Each group is a `Pick` of the mock-data namespace (or a service object type),
 * so the mock adapter satisfies the contract structurally with zero drift.
 */

import * as MockApi from '@chinooz/mock-data'
import type { orderService, messagingService, sellerServices, promotionService, campaignService } from '@chinooz/mock-data'

export interface SellerApi {
  orders: typeof orderService
  messages: typeof messagingService
  services: typeof sellerServices
  promotions: typeof promotionService
  campaigns: typeof campaignService

  catalog: Pick<
    typeof MockApi,
    | 'getSellerProducts'
    | 'getSellerInventory'
    | 'getSellerCategories'
    | 'updateStock'
    | 'bulkUpdateStock'
    | 'updateThreshold'
    | 'setRestockReminder'
    | 'getStockHistory'
    | 'getLowStockAlerts'
    | 'exportStockCsv'
    | 'importStockCsv'
  >

  dashboard: Pick<typeof MockApi, 'getSellerDashboardMetrics'>

  finance: Pick<
    typeof MockApi,
    | 'getFinanceSummary'
    | 'getFinancePayouts'
    | 'requestWithdraw'
    | 'getWithdrawMethods'
    | 'rollbackWithdraw'
    | 'getCodReconciliation'
    | 'exportCodReconciliationCSV'
  >

  analytics: Pick<typeof MockApi, 'getAnalytics' | 'getSalesTrend'>

  sellerReviews: Pick<
    typeof MockApi,
    | 'getSellerReviews'
    | 'respondToSellerReview'
    | 'editSellerReviewResponse'
    | 'deleteSellerReviewResponse'
    | 'toggleSellerReviewFlag'
    | 'flagSellerReview'
    | 'unflagSellerReview'
    | 'bulkUpdateSellerReviews'
  >

  notifications: Pick<
    typeof MockApi,
    | 'getSellerNotifications'
    | 'getUnreadSellerNotificationCount'
    | 'markSellerNotificationRead'
    | 'markAllSellerNotificationsRead'
  >

  onboarding: Pick<
    typeof MockApi,
    'requestOtp' | 'verifyOtp' | 'checkHandleAvailability' | 'getCategories'
  >

  promoCrud: Pick<typeof MockApi, 'createPromotion' | 'updatePromotion'>
}
