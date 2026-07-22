/**
 * Shared fast-check arbitraries for the admin-core domain.
 *
 * Pure test-support module: it generates values for every exported domain type
 * in `../types`, plus the cross-cutting building blocks the downstream property
 * tests (tasks 3.x, 4.x, 5.x, 6.x, ...) rely on — role sets, integer paisa
 * amounts, ISO UTC timestamps, date ranges, edge-case strings, and large
 * collections.
 *
 * No I/O, no React. Import as `import fc from 'fast-check'`. All generators are
 * exported as `Arbitrary<T>` values (or, for parameterised ones, as functions
 * returning an `Arbitrary<T>`). Property tests should run at a minimum of 100
 * iterations per the design Testing Strategy.
 */

import fc from 'fast-check'

import type {
  AccountStatus,
  AdminAccount,
  AdminListing,
  AdminOrder,
  AdminSession,
  AuditRecord,
  DateRange,
  LockoutState,
  MarketplaceUser,
  Metrics,
  ModerationStatus,
  OrderLineItem,
  OrderStatus,
  Page,
  PartyRef,
  Permission,
  PlatformSetting,
  RequesterType,
  Role,
  SettingChange,
  UserType,
  ValidationResult,
  VerificationDocument,
  VerificationRequest,
  VerificationStatus,
} from '../types'

// ---------------------------------------------------------------------------
// Primitive identifiers
// ---------------------------------------------------------------------------

/** A non-empty opaque identifier (UUID-shaped). */
export const idArb: fc.Arbitrary<string> = fc.uuid()

// ---------------------------------------------------------------------------
// Strings & edge cases (lengths 0/1/9/10/100/500/501, whitespace, Devanagari)
// ---------------------------------------------------------------------------

/** The empty string — exercises min-length rejection. */
export const emptyStringArb: fc.Arbitrary<string> = fc.constant('')

/** Common ASCII / Unicode whitespace characters. */
const WHITESPACE_CHARS = [' ', '\t', '\n', '\r', '\f', '\v', '\u00a0'] as const

/**
 * A string of length ≥ 1 composed solely of whitespace — exercises validators
 * that must treat all-whitespace input as effectively empty.
 */
export const whitespaceStringArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...WHITESPACE_CHARS), { minLength: 1, maxLength: 20 })
  .map((chars) => chars.join(''))

/**
 * Common Devanagari (Nepali) characters: consonants, vowels, vowel signs, and
 * digits. Used to confirm validators count by code points / treat non-ASCII
 * text correctly.
 */
const DEVANAGARI_CHARS = [
  'क', 'ख', 'ग', 'घ', 'च', 'छ', 'ज', 'झ', 'ट', 'ठ',
  'ड', 'ढ', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ', 'ब',
  'भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह',
  'ा', 'ि', 'ी', 'ु', 'ू', 'े', 'ै', 'ो', 'ौ', 'ं',
  'ः', '०', '१', '२', '३', '४', '५', '६', '७', '८', '९',
] as const

/** A non-empty string made of Devanagari (Nepali) characters. */
export const devanagariStringArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...DEVANAGARI_CHARS), { minLength: 1, maxLength: 50 })
  .map((chars) => chars.join(''))

/** A non-empty string of arbitrary printable text. */
export const nonEmptyStringArb: fc.Arbitrary<string> = fc.string({
  minLength: 1,
  maxLength: 50,
})

/** A string of exactly `length` characters. */
export function stringOfLengthArb(length: number): fc.Arbitrary<string> {
  return fc.string({ minLength: length, maxLength: length })
}

/** The boundary lengths the bounded-length validators care about. */
export const EDGE_CASE_LENGTHS = [0, 1, 9, 10, 100, 500, 501] as const

/**
 * A string sampled across the full edge-case space: each boundary length
 * (0/1/9/10/100/500/501), an all-whitespace string, and a Devanagari string.
 * Downstream validators bound things like search term (2..100), rejection /
 * cancellation reason (1..500), and listing removal reason (10..500); this
 * arbitrary probes just under, at, and just over each of those boundaries.
 */
export const edgeCaseStringArb: fc.Arbitrary<string> = fc.oneof(
  ...EDGE_CASE_LENGTHS.map((length) => stringOfLengthArb(length)),
  whitespaceStringArb,
  devanagariStringArb,
)

/** A string whose trimmed length is within `[min, max]` inclusive. */
export function boundedReasonArb(
  min: number,
  max: number,
): fc.Arbitrary<string> {
  return fc.string({ minLength: min, maxLength: max })
}

