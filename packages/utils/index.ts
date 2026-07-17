export { formatNPR, formatNPRCompact, formatAmount } from './currency'
export type { CurrencyLocale } from './currency'
export {
  PAISA_PER_NPR,
  paisaToNPR,
  nprToPaisa,
  addPaisa,
  subPaisa,
  formatNPRFromPaisa,
  formatNPRFromPaisaCompact,
} from './currency'
export { calcCartTotals, getDeliveryFee, SHIPPING_CONFIG } from './cartTotals'
export type { DeliveryFeeMethod, PromoCode } from './cartTotals'
export {
  sanitizeString,
  getInitials,
  FALLBACK_AVATAR,
  getImageSource,
  isEmpty,
  truncate,
} from './safeRender'
export { contrastRatio, meetsWCAG_AA, meetsWCAG_AAA, checkAllPairs } from './a11y'
export {
  memoComponent,
  useStableCallback,
  useDeepMemo,
  ITEM_HEIGHT,
  WINDOW_SIZE,
  INITIAL_NUM_TO_RENDER,
  MAX_TO_RENDER_PER_BATCH,
} from './performance'
export { maskAccountNumber, maskPhone, maskPan, maskEmail } from './masking'
export { compressImage, uploadOpRef } from './compressImage'
export type { CompressOptions } from './compressImage'
export {
  getLocale,
  formatDateLocalized,
  formatDateShort,
  formatDateLong,
  formatTimeRemaining,
  formatTimestamp,
  timeAgo,
} from './dates'
export { groupBySeller, getStatusColors, ORDER_STATUS_COLORS } from './orders'
export const MAX_QTY = 10
