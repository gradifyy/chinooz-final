import { useMemo } from 'react'
import { useSellerSessionStore } from '@chinooz/state'
import { SELLER_PERMISSIONS, type StaffRole } from '@chinooz/mock-data'

/**
 * RBAC for the Seller platform.
 *
 * The permission matrix (`SELLER_PERMISSIONS`) maps each feature key
 * (dashboard, products, orders, inventory, promotions, messages, reviews,
 * finance, analytics, settings, staff) to the roles (owner/manager/staff) that
 * may access it. The current user's role lives in `useSellerSessionStore`.
 *
 * `useSellerPermission(key)` returns `{ can: boolean, role: StaffRole }` and is
 * the single hook screens/guards should call. This replaces the display-only
 * permission matrix in StaffSettings with an enforced check — wrap sensitive
 * routes/sections in a guard that reads `can`.
 */

export type SellerPermissionKey =
  | 'dashboard'
  | 'products'
  | 'orders'
  | 'inventory'
  | 'promotions'
  | 'messages'
  | 'reviews'
  | 'finance'
  | 'analytics'
  | 'settings'
  | 'staff'

/** Pure check — usable outside React (e.g. in route handlers/middleware). */
export function canSellerAccess(role: StaffRole, key: SellerPermissionKey): boolean {
  if (role === 'owner') return true
  const entry = SELLER_PERMISSIONS.find(p => p.key === key)
  if (!entry) return false
  return entry[role] === true
}

export function useSellerPermission(key: SellerPermissionKey): { can: boolean; role: StaffRole } {
  const role = useSellerSessionStore(s => s.role)
  const can = useMemo(() => canSellerAccess(role, key), [role, key])
  return { can, role }
}

/** True when the current user can access every one of the given keys. */
export function useSellerAllPermissions(keys: SellerPermissionKey[]): boolean {
  const role = useSellerSessionStore(s => s.role)
  return useMemo(() => keys.every(k => canSellerAccess(role, k)), [role, keys])
}