// ---------------------------------------------------------------------------
// Monetary values — integer paisa (non-negative)
// ---------------------------------------------------------------------------

/**
 * A non-negative integer amount of paisa. Includes 0, small values, and large
 * values (up to {@link Number.MAX_SAFE_INTEGER}) so overflow-sensitive sums are
 * exercised. Never negative — money is always ≥ 0 in this domain.
 */
export const paisaArb: fc.Arbitrary<number> = fc.oneof(
  { weight: 1, arbitrary: fc.constant(0) },
  { weight: 4, arbitrary: fc.nat() },
  {
    weight: 1,
    arbitrary: fc.integer({ min: 1_000_000_000, max: Number.MAX_SAFE_INTEGER }),
  },
)

// ---------------------------------------------------------------------------
// Access control: Role, Permission, role sets
// ---------------------------------------------------------------------------

export const ALL_ROLES: readonly Role[] = [
  'Super_Admin',
  'Operations_Admin',
  'Support_Admin',
  'Read_Only_Admin',
]

export const ALL_PERMISSIONS: readonly Permission[] = [
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

/** A single role. */
export const roleArb: fc.Arbitrary<Role> = fc.constantFrom(...ALL_ROLES)

/** A single permission. */
export const permissionArb: fc.Arbitrary<Permission> = fc.constantFrom(
  ...ALL_PERMISSIONS,
)

/** A possibly-empty set of distinct roles (0..4 roles). */
export const roleSetArb: fc.Arbitrary<Role[]> = fc.uniqueArray(roleArb, {
  maxLength: ALL_ROLES.length,
})

/** Always the empty role set — exercises inactive / zero-role accounts. */
export const emptyRoleSetArb: fc.Arbitrary<Role[]> = fc.constant([])

/** A non-empty set of distinct roles (1..4 roles). */
export const nonEmptyRoleSetArb: fc.Arbitrary<Role[]> = fc.uniqueArray(roleArb, {
  minLength: 1,
  maxLength: ALL_ROLES.length,
})

/** A distinct role set that always includes `Super_Admin`. */
export const superAdminRoleSetArb: fc.Arbitrary<Role[]> = fc
  .uniqueArray(roleArb, { maxLength: ALL_ROLES.length })
  .map((roles) =>
    roles.includes('Super_Admin') ? roles : ['Super_Admin', ...roles],
  )

// ---------------------------------------------------------------------------
// Timestamps & date ranges
// ---------------------------------------------------------------------------

/** Lower bound for generated instants (2000-01-01). */
const MIN_INSTANT = Date.UTC(2000, 0, 1)
/** Upper bound for generated instants (2030-12-31). */
const MAX_INSTANT = Date.UTC(2030, 11, 31)

/**
 * An ISO UTC timestamp string at second precision (e.g. `2024-01-01T00:00:00Z`),
 * matching the convention used across the domain modules. Lexicographic order
 * of these strings agrees with chronological order, which the sort properties
 * rely on.
 */
export const isoUtcTimestampArb: fc.Arbitrary<string> = fc
  .integer({ min: MIN_INSTANT, max: MAX_INSTANT })
  .map((ms) => {
    const truncated = Math.floor(ms / 1000) * 1000
    return new Date(truncated).toISOString().replace(/\.\d{3}Z$/, 'Z')
  })

/** An ISO date-only string (e.g. `2024-01-01`). */
export const isoDateArb: fc.Arbitrary<string> = fc
  .integer({ min: MIN_INSTANT, max: MAX_INSTANT })
  .map((ms) => new Date(ms).toISOString().slice(0, 10))

/**
 * A valid {@link DateRange} where `start <= end` (the inclusive ordering the
 * analytics module requires).
 */
export const dateRangeArb: fc.Arbitrary<DateRange> = fc
  .tuple(isoDateArb, isoDateArb)
  .map(([a, b]) => (a <= b ? { start: a, end: b } : { start: b, end: a }))

/** A degenerate {@link DateRange} where `start === end` (boundary case). */
export const equalDateRangeArb: fc.Arbitrary<DateRange> = isoDateArb.map(
  (d) => ({ start: d, end: d }),
)

/**
 * An invalid {@link DateRange} where `start > end` — used to confirm the
 * analytics module rejects reversed ranges.
 */
export const invalidDateRangeArb: fc.Arbitrary<DateRange> = fc
  .tuple(isoDateArb, isoDateArb)
  .filter(([a, b]) => a !== b)
  .map(([a, b]) => (a > b ? { start: a, end: b } : { start: b, end: a }))

// ---------------------------------------------------------------------------
// Marketplace users (Requirement 3)
// ---------------------------------------------------------------------------

export const userTypeArb: fc.Arbitrary<UserType> = fc.constantFrom(
  'buyer',
  'seller',
  'rider',
)

export const accountStatusArb: fc.Arbitrary<AccountStatus> = fc.constantFrom(
  'active',
  'suspended',
)

/** A digit-only phone-number-like string. */
export const phoneArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
    minLength: 10,
    maxLength: 10,
  })
  .map((digits) => digits.join(''))

