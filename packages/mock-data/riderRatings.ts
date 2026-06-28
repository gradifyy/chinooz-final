/**
 * RP3 — Rider ratings & feedback mock data.
 *
 * Surfaces:
 * - getRiderRatings():  rating summary (average stars, 5→1 distribution,
 *   recent trend), a feedback list with optional comments + tags, and the
 *   filter shape (by stars / by tag).
 * - getRiderRatingHighlights():  positive highlights (top compliments) and
 *   constructive themes, both drawn from the same feedback so the rider sees
 *   a fair, motivating picture.
 *
 * Buyer identities are intentionally limited/anonymized: each row carries an
 * anonymized label (e.g. "Buyer in Patan") rather than a name, and no user
 * IDs. The report path routes to Support with the rating id.
 *
 * Tone: compliments are celebrated, criticism is framed constructively, and
 * the report-unfair-rating action is always one tap away.
 */

export type RiderRatingTag =
  | 'polite'
  | 'fast'
  | 'careful'
  | 'on_time'
  | 'communicative'
  | 'late'
  | 'rushed'
  | 'unresponsive'
  | 'rough_handling'

export type RiderRatingTagTone = 'positive' | 'constructive'

export interface RiderRatingTagInfo {
  id: RiderRatingTag
  /** i18n key for the tag label. */
  labelKey: string
  tone: RiderRatingTagTone
}

export const RIDER_RATING_TAGS: RiderRatingTagInfo[] = [
  { id: 'polite', labelKey: 'rider.ratings.tagPolite', tone: 'positive' },
  { id: 'fast', labelKey: 'rider.ratings.tagFast', tone: 'positive' },
  { id: 'careful', labelKey: 'rider.ratings.tagCareful', tone: 'positive' },
  { id: 'on_time', labelKey: 'rider.ratings.tagOnTime', tone: 'positive' },
  { id: 'communicative', labelKey: 'rider.ratings.tagCommunicative', tone: 'positive' },
  { id: 'late', labelKey: 'rider.ratings.tagLate', tone: 'constructive' },
  { id: 'rushed', labelKey: 'rider.ratings.tagRushed', tone: 'constructive' },
  { id: 'unresponsive', labelKey: 'rider.ratings.tagUnresponsive', tone: 'constructive' },
  { id: 'rough_handling', labelKey: 'rider.ratings.tagRoughHandling', tone: 'constructive' },
]

export interface RiderRatingDistribution {
  5: number
  4: number
  3: number
  2: number
  1: number
}

export interface RiderRatingSummary {
  /** Average rating (0-5, one decimal). */
  average: number
  /** Total rated deliveries. */
  total: number
  /** 5→1 distribution counts. */
  distribution: RiderRatingDistribution
  /** Change vs the previous period (percentage points), signed. */
  trendPct: number
  /** Previous period average, for context. */
  previousAverage: number
}

export interface RiderRatingRow {
  id: string
  /** ISO date (yyyy-mm-dd). */
  date: string
  /** 1-5 stars. */
  rating: number
  /** Anonymized buyer label, e.g. "Buyer in Patan". */
  buyerLabel: string
  /** Zone label (where the delivery happened). */
  zone: string
  /** Optional comment from the buyer. */
  comment?: string
  /** Tags attached to this rating. */
  tags: RiderRatingTag[]
  /** Whether the rider has already reported this rating as unfair. */
  reported?: boolean
}

export type RiderRatingFilter = {
  stars?: number | 'all'
  tag?: RiderRatingTag | 'all'
}

export interface RiderRatingHighlight {
  /** i18n key for the highlight label. */
  labelKey: string
  /** Count of feedback rows that mention this. */
  count: number
  /** Share of total (0..1). */
  share: number
}

export interface RiderRatingHighlights {
  /** Top compliments (positive). */
  positive: RiderRatingHighlight[]
  /** Constructive themes (not punishments — framed as room to grow). */
  constructive: RiderRatingHighlight[]
}

export interface RiderRatingsResult {
  summary: RiderRatingSummary
  items: RiderRatingRow[]
  highlights: RiderRatingHighlights
}

