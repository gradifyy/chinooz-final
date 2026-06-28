export interface ActiveSession {
  id: string
  device: string
  location: string
  lastActive: string
  current: boolean
}

export const SELLER_ACTIVE_SESSIONS: ActiveSession[] = [
  { id: 'session-1', device: 'Chrome — Macbook Pro', location: 'Kathmandu, Nepal', lastActive: 'Now', current: true },
  { id: 'session-2', device: 'Chinooz Seller App — iPhone 15', location: 'Kathmandu, Nepal', lastActive: '2h ago', current: false },
  { id: 'session-3', device: 'Chrome — Windows PC', location: 'Pokhara, Nepal', lastActive: '3d ago', current: false },
]

export const SELLER_ACCOUNT_DEFAULTS = {
  name: 'Ram Sharma',
  phone: '9801234567',
  email: 'ram@chinoozstore.com',
  passwordLastChanged: '2025-01-15',
  biometricEnabled: false,
  twoFactorEnabled: false,
}
