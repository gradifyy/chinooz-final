import {
  getAnalytics,
  getSalesTrend,
  getProductDetail,
  type AnalyticsSection,
  type AnalyticsRange,
  type AnalyticsFilter,
  type AnalyticsSectionData,
  type AnalyticsChartGranularity,
  type AnalyticsChartPoint,
  type AnalyticsProductDetail,
} from './sellerAnalytics'

export type {
  AnalyticsSection,
  AnalyticsRange,
  AnalyticsRangeKey,
  AnalyticsFilter,
  AnalyticsSectionData,
  AnalyticsKpi,
  AnalyticsChartPoint,
  AnalyticsBreakdownRow,
  AnalyticsBreakdownGroup,
  AnalyticsInsight,
  AnalyticsProductRow,
  AnalyticsFunnelStage,
  AnalyticsTrafficSource,
  AnalyticsProductCallout,
  AnalyticsCategoryComparison,
  AnalyticsProductDetail,
  AnalyticsCustomerRow,
  AnalyticsGeoRow,
  AnalyticsSearchTerm,
  AnalyticsChartGranularity,
} from './sellerAnalytics'

export { ANALYTICS_RANGES } from './sellerAnalytics'

export interface AnalyticsQueryOpts {
  compare?: boolean
  filter?: AnalyticsFilter
}

export interface SalesTrendOpts {
  granularity?: AnalyticsChartGranularity
  grossNet?: 'gross' | 'net'
  compare?: boolean
  filter?: AnalyticsFilter
}

export const analyticsService = {
  async getAnalytics(
    section: AnalyticsSection,
    range: AnalyticsRange,
    opts: AnalyticsQueryOpts = {},
  ): Promise<AnalyticsSectionData> {
    return getAnalytics(section, range, opts)
  },

  async getSalesTrend(
    range: AnalyticsRange,
    opts: SalesTrendOpts = {},
  ): Promise<{ points: AnalyticsChartPoint[]; granularity: AnalyticsChartGranularity; grossNet: 'gross' | 'net' }> {
    return getSalesTrend(range, opts)
  },

  async getProductDetail(
    productId: string,
    range: AnalyticsRange,
    opts: AnalyticsQueryOpts = {},
  ): Promise<AnalyticsProductDetail | null> {
    return getProductDetail(productId, range, opts)
  },

  async exportReport(
    section: AnalyticsSection,
    range: AnalyticsRange,
    format: 'csv' | 'pdf',
    opts: AnalyticsQueryOpts = {},
  ): Promise<{ url: string; mock: true }> {
    return {
      url: `mock://analytics/${section}/${range.key}.${format}`,
      mock: true,
    }
  },

  async saveReportView(
    name: string,
    section: AnalyticsSection,
    rangeKey: string,
    opts: AnalyticsQueryOpts = {},
  ): Promise<{ id: string; mock: true }> {
    return {
      id: `rpt-${Date.now()}`,
      mock: true,
    }
  },
}
