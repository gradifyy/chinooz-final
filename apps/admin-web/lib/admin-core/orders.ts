/**
 * Admin-core order-management domain logic.
 *
 * Pure helpers backing the Order_Management_Module (Requirement 5). No I/O, no
 * React, no cookies, no fetch — plain typed inputs and outputs. List
 * retrieval, persistence of cancellations, and audit-record appension live in
 * the surrounding action / `AdminApi` layer; this module only filters and
 * sorts collections, validates cancellation reasons, decides the guarded
 * cancellation transition on an order, constructs the audit record emitted on
 * a successful cancellation, and builds the order-detail view model.
 *
 * Time is expressed as epoch milliseconds (`now: number`) for arithmetic;
 * persisted timestamps on domain records use ISO UTC strings at second
 * precision (consistent with `auth.ts`, `rbac.ts`, `users.ts`, `approvals.ts`,
 * and `audit.ts`). Monetary values are integer paisa; NPR display strings are
 * derived via `formatNPRFromPaisa` from `@chinooz/utils` (Req 5.4/5.5).
 *
 * See design.md "Order_Management_Module" / `lib/admin-core/orders` and
 * Correctness Properties 17, 19, and 20.
 */

import { formatNPRFromPaisa } from '@chinooz/utils'

import { buildAuditRecord } from './audit'
import { filterBy, sortByCreatedDesc } from './shared'
import type {
  AdminOrder,
  AuditRecord,
  OrderLineItem,
  OrderStatus,
  PartyRef,
  ValidationResult,
} from './types'

/**
 * Locale selector for NPR formatting. Mirrors the `CurrencyLocale` accepted by
 * `formatNPRFromPaisa` in `@chinooz/utils` (`'en'` renders `NPR …`, `'ne'`
 * renders `रु. …` with Devanagari digits).
 */
export type CurrencyLocale = 'en' | 'ne'

// ---------------------------------------------------------------------------
// Created-descending sort (Req 5.1 / 5.2 — Property 9)
// ---------------------------------------------------------------------------

/**
 * Re-export of the shared {@link sortByCreatedDesc} helper: returns a
 * permutation of `orders` sorted by `createdAt` (ISO UTC) descending — most
 * recent first — stable and non-mutating (Req 5.1 / 5.2). Surfaced here so the
 * order module is the single import site for order-list ordering.
 */
export { sortByCreatedDesc }

// ---------------------------------------------------------------------------
// Status filtering (Req 5.2)
// ---------------------------------------------------------------------------

/**
 * Returns the orders matching `status`, in input order. When `status` is
 * `undefined`, no status constraint is imposed and every order is returned
 * (Req 5.2). Sound and complete: every order with the selected status is
 * included and no other order is. Non-mutating — the returned array is always
 * a fresh copy.
 */
export function filterByStatus(
  orders: readonly AdminOrder[],
  status?: OrderStatus,
): AdminOrder[] {
  if (status === undefined) return orders.slice()
  return filterBy(orders, (order) => order.status === status)
}

// ---------------------------------------------------------------------------
// Cancellation-reason validation (Req 5.7)
// ---------------------------------------------------------------------------

/** Minimum accepted cancellation-reason length, inclusive (Req 5.6 / 5.7). */
export const CANCELLATION_REASON_MIN_LENGTH = 1

/** Maximum accepted cancellation-reason length, inclusive (Req 5.6 / 5.7). */
export const CANCELLATION_REASON_MAX_LENGTH = 500

/**
 * Validates that a cancellation reason's length lies within the inclusive
 * bounds `[CANCELLATION_REASON_MIN_LENGTH, CANCELLATION_REASON_MAX_LENGTH]`
 * (1..500).
 *
 * A missing/empty reason (length below the minimum) or one longer than the
 * maximum is rejected with a descriptive `reason`; otherwise the reason is
 * accepted (Req 5.7). Used to block invalid cancellations so the order is left
 * unchanged.
 */
