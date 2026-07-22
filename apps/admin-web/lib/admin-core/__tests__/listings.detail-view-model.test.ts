import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { formatNPRFromPaisa } from '@chinooz/utils'

import { listingDetailViewModel, type CurrencyLocale } from '../listings'
import { adminListingArb } from './arbitraries'

/**
 * Property test for the listing-detail view model (Property 21).
 *
 * For any listing, `listingDetailViewModel` produces a view model that includes
 * the title, the description, an NPR-formatted price (prefixed per locale —
 * `NPR ` for `'en'`, `रु. ` for `'ne'`), every image mapped one-to-one, and the
 * seller identity. The build is pure and non-mutating: the input listing and
 * its images are left untouched.
 *
 * Validates Requirements 6.4 (selecting a listing displays its title,
 * description, price in NPR, images, and seller).
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/** Both supported currency locales — NPR formatting must hold for each. */
const localeArb: fc.Arbitrary<CurrencyLocale> = fc.constantFrom('en', 'ne')

/** The NPR prefix the formatted price must begin with, per locale. */
const NPR_PREFIX: Record<CurrencyLocale, string> = {
  en: 'NPR ',
  ne: 'रु. ',
}

describe('listings.listingDetailViewModel (listing detail completeness)', () => {
  // Feature: admin-dashboard, Property 21: Listing detail model is complete
  // Validates: Requirements 6.4
  it('includes title, description, an NPR-formatted price, every image, and the seller, without mutating the input (Req 6.4)', () => {
    fc.assert(
      fc.property(adminListingArb, localeArb, (listing, locale) => {
        const before = structuredClone(listing)

        const model = listingDetailViewModel(listing, locale)

        // Title and description carry through verbatim.
        expect(model.title).toBe(listing.title)
        expect(model.description).toBe(listing.description)

        // Identifying fields carry through.
        expect(model.id).toBe(listing.id)
        expect(model.moderationStatus).toBe(listing.moderationStatus)

        // The price is preserved as raw paisa and rendered in NPR, beginning
        // with the locale's NPR prefix.
        expect(model.pricePaisa).toBe(listing.pricePaisa)
        expect(model.priceFormatted).toBe(
          formatNPRFromPaisa(listing.pricePaisa, locale),
        )
        expect(model.priceFormatted.startsWith(NPR_PREFIX[locale])).toBe(true)

        // Every image is included, one-to-one and in order.
        expect(model.images).toEqual(listing.images)
        expect(model.images).toHaveLength(listing.images.length)

        // The seller identity is included and equals the input.
        expect(model.seller).toEqual({
          id: listing.sellerId,
          name: listing.sellerName,
        })

        // Non-mutating: the input listing (and its images) is untouched.
        expect(listing).toEqual(before)
      }),
      { numRuns: RUNS },
    )
  })
})