export const marketplaceUserArb: fc.Arbitrary<MarketplaceUser> = fc.record({
  id: idArb,
  type: userTypeArb,
  name: nonEmptyStringArb,
  phone: phoneArb,
  email: fc.emailAddress(),
  status: accountStatusArb,
})

// ---------------------------------------------------------------------------
// Verification approvals (Requirement 4)
// ---------------------------------------------------------------------------

export const requesterTypeArb: fc.Arbitrary<RequesterType> = fc.constantFrom(
  'seller',
  'rider',
)

export const verificationStatusArb: fc.Arbitrary<VerificationStatus> =
  fc.constantFrom('pending', 'approved', 'rejected')

export const verificationDocumentArb: fc.Arbitrary<VerificationDocument> =
  fc.record({
    id: idArb,
    label: nonEmptyStringArb,
    url: fc.webUrl(),
  })

/**
 * A {@link VerificationRequest}. When the status is `rejected`, a non-empty
 * `rejectionReason` (1..500 chars) is supplied; otherwise it is omitted.
 */
export const verificationRequestArb: fc.Arbitrary<VerificationRequest> = fc
  .record({
    id: idArb,
    requesterId: idArb,
    requesterType: requesterTypeArb,
    submittedAt: isoUtcTimestampArb,
    status: verificationStatusArb,
    documents: fc.array(verificationDocumentArb, { maxLength: 5 }),
    rejectionReason: boundedReasonArb(1, 500),
  })
  .map(({ rejectionReason, ...rest }) =>
    rest.status === 'rejected' ? { ...rest, rejectionReason } : rest,
  )

// ---------------------------------------------------------------------------
// Orders (Requirement 5)
// ---------------------------------------------------------------------------

export const orderStatusArb: fc.Arbitrary<OrderStatus> = fc.constantFrom(
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
)

export const partyRefArb: fc.Arbitrary<PartyRef> = fc.record({
  id: idArb,
  name: nonEmptyStringArb,
})

export const orderLineItemArb: fc.Arbitrary<OrderLineItem> = fc.record({
  id: idArb,
  name: nonEmptyStringArb,
  quantity: fc.integer({ min: 1, max: 1000 }),
  unitPricePaisa: paisaArb,
})

/**
 * An {@link AdminOrder}. The `rider` party is optional; `cancellationReason`
 * (1..500 chars) is present exactly when the status is `cancelled`. `totalPaisa`
 * is generated independently as a non-negative paisa amount.
 */
export const adminOrderArb: fc.Arbitrary<AdminOrder> = fc
  .record({
    id: idArb,
    createdAt: isoUtcTimestampArb,
    status: orderStatusArb,
    buyer: partyRefArb,
    seller: partyRefArb,
    rider: fc.option(partyRefArb, { nil: undefined }),
    lineItems: fc.array(orderLineItemArb, { maxLength: 10 }),
    totalPaisa: paisaArb,
    cancellationReason: boundedReasonArb(1, 500),
  })
  .map(({ cancellationReason, ...rest }) =>
    rest.status === 'cancelled' ? { ...rest, cancellationReason } : rest,
  )

// ---------------------------------------------------------------------------
// Listings (Requirement 6)
// ---------------------------------------------------------------------------

export const moderationStatusArb: fc.Arbitrary<ModerationStatus> =
  fc.constantFrom('published', 'removed')

/**
 * An {@link AdminListing}. `removalReason` (10..500 chars) is present exactly
 * when the moderation status is `removed`.
 */
export const adminListingArb: fc.Arbitrary<AdminListing> = fc
  .record({
    id: idArb,
    title: nonEmptyStringArb,
    description: fc.string({ maxLength: 200 }),
    pricePaisa: paisaArb,
    images: fc.array(fc.webUrl(), { maxLength: 5 }),
    sellerId: idArb,
    sellerName: nonEmptyStringArb,
    moderationStatus: moderationStatusArb,
    removalReason: boundedReasonArb(10, 500),
  })
  .map(({ removalReason, ...rest }) =>
    rest.moderationStatus === 'removed' ? { ...rest, removalReason } : rest,
  )