export function validateCancellationReason(reason: string): ValidationResult {
  if (reason.length < CANCELLATION_REASON_MIN_LENGTH) {
    return { ok: false, reason: 'Cancellation reason is required' }
  }
  if (reason.length > CANCELLATION_REASON_MAX_LENGTH) {
    return {
      ok: false,
      reason: `Cancellation reason must be at most ${CANCELLATION_REASON_MAX_LENGTH} characters`,
    }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Guarded cancellation (Req 5.6 / 5.7 / 5.8 — Property 17)
// ---------------------------------------------------------------------------

/**
 * Outcome of {@link cancelOrder}. On success the updated order (a copy with
 * status set to `cancelled` and `cancellationReason` recorded) is returned;
 * otherwise the input is left unchanged and a discriminated failure `reason` is
 * given:
 * - `'already_completed'` — the order is in `completed` status (Req 5.8).
 * - `'invalid_reason'` — the cancellation reason was missing or not 1..500
 *   characters (Req 5.7).
 */
export type CancelResult =
  | { ok: true; order: AdminOrder }
  | { ok: false; reason: 'already_completed' | 'invalid_reason' }

/**
 * Applies a guarded cancellation to an order (Property 17).
 *
 * The cancellation succeeds if and only if the order is **not** in `completed`
 * status **and** the reason is valid (1..500 characters). A completed order is
 * blocked with `'already_completed'` and left unchanged (Req 5.8); an invalid
 * reason is blocked with `'invalid_reason'` and the order status is left
 * unchanged (Req 5.7). The completed-status guard is checked first so a
 * completed order is never reported as having an invalid reason.
 *
 * On success a fresh order object with `status` set to `cancelled` and the
 * `cancellationReason` set is returned; the input is never mutated (Req 5.6).
 * The audit record for a successful cancellation is built by
 * {@link buildCancellationAuditRecord} in the action layer.
 */
export function cancelOrder(order: AdminOrder, reason: string): CancelResult {
  if (order.status === 'completed') {
    return { ok: false, reason: 'already_completed' }
  }
  if (!validateCancellationReason(reason).ok) {
    return { ok: false, reason: 'invalid_reason' }
  }
  return {
    ok: true,
    order: { ...order, status: 'cancelled', cancellationReason: reason },
  }
}

// ---------------------------------------------------------------------------
// Cancellation audit record (Req 5.6 — Property 17)
// ---------------------------------------------------------------------------

/** Action type recorded in the Audit_Log when an order is cancelled (Req 5.6). */
export const ORDER_CANCEL_ACTION = 'order_cancel'

/**
 * Builds the {@link AuditRecord} emitted on a successful order cancellation
 * (Req 5.6 — Property 17).
 *
 * The record carries the acting Administrator identity (`actorId`), the
 * affected Order identity (`entityId`), the action performed (`actionType`),
 * and a UTC second-precision timestamp derived from `now` (epoch
 * milliseconds). The cancellation reason is captured in `details`. Built via
 * the shared {@link buildAuditRecord} helper to match the record-construction
 * pattern used by the other admin-core modules.
 *
 * `order` should be the resulting order from a successful {@link cancelOrder}
 * (i.e. carrying the `cancelled` status and the `cancellationReason`).
 */
export function buildCancellationAuditRecord(
  actor: string,
  order: AdminOrder,
  now: number,
): AuditRecord {
  return buildAuditRecord(actor, ORDER_CANCEL_ACTION, order.id, now, {
    affectedId: order.id,
    cancellationReason: order.cancellationReason ?? '',
  })
}

// ---------------------------------------------------------------------------
// Order detail view model (Req 5.4 / 5.5 — Property 20)
// ---------------------------------------------------------------------------

/** A line item enriched with its NPR-formatted unit price (Req 5.5). */
export interface OrderLineItemViewModel extends OrderLineItem {
  /** `unitPricePaisa` rendered as an NPR string. */
  unitPriceFormatted: string
}

/**
 * View model for the order-detail screen (Property 20). Includes the buyer,
 * the seller, the rider when one is assigned (`undefined` otherwise), every
 * line item, the raw integer-paisa total, and the NPR-formatted total.
 */
export interface OrderDetailViewModel {
  id: string
  /** ISO UTC creation timestamp. */
  createdAt: string
  status: OrderStatus
  buyer: PartyRef
  seller: PartyRef
  /** Present only when a rider is assigned to the order. */
  rider?: PartyRef
  lineItems: OrderLineItemViewModel[]
  /** integer paisa */
  totalPaisa: number
  /** `totalPaisa` rendered as an NPR string via `@chinooz/utils`. */
  totalFormatted: string
}

/**
 * Builds the {@link OrderDetailViewModel} for an order (Property 20).
 *
 * The model always includes the buyer, the seller, and every line item; the
 * rider is included only when one is assigned (Req 5.4). The total and each
 * line item's unit price are formatted in NPR via `formatNPRFromPaisa` from
 * `@chinooz/utils`, using the supplied `locale` (default `'en'`) (Req 5.5).
 * Pure and non-mutating — the input order and its line items are not modified;
 * a fresh model with copied line items is returned.
 */
export function orderDetailViewModel(
  order: AdminOrder,
  locale: CurrencyLocale = 'en',
): OrderDetailViewModel {
  const lineItems: OrderLineItemViewModel[] = order.lineItems.map((item) => ({
    ...item,
    unitPriceFormatted: formatNPRFromPaisa(item.unitPricePaisa, locale),
  }))

  const model: OrderDetailViewModel = {
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    buyer: order.buyer,
    seller: order.seller,
    lineItems,
    totalPaisa: order.totalPaisa,
    totalFormatted: formatNPRFromPaisa(order.totalPaisa, locale),
  }

  if (order.rider !== undefined) {
    model.rider = order.rider
  }

  return model
}
