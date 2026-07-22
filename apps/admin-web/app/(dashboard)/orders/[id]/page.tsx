/**
 * Order detail page (Server Component) — Order_Management_Module.
 *
 * Displays a single order's details: the buyer, seller, rider (when assigned),
 * every line item, and the total amount — all monetary values formatted in NPR
 * (Req 5.4, 5.5). The view model (including the NPR-formatted total and per
 * line-item unit prices) is built by the pure
 * `admin-core/orders.orderDetailViewModel`, so this page only renders it.
 *
 * The cancellation control is the page's single interactive island
 * (`CancelOrderForm`); it is rendered only when the order is in a cancellable
 * state (not completed, not already cancelled), and the guarded cancellation
 * itself is enforced server-side by `cancelOrderAction` (Req 5.6–5.8).
 *
 * Every user-visible string comes from the `@chinooz/i18n` EN/NE catalogs
 * (Req 10.1); all styling uses `@chinooz/theme` token utility classes only
 * (Req 11.1).
 *
 * _Requirements: 5.4, 5.5_
 */

import { cookies } from 'next/headers'
import Link from 'next/link'
import { resources } from '@chinooz/i18n'
import { Badge, Card, Divider, EmptyState, Heading, Text } from '@chinooz/ui-web'

import { resolveLocale } from '@/lib/admin-core/i18n'
import { orderDetailViewModel } from '@/lib/admin-core/orders'
import { mockAdminApi } from '@/lib/api/mock'
import CancelOrderForm from '@/components/CancelOrderForm'
import { orderStatusBadgeVariant, orderStatusLabel } from '../status-display'

/** Order statuses that can no longer be cancelled (Req 5.8). */
const NON_CANCELLABLE: ReadonlyArray<string> = ['completed', 'cancelled']

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const locale = resolveLocale((await cookies()).get('chinooz-locale')?.value)
  const t = resources[locale].translation.admin
  const orders = t.orders

  const { id } = await params
  const found = await mockAdminApi.orders.get(id)

  if (!found.ok) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <EmptyState title={orders.notFound} testID="admin-order-not-found" />
        <Link href="/orders" className="text-sm font-medium text-primary">
          {t.common.back}
        </Link>
      </div>
    )
  }

  // The NPR-formatted total and per-item unit prices are computed by the pure
  // core view-model builder (Req 5.4 / 5.5).
  const order = orderDetailViewModel(found.data, locale)
  const cancellable = !NON_CANCELLABLE.includes(order.status)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Link href="/orders" className="text-sm font-medium text-primary">
          {t.common.back}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Heading variant="h2" testID="admin-order-detail-title">
            {orders.detailTitle}
          </Heading>
          <Badge
            label={orderStatusLabel(order.status, orders)}
            variant={orderStatusBadgeVariant(order.status)}
          />
        </div>
        <Text variant="caption" className="text-text-muted">
          {orders.orderId}: {order.id}
        </Text>
        <Text variant="caption" className="text-text-muted">
          {orders.placedOn}: {order.createdAt.slice(0, 10)}
        </Text>
      </div>

      {/* Parties: buyer, seller, rider (when assigned) (Req 5.4) */}
      <Card>
        <Heading variant="h4" className="mb-3">
          {orders.parties}
        </Heading>
        <dl className="flex flex-col gap-2">
          <div className="flex justify-between gap-4">
            <dt className="text-sm text-text-muted">{orders.buyer}</dt>
            <dd className="text-sm font-medium text-text">{order.buyer.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-sm text-text-muted">{orders.seller}</dt>
            <dd className="text-sm font-medium text-text">{order.seller.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-sm text-text-muted">{orders.rider}</dt>
            <dd className="text-sm font-medium text-text" data-testid="admin-order-rider">
              {order.rider?.name ?? orders.riderUnassigned}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Line items + total (Req 5.4 / 5.5) */}
      <Card padded={false}>
        <Heading variant="h4" className="px-4 pt-4">
          {orders.lineItems}
        </Heading>
        <table className="mt-3 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border-light">
              <th className="px-4 py-2 text-sm font-semibold text-text-muted">
                {orders.item}
              </th>
              <th className="px-4 py-2 text-sm font-semibold text-text-muted">
                {orders.quantity}
              </th>
              <th className="px-4 py-2 text-sm font-semibold text-text-muted">
                {orders.unitPrice}
              </th>
            </tr>
          </thead>
          <tbody>
            {order.lineItems.map((item) => (
              <tr key={item.id} className="border-b border-border-light last:border-0">
                <td className="px-4 py-2 text-sm text-text">{item.name}</td>
                <td className="px-4 py-2 text-sm text-text">{item.quantity}</td>
                <td className="px-4 py-2 text-sm text-text">{item.unitPriceFormatted}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Divider />
        <div className="flex items-center justify-between px-4 py-3">
          <Text variant="label" className="text-text">
            {orders.total}
          </Text>
          <Text variant="label" className="text-text" testID="admin-order-total">
            {order.totalFormatted}
          </Text>
        </div>
      </Card>

      {/* Cancellation island — only for orders that can still be cancelled. */}
      {cancellable && (
        <Card>
          <Heading variant="h4" className="mb-3">
            {orders.cancel}
          </Heading>
          <CancelOrderForm
            orderId={order.id}
            labels={{
              cancel: orders.cancel,
              cancelling: orders.cancelling,
              reason: orders.cancelReason,
              reasonPlaceholder: orders.cancelReasonPlaceholder,
              reasonRequired: t.validation.reasonRequired,
              reasonTooLong: t.validation.reasonTooLong,
              cancelled: orders.cancelled,
              alreadyCompleted: orders.alreadyCompleted,
              actionDenied: t.forbidden.actionDenied,
              cancelError: orders.cancelError,
            }}
          />
        </Card>
      )}
    </div>
  )
}
