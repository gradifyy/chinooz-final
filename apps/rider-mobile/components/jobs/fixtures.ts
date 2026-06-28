import type { JobRequest, JobHistoryEntry } from './types'

const now = Date.now()
const minsFromNow = (m: number) => now + m * 60000
const minsAgo = (m: number) => now - m * 60000

/**
 * RJ3 — available job requests near the rider's zone.
 * Stubbed for the shell; replaced by a query in a later pass.
 */
export const AVAILABLE_REQUESTS: JobRequest[] = [
  {
    id: 'rj3-1',
    orderRef: 'CHZ-2048',
    pickupLabel: 'TechHub Nepal, Putalisadak',
    dropoffLabel: 'Baluwatar, Kathmandu',
    pickupDistanceKm: 0.8,
    tripDistanceKm: 3.4,
    payout: 180,
    etaDropoffMs: minsFromNow(22),
    codAmount: 1290,
    itemSummary: '2 items',
    itemCount: 2,
    vehicle: 'bike',
    expiresAtMs: minsFromNow(2.5),
  },
  {
    id: 'rj3-2',
    orderRef: 'CHZ-2051',
    pickupLabel: 'Dhaka Crafts, Patan',
    dropoffLabel: 'Jawalakhel, Lalitpur',
    pickupDistanceKm: 1.2,
    tripDistanceKm: 2.1,
    payout: 120,
    etaDropoffMs: minsFromNow(15),
    itemSummary: '1 item',
    itemCount: 1,
    vehicle: 'scooter',
    expiresAtMs: minsFromNow(1.75),
  },
  {
    id: 'rj3-3',
    orderRef: 'CHZ-2053',
    pickupLabel: 'Mart Nepal, Chabahil',
    dropoffLabel: 'Boudha, Kathmandu',
    pickupDistanceKm: 2.0,
    tripDistanceKm: 4.6,
    payout: 210,
    etaDropoffMs: minsFromNow(28),
    codAmount: 840,
    itemSummary: 'Grocery bag',
    itemCount: 3,
    vehicle: 'bike',
    expiresAtMs: minsFromNow(3),
  },
]

/**
 * RJ5 — completed / cancelled job history.
 * Stubbed for the shell; replaced by a query in a later pass.
 */
export const HISTORY_ENTRIES: JobHistoryEntry[] = [
  {
    id: 'rj5-h1',
    orderRef: 'CHZ-2031',
    pickupLabel: 'TechHub Nepal, Putalisadak',
    dropoffLabel: 'Baneshwor, Kathmandu',
    payout: 150,
    status: 'completed',
    finishedAt: minsAgo(95),
    tripDistanceKm: 3.1,
    durationMin: 19,
    codAmount: 0,
    itemSummary: '2 items',
    itemCount: 2,
    vehicle: 'bike',
    acceptedAt: minsAgo(114),
  },
  {
    id: 'rj5-h2',
    orderRef: 'CHZ-2024',
    pickupLabel: 'Mart Nepal, Chabahil',
    dropoffLabel: 'Gausala, Kathmandu',
    payout: 90,
    status: 'completed',
    finishedAt: minsAgo(180),
    tripDistanceKm: 1.8,
    durationMin: 11,
    itemSummary: '1 item',
    itemCount: 1,
    vehicle: 'scooter',
    acceptedAt: minsAgo(191),
  },
  {
    id: 'rj5-h3',
    orderRef: 'CHZ-2018',
    pickupLabel: 'Dhaka Crafts, Patan',
    dropoffLabel: 'Kupondole, Lalitpur',
    payout: 110,
    status: 'cancelled',
    finishedAt: minsAgo(320),
    tripDistanceKm: 2.0,
    durationMin: 0,
    codAmount: 840,
    itemSummary: '1 item',
    itemCount: 1,
    vehicle: 'cycle',
    acceptedAt: minsAgo(328),
  },
]