// ---------------------------------------------------------------------------
// Analytics (Requirement 7)
// ---------------------------------------------------------------------------

export const metricsArb: fc.Arbitrary<Metrics> = fc.record({
  totalOrders: fc.nat(),
  totalSalesPaisa: paisaArb,
  activeSellers: fc.nat(),
  activeRiders: fc.nat(),
})

// ---------------------------------------------------------------------------
// Platform settings (Requirement 8)
// ---------------------------------------------------------------------------

export const platformSettingArb: fc.Arbitrary<PlatformSetting> = fc.record({
  id: idArb,
  value: fc.integer(),
})

export const settingChangeArb: fc.Arbitrary<SettingChange> = fc.record({
  id: idArb,
  previous: fc.integer(),
  next: fc.integer(),
})

// ---------------------------------------------------------------------------
// Audit log (Requirement 9)
// ---------------------------------------------------------------------------

export const auditRecordArb: fc.Arbitrary<AuditRecord> = fc.record({
  id: idArb,
  actorId: idArb,
  actionType: nonEmptyStringArb,
  entityId: idArb,
  details: fc.option(fc.dictionary(nonEmptyStringArb, fc.string()), {
    nil: undefined,
  }),
  timestamp: isoUtcTimestampArb,
})

// ---------------------------------------------------------------------------
// Access control records (Requirement 1 & 2)
// ---------------------------------------------------------------------------

/**
 * An {@link AdminAccount} whose `active` flag is kept consistent with its role
 * set (`active === roles.length > 0`).
 */
export const adminAccountArb: fc.Arbitrary<AdminAccount> = fc
  .record({
    id: idArb,
    identifier: fc.emailAddress(),
    roles: roleSetArb,
  })
  .map((account) => ({ ...account, active: account.roles.length > 0 }))

export const adminSessionArb: fc.Arbitrary<AdminSession> = fc
  .record({
    adminId: idArb,
    roles: nonEmptyRoleSetArb,
    issuedAt: isoUtcTimestampArb,
    lastSeenAt: isoUtcTimestampArb,
  })
  .map((session) =>
    session.issuedAt <= session.lastSeenAt
      ? session
      : { ...session, issuedAt: session.lastSeenAt, lastSeenAt: session.issuedAt },
  )

/** Lockout state: ascending epoch-millisecond failure timestamps. */
export const lockoutStateArb: fc.Arbitrary<LockoutState> = fc
  .array(fc.integer({ min: MIN_INSTANT, max: MAX_INSTANT }), { maxLength: 10 })
  .map((failures) => ({ failures: [...failures].sort((a, b) => a - b) }))

// ---------------------------------------------------------------------------
// Shared utility types & collections
// ---------------------------------------------------------------------------

/** A {@link ValidationResult} — either `{ ok: true }` or `{ ok: false, reason }`. */
export const validationResultArb: fc.Arbitrary<ValidationResult> = fc.oneof(
  fc.constant<ValidationResult>({ ok: true }),
  nonEmptyStringArb.map<ValidationResult>((reason) => ({ ok: false, reason })),
)

/**
 * A {@link Page} of items drawn from `itemArb`, with internally-consistent
 * pagination metadata (`items.length <= pageSize`, `page >= 1`,
 * `total >= items.length`).
 */
export function pageArb<T>(itemArb: fc.Arbitrary<T>): fc.Arbitrary<Page<T>> {
  return fc
    .record({
      items: fc.array(itemArb, { maxLength: 20 }),
      page: fc.integer({ min: 1, max: 100 }),
      pageSize: fc.integer({ min: 1, max: 50 }),
      extraTotal: fc.nat({ max: 1000 }),
    })
    .map(({ items, page, pageSize, extraTotal }) => ({
      items,
      page,
      pageSize: Math.max(pageSize, items.length),
      total: items.length + extraTotal,
    }))
}

/**
 * A large collection of `itemArb` values (50..500 items) for stress-testing
 * pagination and sort properties.
 */
export function largeCollectionArb<T>(
  itemArb: fc.Arbitrary<T>,
): fc.Arbitrary<T[]> {
  return fc.array(itemArb, { minLength: 50, maxLength: 500 })
}
