/**
 * Orders list page (Server Component) — Order_Management_Module.
 *
 * Renders a page of orders paginated at 25 records, ordered by creation
 * timestamp descending, with a status filter and an empty-state message
 * (Req 5.1, 5.2, 5.3). Server-first: the active locale, status filter, and
 * page number are read from the request (cookie + `searchParams`), and the
 * ordering / status filtering / 25-per-page pagination are performed by the
 * pure `admin-core` helpers behind `AdminApi.orders.list`. There is no client
 * island on this route — the status filter and pager are plain navigation
 * links that re-run the server query.
 *
 * Monetary totals are displayed in NPR via `@chinooz/utils` (Req 5.5). Every
 * user-visible string comes from the `@chinooz/i18n` EN/NE catalogs (Req 10.1),
 * and all styling uses `@chinooz/theme` token utility classes only (Req 11.1).
 *
 * _Requirements: 5.1, 5.2, 5.3, 5.5_
 */

import { cookies } from 'next/headers'
import Link from 'next/link'
import { resources } from '@chinooz/i18n'
import { formatNPRFromPaisa } from '@chinooz/utils'
import { Badge, Card, EmptyState, Heading, Text } from '@chinooz/ui-web'

import { resolveLocale } from '@/lib/admin-core/i18n'
import { mockAdminApi } from '@/lib/api/mock'
import type { OrderStatus } from '@/lib/admin-core/types'
import {
  ORDER_STATUSES,
  orderStatusBadgeVariant,
  orderStatusLabel,
  parseOrderStatus,
} from './status-display'

/** Parses the 1-based `page` search param, defaulting to page 1. */
function parsePage(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
}

/** Builds an `/orders` href carrying the given status filter and page. */
function ordersHref(status: OrderStatus | undefined, page: number): string {
  const params = new URLSearchParams()
  if (status !== undefined) params.set('status', status)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query.length > 0 ? `/orders?${query}` : '/orders'
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; page?: string | string[] }>
}) {
  const locale = resolveLocale((await cookies()).get('chinooz-locale')?.value)
  const t = resources[locale].translation.admin
  const orders = t.orders

  const params = await searchParams
  const statusParam = typeof params.status === 'string' ? params.status : undefined
  const pageParam = typeof params.page === 'string' ? params.page : undefined

  const status = parseOrderStatus(statusParam)
  const requestedPage = parsePage(pageParam)

  // Status filtering, created-descending ordering, and 25-per-page pagination
  // are all applied by the pure core helpers behind the AdminApi (Req 5.1/5.2).
  const result = await mockAdminApi.orders.list({ status, page: requestedPage })
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))

  return (
    <div className="flex flex-col gap-6 p-6">
      <Heading variant="h2" testID="admin-orders-title">
        {orders.title}
      </Heading>

      {/* Status filter (Req 5.2) — plain navigation links, no client island. */}
      <nav aria-label={orders.filterStatus} className="flex flex-wrap gap-2">
        <Link
          href={ordersHref(undefined, 1)}
          aria-current={status === undefined ? 'true' : undefined}
          className={`flex h-9 items-center rounded-full px-3 text-sm font-medium transition-colors ${
            status === undefined
              ? 'bg-primary text-white'
              : 'bg-surface text-text-muted hover:text-text'
          }`}
        >
          {orders.allStatuses}
        </Link>
        {ORDER_STATUSES.map((option) => {
          const active = status === option
          return (
            <Link
              key={option}
              href={ordersHref(option, 1)}
              aria-current={active ? 'true' : undefined}
              className={`flex h-9 items-center rounded-full px-3 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-muted hover:text-text'
              }`}
            >
              {orderStatusLabel(option, orders)}
            </Link>
          )
        })}
      </nav>

      {result.items.length === 0 ? (
        // Empty-state message (Req 5.3) — distinguishes a filtered empty result.
        <EmptyState
          title={status === undefined ? orders.empty : orders.emptyFiltered}
          testID="admin-orders-empty"
        />
      ) : (
        <>
          <Card padded={false}>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="px-4 py-3 text-sm font-semibold text-text-muted">
                    {orders.orderId}
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-text-muted">
                    {orders.buyer}
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-text-muted">
                    {orders.seller}
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-text-muted">
                    {t.common.status}
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-text-muted">
                    {orders.total}
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-text-muted">
                    {orders.placedOn}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border-light last:border-0 hover:bg-background"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-sm font-medium text-primary"
                        data-testid={`admin-order-link-${order.id}`}
                      >
                        {order.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-text">{order.buyer.name}</td>
                    <td className="px-4 py-3 text-sm text-text">{order.seller.name}</td>
                    <td className="px-4 py-3">
                      <Badge
                        label={orderStatusLabel(order.status, orders)}
                        variant={orderStatusBadgeVariant(order.status)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text">
                      {formatNPRFromPaisa(order.totalPaisa, locale)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {order.createdAt.slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Pager (Req 5.1) — preserves the active status filter. */}
          <div className="flex items-center justify-between">
            <Text variant="caption" className="text-text-muted">
              {t.pagination.page} {result.page} {t.pagination.of} {totalPages}
            </Text>
            <div className="flex gap-2">
              {result.page > 1 && (
                <Link
                  href={ordersHref(status, result.page - 1)}
                  className="flex h-9 items-center rounded-md bg-surface px-3 text-sm font-medium text-text hover:bg-background"
                  data-testid="admin-orders-prev"
                >
                  {t.pagination.previous}
                </Link>
              )}
              {result.page < totalPages && (
                <Link
                  href={ordersHref(status, result.page + 1)}
                  className="flex h-9 items-center rounded-md bg-surface px-3 text-sm font-medium text-text hover:bg-background"
                  data-testid="admin-orders-next"
                >
                  {t.pagination.next}
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
