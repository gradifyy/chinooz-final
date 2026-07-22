import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTranslation } from 'react-i18next'
import { resources, i18n, initI18n } from '@chinooz/i18n'
import { useUIStore } from '@chinooz/state'

import I18nProvider from '../components/I18nProvider'
import LanguageToggle from '../components/LanguageToggle'

/**
 * Component / render test for the language switch (task 19.11).
 *
 * Requirement 10.2: switching language re-renders all strings in the new
 * language without re-authentication.
 * Requirement 10.3: the selected language is persisted and reapplied on
 * subsequent sessions.
 *
 * The real `I18nProvider` (client i18next/store wiring) and `LanguageToggle`
 * (the toggle island) are exercised together with a small string consumer so
 * the actual re-render is observed. The toggle's only non-pure dependency —
 * `next/navigation`'s `useRouter` — is replaced with a double so the
 * server-component refresh can be observed without a router context.
 *
 * Validates: Requirements 10.2, 10.3
 */

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: mocks.push }),
}))

const toggleLabels = {
  aria: resources.en.translation.admin.language.toggle,
  english: resources.en.translation.admin.language.english,
  nepali: resources.en.translation.admin.language.nepali,
}

const EN_STRING = resources.en.translation.admin.users.accountDetails
const NE_STRING = resources.ne.translation.admin.users.accountDetails

/** Renders a representative localized string via react-i18next. */
function StringConsumer() {
  const { t } = useTranslation()
  return <span data-testid="consumer">{t('admin.users.accountDetails')}</span>
}

function renderHarness(initialLocale: 'en' | 'ne') {
  return render(
    <I18nProvider initialLocale={initialLocale}>
      <LanguageToggle labels={toggleLabels} />
      <StringConsumer />
    </I18nProvider>,
  )
}

beforeEach(() => {
  mocks.refresh.mockClear()
  mocks.push.mockClear()
  // Reset shared client state so each test starts from English.
  useUIStore.setState({ locale: 'en' })
  // Ensure i18next is initialized (with useSuspense disabled) before the first
  // render so the string consumer renders synchronously rather than suspending.
  initI18n('en')
  i18n.changeLanguage('en')
  // Clear the persisted locale cookie.
  document.cookie = 'chinooz-locale=; path=/; max-age=0'
})

afterEach(() => {
  cleanup()
})

describe('language switch (Req 10.2, 10.3)', () => {
  it('re-renders strings in the new language without re-authentication (Req 10.2)', async () => {
    // A pre-existing admin session must survive the switch (no re-auth).
    document.cookie = 'chinooz-admin-session=existing-session; path=/'

    renderHarness('en')

    // Initially rendered in English.
    expect(screen.getByTestId('consumer')).toHaveTextContent(EN_STRING)

    // Switch to Nepali.
    await userEvent.click(screen.getByText(toggleLabels.nepali))

    // All strings re-render in Nepali.
    await waitFor(() => {
      expect(screen.getByTestId('consumer')).toHaveTextContent(NE_STRING)
    })

    // Server components are re-rendered (no re-auth) — refresh, never a login push.
    expect(mocks.refresh).toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
    // The existing session cookie is untouched by the language switch.
    expect(document.cookie).toContain('chinooz-admin-session=existing-session')
  })

  it('persists the selected language in a server-readable cookie (Req 10.3)', async () => {
    renderHarness('en')

    await userEvent.click(screen.getByText(toggleLabels.nepali))

    // The choice is persisted via the server-readable cookie the layout reads
    // at the start of every subsequent session.
    await waitFor(() => {
      expect(document.cookie).toContain('chinooz-locale=ne')
    })
    // And reflected in the shared client store.
    expect(useUIStore.getState().locale).toBe('ne')
  })

  it('reapplies the persisted language at the start of a new session (Req 10.3)', async () => {
    // Simulate a fresh session where the server resolved the persisted locale
    // (Nepali) from the cookie and passed it as the initial locale.
    renderHarness('ne')

    await waitFor(() => {
      expect(screen.getByTestId('consumer')).toHaveTextContent(NE_STRING)
    })
  })
})
