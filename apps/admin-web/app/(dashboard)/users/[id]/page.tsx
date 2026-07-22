/**
 * Marketplace user detail page (Server Component).
 *
 * The User_Management_Module detail view (Req 3.6). Server-first: it re-checks
 * the acting administrator's permission (defense in depth), fetches the
 * selected user through the mock {@link AdminApi}, and renders the account
 * details with the suspend / reactivate controls.
 *
 * - Account details: name, type, phone, email, and the current status (Req 3.6).
 * - The suspended status is displayed on the details whenever the account is
 *   suspended (Req 3.10) via the status badge.
 * - The suspend / reactivate controls (the `UserStatusControls` island) are
 *   shown only when the acting administrator holds `users.manage`; a read-only
 *   administrator sees the details without the mutating controls. The action
 *   itself also re-checks RBAC server-side, so hiding the control is a
 *   convenience, not the security boundary (Req 2.6).
 * - A missing user renders a not-found message rather than throwing.
 *
 * Every user-visible string comes from `@chinooz/i18n` (EN + NE) and all
 * styling from `@chinooz/theme` token utility classes (Req 10.1 / 11.1).
 *
 * _Requirements: 3.6, 3.10_
 */

import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { resources } from '@chinooz/i18n'
import { Badge, Card, Heading, Text } from '@chinooz/ui-web'

import { resolveLocale } from '@/lib/admin-core/i18n'
import { canPerform } from '@/lib/admin-core/rbac'
import type { UserType } from '@/lib/admin-core/types'
import { mockAdminApi } from '@/lib/api/mock'
import { readSession } from '@/lib/session'
import UserStatusControls from '@/components/users/UserStatusControls'

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Defense in depth: re-check session + permission even though middleware guards.
  const session = await readSession()
  if (session === null) redirect(`/login?next=/users/${id}`)
  if (!canPerform(session.roles, 'users.view')) redirect('/forbidden')

  const locale = resolveLocale((await cookies()).get('chinooz-locale')?.value)
  const t = resources[locale].translation.admin
  const tu = t.users

  const result = await mockAdminApi.users.get(id)

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Link href="/users" className="text-sm font-medium text-primary hover:underline">
          {tu.backToList}
        </Link>
        <Card>
          <Text variant="body" className="text-text-muted" testID="admin-user-not-found">
            {tu.notFound}
          </Text>
        </Card>
      </div>
    )
  }

  const user = result.data
  const canManage = canPerform(session.roles, 'users.manage')

  const typeLabel = (type: UserType): string =>
    type === 'buyer' ? tu.typeBuyer : type === 'seller' ? tu.typeSeller : tu.typeRider

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link
        href="/users"
        className="text-sm font-medium text-primary hover:underline"
        data-testid="admin-user-back"
      >
        {tu.backToList}
      </Link>

      <div className="flex items-center justify-between gap-4">
        <Heading variant="h2" testID="admin-user-detail-title">
          {user.name}
        </Heading>
        <Badge
          label={user.status === 'active' ? tu.statusActive : tu.statusSuspended}
          variant={user.status === 'active' ? 'success' : 'error'}
          testID="admin-user-detail-status"
        />
      </div>

      <Card>
        <div className="flex flex-col gap-4">
          <Heading variant="h4">{tu.accountDetails}</Heading>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt>
                <Text variant="caption" className="text-text-muted">
                  {tu.colName}
                </Text>
              </dt>
              <dd>
                <Text variant="body">{user.name}</Text>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt>
                <Text variant="caption" className="text-text-muted">
                  {tu.typeLabel}
                </Text>
              </dt>
              <dd>
                <Text variant="body">{typeLabel(user.type)}</Text>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt>
                <Text variant="caption" className="text-text-muted">
                  {tu.phoneLabel}
                </Text>
              </dt>
              <dd>
                <Text variant="body">{user.phone}</Text>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt>
                <Text variant="caption" className="text-text-muted">
                  {t.common.email}
                </Text>
              </dt>
              <dd>
                <Text variant="body">{user.email}</Text>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt>
                <Text variant="caption" className="text-text-muted">
                  {tu.colStatus}
                </Text>
              </dt>
              <dd>
                <Text variant="body" testID="admin-user-detail-status-text">
                  {user.status === 'active' ? tu.statusActive : tu.statusSuspended}
                </Text>
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      {/* Suspend / reactivate controls — shown only with users.manage (Req 2.6). */}
      {canManage && (
        <Card>
          <UserStatusControls
            userId={user.id}
            status={user.status}
            labels={{
              suspend: tu.suspend,
              reactivate: tu.reactivate,
              suspendConfirmTitle: tu.suspendConfirmTitle,
              suspendConfirmMessage: tu.suspendConfirmMessage,
              reactivateConfirmTitle: tu.reactivateConfirmTitle,
              reactivateConfirmMessage: tu.reactivateConfirmMessage,
              confirm: t.common.confirm,
              cancel: t.common.cancel,
              alreadyInStatus: tu.alreadyInStatus,
              updateError: tu.statusUpdateError,
            }}
          />
        </Card>
      )}
    </div>
  )
}
