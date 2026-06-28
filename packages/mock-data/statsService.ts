import {
  getSellerDashboardMetrics,
  getEmptySellerDashboardMetrics,
  SELLER_GO_LIVE_TASKS,
  type SellerDashboardMetrics,
  type SellerDateRange,
  type SellerDateRangeKey,
  type SellerAlert,
} from './sellerDashboard'

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomDelay(min = 200, max = 600): Promise<void> {
  return delay(min + Math.random() * (max - min))
}

export async function getSellerDashboardStats(range: SellerDateRange): Promise<SellerDashboardMetrics> {
  await randomDelay(300, 700)
  return getSellerDashboardMetrics(range)
}

export async function getSellerDashboardStatsEmpty(range: SellerDateRange): Promise<SellerDashboardMetrics> {
  await randomDelay(100, 200)
  return getEmptySellerDashboardMetrics(range)
}

export async function getGoLiveChecklist(): Promise<typeof SELLER_GO_LIVE_TASKS> {
  await randomDelay(100, 200)
  return SELLER_GO_LIVE_TASKS
}

export type { SellerDashboardMetrics, SellerDateRange, SellerDateRangeKey, SellerAlert }
