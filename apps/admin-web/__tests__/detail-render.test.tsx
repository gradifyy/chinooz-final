import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { resources } from '@chinooz/i18n'

import type { AdminSession, Role } from '@/lib/admin-core/types'

/**
 * Component / render tests for the Admin Dashboard detail views (task 19.11).
 *
 * These assert that the user, verification-request, order, and listing detail
 * Server Components render the correct fields for the selected entity, and that
 * a suspended marketplace user surfaces the suspended status on its detail view.
 *
 * The detail pages are Server Components: each is invoked directly (awaiting the
 * returned element) and rendered into jsdom. Their non-pure dependencies are
 * replaced with controllable doubles:
 *  - `next/headers` `cookies` — supplies the active `chinooz-locale` (English).
 *  - `next/navigation` `redirect` — observed so an unexpected redirect fails.
 *  - `@/lib/session` `readSession` — supplies the acting administrator roles.
 *  - `next/link` / `next/image` — lightweight host-element stand-ins.
 *  - the interactive client islands — stubbed out so these render tests focus
 *    on the read-only detail presentation (the islands are covered elsewhere).
 *
 * The real in-memory `mockAdminApi` seed data is used as the source of truth so
 * the asserted fields match what an administrator actually sees.
 *
 * Validates: Requirements 3.6, 3.10, 4.2
 */

const mocks = vi.hoisted(() => ({
  // Active locale returned by the cookies() double.
  locale: 'en' as 'en' | 'ne',
  // Roles the page sees via readSession; configured per test.
  roles: ['Read_Only_Admin'] as Role[],
  redirect: vi.fn((_url: string): never => {
    throw new Error(`unexpected redirect to ${_url}`)
  }),
}))

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        name === 'chinooz-locale' ? { value: mocks.locale } : undefined,
    }),
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

vi.mock('@/lib/session', () => ({
  readSession: (): Promise<AdminSession | null> =>
    Promise.resolve({
      adminId: 'admin-test',
      roles: mocks.roles,
      issuedAt: '2024-01-01T00:00:00Z',
      lastSeenAt: '2024-01-01T00:00:00Z',
    }),
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ['data-testid']: testId,
  }: {
    src: string
    alt: string
    'data-testid'?: string
  }) => <img src={src} alt={alt} data-testid={testId} />,
}))

// The interactive islands are stubbed: these render tests assert the read-only
// detail presentation, not the mutating controls.
vi.mock('@/components/users/UserStatusControls', () => ({ default: () => null }))
vi.mock('@/components/ApprovalDecision', () => ({ default: () => null }))
vi.mock('@/components/CancelOrderForm', () => ({ default: () => null }))
vi.mock('@/components/listings/ListingModerationControls', () => ({
  default: () => null,
}))

import type { ReactElement, ReactNode } from 'react'

// Imported after the mocks are registered so the pages bind to the doubles.
import UserDetailPage from '../app/(dashboard)/users/[id]/page'
import ApprovalDetailPage from '../app/(dashboard)/approvals/[id]/page'
import OrderDetailPage from '../app/(dashboard)/orders/[id]/page'
import ListingDetailPage from '../app/(dashboard)/listings/[id]/page'

const admin = resources.en.translation.admin

beforeEach(() => {
  mocks.locale = 'en'
  mocks.roles = ['Read_Only_Admin']
  mocks.redirect.mockClear()
})

afterEach(() => {
  cleanup()
})

/** Renders an awaited Server Component element into jsdom. */
async function renderPage(
  element: Promise<ReactElement>,
): Promise<void> {
  render(await element)
}

