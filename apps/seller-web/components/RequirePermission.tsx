'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'
import { Container, Screen } from '@chinooz/ui-web'
import { useSellerPermission, type SellerPermissionKey } from '@chinooz/hooks'

/**
 * RBAC route guard for seller-web. Wrap any page/section that requires a
 * permission. If the current seller's role lacks the permission, a "no access"
 * state is rendered instead of the children — so the feature is enforced
 * client-side at the route boundary. (Server-side enforcement must still be
 * added at the API layer; this prevents the UI from showing actions the user
 * can't perform and from rendering screens they can't access.)
 *
 * Usage:
 *   <RequirePermission permission="finance">
 *     <FinanceScreen />
 *   </RequirePermission>
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: SellerPermissionKey
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const { can } = useSellerPermission(permission)

  if (can) return <>{children}</>

  return (
    <Screen>
      <Container className="py-16 max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error-light">
          <ShieldAlert size={28} className="text-error" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-text">
          {t('seller.rbac.noAccessTitle')}
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          {t('seller.rbac.noAccessBody')}
        </p>
      </Container>
    </Screen>
  )
}

export default RequirePermission