export const RIDER_RATING_TAG_LABEL_KEY: Record<RiderRatingTag, string> = {
  polite: 'rider.ratings.tagPolite',
  fast: 'rider.ratings.tagFast',
  careful: 'rider.ratings.tagCareful',
  on_time: 'rider.ratings.tagOnTime',
  communicative: 'rider.ratings.tagCommunicative',
  late: 'rider.ratings.tagLate',
  rushed: 'rider.ratings.tagRushed',
  unresponsive: 'rider.ratings.tagUnresponsive',
  rough_handling: 'rider.ratings.tagRoughHandling',
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const FEEDBACK: Omit<RiderRatingRow, 'id'>[] = [
  {
    date: '2026-06-27',
    rating: 5,
    buyerLabel: 'Buyer in Thamel',
    zone: 'Thamel',
    comment: 'Very polite and quick. Handled the package carefully.',
    tags: ['polite', 'fast', 'careful'],
  },
  {
    date: '2026-06-27',
    rating: 5,
    buyerLabel: 'Buyer in Patan',
    zone: 'Patan',
    comment: 'Arrived right on time. Great communication.',
    tags: ['on_time', 'communicative'],
  },
  {
    date: '2026-06-26',
    rating: 4,
    buyerLabel: 'Buyer in Baluwatar',
    zone: 'Baluwatar',
    comment: 'Friendly rider, slightly late due to traffic.',
    tags: ['polite', 'late'],
  },
  {
    date: '2026-06-26',
    rating: 5,
    buyerLabel: 'Buyer in Kirtipur',
    zone: 'Kirtipur',
    tags: ['fast', 'careful'],
  },
  {
    date: '2026-06-25',
    rating: 2,
    buyerLabel: 'Buyer in Naxal',
    zone: 'Naxal',
    comment: 'Package looked a bit rough. Please handle with care.',
    tags: ['rough_handling'],
  },
  {
    date: '2026-06-25',
    rating: 5,
    buyerLabel: 'Buyer in Boudha',
    zone: 'Boudha',
    comment: 'Super smooth delivery. Thank you!',
    tags: ['polite', 'on_time', 'careful'],
  },
  {
    date: '2026-06-24',
    rating: 3,
    buyerLabel: 'Buyer in Jorpati',
    zone: 'Jorpati',
    comment: 'Took a while to respond after pickup.',
    tags: ['unresponsive'],
  },
  {
    date: '2026-06-24',
    rating: 5,
    buyerLabel: 'Buyer in Kalanki',
    zone: 'Kalanki',
    tags: ['fast', 'communicative'],
  },
  {
    date: '2026-06-23',
    rating: 4,
    buyerLabel: 'Buyer in Baneshwor',
    zone: 'Baneshwor',
    comment: 'Good delivery, felt a little rushed at drop-off.',
    tags: ['rushed'],
  },
  {
    date: '2026-06-23',
    rating: 5,
    buyerLabel: 'Buyer in Lagankhel',
    zone: 'Lagankhel',
    comment: 'Very careful with the package. On time.',
    tags: ['careful', 'on_time'],
  },
  {
    date: '2026-06-22',
    rating: 1,
    buyerLabel: 'Buyer in Maharajgunj',
    zone: 'Maharajgunj',
    comment: 'Late and hard to reach. Delivery was important.',
    tags: ['late', 'unresponsive'],
  },
  {
    date: '2026-06-22',
    rating: 5,
    buyerLabel: 'Buyer in Swayambhu',
    zone: 'Swayambhu',
    tags: ['polite', 'fast'],
  },
]

const FEEDBACK_WITH_IDS: RiderRatingRow[] = FEEDBACK.map((f, i) => ({
  ...f,
  id: `r-${i + 1}`,
}))

function summarize(list: RiderRatingRow[]): RiderRatingSummary {
  const distribution: RiderRatingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  let sum = 0
  for (const r of list) {
    distribution[r.rating as 5 | 4 | 3 | 2 | 1] += 1
    sum += r.rating
  }
  const total = list.length
  const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0
  // Mock trend: up a little vs the prior period.
  const previousAverage = Math.max(0, Math.round((average - 0.2) * 10) / 10)
  const trendPct = total > 0 ? Math.round(((average - previousAverage) / Math.max(0.1, previousAverage)) * 100) : 0
  return { average, total, distribution, trendPct, previousAverage }
}

function buildHighlights(list: RiderRatingRow[]): RiderRatingHighlights {
  const counts: Record<RiderRatingTag, number> = {
    polite: 0, fast: 0, careful: 0, on_time: 0, communicative: 0,
    late: 0, rushed: 0, unresponsive: 0, rough_handling: 0,
  }
  for (const r of list) {
    for (const tag of r.tags) counts[tag] += 1
  }
  const total = list.length || 1
  const positive: RiderRatingHighlight[] = []
  const constructive: RiderRatingHighlight[] = []
  for (const info of RIDER_RATING_TAGS) {
    const entry = { labelKey: info.labelKey, count: counts[info.id], share: Math.round((counts[info.id] / total) * 100) / 100 }
    if (info.tone === 'positive') positive.push(entry)
    else constructive.push(entry)
  }
  positive.sort((a, b) => b.count - a.count)
  constructive.sort((a, b) => b.count - a.count)
  return { positive, constructive }
}

export async function getRiderRatings(
  filter: RiderRatingFilter = { stars: 'all', tag: 'all' },
): Promise<RiderRatingsResult> {
  await delay(200 + Math.random() * 240)
  let items = FEEDBACK_WITH_IDS
  if (filter.stars && filter.stars !== 'all') {
    items = items.filter(r => r.rating === filter.stars)
  }
  if (filter.tag && filter.tag !== 'all') {
    items = items.filter(r => r.tags.includes(filter.tag as RiderRatingTag))
  }
  // Summary + highlights always reflect the full set (fair, stable picture).
  const summary = summarize(FEEDBACK_WITH_IDS)
  const highlights = buildHighlights(FEEDBACK_WITH_IDS)
  return { summary, items, highlights }
}

/** Mark a rating as reported (routes to Support in the UI). Mock-only. */
export async function reportRiderRating(
  ratingId: string,
): Promise<{ success: boolean }> {
  await delay(160 + Math.random() * 200)
  const row = FEEDBACK_WITH_IDS.find(r => r.id === ratingId)
  if (row) row.reported = true
  return { success: true }
}
