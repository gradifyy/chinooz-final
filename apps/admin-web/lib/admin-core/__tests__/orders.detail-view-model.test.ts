import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { formatNPRFromPaisa } from '@chinooz/utils'

import { orderDetailViewModel, type CurrencyLocale } from '../orders'
import type { AdminOrder, PartyRef } from '../types'
import { adminOrderArb, partyRefArb } from './arbitraries'

/**
 * Property test for the order-detail view model (Property 20).
 *
 * For any order, `orderDetailViewModel` produces a view model that includes the
 * buyer, the seller, the rider when (and only when) one is assigned, every line
 * item mapped one-to-one (each carrying an NPR-formatted unit price), the raw
 * integer-paisa total, and an NPR-formatted total. The build is pure and
 * non-mutating: the input order and its line items are left untouched.
 *
 * Validates Requirements 5.4 (selecting an order displays buyer, seller, rider,
 * line items, and the total amount in NPR).
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/** Both supported currency locales — NPR formatting must hold for each. */
const localeArb: fc.Arbitrary<CurrencyLocale> = fc.constantFrom('en', 'ne')

/** An order forced to have a rider assigned. */
function orderWithRider(base: AdminOrder, rider: PartyRef): AdminOrder {
  return { ...base, rider }
}

/** An order forced to have no rider assigned. */
function orderWithoutRider(base: AdminOrder): AdminOrder {
  const { rider, ...rest } = base
  void rider
  return rest
}

describe('orders.orderDetailViewModel (order detail completeness)', () => {
  // Feature: admin-dashboard, Property 20: Order detail model is complete
  // Validates: Requirements 5.4
  it('includes buyer, seller, rider-when-assigned, every line item, and an NPR-formatted total, without mutating the input (Req 5.4)', () => {
    fc.assert(
      fc.property(
        adminOrderArb,
        partyRefArb,
        fc.boolean(),
        localeArb,
        (base, rider, assignRider, locale) => {
          const order = assignRider
            ? orderWithRider(base, rider)
            : orderWithoutRider(base)
          const before = structuredClone(order)

          const model = orderDetailViewModel(order, locale)

          // Buyer and seller are always present and equal the input.
          expect(model.buyer).toEqual(order.buyer)
          expect(model.seller).toEqual(order.seller)

          // Identifying fields carry through.
          expect(model.id).toBe(order.id)
          expect(model.createdAt).toBe(order.createdAt)
          expect(model.status).toBe(order.status)

          // The rider is included exactly when the input order has one.
          if (order.rider !== undefined) {
            expect(model.rider).toEqual(order.rider)
          } else {
            expect(model.rider).toBeUndefined()
          }

          // Line items correspond one-to-one to the input, each with an
          // NPR-formatted unit price.
          expect(model.lineItems).toHaveLength(order.lineItems.length)
          model.lineItems.forEach((vmItem, index) => {
            const source = order.lineItems[index]
            expect(vmItem.id).toBe(source.id)
            expect(vmItem.name).toBe(source.name)
            expect(vmItem.quantity).toBe(source.quantity)
            expect(vmItem.unitPricePaisa).toBe(source.unitPricePaisa)
            expect(vmItem.unitPriceFormatted).toBe(
              formatNPRFromPaisa(source.unitPricePaisa, locale),
            )
          })

          // The total is preserved as raw paisa and rendered in NPR.
          expect(model.totalPaisa).toBe(order.totalPaisa)
          expect(model.totalFormatted).toBe(
            formatNPRFromPaisa(order.totalPaisa, locale),
          )

          // Non-mutating: the input order (and its line items) is untouched.
          expect(order).toEqual(before)
        },
      ),
      { numRuns: RUNS },
    )
  })
})
