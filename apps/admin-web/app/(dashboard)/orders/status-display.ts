/**
 * Presentational mapping for order statuses (Order_Management_Module).
 *
 * Pure, server-safe helpers shared by the orders list and detail pages: the
 * canonical status ordering used by the status filter, the `@chinooz/ui-web`
 * `Badge` variant for each status, and a label resolver that maps a status to
 * its pre-resolved `@chinooz/i18n` string. Keeping this here avoids duplicating
 * the status→label / status→variant switches across the two routes while
 * holding no hard-coded user-visible strings (the caller passes the resolved
 * labels) and no design literals.
 */

import type { OrderStatus } from '@/lib/admin-core/types'

/** `@chinooz/ui-web` `Badge` variants used for order statuses. */
export type OrderBadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'

/**
 * Canonical order-status ordering, used to render the status filter options.
 * Mirrors the `OrderStatus` union in `lib/admin-core/types`.
 */
export const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
]

/** The subset of `admin.orders` i18n strings naming each order status. */
export interface OrderStatusLabels {
  statusPending: string
  statusConfirmed: string
  statusShipped: string
  statusDelivered: string
  statusCompleted: string
  statusCancelled: string
}

/** Maps an order status to its localized label. */
export function orderStatusLabel(
  status: OrderStatus,
  labels: OrderStatusLabels,
): string {
  switch (status) {
    case 'pending':
      return labels.statusPending
    case 'confirmed':
      return labels.statusConfirmed
    case 'shipped':
      return labels.statusShipped
    case 'delivered':
      return labels.statusDelivered
    case 'completed':
      return labels.statusCompleted
    case 'cancelled':
      return labels.statusCancelled
  }
}

/** Maps an order status to a `Badge` variant for visual emphasis. */
export function orderStatusBadgeVariant(status: OrderStatus): OrderBadgeVariant {
  switch (status) {
    case 'completed':
      return 'success'
    case 'delivered':
      return 'info'
    case 'shipped':
    case 'confirmed':
      return 'primary'
    case 'pending':
      return 'warning'
    case 'cancelled':
      return 'error'
  }
}

/**
 * Narrows an arbitrary string (e.g. a `status` search param) to an
 * {@link OrderStatus}, returning `undefined` when it is absent or not a valid
 * status. Used to validate the status filter before querying.
 */
export function parseOrderStatus(
  value: string | undefined,
): OrderStatus | undefined {
  if (value === undefined) return undefined
  return (ORDER_STATUSES as readonly string[]).includes(value)
    ? (value as OrderStatus)
    : undefined
}
