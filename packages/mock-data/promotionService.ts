import {
  getPromotions,
  getPromotionCounts,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotionById,
  duplicatePromotionById,
  togglePromotionActiveById,
  endPromotionNowById,
  type Promotion,
  type PromotionsQuery,
  type PromotionStatus,
} from './promotions'
import {
  getCampaigns,
  getCampaignById,
  optIntoCampaign,
  withdrawFromCampaign,
  type Campaign,
  type CampaignOptInInput,
} from './campaigns'

export const promotionService = {
  list: getPromotions,
  counts: getPromotionCounts,
  getById: getPromotionById,
  create: createPromotion,
  update: updatePromotion,
  remove: deletePromotionById,
  duplicate: duplicatePromotionById,
  toggleActive: togglePromotionActiveById,
  endNow: endPromotionNowById,
}

export const campaignService = {
  list: getCampaigns,
  getById: getCampaignById,
  optIn: optIntoCampaign,
  withdraw: withdrawFromCampaign,
}

export type { Promotion, PromotionsQuery, PromotionStatus, Campaign, CampaignOptInInput }
