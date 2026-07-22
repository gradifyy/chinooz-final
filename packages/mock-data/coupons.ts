/**
 * Buyer-facing promo coupons shown on the Deals screen.
 *
 * Single source of truth for BOTH buyer-web and buyer-mobile so the codes,
 * discounts and terms presented to buyers are identical across platforms.
 * Previously each app hardcoded its own divergent list (web: CHINOOZ10 /
 * FREESHIP / FLASH20; mobile: WELCOME15 / FREESHIP / FLAT500 / FLASH20), which
 * meant a code seen on one platform might not exist on the other.
 *
 * The shape is a superset of what each app's coupon card needs:
 *   - web `CouponCard`  consumes { code, description, discount }
 *     (discount = `${discountLabel} ${discountUnit}`)
 *   - mobile `CouponTicket` consumes { code, big, small, desc, terms }
 *     (big = discountLabel, small = discountUnit, desc = description)
 *
 * NOTE: copy here is English-only, matching the prior hardcoded arrays in both
 * apps (coupon copy was never localized on either side). When coupon i18n is
 * added, replace `description`/`terms` with i18n keys in one place here.
 */
export interface BuyerCoupon {
  /** Promo code the buyer copies, e.g. "WELCOME15". */
  code: string
  /** Headline discount, e.g. "15%", "FREE", "Rs 500". */
  discountLabel: string
  /** Short unit rendered under/after the headline, e.g. "OFF", "SHIP". */
  discountUnit: string
  /** One-line description of the offer. */
  description: string
  /** Eligibility / fine print. */
  terms: string
}

export const buyerCoupons: BuyerCoupon[] = [
  {
    code: 'WELCOME15',
    discountLabel: '15%',
    discountUnit: 'OFF',
    description: '15% off your first order',
    terms: 'Up to Rs 1,500 · new buyers',
  },
  {
    code: 'FREESHIP',
    discountLabel: 'FREE',
    discountUnit: 'SHIP',
    description: 'Free delivery on your order',
    terms: 'Min. spend Rs 1,000',
  },
  {
    code: 'FLAT500',
    discountLabel: 'Rs 500',
    discountUnit: 'OFF',
    description: 'Rs 500 off big baskets',
    terms: 'On orders over Rs 2,500',
  },
  {
    code: 'FLASH20',
    discountLabel: '20%',
    discountUnit: 'OFF',
    description: 'Extra 20% on flash deals',
    terms: 'Min. spend Rs 1,500',
  },
]
