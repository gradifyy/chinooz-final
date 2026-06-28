/**
 * Review Service — clean boundary for review operations.
 *
 * Currently backed by mock data (@chinooz/mock-data).
 * Swap implementations to Supabase without changing call sites.
 */

import * as mockApi from './api'
import type {
  SellerReview,
  SellerReviewFilter,
  SellerReviewResult,
} from './api'
import type { ReviewFlagReason, SellerReviewResponse } from '@chinooz/types'

export type { SellerReview, SellerReviewFilter, SellerReviewResult, ReviewFlagReason }

export interface ReviewSummary {
  average: number
  total: number
  needsResponseCount: number
  respondedCount: number
  flaggedCount: number
}

export const reviewService = {
  async getReviews(filter: SellerReviewFilter): Promise<SellerReviewResult> {
    return mockApi.getSellerReviews(filter)
  },

  async getSummary(): Promise<ReviewSummary> {
    const result = await mockApi.getSellerReviews({})
    return {
      average: result.summary.average,
      total: result.summary.total,
      needsResponseCount: result.counts.needs_response,
      respondedCount: result.counts.responded,
      flaggedCount: result.counts.flagged,
    }
  },

  async respondToReview(reviewId: string, text: string): Promise<{ success: boolean; review?: SellerReview }> {
    return mockApi.respondToSellerReview(reviewId, text)
  },

  async editResponse(reviewId: string, text: string): Promise<{ success: boolean; review?: SellerReview }> {
    return mockApi.editSellerReviewResponse(reviewId, text)
  },

  async deleteResponse(reviewId: string): Promise<{ success: boolean; review?: SellerReview }> {
    return mockApi.deleteSellerReviewResponse(reviewId)
  },

  async flagReview(reviewId: string, reason: ReviewFlagReason): Promise<{ success: boolean; review?: SellerReview }> {
    return mockApi.flagSellerReview(reviewId, reason)
  },

  async unflagReview(reviewId: string): Promise<{ success: boolean; review?: SellerReview }> {
    return mockApi.unflagSellerReview(reviewId)
  },

  async bulkUpdate(reviewIds: string[], action: mockApi.BulkReviewAction, reason?: ReviewFlagReason): Promise<{ success: boolean; updated: SellerReview[] }> {
    return mockApi.bulkUpdateSellerReviews(reviewIds, action, reason)
  },
}
