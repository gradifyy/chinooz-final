/**
 * Admin-core role-based access control (RBAC) domain logic.
 *
 * Pure helpers backing the Access_Control_Service (Requirement 2). No I/O, no
 * React, no cookies, no fetch — plain typed inputs and outputs. The
 * {@link ROLE_PERMISSIONS} map is the single, declarative source of truth for
 * role→permission mappings; every decision in this module derives from it.
 *
 * Time is expressed as epoch milliseconds (`now: number`) for arithmetic;
 * persisted timestamps on domain records use ISO UTC strings at second
 * precision (consistent with `auth.ts`).
 *
 * See design.md "Access_Control_Service" / `lib/admin-core/rbac` and
 * Correctness Properties 4, 5, 6, and 7.
 */

import type { AuditRecord, Permission, Role } from './types'

// ---------------------------------------------------------------------------
// Role → permission source of truth (Req 2.3 / 2.4 / 2.5 / 2.6 — Property 5)
// ---------------------------------------------------------------------------

/**
 * All view (read-only) permissions for the operational modules. These are the
 * permissions a {@link Role} of `Read_Only_Admin` is granted — viewing data is
 * always permitted (Req 2.5).
 *
 * Note: `settings.view` and `audit.view`, although their action segment is
 * `view`, are deliberately **not** part of the operational read set. Settings
 * and the audit log are restricted to `Super_Admin` (Req 8.6 / 9.4 — see
 * Property 5: `settings.manage` and `audit.view` are granted only when the
 * roles include `Super_Admin`), so they are scoped to that role alone.
 */
const OPERATIONAL_VIEW_PERMISSIONS: readonly Permission[] = [
  'users.view',
  'approvals.view',
  'orders.view',
  'listings.view',
  'analytics.view',
]

/** Every permission in the domain — the full grant for `Super_Admin`. */
const ALL_PERMISSIONS: readonly Permission[] = [
  'users.view',
  'users.manage',
  'approvals.view',
  'approvals.decide',
  'orders.view',
  'orders.cancel',
  'listings.view',
  'listings.moderate',
  'analytics.view',
  'settings.view',
  'settings.manage',
  'audit.view',
]

/**
 * Single source of truth mapping each {@link Role} to the set of
 * {@link Permission}s it grants. All authorization decisions derive from this
 * declarative map (Property 5).
 *
 * - `Super_Admin`: every permission, including `settings.view`,
 *   `settings.manage`, and `audit.view`.
 * - `Operations_Admin`: operational view + mutate permissions across users,
 *   approvals, orders, listings, and analytics — but never `settings.manage`
 *   or `audit.view`.
 * - `Support_Admin`: view-oriented support access (read across the operational
 *   modules); no mutating, settings, or audit permissions.
 * - `Read_Only_Admin`: the operational view permissions only — no mutating
 *   permissions and no privileged (settings/audit) views.
 */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  Super_Admin: new Set<Permission>(ALL_PERMISSIONS),
  Operations_Admin: new Set<Permission>([
    'users.view',
    'users.manage',
    'approvals.view',
    'approvals.decide',
    'orders.view',
    'orders.cancel',
    'listings.view',
    'listings.moderate',
    'analytics.view',
  ]),
  Support_Admin: new Set<Permission>([
    'users.view',
    'approvals.view',
    'orders.view',
    'listings.view',
    'analytics.view',
  ]),
  Read_Only_Admin: new Set<Permission>(OPERATIONAL_VIEW_PERMISSIONS),
}

// ---------------------------------------------------------------------------
// Role / permission resolution (Req 2.1 — 2.6 — Properties 4 & 5)
// ---------------------------------------------------------------------------

/**
 * Returns true when the account holds at least one role. Zero-role accounts
 * are inactive and denied every feature (Req 2.1 / 2.2 — Property 4).
 */
export function hasAnyRole(roles: Role[]): boolean {
  return roles.length > 0
}

/**
 * Returns the union of all permissions granted by the assigned `roles`
 * (Property 5). An empty role set yields an empty permission set. The returned
 * set is a fresh copy; the {@link ROLE_PERMISSIONS} map is never mutated.
 */
export function permissionsFor(roles: Role[]): Set<Permission> {
  const union = new Set<Permission>()
  for (const role of roles) {
    const granted = ROLE_PERMISSIONS[role]
    for (const permission of granted) {
      union.add(permission)
    }
  }
  return union
}

/**
 * Returns true if and only if `permission` is in the union of the permissions
 * granted by `roles` (Req 2.3 grant / Req 2.4 deny — Property 5).
 */
