import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '@chinooz/mock-data'
import type {
  AnalyticsSection,
  AnalyticsRange,
  AnalyticsFilter,
  AnalyticsChartGranularity,
} from '@chinooz/mock-data'

const STALE_TIME = 1000 * 60

export function useAnalytics(
  section: AnalyticsSection,
  range: AnalyticsRange,
  opts: { compare?: boolean; filter?: AnalyticsFilter } = {},
) {
  return useQuery({
    queryKey: ['analytics', section, range.key, range.days, range.custom?.start, range.custom?.end, opts.compare, opts.filter?.categoryId, opts.filter?.productId],
    queryFn: () => analyticsService.getAnalytics(section, range, opts),
    staleTime: STALE_TIME,
  })
}

export function useSalesTrend(
  range: AnalyticsRange,
  opts: {
    granularity?: AnalyticsChartGranularity
    grossNet?: 'gross' | 'net'
    compare?: boolean
    filter?: AnalyticsFilter
  } = {},
) {
  return useQuery({
    queryKey: ['analytics-sales-trend', range.key, range.days, opts.granularity, opts.grossNet, opts.compare, opts.filter?.categoryId, opts.filter?.productId],
    queryFn: () => analyticsService.getSalesTrend(range, opts),
    staleTime: STALE_TIME,
  })
}

export function useProductDetail(
  productId: string | null,
  range: AnalyticsRange,
  opts: { compare?: boolean; filter?: AnalyticsFilter } = {},
) {
  return useQuery({
    queryKey: ['analytics-product-detail', productId, range.key, range.days, opts.compare],
    queryFn: () => analyticsService.getProductDetail(productId as string, range, opts),
    enabled: !!productId,
    staleTime: STALE_TIME,
  })
}
