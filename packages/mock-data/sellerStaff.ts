export type StaffRole = 'owner' | 'manager' | 'staff'
export type StaffStatus = 'active' | 'pending'

export interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  role: StaffRole
  status: StaffStatus
  invitedAt?: string
}

export interface PermissionEntry {
  key: string
  labelKey: string
  owner: boolean
  manager: boolean
  staff: boolean
}

export const SELLER_PERMISSIONS: PermissionEntry[] = [
  { key: 'dashboard', labelKey: 'seller.settings.staff.permissions.dashboard', owner: true, manager: true, staff: true },
  { key: 'products', labelKey: 'seller.settings.staff.permissions.products', owner: true, manager: true, staff: true },
  { key: 'orders', labelKey: 'seller.settings.staff.permissions.orders', owner: true, manager: true, staff: true },
  { key: 'inventory', labelKey: 'seller.settings.staff.permissions.inventory', owner: true, manager: true, staff: false },
  { key: 'promotions', labelKey: 'seller.settings.staff.permissions.promotions', owner: true, manager: true, staff: false },
  { key: 'messages', labelKey: 'seller.settings.staff.permissions.messages', owner: true, manager: true, staff: true },
  { key: 'reviews', labelKey: 'seller.settings.staff.permissions.reviews', owner: true, manager: true, staff: true },
  { key: 'finance', labelKey: 'seller.settings.staff.permissions.finance', owner: true, manager: false, staff: false },
  { key: 'analytics', labelKey: 'seller.settings.staff.permissions.analytics', owner: true, manager: true, staff: false },
  { key: 'settings', labelKey: 'seller.settings.staff.permissions.settings', owner: true, manager: false, staff: false },
  { key: 'staff', labelKey: 'seller.settings.staff.permissions.staff', owner: true, manager: false, staff: false },
]

export const SELLER_STAFF_ROLES: { id: StaffRole; labelKey: string; descKey: string }[] = [
  { id: 'owner', labelKey: 'seller.settings.staff.roles.owner', descKey: 'seller.settings.staff.roles.ownerDesc' },
  { id: 'manager', labelKey: 'seller.settings.staff.roles.manager', descKey: 'seller.settings.staff.roles.managerDesc' },
  { id: 'staff', labelKey: 'seller.settings.staff.roles.staff', descKey: 'seller.settings.staff.roles.staffDesc' },
]

export const SELLER_STAFF_DEFAULTS: StaffMember[] = [
  { id: 'staff-1', name: 'Ram Sharma', email: 'ram@chinoozstore.com', phone: '9801234567', role: 'owner', status: 'active' },
  { id: 'staff-2', name: 'Sita Karki', email: 'sita@chinoozstore.com', phone: '9851234567', role: 'manager', status: 'active' },
  { id: 'staff-3', name: 'Hari Thapa', email: 'hari@chinoozstore.com', phone: '9741234567', role: 'staff', status: 'pending', invitedAt: '2025-02-10' },
]

export const SENSITIVE_AREAS = ['finance', 'settings', 'staff'] as const