export function canPerform(roles: Role[], permission: Permission): boolean {
  return permissionsFor(roles).has(permission)
}

/**
 * Returns true when a permission mutates data — i.e. its action segment (the
 * part after the `.`) is not `view`. Used to enforce the read-only restriction
 * (Req 2.6 — Property 5).
 */
export function isMutating(permission: Permission): boolean {
  const action = permission.slice(permission.indexOf('.') + 1)
  return action !== 'view'
}

/**
 * Returns true when the account holds at least one role and every assigned
 * role is `Read_Only_Admin` — the read-only restriction applies only when no
 * broader role is also held (Req 2.5 / 2.6).
 */
export function isReadOnlyOnly(roles: Role[]): boolean {
  return hasAnyRole(roles) && roles.every((role) => role === 'Read_Only_Admin')
}

// ---------------------------------------------------------------------------
// Route guard for the middleware (design "middleware.ts" — Req 2 / 8.6 / 9.4)
// ---------------------------------------------------------------------------

/**
 * Maps the leading path segment of a protected feature route to the permission
 * required to access it. Routes not listed here are general authenticated
 * routes (e.g. the dashboard root) that any administrator holding a role may
 * reach. `/settings` and `/audit` are restricted to `Super_Admin` via the
 * `settings.manage` and `audit.view` permissions (Req 8.6 / 9.4).
 */
const ROUTE_PERMISSIONS: Readonly<Record<string, Permission>> = {
  users: 'users.view',
  approvals: 'approvals.view',
  orders: 'orders.view',
  listings: 'listings.view',
  analytics: 'analytics.view',
  settings: 'settings.manage',
  audit: 'audit.view',
}

/**
 * Returns the first non-empty path segment of `pathname` (e.g. `/users/123`
 * → `users`), or the empty string for the root path.
 */
function leadingSegment(pathname: string): string {
  const segments = pathname.split('/').filter((segment) => segment.length > 0)
  return segments[0] ?? ''
}

/**
 * Coarse route-level authorization used by the middleware guard. Returns true
 * when `roles` may access `pathname`.
 *
 * A zero-role account is denied every route (Property 4). Feature routes map
 * to a required permission via {@link ROUTE_PERMISSIONS} and are granted only
 * when {@link canPerform} holds; in particular `/settings` and `/audit` are
 * restricted to `Super_Admin` (Req 8.6 / 9.4). Any other route is reachable by
 * any administrator that holds at least one role.
 */
export function canAccessRoute(roles: Role[], pathname: string): boolean {
  if (!hasAnyRole(roles)) return false
  const required = ROUTE_PERMISSIONS[leadingSegment(pathname)]
  if (required === undefined) return true
  return canPerform(roles, required)
}

// ---------------------------------------------------------------------------
// Role-change audit record (Req 2.7 — Property 7)
// ---------------------------------------------------------------------------

/** Action type recorded in the Audit_Log for a role-assignment change. */
export const ROLE_CHANGE_ACTION = 'role_change'

/**
 * Formats an epoch-millisecond instant as an ISO UTC timestamp at second
 * precision with no sub-second component (e.g. `2024-01-01T00:00:00Z`).
 * Consistent with the convention in `auth.ts`.
 */
function toUtcSecondTimestamp(now: number): string {
  const truncated = Math.floor(now / 1000) * 1000
  return new Date(truncated).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/**
 * Serializes a role set to a stable, comma-separated string for storage in an
 * {@link AuditRecord}'s `details` (which holds `string` values only).
 */
function serializeRoles(roles: Role[]): string {
  return roles.join(',')
}

/**
 * Builds an {@link AuditRecord} for an administrator role-assignment change
 * (Req 2.7 — Property 7). The record carries the acting administrator identity
 * (`actorId`), the affected administrator identity (`entityId`), the previous
 * and new role sets (in `details`), and a UTC second-precision timestamp.
 * `now` is epoch milliseconds.
 */
export function buildRoleChangeAuditRecord(
  actor: string,
  affected: string,
  prevRoles: Role[],
  newRoles: Role[],
  now: number,
): AuditRecord {
  const timestamp = toUtcSecondTimestamp(now)
  return {
    id: `${ROLE_CHANGE_ACTION}:${actor}:${affected}:${timestamp}`,
    actorId: actor,
    actionType: ROLE_CHANGE_ACTION,
    entityId: affected,
    details: {
      affectedId: affected,
      previousRoles: serializeRoles(prevRoles),
      newRoles: serializeRoles(newRoles),
    },
    timestamp,
  }
}