describe('marketplace user detail (Req 3.6, 3.10)', () => {
  it('renders the account details for the selected user (Req 3.6)', async () => {
    // user-buyer-1 = Ayush Chaudhary, active buyer.
    await renderPage(
      UserDetailPage({ params: Promise.resolve({ id: 'user-buyer-1' }) }),
    )

    expect(screen.getByTestId('admin-user-detail-title')).toHaveTextContent(
      'Ayush Chaudhary',
    )
    // Account-detail fields: name, type, phone, email.
    expect(screen.getByText('9800000010')).toBeInTheDocument()
    expect(screen.getByText('ayush.buyer@example.com')).toBeInTheDocument()
    expect(screen.getByText(admin.users.typeBuyer)).toBeInTheDocument()
    // Active status for this account.
    expect(
      screen.getByTestId('admin-user-detail-status-text'),
    ).toHaveTextContent(admin.users.statusActive)
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('shows the suspended status on a suspended account detail (Req 3.10)', async () => {
    // user-buyer-2 = Sita Rai, suspended buyer.
    await renderPage(
      UserDetailPage({ params: Promise.resolve({ id: 'user-buyer-2' }) }),
    )

    expect(screen.getByTestId('admin-user-detail-title')).toHaveTextContent(
      'Sita Rai',
    )
    // The suspended status appears both as the badge and the status field.
    expect(screen.getByTestId('admin-user-detail-status')).toHaveTextContent(
      admin.users.statusSuspended,
    )
    expect(
      screen.getByTestId('admin-user-detail-status-text'),
    ).toHaveTextContent(admin.users.statusSuspended)
  })
})

describe('verification request detail (Req 4.2)', () => {
  it('renders the submitted details and documents for the request', async () => {
    // vr-1 = pending seller request with two documents.
    await renderPage(
      ApprovalDetailPage({ params: Promise.resolve({ id: 'vr-1' }) }),
    )

    // Submitted details section.
    expect(screen.getByTestId('admin-approval-details')).toBeInTheDocument()
    expect(screen.getByText('user-seller-1')).toBeInTheDocument()
    expect(screen.getByText(admin.approvals.typeSeller)).toBeInTheDocument()

    // Documents section lists each submitted document.
    expect(
      screen.getByTestId('admin-approval-documents-list'),
    ).toBeInTheDocument()
    expect(screen.getByText('Business registration')).toBeInTheDocument()
    expect(screen.getByText('PAN certificate')).toBeInTheDocument()
  })
})

describe('order detail (Req 5.4)', () => {
  it('renders the parties, line items, and total for the selected order', async () => {
    // order-1001 = completed order (no cancellation island), full party set.
    await renderPage(
      OrderDetailPage({ params: Promise.resolve({ id: 'order-1001' }) }),
    )

    // Parties: buyer, seller, rider.
    expect(screen.getByText('Ayush Chaudhary')).toBeInTheDocument()
    expect(screen.getByText('Himalaya Traders')).toBeInTheDocument()
    expect(screen.getByTestId('admin-order-rider')).toHaveTextContent(
      'Bikash Tamang',
    )

    // Line items.
    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument()
    expect(screen.getByText('Phone Case')).toBeInTheDocument()

    // NPR-formatted total is present and non-empty.
    expect(screen.getByTestId('admin-order-total').textContent ?? '').not.toBe(
      '',
    )
  })
})

describe('listing detail (Req 6.4)', () => {
  it('renders the title, seller, price, description, and images', async () => {
    // listing-1 = published listing with two images.
    await renderPage(
      ListingDetailPage({ params: Promise.resolve({ id: 'listing-1' }) }),
    )

    expect(screen.getByTestId('admin-listing-detail-title')).toHaveTextContent(
      'Wireless Earbuds Pro',
    )
    expect(screen.getByTestId('admin-listing-seller')).toHaveTextContent(
      'Himalaya Traders',
    )
    expect(
      screen.getByTestId('admin-listing-price').textContent ?? '',
    ).not.toBe('')
    expect(screen.getByTestId('admin-listing-description')).toHaveTextContent(
      'Noise-cancelling wireless earbuds with charging case.',
    )
    // Images render.
    expect(screen.getByTestId('admin-listing-image-0')).toBeInTheDocument()
  })
})
