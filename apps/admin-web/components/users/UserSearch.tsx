'use client'

/**
 * Marketplace-user search island (client island).
 *
 * The only interactive part of the users list page: it owns the search input
 * and the client-side length validation message (Req 3.4). The surrounding
 * list page is a Server Component that reads the `search` query parameter and
 * renders the matching, paginated results.
 *
 * Behavior:
 * - Submitting a valid term (length 2..100 per the pure `validateSearchTerm`)
 *   navigates to `/users?search=<term>` — preserving the active type filter
 *   and resetting to the first page — so the server component re-resolves the
 *   matching records (Req 3.3).
 * - Submitting a term outside the allowed length does NOT navigate: the current
 *   list is left unchanged and a localized message indicating the allowed
 *   length is shown (Req 3.4).
 * - Submitting an empty field clears the active search (preserving the type
 *   filter), so the unfiltered list returns.
 *
 * Submission is triggered by the search button or the Enter key (the input's
 * `onSubmitEditing`); no `<form>` element is used, so the separate clear
 * control cannot implicitly submit. The length check reuses the pure
 * `validateSearchTerm` from `lib/admin-core` — the single source of truth for
 * the 2..100 bound, never re-encoded in the UI. Every user-visible string is
 * resolved against `@chinooz/i18n` by the server page and passed in as props,
 * so this island holds no hard-coded strings (Req 10.1). Presentation uses
 * `@chinooz/ui-web` primitives and `@chinooz/theme` token utility classes only
 * (Req 11.1).
 *
 * _Requirements: 3.3, 3.4_
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@chinooz/ui-web'

import { validateSearchTerm } from '@/lib/admin-core/users'
import type { UserType } from '@/lib/admin-core/types'

interface UserSearchLabels {
  /** Placeholder for the search field. */
  placeholder: string
  /** Accessible label for the search field. */
  label: string
  /** Submit-button label. */
  submit: string
  /** Clear-button label. */
  clear: string
  /** Message shown when the term is shorter than the minimum (Req 3.4). */
  tooShort: string
  /** Message shown when the term is longer than the maximum (Req 3.4). */
  tooLong: string
}

interface UserSearchProps {
  /** Pre-localized, user-visible labels resolved by the server page. */
  labels: UserSearchLabels
  /** The active search term, echoed from the `search` query parameter. */
  initialTerm: string
  /** The active type filter to preserve across a search navigation. */
  activeType?: UserType
}

/**
 * Builds the `/users` URL for a search navigation, preserving the active type
 * filter and resetting pagination to the first page (the page parameter is
 * simply omitted, which the server resolves to page 1).
 */
function buildUsersUrl(term: string, type?: UserType): string {
  const params = new URLSearchParams()
  if (type !== undefined) params.set('type', type)
  if (term.length > 0) params.set('search', term)
  const query = params.toString()
  return query.length > 0 ? `/users?${query}` : '/users'
}

export default function UserSearch({
  labels,
  initialTerm,
  activeType,
}: UserSearchProps) {
  const router = useRouter()
  const [term, setTerm] = useState(initialTerm)
  const [error, setError] = useState<string | null>(null)

  const submitSearch = () => {
    // An empty field clears the active search and returns the unfiltered list.
    if (term.length === 0) {
      setError(null)
      router.push(buildUsersUrl('', activeType))
      return
    }

    // Reuse the pure validator (single source of truth for the 2..100 bound).
    const validation = validateSearchTerm(term)
    if (!validation.ok) {
      // Reject the search and leave the current list unchanged (Req 3.4).
      setError(validation.reason === 'too_short' ? labels.tooShort : labels.tooLong)
      return
    }

    setError(null)
    router.push(buildUsersUrl(term, activeType))
  }

  const handleClear = () => {
    setTerm('')
    setError(null)
    router.push(buildUsersUrl('', activeType))
  }

  return (
    <div role="search" className="flex items-end gap-2">
      <div className="flex-1">
        <Input
          name="search"
          label={labels.label}
          placeholder={labels.placeholder}
          value={term}
          onChangeText={setTerm}
          error={error ?? undefined}
          returnKeyType="search"
          onSubmitEditing={submitSearch}
          testID="admin-users-search-input"
        />
      </div>
      <Button
        variant="primary"
        size="md"
        onPress={submitSearch}
        testID="admin-users-search-submit"
      >
        {labels.submit}
      </Button>
      {initialTerm.length > 0 && (
        <Button
          variant="ghost"
          size="md"
          onPress={handleClear}
          testID="admin-users-search-clear"
        >
          {labels.clear}
        </Button>
      )}
    </div>
  )
}
