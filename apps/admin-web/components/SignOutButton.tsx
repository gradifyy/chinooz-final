'use client'

/**
 * Sign-out control for the authenticated shell (client island).
 *
 * Wraps the `signOut` server action (`app/actions/auth.ts`) in a
 * `@chinooz/ui-web` `Button`. Pressing it terminates the session server-side
 * and redirects to the login route (Req 1.4). The label is resolved against
 * `@chinooz/i18n` by the server layout and passed in, so no user-visible string
 * is hard-coded (Req 10.1). Styling comes from the shared `Button` primitive /
 * `@chinooz/theme` tokens (Req 11.1).
 */

import { Button } from '@chinooz/ui-web'

import { signOut } from '@/app/actions/auth'

interface SignOutButtonProps {
  /** Localized, user-visible label for the sign-out action. */
  label: string
}

export default function SignOutButton({ label }: SignOutButtonProps) {
  return (
    <Button
      variant="ghost"
      fullWidth
      onPress={() => {
        void signOut()
      }}
      testID="admin-sign-out"
    >
      {label}
    </Button>
  )
}
